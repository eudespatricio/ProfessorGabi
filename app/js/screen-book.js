/* Modo Livro: foto da página → texto → leitura palavra por palavra com correção guiada. */
import { el, sleep, alignReading, loadJSON, saveJSON, stripAccents, norm, download } from './utils.js';
import { speak, stopSpeaking, sfx, haptic } from './audio.js';
import { listen, asrSupported, requestMic, asrErrorMessage } from './speech.js';
import { openGuided } from './guided.js';
import { showWordCard } from './word-card.js';
/* O corretor (dicionário de 94 KB) só é baixado/avaliado quando o Modo livro é usado. */
let ocrFix = null;
async function ensureOcrFix() {
  if (!ocrFix) ocrFix = await import('./ocr-fix.js');
  return ocrFix;
}
import { clearScreen, tabbar, toast, gabiEl } from './ui.js';
import * as store from './store.js';

const PAGES_KEY = 'gabi.pages.v1';

/* ---------------- OCR (Tesseract.js, carregado sob demanda) ---------------- */
let tesseractPromise = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error('Não consegui carregar o leitor de texto. Verifique a internet.'));
    document.head.append(s);
    setTimeout(() => { if (!window.Tesseract) reject(new Error('O leitor de texto demorou demais para carregar.')); }, 30000);
  });
  return tesseractPromise;
}

/** Prepara a foto para o OCR.
 *  - 'otsu': cinza + contraste + limiar global (rápido; sofre com sombra nas bordas)
 *  - 'normalize': corrige a iluminação (divide pelo fundo desfocado) e aplica Otsu
 *  - 'sauvola': correção de iluminação + limiar local (melhor em página curvada/sombreada)
 */
