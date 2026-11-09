/* Utilitários gerais: DOM, texto, aleatoriedade determinística, datas. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Cria elementos. attrs: class, text, html, dataset, style, on:<evento>, ...atributos */
export function el(tag, attrs = null, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (k.startsWith('on:') && typeof v === 'function') node.addEventListener(k.slice(3), v);
      else if (k === 'value') node.value = v;
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
  }
  for (const c of children.flat(3)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const pct = (a, b) => (b > 0 ? a / b : 0);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const unique = (arr) => [...new Set(arr)];
export const sum = (arr) => arr.reduce((a, b) => a + b, 0);
export const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);

/* ---------- aleatoriedade determinística (lições estáveis) ---------- */
export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'string' ? hashStr(seed) : (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const pick = (arr, rand = Math.random) => arr[Math.floor(rand() * arr.length)];
export function sample(arr, n, rand = Math.random) {
  return shuffle(arr, rand).slice(0, Math.min(n, arr.length));
}
export function pickManyDistinct(arr, n, rand = Math.random) {
  return sample(unique(arr), n, rand);
}

/* ---------- texto ---------- */
const ACCENTS = { á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o', ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c', ñ: 'n' };

export function stripAccents(s) {
  return String(s ?? '').toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/g, (c) => ACCENTS[c] || c);
}
/** Normaliza para comparação: minúsculas, sem acento, só letras/números e espaços. */
export function norm(s) {
  return stripAccents(s).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
/**
 * Chave fonética simples para leitura em voz alta. No fim da palavra:
 * L soa como U ("sol" ~ "sou"); R costuma sumir ("mar" ~ "ma");
 * O e E finais soam como U e I ("gato" ~ "gatu", "leite" ~ "leiti").
 * Serve para aceitar o que o reconhecedor escreve, sem afrouxar palavras diferentes.
 */
export function readingKey(s) {
  return norm(s).split(' ').filter(Boolean).map((w) => {
    let x = w;
    if (x === 'o') return 'u';
    if (x === 'e') return 'i';
    if (x.length > 1) {
      x = x.replace(/l$/, 'u').replace(/r$/, '');
      x = x.replace(/o$/, 'u').replace(/e$/, 'i');
    }
    return x;
  }).join(' ');
}
export const words = (s) => norm(s).split(' ').filter(Boolean);
export function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
export function plural(n, s, p) { return n === 1 ? s : p || s + 's'; }

/** Distância de Levenshtein (palavras isoladas). */
export function lev(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Alinha a fala reconhecida ao texto-alvo usando LCS sobre palavras normalizadas.
 * Tolerante a inserções/omissões do reconhecedor.
 * @returns {{accuracy:number, matched:number, total:number, missed:string[], said:string[]}}
 */
export function alignReading(target, transcript) {
  const T = words(target);
  const S = words(transcript);
  const TK = T.map((w) => readingKey(w));
  const SK = S.map((w) => readingKey(w));
  const wordMatch = (i, j) => {
    if (T[i] === S[j] || TK[i] === SK[j]) return true;
    const minLen = Math.min(TK[i].length, SK[j].length);
    if (minLen >= 4 && lev(TK[i], SK[j]) <= 1) return true;
    return false;
  };
  const n = T.length, m = S.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = wordMatch(i, j) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const matchedIdx = new Set();
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (wordMatch(i, j)) { matchedIdx.add(i); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  const missed = T.filter((_, idx) => !matchedIdx.has(idx));
  return {
    accuracy: n ? matchedIdx.size / n : 0,
    matched: matchedIdx.size,
    total: n,
    missed,
    said: S,
  };
}

/* ---------- datas ---------- */
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
export function daysBetween(a, b) {
  const d1 = new Date(a); const d2 = new Date(b);
  d1.setHours(0, 0, 0, 0); d2.setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / 86400000);
}
export function fmtMinutes(sec) {
  const m = Math.floor(sec / 60);
  if (m < 1) return `${Math.max(1, Math.round(sec))}s`;
  return `${m} min`;
}

/* ---------- persistência segura ---------- */
export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.warn('Falha ao salvar', e); return false; }
}
export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
