/* Caça-palavras: grade 8×8 determinística e jogo por toque. */
import { el, rng, shuffle, stripAccents, norm } from './utils.js';
import { speak, sfx, haptic } from './audio.js';
import * as store from './store.js';
import { UNITS } from './curriculum.js';
import { wordsOfUnit } from './content.js';
import { clearScreen, tabbar, confetti } from './ui.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_SIZE = 8;
const WORD_COUNT = 5;
const FOUND = '✅';
const EMPTY = '○';

/* =========================== grade determinística =========================== */

const cellKey = (r, c) => `${r},${c}`;

function toCell(value) {
  if (Array.isArray(value)) {
    const r = Number(value[0]);
    const c = Number(value[1]);
    return Number.isInteger(r) && Number.isInteger(c) ? [r, c] : null;
  }
  if (value && typeof value === 'object') {
    const r = Number(value.r ?? value.row);
    const c = Number(value.c ?? value.col);
    return Number.isInteger(r) && Number.isInteger(c) ? [r, c] : null;
  }
  return null;
}

/** Expande as pontas da seleção em todas as células da linha/coluna. */
function selectionLine(cells) {
  const list = (Array.isArray(cells) ? cells : []).map(toCell).filter(Boolean);
  if (list.length < 2) return null;
  const [r0, c0] = list[0];
  const [r1, c1] = list[list.length - 1];
  if (r0 !== r1 && c0 !== c1) return null;
  const dr = Math.sign(r1 - r0);
  const dc = Math.sign(c1 - c0);
  const len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
  const line = [];
  for (let i = 0; i <= len; i++) line.push([r0 + dr * i, c0 + dc * i]);
  const allowed = new Set(line.map(([r, c]) => cellKey(r, c)));
  if (!list.every(([r, c]) => allowed.has(cellKey(r, c)))) return null;
  return line;
}

function sameLine(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

/**
 * Palavra que ocupa exatamente as células selecionadas (horizontal ou vertical,
 * nos dois sentidos). Recebe as pontas ou a sequência inteira; devolve a palavra
 * original do placement, ou null.
 */
export function findWordAt(placements, cells) {
  const line = selectionLine(cells);
  if (!line || line.length < 2) return null;
  for (const placement of Array.isArray(placements) ? placements : []) {
    const pc = (placement?.cells || []).map(toCell).filter(Boolean);
    if (pc.length !== line.length) continue;
    if (sameLine(pc, line) || sameLine(pc.slice().reverse(), line)) return placement.word;
  }
  return null;
}

function fits(key, grid, r, c, dr, dc) {
  for (let i = 0; i < key.length; i++) {
    const current = grid[r + dr * i][c + dc * i];
    if (current && current !== key[i]) return false;
  }
  return true;
}

function writeWord(key, grid, r, c, dr, dc) {
  const cells = [];
  for (let i = 0; i < key.length; i++) {
    const rr = r + dr * i;
    const cc = c + dc * i;
    grid[rr][cc] = key[i];
    cells.push([rr, cc]);
  }
  return cells;
}

/** Tenta posições aleatórias e, se precisar, varre a grade inteira. */
function placeWord(key, grid, n, rand) {
  const dirs = [[0, 1], [1, 0]]; // horizontal, vertical (nunca diagonal)
  for (let attempt = 0; attempt < 240; attempt++) {
    const [dr, dc] = dirs[rand() < 0.5 ? 0 : 1];
    const maxR = n - (dr ? key.length : 1);
    const maxC = n - (dc ? key.length : 1);
    const r = Math.floor(rand() * (maxR + 1));
    const c = Math.floor(rand() * (maxC + 1));
    if (fits(key, grid, r, c, dr, dc)) return writeWord(key, grid, r, c, dr, dc);
  }
  for (const [dr, dc] of dirs) {
    const maxR = n - (dr ? key.length : 1);
    const maxC = n - (dc ? key.length : 1);
    for (let r = 0; r <= maxR; r++) {
      for (let c = 0; c <= maxC; c++) {
        if (fits(key, grid, r, c, dr, dc)) return writeWord(key, grid, r, c, dr, dc);
      }
    }
  }
  return null;
}

/**
 * Monta a grade. Palavras com menos de 3 letras, mais de `size`, repetidas,
 * com espaço/hífen ou que não couberem são ignoradas. Letras iguais podem
 * cruzar; letras diferentes nunca se sobrepõem.
 * @param {string[]} words
 * @param {number} size
 * @param {string} seed
 * @returns {{grid: string[][], placements: {word: string, cells: number[][]}[]}}
 */
export function buildGrid(words = [], size = DEFAULT_SIZE, seed = 'ws') {
  const n = Math.max(3, Math.min(20, Math.floor(Number(size)) || DEFAULT_SIZE));
  const rand = rng(`${seed}:${n}`);
  const grid = Array.from({ length: n }, () => Array(n).fill(''));

  const seen = new Set();
  const candidates = [];
  for (const raw of Array.isArray(words) ? words : []) {
    const word = String(raw ?? '').trim();
    const plain = stripAccents(word);
    if (!/^[a-z]+$/.test(plain)) continue; // só letras: sem espaço, hífen ou número
    if (plain.length < 3 || plain.length > n) continue;
    const key = plain.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ word, key });
  }

  const placements = [];
  for (const { word, key } of shuffle(candidates, rand)) {
    const cells = placeWord(key, grid, n, rand);
    if (cells) placements.push({ word, cells });
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(rand() * ALPHABET.length)];
    }
  }
  return { grid, placements };
}

