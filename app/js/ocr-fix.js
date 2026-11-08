/* Corretor conservador para palavras do OCR.
   Só troca quando: a palavra não existe na lista das 12 mil mais frequentes,
   a confiança do OCR é baixa, e existe UM vizinho de distância 1 claramente
   mais comum que os outros. Nomes próprios e palavras com hífen ficam intactos. */
import { PT_WORDS } from './wordlist-pt.js';

const CONF_LIMIT = 85;   // acima disso, o OCR "acredita" na palavra
const MAX_RANK = 6000;   // só sugere palavra comum
const MARGIN = 3;        // o melhor candidato precisa ser 3x mais frequente que o segundo
const MAX_FIXES = 8;     // por página

const ALPHA = [...'abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúüç'];
const DIGITS = { 0: 'o', 1: 'l', 5: 's' }; // só trocas visuais seguras (8 pode ser "g" ou "b")

const DIGIT_OPTS = { 0: 'o', 1: 'l', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'gb', 7: 't', 8: 'bg', 9: 'g' };

/** Todas as leituras possíveis de uma palavra com dígitos ("cora8em" -> corabem/coragem). */
function digitVariants(w) {
  const idx = [...w].map((c, i) => (/[0-9]/.test(c) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return [w];
  if (idx.length > 2) return [];
  let res = [w];
  for (const i of idx) {
    const next = [];
    for (const s of res) for (const o of (DIGIT_OPTS[w[i]] || '')) next.push(s.slice(0, i) + o + s.slice(i + 1));
    res = next;
  }
  return res;
}

let RANK = null;
function init() {
  if (RANK) return;
  RANK = new Map(PT_WORDS.split(' ').map((w, i) => [w, i]));
}

/** true se a palavra está na lista das mais frequentes. */
export function isKnown(word) {
  init();
  return RANK.has(String(word || '').toLowerCase());
}

/** Candidatos de distância 1 (substituição ou troca de duas letras), do mais comum ao menos. */
export function candidates(word) {
  init();
  const found = new Set();
  for (let i = 0; i < word.length; i++) {
    const head = word.slice(0, i);
    const tail = word.slice(i + 1);
    for (const c of ALPHA) {
      const cand = head + c + tail;
      if (cand !== word && RANK.has(cand)) found.add(cand);
    }
    if (i < word.length - 1) {
      const swapped = head + word[i + 1] + word[i] + word.slice(i + 2);
      if (RANK.has(swapped)) found.add(swapped);
    }
  }
  return [...found].sort((a, b) => RANK.get(a) - RANK.get(b));
}

/** Corrige uma palavra se as regras permitirem; devolve a original caso contrário. */
export function fixWord(word, conf) {
  init();
  const w = String(word || '');
  if (w.length < 3) return w;
  if (!/^[\p{L}\p{N}]+$/u.test(w)) return w;          // hífen, apóstrofo, pontuação
  if (/^\p{Lu}/u.test(w)) return w;                    // nome próprio ou início de frase
  if (/\p{Lu}/u.test(w)) return w;                     // maiúscula no meio (dA, UmMentas)
  if (RANK.has(w)) return w;                           // já é palavra conhecida
  if (conf != null && conf >= CONF_LIMIT) return w;    // OCR confiante: não mexe

  if (/\d/.test(w)) {                                  // "8em" -> "bem"
    const digitsFixed = w.replace(/[0-9]/g, (c) => DIGITS[c] || c);
    if (digitsFixed !== w && RANK.has(digitsFixed)) return digitsFixed;
    return w;
  }
  if (w.length < 4) return w;

  const cands = candidates(w);
  if (!cands.length) return w;
  const best = cands[0];
  if (RANK.get(best) > MAX_RANK) return w;
  if (cands.length > 1 && RANK.get(cands[1]) < RANK.get(best) * MARGIN) return w; // empate: não arrisca
  return best;
}

/** Segundo passe, no texto já limpo: só corrige quando existe UM único candidato comum.
 *  Pega casos que o OCR juntou de duas linhas, como "ral-" + "vez" = "ralvez". */
export function fixPlainText(text) {
  init();
  let fixes = 0;
  // 1) palavra cortada por hífen no fim da linha e continuada por algo ilegível: "cora-" + "8em"
  let t = String(text || '').replace(/([\p{Ll}]{3,})-\s*\n\s*([\p{L}\p{N}]{2,})/gu, (m, a, b) => {
    const options = digitVariants(a + b).filter((x) => RANK.has(x));
    if (options.length === 1) { fixes++; return options[0]; }
    return m;
  });
  // 2) palavra única com dígito no meio ("c0m" -> "com")
  t = t.replace(/[\p{L}\p{N}]{3,}/gu, (w) => {
    if (fixes >= MAX_FIXES) return w;
    if (!/\d/.test(w)) return w;
    if ((w.match(/\p{L}/gu) || []).length < 2) return w;
    const options = digitVariants(w).filter((x) => RANK.has(x));
    if (options.length === 1) { fixes++; return options[0]; }
    return w;
  });
  // 3) palavra desconhecida com UM único vizinho comum ("ralvez" -> "talvez")
  t = t.replace(/[\p{L}]{5,}/gu, (w) => {
    if (fixes >= MAX_FIXES) return w;
    if (/^\p{Lu}/u.test(w)) return w;
    if (RANK.has(w)) return w;
    const cands = candidates(w);
    if (cands.length !== 1) return w;
    const cand = cands[0];
    // erro de letra dobrada ("ammosfera" -> "atmosfera") vale mesmo se a palavra for menos comum
    const doubled = /(mm|nn|tt|pp|ff|cc|bb|dd|gg|vv|zz)/;
    if (RANK.get(cand) > 3000 && !(doubled.test(w) && !doubled.test(cand))) return w;
    fixes++;
    return cand;
  });
  return { text: t, fixes };
}

/** Aplica o corretor nas linhas do OCR (que trazem palavra + confiança). */
export function applyDictionary(lines) {
  let fixes = 0;
  const out = (lines || []).map((line) => {
    const words = line.words || [];
    const confs = line.wordConfs || [];
    const fixedWords = words.map((raw, i) => {
      if (fixes >= MAX_FIXES) return raw;
      const m = String(raw).match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}]+)([^\p{L}\p{N}]*)$/u);
      if (!m) return raw;
      const fixed = fixWord(m[2], confs[i]);
      if (fixed !== m[2]) { fixes++; return m[1] + fixed + m[3]; }
      return raw;
    });
    return { ...line, text: fixedWords.join(' '), words: fixedWords };
  });
  return { lines: out, fixes };
}