export async function preprocessImage(file, maxW = 1700, mode = 'normalize') {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(2, Math.max(0.5, maxW / bitmap.width));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // 1) cinza (com um pouco de contraste só no modo antigo)
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[p] = mode === 'otsu' ? Math.max(0, Math.min(255, Math.round((g - 128) * 1.35 + 128))) : Math.round(g);
  }

  // 2) fundo = imagem cinza muito desfocada; dividir por ele remove sombra e vinheta
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = w; blurCanvas.height = h;
  const bctx = blurCanvas.getContext('2d', { willReadFrequently: true });
  bctx.fillStyle = '#fff';
  bctx.fillRect(0, 0, w, h);
  if (mode !== 'otsu') {
    bctx.filter = `blur(${Math.max(8, Math.round(w / 80))}px)`;
    bctx.drawImage(canvas, 0, 0);
    bctx.filter = 'none';
    const bg = bctx.getImageData(0, 0, w, h).data;
    for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
      const base = bg[i] || 1;
      gray[p] = Math.max(0, Math.min(255, Math.round((gray[p] * 255) / Math.max(1, base))));
    }
  }

  let bin;
  if (mode === 'sauvola') {
    bin = sauvola(gray, w, h);
  } else {
    // Otsu sobre o cinza (normalizado ou não)
    const hist = new Uint32Array(256);
    for (let p = 0; p < gray.length; p++) hist[gray[p]]++;
    const total = w * h;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let i = 0; i < 256; i++) {
      wB += hist[i];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += i * hist[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = i; }
    }
    bin = new Uint8ClampedArray(gray.length);
    for (let p = 0; p < gray.length; p++) bin[p] = gray[p] > thr ? 255 : 0;
  }

  for (let p = 0, i = 0; p < bin.length; p++, i += 4) {
    d[i] = bin[p]; d[i + 1] = bin[p]; d[i + 2] = bin[p];
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Limiar local de Sauvola com imagens integrais (rápido o bastante para uma página). */
function sauvola(gray, w, h, window = 0) {
  const win = window || Math.max(9, Math.round(w / 90));
  const r = Math.max(3, Math.floor(win / 2));
  const size = (w + 1) * (h + 1);
  const I = new Float64Array(size);
  const I2 = new Float64Array(size);
  for (let y = 0; y < h; y++) {
    let rowSum = 0, rowSum2 = 0;
    const row = y * w;
    const iRow = (y + 1) * (w + 1);
    const iPrev = y * (w + 1);
    for (let x = 0; x < w; x++) {
      const v = gray[row + x];
      rowSum += v; rowSum2 += v * v;
      I[iRow + x + 1] = I[iPrev + x + 1] + rowSum;
      I2[iRow + x + 1] = I2[iPrev + x + 1] + rowSum2;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  const k = 0.25, R = 128;
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const a = I[y1 + 1 <= h ? (y1 + 1) * (w + 1) + (x1 + 1) : 0] || 0;
      const b = I[y0 * (w + 1) + (x1 + 1)] || 0;
      const c = I[(y1 + 1) * (w + 1) + x0] || 0;
      const dI = I[y0 * (w + 1) + x0] || 0;
      const sum = a - b - c + dI;
      const a2 = I2[(y1 + 1) * (w + 1) + (x1 + 1)] || 0;
      const b2 = I2[y0 * (w + 1) + (x1 + 1)] || 0;
      const c2 = I2[(y1 + 1) * (w + 1) + x0] || 0;
      const d2 = I2[y0 * (w + 1) + x0] || 0;
      const sum2 = a2 - b2 - c2 + d2;
      const mean = sum / area;
      const variance = Math.max(0, sum2 / area - mean * mean);
      const std = Math.sqrt(variance);
      const t = mean * (1 + k * (std / R - 1));
      out[y * w + x] = gray[y * w + x] > t ? 255 : 0;
    }
  }
  return out;
}

/** Lê o TSV do Tesseract e agrupa as palavras por linha, com a confiança e posição de cada uma. */
export function parseTsvLines(tsv) {
  if (!tsv) return [];
  const map = new Map();
  for (const row of String(tsv).split('\n')) {
    const c = row.split('\t');
    if (c.length < 12 || Number(c[0]) !== 5) continue; // nível 5 = palavra
    const text = c.slice(11).join('\t').trim();
    if (!text) continue;
    const key = `${c[1]}.${c[2]}.${c[3]}.${c[4]}`;
    let line = map.get(key);
    if (!line) { line = { words: [], confs: [], lefts: [], rights: [] }; map.set(key, line); }
    const left = Number(c[6]) || 0;
    const width = Number(c[8]) || 0;
    line.words.push(text);
    line.confs.push(Number(c[10]));
    line.lefts.push(left);
    line.rights.push(left + width);
  }
  return [...map.values()].map((l) => ({
    text: l.words.join(' '),
    conf: Math.round(l.confs.reduce((a, b) => a + b, 0) / Math.max(1, l.confs.length)),
    words: l.words,
    wordConfs: l.confs,
    wordLefts: l.lefts,
    wordRights: l.rights,
  }));
}

export async function imageToText(file, onProgress, opts = {}) {
  const T = await loadTesseract();
  const worker = await T.createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(Math.round((m.progress || 0) * 100));
    },
  });
  try {
    await worker.setParameters?.({ preserve_interword_spaces: '1', tessedit_char_blacklist: '|[]{}<>~^_=+*#@$%&' });
    const canvas = await preprocessImage(file, opts.maxW || 1700, opts.mode || 'normalize');
    const { data } = await worker.recognize(canvas, {}, { text: true, tsv: true });
    const lines = parseTsvLines(data.tsv);
    const fixer = await ensureOcrFix();
    const corrected = fixer.applyDictionary(lines);
    return {
      text: data.text || '',
      confidence: Math.round(data.confidence || 0),
      lines: corrected.lines,
      fixes: corrected.fixes,
    };
  } finally {
    worker.terminate?.().catch?.(() => {});
  }
}

/** Corrige quebras de linha típicas de OCR e devolve texto limpo. */
export function cleanOcr(text) {
  const joined = String(text || '')
    .replace(/\r/g, '')
    .replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2')
    .replace(/([a-záéíóúâêôãõç,;:])\n([a-záéíóúâêôãõç])/g, '$1 $2')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
  return joined;
}

const VOWEL = /[aeiouáàâãäéèêëíìîïóòôõöúùûü]/i;
const VALID_1CHAR = new Set(['a', 'o', 'e', 'é', 'à', 'A', 'O', 'E', 'É', 'À']);
const VALID_2CHAR = new Set([
  'ao', 'as', 'às', 'da', 'de', 'do', 'em', 'eu', 'fé', 'há', 'ir', 'já', 'lá',
  'lê', 'me', 'na', 'no', 'nó', 'os', 'ou', 'pé', 'pó', 'sê', 'sé', 'se', 'só',
  'te', 'ti', 'tu', 'um', 'vá', 'vê', 'vi', 'vó', 'vô',
]);