/* =============================== tela do jogo =============================== */

const STYLE_ID = 'ws-style';
const WS_CSS = `
.ws-wrap { display: grid; grid-template-columns: minmax(0, 430px) minmax(160px, 200px); gap: 18px; justify-content: center; align-items: start; }
.ws-board { width: 100%; max-width: 430px; display: flex; flex-direction: column; gap: 10px; }
.ws-status { min-height: 24px; padding: 8px 12px; border-radius: 12px; background: var(--sun-soft); color: var(--ink); font-size: .88em; font-weight: 700; transition: background .2s; }
.ws-status[data-kind="ok"] { background: var(--green-soft); color: #1e7a49; }
.ws-status[data-kind="err"] { background: var(--red-soft, #ffe4e0); color: #a83327; }
.ws-grid { display: grid; gap: 6px; padding: 8px; background: var(--card); border: 2px solid var(--line-2); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); }
.ws-cell {
  display: flex; align-items: center; justify-content: center;
  width: 100%; min-width: 0; aspect-ratio: 1; padding: 0;
  border: 2px solid var(--line-2); border-radius: 10px;
  background: var(--card); color: var(--ink);
  font-family: var(--font); font-weight: 700; font-size: clamp(17px, 4.2vw, 24px); line-height: 1;
  cursor: pointer; user-select: none; -webkit-user-select: none; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background .12s, color .12s, border-color .12s, transform .12s;
}
.ws-cell:active { transform: scale(.94); }
.ws-cell.sel { background: var(--teal); border-color: var(--teal); color: #fff; transform: scale(.94); box-shadow: 0 0 0 3px rgba(18, 156, 142, .25); }
.ws-cell.found { background: var(--green-soft); border-color: #9fd9b6; color: #186b41; }
.ws-cell:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }
.ws-words { display: flex; flex-direction: column; gap: 8px; padding: 12px; background: var(--card); border: 2px solid var(--line-2); border-radius: var(--radius-sm); }
.ws-word { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 2px solid transparent; border-radius: 10px; background: var(--sun-soft); color: var(--ink); font-weight: 700; letter-spacing: .02em; }
.ws-word__check { width: 1.2em; text-align: center; font-size: .95em; line-height: 1; }
.ws-word.done { background: var(--green-soft); border-color: #b7e6cb; color: #1e7a49; }
.ws-win { border: 2px solid #b7e6cb; background: linear-gradient(180deg, #fbfefc, var(--green-soft)); }
@media (max-width: 720px) {
  .ws-wrap { grid-template-columns: minmax(0, 1fr); }
  .ws-board { margin: 0 auto; }
  .ws-words { flex-direction: row; flex-wrap: wrap; }
  .ws-words .section-title { flex: 1 0 100%; }
  .ws-word { flex: 1 1 120px; justify-content: center; }
}
`;

function ensureStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = WS_CSS;
  document.head.append(style);
}

function eligible(word, maxLen = 8) {
  const plain = stripAccents(String(word ?? ''));
  return plain.length >= 3 && plain.length <= maxLen && /^[a-z]+$/.test(plain);
}

/** Palavras da unidade atual; completa com u2 (e, no limite, com outras). */
function pickWords(rec, count = WORD_COUNT, maxLen = 8) {
  const out = [];
  const seen = new Set();
  const add = (list) => {
    for (const word of shuffle(list)) {
      if (out.length >= count) return;
      if (!eligible(word, maxLen)) continue;
      const key = norm(word);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(word);
    }
  };
  add(wordsOfUnit(rec.unitId).map((w) => w.w));
  if (out.length < count) add(wordsOfUnit('u2').map((w) => w.w));
  if (out.length < count) {
    for (const unit of UNITS) {
      if (out.length >= count) break;
      add(wordsOfUnit(unit.id).map((w) => w.w));
    }
  }
  return out;
}

/**
 * Tela do caça-palavras. Funciona 100% por toque (sem microfone).
 * @param {{bonus?: boolean}} options
 */
export function renderSearch({ bonus = false } = {}) {
  ensureStyle();
  const screen = clearScreen();
  tabbar('home');

  const rec = store.recommendation(UNITS);
  // em telas estreitas, grade 6×6 com 4 palavras curtas (células ≥ 44 px);
  // no tablet, 8×8 com 5 palavras
  const compact = typeof window !== 'undefined' && window.innerWidth < 460;
  const size = compact ? 6 : 8;
  const count = compact ? 4 : WORD_COUNT;
  const maxLen = compact ? 6 : 8;
  const picked = pickWords(rec, count, maxLen);
  const seed = () => `ws:${rec.unitId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
  let puzzle = buildGrid(picked, size, seed());
  for (let i = 0; i < 6 && puzzle.placements.length < picked.length; i++) {
    puzzle = buildGrid(picked, size, seed());
  }

  const placements = puzzle.placements;
  const total = placements.length;
  const repaintPoints = bonus ? '+40 XP' : '+25 XP';

  const wrap = el('div', { class: 'wrap stack' });
  const score = el('div', { class: 'pill pill--star', text: `0/${total}` });
  wrap.append(el('div', { class: 'row' },
    el('button', {
      class: 'btn--back', 'aria-label': 'Voltar ao início',
      'on:click': () => { location.hash = '#/'; },
    }, '←'),
    el('div', { class: 'grow' },
      el('div', { class: 'topbar__title', text: 'Caça-palavras' }),
      el('div', { class: 'small muted', text: `Encontre as ${picked.length} palavras escondidas` })),
    score));

  const status = el('div', {
    class: 'ws-status', role: 'status', 'aria-live': 'polite',
    text: 'Toque na primeira letra e depois na última.',
  });
  const gridEl = el('div', {
    class: 'ws-grid', role: 'grid', 'aria-label': 'Grade de caça-palavras',
    style: { gridTemplateColumns: `repeat(${puzzle.grid.length}, minmax(0, 1fr))` },
  });

  const cells = new Map();
  for (let r = 0; r < puzzle.grid.length; r++) {
    for (let c = 0; c < puzzle.grid.length; c++) {
      const letter = puzzle.grid[r][c];
      const cell = el('button', {
        class: 'ws-cell', type: 'button', text: letter,
        'data-r': String(r), 'data-c': String(c),
        'aria-label': `Linha ${r + 1}, coluna ${c + 1}: ${letter}`,
        'on:click': () => tap(r, c),
      });
      cells.set(cellKey(r, c), cell);
      gridEl.append(cell);
    }
  }

  const wordsCard = el('div', { class: 'ws-words' });
  wordsCard.append(el('div', { class: 'section-title', text: 'Palavras' }));
  const wordEls = new Map();
  for (const placement of placements) {
    const item = el('div', { class: 'ws-word' },
      el('span', { class: 'ws-word__check', text: EMPTY }),
      el('span', { class: 'ws-word__text', text: placement.word }));
    wordEls.set(placement.word, item);
    wordsCard.append(item);
  }

  const win = el('div', { class: 'card ws-win', hidden: true },
    el('div', { class: 'row', style: { gap: '10px' } },
      el('div', { text: '🎉', style: { fontSize: '2em' } }),
      el('div', { class: 'grow' },
        el('div', { class: 'card__title', text: 'Você encontrou todas!' }),
        el('div', { class: 'small muted', text: 'Procurar as letras ajuda a guardar as palavras na memória.' }))),
    el('div', { class: 'row', style: { gap: '10px', marginTop: '12px', flexWrap: 'wrap' } },
      el('button', {
        class: 'btn btn--primary grow',
        'on:click': () => renderSearch({ bonus }),
      }, 'Jogar outra'),
      el('button', {
        class: 'btn btn--soft grow',
        'on:click': () => { location.hash = '#/'; },
      }, 'Voltar'),
      el('div', { class: 'pill pill--star', text: repaintPoints })));

  wrap.append(el('div', { class: 'ws-wrap' },
    el('div', { class: 'ws-board' }, status, gridEl),
    wordsCard));
  wrap.append(win);
  screen.append(wrap);

  let start = null;
  let finished = false;
  const found = new Set();

  function setStatus(message, kind = '') {
    status.textContent = message;
    if (kind) status.dataset.kind = kind;
    else delete status.dataset.kind;
  }

  function paintSel(selected) {
    cells.forEach((cell) => cell.classList.remove('sel'));
    for (const [r, c] of selected) cells.get(cellKey(r, c))?.classList.add('sel');
  }

  function markFound(word) {
    const placement = placements.find((p) => p.word === word);
    if (!placement) return;
    found.add(word);
    for (const [r, c] of placement.cells) cells.get(cellKey(r, c))?.classList.add('found');
    const item = wordEls.get(word);
    if (item) {
      item.classList.add('done');
      const check = item.querySelector('.ws-word__check');
      if (check) check.textContent = FOUND;
    }
    score.textContent = `${found.size}/${total}`;
    sfx('ok');
    haptic(16);
    speak(word);
    setStatus(`Achou: ${word.toUpperCase()}!`, 'ok');
    if (found.size === total) finish();
  }

  function finish() {
    finished = true;
    start = null;
    paintSel([]);
    confetti(24);
    sfx('great');
    setStatus('Você encontrou todas as palavras!', 'ok');
    speak('Você encontrou todas as palavras!');
    store.awardBonus(bonus ? 40 : 25);
    win.hidden = false;
    win.scrollIntoView?.({ block: 'nearest' });
  }

  function tap(r, c) {
    if (finished) return;
    sfx('tap');
    haptic(6);
    if (!start) {
      start = [r, c];
      paintSel([start]);
      setStatus('Agora toque na última letra, na mesma linha ou coluna.');
      return;
    }
    if (start[0] === r && start[1] === c) {
      start = null;
      paintSel([]);
      setStatus('Toque na primeira letra de uma palavra.');
      return;
    }
    if (start[0] !== r && start[1] !== c) {
      start = [r, c];
      paintSel([start]);
      setStatus('Escolha a outra ponta na mesma linha ou coluna.');
      return;
    }
    const word = findWordAt(placements, [start, [r, c]]);
    start = null;
    paintSel([]);
    if (!word) {
      setStatus('Tente de novo', 'err');
      sfx('soft');
      haptic(30);
      return;
    }
    if (found.has(word)) {
      setStatus('Essa você já achou!');
      sfx('soft');
      return;
    }
    markFound(word);
  }
}
