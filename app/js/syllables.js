/* Divisão silábica para o português do Brasil, orientada ao ensino.
   Regras: dígrafos inseparáveis (ch, lh, nh, qu, gu) ficam juntos;
   rr/ss/sc/xc separam-se; encontros consonantais (pr, br, tr, dr, cr, gr, vr,
   pl, bl, cl, gl, fl) ficam juntos; consoante entre vogais vai para a sílaba
   seguinte; dígrafos nasais fecham a sílaba (cam-po, den-te). */

const VOWELS = new Set([...'aeiouáéíóúâêîôûãõàäëïöü']);
const ACCENTED_I_U = new Set(['í', 'ú', 'ì', 'ù', 'î', 'û']);
const DIPHTHONGS = new Set([
  'ai', 'ei', 'oi', 'ui', 'au', 'eu', 'iu', 'ou',
  'ão', 'ãe', 'õe', 'ãi', 'éi', 'ói', 'úi', 'êu', 'éu', 'ói', 'uai', 'uei',
]);
const CLUSTER_FIRST = new Set([...'pbtdcgfvk']);
const INSEPARABLE = new Set(['ch', 'lh', 'nh']);

const isVowel = (c) => VOWELS.has(c);

/** Divide a palavra em unidades: dígrafos, vogais e consoantes. */
function tokenize(word) {
  const chars = [...word];
  const units = [];
  for (let i = 0; i < chars.length; i++) {
    const a = chars[i];
    const la = a.toLowerCase();
    const b = (chars[i + 1] || '').toLowerCase();
    const c = (chars[i + 2] || '').toLowerCase();
    if (la === 'q' && b === 'u') { units.push({ t: chars[i] + chars[i + 1], v: false, d: true }); i++; continue; }
    if (la === 'g' && b === 'u' && isVowel(c)) { units.push({ t: chars[i] + chars[i + 1], v: false, d: true }); i++; continue; }
    if (INSEPARABLE.has(la + b)) { units.push({ t: chars[i] + chars[i + 1], v: false, d: true }); i++; continue; }
    units.push({ t: a, v: isVowel(la) });
  }
  return units;
}

function mergeDiphthongs(units) {
  const out = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const n = units[i + 1];
    if (u.v && n && n.v) {
      const pair = (u.t + n.t).toLowerCase();
      const pairNoAccent = pair.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const secondChar = n.t.toLowerCase();
      const mergeable = DIPHTHONGS.has(pair) || DIPHTHONGS.has(pairNoAccent);
      if (mergeable && !ACCENTED_I_U.has(secondChar)) {
        out.push({ t: u.t + n.t, v: true, merged: true });
        i++;
        continue;
      }
    }
    out.push(u);
  }
  return out;
}

function isCluster(x, y) {
  if (!x || !y) return false;
  const a = x.t.toLowerCase();
  const b = y.t.toLowerCase();
  return CLUSTER_FIRST.has(a) && (b === 'l' || b === 'r');
}

function nucleusRanges(units) {
  const ranges = [];
  for (let i = 0; i < units.length; i++) {
    if (units[i].v) {
      let j = i;
      while (j + 1 < units.length && units[j + 1].v && units[j + 1].merged) j++;
      ranges.push([i, j]);
      i = j;
    }
  }
  return ranges;
}

/** Quantas consoantes entre núcleos ficam na sílaba anterior (coda). */
function codaCount(between) {
  const n = between.length;
  if (n <= 1) return 0;
  if (n === 2) return isCluster(between[0], between[1]) ? 0 : 1;
  // 3+ consoantes: mantém junto o último par se for encontro consonantal
  return isCluster(between[n - 2], between[n - 1]) ? n - 2 : n - 1;
}

const OVERRIDES = {
  cair: ['ca', 'ir'], caiu: ['ca', 'iu'], saiu: ['sa', 'iu'], sair: ['sa', 'ir'],
  ainda: ['a', 'in', 'da'], rainha: ['ra', 'i', 'nha'], moinho: ['mo', 'i', 'nho'],
  saída: ['sa', 'í', 'da'], baú: ['ba', 'ú'], país: ['pa', 'ís'], juiz: ['ju', 'iz'],
  raiz: ['ra', 'iz'], ruim: ['ru', 'im'], ainda2: [], poesia: ['po', 'e', 'si', 'a'],
  veículo: ['ve', 'í', 'cu', 'lo'], ciúme: ['ci', 'ú', 'me'], saúde: ['sa', 'ú', 'de'],
  prefeitura: [], muito: ['mui', 'to'], muito2: [],
};

/**
 * Divide a palavra em sílabas.
 * @param {string} word
 * @returns {string[]}
 */
export function splitSyllables(word) {
  if (!word) return [];
  const clean = String(word).trim();
  const lower = clean.toLowerCase();
  if (OVERRIDES[lower]) return OVERRIDES[lower].length ? OVERRIDES[lower] : [clean];

  const units = mergeDiphthongs(tokenize(clean));
  const nuclei = nucleusRanges(units);
  if (!nuclei.length) return [clean];

  // limites: índice da unidade onde cada sílaba começa
  const starts = [0];
  for (let k = 1; k < nuclei.length; k++) {
    const prevEnd = nuclei[k - 1][1];
    const curStart = nuclei[k][0];
    const between = units.slice(prevEnd + 1, curStart);
    const codas = codaCount(between);
    starts.push(prevEnd + 1 + codas);
  }

  const out = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : units.length;
    const part = units.slice(from, to).map((u) => u.t).join('');
    if (part) out.push(part);
  }
  // garante que a concatenação seja exatamente a palavra original
  if (out.join('').toLowerCase() !== lower) return [clean];
  return out;
}

export const countSyllables = (w) => splitSyllables(w).length;

/** Sílabas com acento preservado + forma normalizada (para comparação). */
export function syllableParts(word) {
  return splitSyllables(word).map((s) => ({ text: s, key: s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }));
}

/** Verifica se a palavra contém um dígrafo/conteúdo específico. */
export function graphemes(word) {
  const w = String(word).toLowerCase();
  const found = [];
  const pairs = ['ch', 'lh', 'nh', 'rr', 'ss', 'qu', 'gu', 'ão', 'ãe', 'õe', 'am', 'an', 'em', 'en', 'im', 'in', 'om', 'on', 'um', 'un', 'br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'vr', 'bl', 'cl', 'fl', 'gl', 'pl'];
  for (const p of pairs) if (w.includes(p)) found.push(p);
  return found;
}

/** Última sílaba (para rimas). */
export const lastSyllable = (w) => splitSyllables(w).slice(-1)[0] || '';

export const firstSyllable = (w) => splitSyllables(w)[0] || '';

/** Terminação usada para rima (a partir da vogal tônica aproximada). */
export function rhymeKey(word) {
  const s = splitSyllables(word);
  const last = s[s.length - 1] || '';
  return last.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function hasOpenAccent(word) {
  return /[áéíóúâêôãõà]/i.test(word);
}