function isNoiseWord(tok, conf = null) {
  const bare = tok.replace(/[^\p{L}\p{N}-]/gu, '');
  if (!bare) return true;
  if (/^\d{1,3}$/.test(bare)) return true;
  const letters = (bare.match(/\p{L}/gu) || []).length;
  if (letters === 0) return true;
  if (letters === 1 && !VALID_1CHAR.has(bare)) return true;
  if (letters === 2) {
    const low = bare.toLowerCase();
    // Siglas/ruído de 2 letras ("RO", "FE", "EE", "Fa", "Ca", "cm", "rm") sem ser palavra funcional real
    if (!VALID_2CHAR.has(low) && (!VOWEL.test(bare) || /^\p{Lu}{2}$/u.test(bare) || (conf != null && conf < 75))) {
      return true;
    }
    if (!VALID_2CHAR.has(low) && /^\p{Lu}\p{Ll}$/u.test(bare)) return true;
  }
  if (letters > 2 && !VOWEL.test(bare)) return true;
  if (/(.)\1{3,}/u.test(bare)) return true;
  if (conf != null && conf < 55 && letters <= 3 && !STOPWORDS.has(stripAccents(bare).toLowerCase())) return true;
  return false;
}

/** Remove ruído de borda/ilustração (palavras com baixa confiança, siglas soltas ou separadas por grande salto horizontal). */
function stripLineEdgeNoise(line) {
  if (!Array.isArray(line?.words) || !line.words.length) return line?.text || '';
  const words = line.words;
  const confs = line.wordConfs || [];
  const lefts = line.wordLefts || [];
  const rights = line.wordRights || [];

  // 1) Se houver um salto horizontal grande (> 90px) separando um cluster curto de baixa confiança (ilustração/espiral) do texto principal, fica só com o bloco principal
  let start = 0;
  let end = words.length;
  if (lefts.length === words.length && words.length >= 4) {
    for (let i = 0; i < Math.min(5, words.length - 2); i++) {
      const gap = lefts[i + 1] - rights[i];
      const prefixConf = confs.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1);
      if (gap > 85 && prefixConf < 78) start = i + 1;
    }
    for (let i = words.length - 1; i >= Math.max(start + 2, words.length - 5); i--) {
      const gap = lefts[i] - rights[i - 1];
      const suffixConf = confs.slice(i).reduce((a, b) => a + b, 0) / (words.length - i);
      if (gap > 85 && suffixConf < 78) { end = i; break; }
    }
  }

  const slicedWords = words.slice(start, end);
  const slicedConfs = confs.slice(start, end);

  // 2) Descarta prefixo/sufixo de tokens ruidosos (espiral do caderno, ícones, rabiscos na margem)
  let s = 0;
  while (s < slicedWords.length && (
    isNoiseWord(slicedWords[s], slicedConfs[s])
    || (slicedConfs[s] != null && slicedConfs[s] < 68 && slicedWords.length - s >= 4)
  )) s++;

  let e = slicedWords.length;
  while (e > s && (
    isNoiseWord(slicedWords[e - 1], slicedConfs[e - 1])
    || (slicedConfs[e - 1] != null && slicedConfs[e - 1] < 62 && e - s >= 4)
  )) e--;

  // 3) Filtra tokens internos que são claramente ruído de OCR (ex.: "EE", "RO", "FE", "rm", "cm", "Debe;")
  const kept = [];
  for (let i = s; i < e; i++) {
    const w = slicedWords[i];
    const c = slicedConfs[i];
    if (isNoiseWord(w, c)) continue;
    // Palavra toda em maiúsculas (2–4 letras) perdida no meio de frase em minúsculas
    const bare = w.replace(/[^\p{L}]/gu, '');
    if (bare.length >= 2 && bare.length <= 4 && /^\p{Lu}+$/u.test(bare) && slicedWords.some((x) => /^\p{Ll}{3,}/u.test(x))) {
      continue;
    }
    if (/;$/.test(w) && c != null && c < 75) continue;
    kept.push(w);
  }
  return kept.join(' ');
}

function cleanOcrLine(line) {
  const tokens = line.split(/\s+/).filter(Boolean)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.,;:!?%°ºª-]+$/gu, ''));
  const kept = [];
  for (const t of tokens) {
    if (!t) continue;
    if (isNoiseWord(t, null)) continue;
    if ((t.match(/[^\p{L}\p{N}.,;:!?%°ºª-]/gu) || []).length > 1) continue;
    kept.push(t);
  }
  // Remove corridas de 2+ tokens curtos (1-2 letras) no início da linha ("Um E A Fa EE cm gato" -> "gato" ou preserva "Um gato")
  while (kept.length >= 3) {
    const w0 = kept[0].replace(/[^\p{L}]/gu, '');
    const w1 = kept[1].replace(/[^\p{L}]/gu, '');
    if (w0.length <= 2 && w1.length <= 2 && (/^\p{Lu}/u.test(w1) || !STOPWORDS.has(stripAccents(w1).toLowerCase()))) {
      // Se a primeira é "Um"/"O"/"A" e logo depois vem lixo ("E A Fa"), remove o lixo na posição 1
      if (/^(Um|Uma|O|A|Os|As)$/u.test(w0)) {
        kept.splice(1, 1);
        continue;
      }
      kept.shift();
      continue;
    }
    break;
  }
  return kept.join(' ');
}

const STOPWORDS = new Set(('a o e é de da do das dos que em um uma para com não se por no na nos nas ao aos à às '
  + 'foi ser sua seu suas seus ele ela eles elas isso isto aqui como mais mas já também muito bem eu você me lhe '
  + 'quando onde porque ainda depois antes sobre entre sem sob até cada todos todas outro outra').split(' '));

const MIN_LINE_CONF = 58;

/** Uma linha "de verdade" tem palavras com forma de palavra e, se for longa, palavras funcionais. */
function looksLikeTextLine(cleaned) {
  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length) return false;
  // Descarta rodapés editoriais e cabeçalhos de seção de livro didático
  if (/^(acervo\s+editora|editora\s+|atividades?\s+adicionais|l[íi]ngua\s+portuguesa|leitura\b|atividade\b|para\s+casa\b)/iu.test(cleaned)) {
    return false;
  }
  const good = words.filter((w) => /^[\p{L}][\p{L}'’-]*$/u.test(w));
  if (!good.length || good.length / words.length < 0.65) return false;
  const lower = good.filter((w) => w.length >= 3 && /^\p{Ll}/u.test(w));
  const stop = good.filter((w) => STOPWORDS.has(stripAccents(w).toLowerCase())).length;
  const shortCaps = words.filter((w) => /^[\p{Lu}\p{Lt}]{1,3}$/u.test(w)).length;
  if (shortCaps / words.length > 0.35) return false;
  // Linhas onde quase todas as palavras começam com maiúscula ("SUN À Fara Cara A") são falsos positivos de manuscrito/espiral
  const initCaps = words.filter((w) => /^\p{Lu}/u.test(w)).length;
  if (words.length >= 3 && initCaps / words.length > 0.6 && lower.length < 2) return false;
  if (words.length >= 4 && lower.length < 2 && stop === 0) return false;
  // título curto todo em maiúsculas/iniciais ou título de texto (ex.: "Um presente inesperado", "PLANTA-SE UMA ÁRVORE")
  const title = words.length >= 2 && words.length <= 6
    && words.every((w) => /^[\p{L}][\p{L}-]*$/u.test(w))
    && (/^\p{Lu}/u.test(words[0]))
    && (lower.length >= 1 || words.every((w) => /^[\p{Lu}\p{Lt}-]+$/u.test(w)));
  if (words.length < 4 && !title) return false;
  return true;
}

/** Descarta linhas e palavras que não parecem texto (desenhos, sombras, símbolos soltos). */
export function sanitizeOcr(raw, lines = null) {
  const source = Array.isArray(lines) && lines.length
    ? lines
    : String(raw || '').split('\n').filter((l) => l.trim()).map((t) => ({ text: t, conf: null }));
  const keep = [];
  let dropped = 0;
  for (const line of source) {
    if (line.conf != null && line.conf < MIN_LINE_CONF) { dropped++; continue; }
    const preCleaned = line.words ? stripLineEdgeNoise(line) : line.text;
    const cleaned = cleanOcrLine(preCleaned);
    const words = cleaned.split(' ').filter(Boolean);
    const letters = (cleaned.match(/\p{L}/gu) || []).length;
    if (words.length < 2 || letters < 4) { dropped++; continue; }
    if (!looksLikeTextLine(cleaned)) { dropped++; continue; }
    keep.push(cleaned);
  }
  if (!keep.length) {
    // filtro agressivo demais (foto ruim): volta ao comportamento antigo, que só remove o óbvio
    for (const line of source) {
      const cleaned = cleanOcrLine(line.text);
      const words = cleaned.split(' ').filter(Boolean);
      const letters = (cleaned.match(/\p{L}/gu) || []).length;
      if (words.length < 2 || letters < 4) { dropped++; continue; }
      keep.push(cleaned);
    }
  }
  const merged = cleanOcr(keep.join('\n'));
  const plain = ocrFix ? ocrFix.fixPlainText(merged) : { text: merged, fixes: 0 };
  return { text: plain.text, dropped, total: source.length, fixes: plain.fixes };
}

export function splitSentences(text) {
  return String(text || '')
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\p{L}]/gu, '').length > 3);
}

const pages = () => loadJSON(PAGES_KEY, []);

/* ------------------------------ TELA ------------------------------ */
export function renderBook() {
  const s = clearScreen();
  tabbar('home');
  const wrap = el('div', { class: 'wrap stack' });
  let text = '';
  let title = '';
  let confidence = null;
  let fixes = 0;

  const back = el('button', { class: 'btn--back', 'aria-label': 'Voltar', 'on:click': () => { stopSpeaking(); location.hash = '#/'; } }, '←');
  const head = el('div', { class: 'row' }, back,
    el('div', { class: 'grow' },
      el('div', { class: 'topbar__title', text: 'Modo livro' }),
      el('div', { class: 'small muted', text: 'Fotografe uma página e eu ajudo palavra por palavra.' })));
  wrap.append(head);

  const body = el('div', { class: 'col' });
  wrap.append(body);
  s.append(wrap);

  function captureView() {
    body.innerHTML = '';
    const card = el('div', { class: 'card' });
    card.append(el('div', { class: 'card__title', text: '1. Escolha a página' }));
    card.append(el('div', { class: 'small muted mt', text: 'Enquadre só o texto, com luz de cima e sem sombra. Pode ser foto ou imagem da galeria.' }));

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    const camInput = document.createElement('input');
    camInput.type = 'file';
    camInput.accept = 'image/*';
    camInput.capture = 'environment';
    camInput.style.display = 'none';
    document.body.append(fileInput, camInput);

    const row = el('div', { class: 'row row--wrap', style: { gap: '10px', marginTop: '12px' } });
    const bCam = el('button', { class: 'btn btn--primary', 'on:click': () => camInput.click() }, '📷 Tirar foto');
    const bGal = el('button', { class: 'btn btn--soft', 'on:click': () => fileInput.click() }, '🖼️ Escolher imagem');
    row.append(bCam, bGal);
    card.append(row);

    const status = el('div', { class: 'small muted mt', text: '' });
    const bar = el('div', { class: 'unitbar', style: { display: 'none', marginTop: '10px' } });
    const fill = el('i', { style: { width: '0%' } });
    bar.append(fill);
    card.append(status, bar);
    body.append(card);

    const handleFile = async (file) => {
      if (!file) return;
      status.textContent = 'Lendo a página… isso pode levar alguns segundos.';
      bar.style.display = 'block';
      fill.style.width = '5%';
      try {
        const out = await imageToText(file, (p) => { fill.style.width = `${Math.max(5, p)}%`; status.textContent = `Lendo a página… ${p}%`; });
        const clean = sanitizeOcr(out.text, out.lines);
        text = clean.text;
        confidence = out.confidence;
        fixes = (out.fixes || 0) + (clean.fixes || 0);
        if (!text || text.replace(/\s/g, '').length < 20) {
          status.textContent = 'Não consegui ler esta foto. Tente enquadrar só o texto, com mais luz, ou cole o texto abaixo.';
          return;
        }
        status.textContent = `Página lida (confiança ${out.confidence || '—'}%).${fixes ? ` Corrigi ${fixes} palavra(s) pelo dicionário.` : ''}${clean.dropped ? ` Removi ${clean.dropped} linha(s) que não pareciam texto.` : ''} Confira antes de começar.`;
        editView();
      } catch (e) {
        status.textContent = `${e.message} Você pode colar o texto manualmente.`;
      } finally {
        bar.style.display = 'none';
      }
    };
    camInput.addEventListener('change', () => handleFile(camInput.files?.[0]));
    fileInput.addEventListener('change', () => handleFile(fileInput.files?.[0]));

    const manual = el('div', { class: 'card' });
    manual.append(el('div', { class: 'card__title', text: 'Ou cole o texto' }));
    const ta = el('textarea', { class: 'input', rows: '5', placeholder: 'Cole aqui o texto da página…', style: { marginTop: '10px', minHeight: '120px' } });
    manual.append(ta);
    manual.append(el('button', {
      class: 'btn btn--soft btn--sm', style: { marginTop: '8px' },
      'on:click': () => { text = cleanOcr(ta.value); if (text.length < 20) { toast('Texto curto demais.'); return; } editView(); },
    }, 'Usar este texto'));
    body.append(manual);

    const saved = pages();
    if (saved.length) {
      const rec = el('div', { class: 'card' });
      rec.append(el('div', { class: 'card__title', text: 'Páginas recentes' }));
      saved.slice(0, 5).forEach((p) => {
        const rowP = el('div', { class: 'row', style: { gap: '8px', padding: '8px 0', borderBottom: '1px solid #faf2e8' } });
        const mid = el('div', { class: 'grow' });
        mid.append(el('div', { class: 'small strong', text: p.title || 'Página sem título' }));
        mid.append(el('div', { class: 'tiny muted', text: `${(p.text || '').length} caracteres` }));
        rowP.append(mid);
        rowP.append(el('button', {
          class: 'btn btn--soft btn--sm', 'on:click': () => { text = p.text; title = p.title; readView(); },
        }, 'Abrir'));
        rec.append(rowP);
      });
      body.append(rec);
    }
  }

  function editView() {
    body.innerHTML = '';
    const card = el('div', { class: 'card' });
    card.append(el('div', { class: 'card__title', text: '2. Confira o texto' }));
    card.append(el('div', { class: 'small muted mt', text: 'Corrija o que o leitor errou (nomes, pontuação). Depois comece a leitura.' }));
    const ti = el('input', { class: 'input', placeholder: 'Título do livro ou página', value: title, style: { marginTop: '10px' } });
    const ta = el('textarea', { class: 'input', rows: '8', style: { marginTop: '10px', minHeight: '180px' } });
    ta.value = text;
    card.append(ti, ta);
    const row = el('div', { class: 'row row--wrap', style: { gap: '10px', marginTop: '12px' } });
    row.append(el('button', { class: 'btn btn--ghost', 'on:click': captureView }, '← Outra foto'));
    row.append(el('button', {
      class: 'btn btn--primary grow',
      'on:click': () => { text = ta.value; title = ti.value; readView(); },
    }, 'Começar leitura ➜'));
    card.append(row);
    body.append(card);
    body.append(el('div', { class: 'card card--soft small muted', text: confidence != null ? `Confiança do OCR: ${confidence}%.${fixes ? ` Corrigi ${fixes} palavra(s) pelo dicionário.` : ''} Palavras estranhas costumam ser nome próprio ou letra decorativa.` : 'Texto colado manualmente.' }));
  }

  function readView() {
    body.innerHTML = '';
    const sentences = splitSentences(text);
    if (!sentences.length) { toast('Não encontrei frases neste texto.'); return; }

    const pageCard = el('div', { class: 'card book-page' });
    pageCard.append(el('div', { class: 'book-title', text: title || 'Minha página' }));
    pageCard.append(el('div', { class: 'small muted', text: 'Toque em qualquer palavra para ouvir e treinar as sílabas. Ou use o microfone para ler a frase.' }));

    const hint = el('div', { class: 'book-hint', text: 'Escolha uma frase e toque no microfone.' });
    const sentenceEls = [];

    sentences.forEach((sentence, si) => {
      const box = el('div', { class: 'book-sentence' });
      const line = el('div', { class: 'book-line' });
      const words = sentence.split(/\s+/).filter(Boolean);
      words.forEach((raw) => {
        const target = raw.replace(/[^\p{L}\p{N}-]/gu, '');
        if (!target) { line.append(document.createTextNode(raw + ' ')); return; }
        const b = el('button', {
          class: 'book-word', type: 'button',
          'on:click': async () => {
            haptic(8);
            showWordCard(target);
          },
        }, raw);
        line.append(b, document.createTextNode(' '));
      });
      box.append(line);

      const actions = el('div', { class: 'book-actions' });
      actions.append(el('button', {
        class: 'btn btn--sm btn--soft', 'on:click': () => { stopSpeaking(); speak(sentence, { rate: 0.75 }); },
      }, '🔊 Ouvir'));
      actions.append(el('button', {
        class: 'btn btn--sm btn--teal', 'on:click': () => readSentence(sentence, line, si),
      }, '🎤 Ler'));
      box.append(actions);
      pageCard.append(box);
      sentenceEls.push({ box, line });
    });
    body.append(pageCard);

    async function readSentence(sentence, line, si) {
      stopSpeaking();
      hint.textContent = 'Estou ouvindo…';
      await sleep(180); // libera o áudio antes de abrir o microfone
      const res = await listen({ onPartial: (t) => { hint.textContent = `“${t}”`; } });
      if (!res.ok) {
        if (res.error === 'not-allowed' || res.error === 'service-not-allowed') {
          const ok = await requestMic();
          hint.textContent = ok ? 'Agora toque em “Ler” de novo.' : 'Sem microfone. Use “Ouvir” e toque nas palavras para treinar.';
          return;
        }
        hint.textContent = asrErrorMessage(res.error);
        return;
      }
      const { accuracy, missed } = alignReading(sentence, res.transcript);
      const wordsEls = [...line.querySelectorAll('.book-word')];
      line.querySelectorAll('.book-word').forEach((w) => w.classList.remove('ok', 'miss'));
      if (accuracy >= 0.7) {
        wordsEls.forEach((w) => w.classList.add('ok'));
        sfx('ok'); haptic();
        hint.textContent = `Isso! Você leu ${Math.round(accuracy * 100)}% da frase.`;
        store.addTime(15);
        sentenceEls[si].box.classList.add('done');
      } else {
        const missKeys = new Set(missed.map((m) => stripAccents(m)));
        wordsEls.forEach((w) => {
          const k = stripAccents(w.textContent.replace(/[^\p{L}\p{N}]/gu, ''));
          w.classList.add(missKeys.has(k) ? 'miss' : 'ok');
        });
        sfx('soft');
        const first = missed[0];
        hint.innerHTML = '';
        hint.append(document.createTextNode(`Quase (${Math.round(accuracy * 100)}%). `));
        if (first) {
          hint.append(el('button', {
            class: 'btn btn--sm btn--primary', 'on:click': () => openGuided(first),
          }, `👩‍🏫 Treinar “${first}”`));
        }
      }
    }

    const foot = el('div', { class: 'row row--wrap', style: { gap: '10px' } });
    foot.append(el('button', {
      class: 'btn btn--soft',
      'on:click': async () => {
        const long = [...new Set(norm(text).split(' ').filter((w) => w.length >= 6))].slice(0, 5);
        for (const w of long) {
          // eslint-disable-next-line no-await-in-loop
          await openGuided(w);
        }
      },
    }, '🎯 Treinar 5 palavras difíceis'));
    foot.append(el('button', {
      class: 'btn btn--soft',
      'on:click': () => {
        const list = pages();
        list.unshift({ title: title || 'Página', text, at: Date.now() });
        saveJSON(PAGES_KEY, list.slice(0, 10));
        toast('Página salva em “recentes”', 'ok');
      },
    }, '💾 Salvar página'));
    foot.append(el('button', { class: 'btn btn--ghost', 'on:click': captureView }, '📷 Nova página'));
    body.append(hint, foot, el('div', { class: 'card card--soft small muted mt', text: 'Dica: para livros longos, escolha duas ou três frases por dia. Ler a mesma frase de novo no dia seguinte é o que mais melhora.' }));
  }

  captureView();
}
