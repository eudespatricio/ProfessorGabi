/* Estado persistente, progresso, revisão espaçada e recompensas. */
import { loadJSON, saveJSON, clamp, dayKey, daysBetween, addDays, shuffle } from './utils.js';

const KEY = 'gabi.state.v1';
const SRS_DAYS = [0, 1, 3, 7, 16, 35];
export const STATE_VERSION = 2;
const HISTORY_MAX = 300;

export function defaultState() {
  return {
    version: STATE_VERSION,
    createdAt: Date.now(),
    onboarded: false,
    child: { name: '', avatar: '🦊' },
    settings: {
      rate: 0.9,
      pitch: 1,
      voiceURI: '',
      muted: false,
      readScale: 1,
      reduceMotion: false,
      sound: true,
      sessionTarget: 10,
      freeMode: false,
      pin: '',
      llm: { enabled: false, baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', key: '' },
    },
    progress: {
      xp: 0,
      coins: 0,
      streak: { last: '', days: 0, best: 0 },
      startUnit: 'u1',
      units: {},
      lessons: {},
    },
    skills: {},
    srs: {},
    reading: { alone: 0, helped: 0, syllables: 0 },
    errors: {},
    stickers: [],
    days: {},
    history: [],
    diagnostic: null,
  };
}

export const state = defaultState();

/** Migra qualquer backup/estado antigo para a versão atual. Nunca lança. */
export function migrate(saved) {
  if (!saved || typeof saved !== 'object') return null;
  const s = { ...saved };
  s.version = STATE_VERSION;
  if (Array.isArray(s.history) && s.history.length > HISTORY_MAX) s.history = s.history.slice(-HISTORY_MAX);
  if (!s.reading || typeof s.reading !== 'object') s.reading = { alone: 0, helped: 0, syllables: 0 };
  if (s.diagnostic === undefined) s.diagnostic = null;
  return s;
}

export function load() {
  const saved = migrate(loadJSON(KEY, null));
  if (!saved) return state;
  // merge raso por seção para tolerar versões antigas
  const base = defaultState();
  for (const k of Object.keys(base)) {
    if (saved[k] == null) continue;
    if (typeof base[k] === 'object' && !Array.isArray(base[k])) {
      state[k] = { ...base[k], ...saved[k] };
    } else state[k] = saved[k];
  }
  state.settings = { ...base.settings, ...(saved.settings || {}) };
  state.settings.llm = { ...base.settings.llm, ...((saved.settings || {}).llm || {}) };
  state.progress = { ...base.progress, ...(saved.progress || {}) };
  state.progress.streak = { ...base.progress.streak, ...((saved.progress || {}).streak || {}) };
  return state;
}

let saveTimer = null;
export function save(immediate = false) {
  if (state.history.length > HISTORY_MAX) state.history = state.history.slice(-HISTORY_MAX);
  if (saveTimer) clearTimeout(saveTimer);
  if (immediate) { saveJSON(KEY, state); return; }
  saveTimer = setTimeout(() => saveJSON(KEY, state), 400);
}

/* ---------- dia / minutos ---------- */
function today() {
  const k = dayKey();
  state.days[k] = state.days[k] || { sec: 0, ex: 0, ok: 0, lessons: 0 };
  return state.days[k];
}

export function addTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  today().sec = Math.min(today().sec + seconds, 7200);
  save();
}

export function todayMinutes() {
  return Math.round((state.days[dayKey()]?.sec || 0) / 60);
}

export function todayStats() {
  return state.days[dayKey()] || { sec: 0, ex: 0, ok: 0, lessons: 0 };
}

export function daysSummary(n = 14) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = dayKey(addDays(new Date(), -i));
    out.push({ key: k, min: Math.round((state.days[k]?.sec || 0) / 60) });
  }
  return out;
}

/* ---------- XP / nível ---------- */
export const levelFromXp = (xp) => Math.floor(xp / 100) + 1;
export const level = () => levelFromXp(state.progress.xp);
export const xpToNext = () => 100 - (state.progress.xp % 100);

function addXp(n) {
  const before = level();
  state.progress.xp += n;
  state.progress.coins += Math.round(n / 2);
  if (level() > before) return true;
  return false;
}

/* ---------- tentativas ---------- */
export function recordAttempt({ unitId, lessonIndex, item, ok, firstTry = true, ms = 0, helped = false, selfReported = false }) {
  const skill = item.skill || 'leitura';
  const word = item.word;
  const s = state.skills[skill] || (state.skills[skill] = { ok: 0, n: 0 });
  s.n++;
  if (ok) s.ok++;

  if (word) {
    const cur = state.srs[word] || { box: 0, due: dayKey(), lapses: 0, seen: 0, ok: 0 };
    cur.seen++;
    if (ok) {
      cur.ok++;
      cur.box = clamp((cur.box || 0) + 1, 0, 5);
    } else {
      cur.box = 0;
      cur.lapses++;
      state.errors[word] = (state.errors[word] || 0) + 1;
    }
    cur.due = dayKey(addDays(new Date(), SRS_DAYS[cur.box] ?? 1));
    state.srs[word] = cur;
  }

  const d = today();
  d.ex++;
  if (ok) d.ok++;

  const gained = ok ? 10 + (firstTry ? 5 : 0) : 2;
  const levelUp = addXp(gained);

  // unidade
  const u = state.progress.units[unitId] || (state.progress.units[unitId] = { attempts: 0, correct: 0, first: 0 });
  u.attempts++;
  if (ok) u.correct++;
  if (ok && firstTry) u.first = (u.first || 0) + 1;

  state.history.push({ ts: Date.now(), unitId, lessonIndex, type: item.type, word, ok, helped, ms, selfReported });
  if (state.history.length > HISTORY_MAX) state.history = state.history.slice(-HISTORY_MAX);

  updateStreak();
  lastNewSticker = null;
  checkStickers({ ok, item, levelUp });
  save();
  return { gained, levelUp, sticker: lastNewSticker };
}

let lastNewSticker = null;

function updateStreak() {
  const k = dayKey();
  const st = state.progress.streak;
  if (st.last === k) return;
  if (!st.last) st.days = 1;
  else {
    const gap = daysBetween(st.last, k);
    st.days = gap === 1 ? st.days + 1 : 1;
  }
  st.last = k;
  st.best = Math.max(st.best || 0, st.days);
}

/* ---------- lições ---------- */
export function lessonKey(unitId, idx) { return `${unitId}:${idx}`; }

export function lessonRecord(unitId, idx) {
  return state.progress.lessons[lessonKey(unitId, idx)] || null;
}

export function markLessonComplete(unitId, idx, { stars = 1, total = 0, correct = 0, durationSec = 0, textId = null }) {
  const k = lessonKey(unitId, idx);
  const prev = state.progress.lessons[k];
  state.progress.lessons[k] = {
    stars: Math.max(stars, prev?.stars || 0),
    best: Math.max(correct, prev?.best || 0),
    total: total || prev?.total || 0,
    doneAt: Date.now(),
    plays: (prev?.plays || 0) + 1,
    textId: textId || prev?.textId || null,
  };
  today().lessons++;
  if (durationSec) addTime(durationSec);
  save(true);
}

export function unitProgress(unitId, unit) {
  const lessons = unit?.lessons || 4;
  let done = 0, stars = 0, correct = 0, total = 0;
  for (let i = 0; i < lessons; i++) {
    const r = lessonRecord(unitId, i);
    if (r) { done++; stars += r.stars || 0; correct += r.best || 0; total += r.total || 0; }
  }
  const agg = state.progress.units[unitId] || { attempts: 0, correct: 0, first: 0 };
  const rawAcc = agg.attempts ? (agg.first || 0) / agg.attempts : 0;
  const conf = Math.min(1, agg.attempts / 8); // poucas tentativas não contam como domínio
  const cover = done / lessons;
  const mastery = Math.round((0.55 * rawAcc * conf + 0.45 * cover) * 100);
  return { done, lessons, stars, accuracy: rawAcc, mastery, complete: done >= lessons, maxStars: lessons * 3, attempts: agg.attempts };
}

export function currentUnitId() {
  const startIdx = Math.max(0, Math.floor(Number(state.progress.startUnitNum ?? 0)));
  return state.progress.startUnit || 'u1';
}

export function nextLessonFor(unitId, unit) {
  for (let i = 0; i < (unit?.lessons || 4); i++) if (!lessonRecord(unitId, i)) return i;
  return 0;
}

/** Próxima atividade recomendada (unidade atual ou a primeira não dominada). */
export function recommendation(units) {
  const startId = state.progress.startUnit || 'u1';
  const startIdx = units.findIndex((u) => u.id === startId);
  for (let i = Math.max(0, startIdx); i < units.length; i++) {
    const u = units[i];
    if (!isUnitUnlocked(u.id, units)) continue;
    const p = unitProgress(u.id, u);
    if (!p.complete) return { unitId: u.id, lessonIndex: nextLessonFor(u.id, u), unit: u, progress: p };
  }
  // tudo concluído: revisar a última unidade
  const last = units[units.length - 1];
  return { unitId: last.id, lessonIndex: nextLessonFor(last.id, last), unit: last, progress: unitProgress(last.id, last) };
}

export function isUnitUnlocked(unitId, units) {
  if (state.settings.freeMode) return true;
  const idx = units.findIndex((u) => u.id === unitId);
  if (idx < 0) return false;
  const startId = state.progress.startUnit || 'u1';
  const startIdx = units.findIndex((u) => u.id === startId);
  if (idx <= Math.max(0, startIdx)) return true;
  const prev = units[idx - 1];
  const p = unitProgress(prev.id, prev);
  const minLessons = Math.max(2, Math.ceil(prev.lessons * 0.7));
  return p.done >= minLessons && p.accuracy >= 0.6;
}

/* ---------- revisão espaçada ---------- */
export function dueWords(limit = 8) {
  const k = dayKey();
  return Object.entries(state.srs)
    .filter(([, v]) => v.due <= k)
    .sort((a, b) => (a[1].box - b[1].box) || (a[1].due < b[1].due ? -1 : 1))
    .slice(0, limit)
    .map(([w]) => w);
}

export function reviewDueCount() {
  const k = dayKey();
  return Object.values(state.srs).filter((v) => v.due <= k).length;
}

/** Registra treino de leitura guiada (sílaba a sílaba). */
export function recordGuided(word, { ok = false, helped = true, syllables = 0 } = {}) {
  if (!word) return;
  const cur = state.srs[word] || (state.srs[word] = { box: 0, due: dayKey(), lapses: 0, seen: 0, ok: 0 });
  cur.guided = (cur.guided || 0) + 1;
  if (ok && !helped) {
    cur.seen = (cur.seen || 0) + 1;
    cur.ok = (cur.ok || 0) + 1;
    cur.box = clamp((cur.box || 0) + 1, 0, 5);
    cur.due = dayKey(addDays(new Date(), SRS_DAYS[cur.box] ?? 1));
  } else {
    state.errors[word] = (state.errors[word] || 0) + 1;
  }
  const r = state.reading || (state.reading = { alone: 0, helped: 0, syllables: 0 });
  if (ok && !helped) r.alone++;
  else r.helped++;
  r.syllables += syllables || 0;
  save();
}

export function weakWords(limit = 12) {  return Object.entries(state.errors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w, n]) => ({ word: w, errors: n, srs: state.srs[w] || null }));
}

/* ---------- adesivos ---------- */
export function awardSticker(id) {
  if (!id || state.stickers.includes(id)) return false;
  state.stickers.push(id);
  lastNewSticker = id;
  save(true);
  return true;
}

function checkStickers({ ok, item, levelUp }) {
  const st = state.stickers;
  const hist = state.history;
  if (hist.length >= 1) awardSticker('primeira');
  if (ok && item?.type === 'read-word') {
    const reads = hist.filter((h) => h.type === 'read-word' && h.ok).length;
    if (reads >= 10) awardSticker('dez');
    if (reads >= 100) awardSticker('cem');
  }
  if (ok && ['count-syllables', 'initial-syllable', 'rhyme', 'same-initial', 'blend'].includes(item?.type)) {
    const n = hist.filter((h) => ['count-syllables', 'initial-syllable', 'rhyme', 'same-initial', 'blend'].includes(h.type) && h.ok).length;
    if (n >= 20) awardSticker('silabas');
  }
  if (ok && item?.type === 'm-pb') {
    const n = hist.filter((h) => h.type === 'm-pb' && h.ok).length;
    if (n >= 10) awardSticker('detetive');
  }
  if (state.progress.streak.days >= 3) awardSticker('tresdias');
  if (state.progress.streak.days >= 7) awardSticker('setedias');
  if (levelUp && level() >= 5) awardSticker('nivel5');
}

export function checkUnitStickers(units) {
  const done = units.filter((u) => unitProgress(u.id, u).complete).length;
  if (done >= 5) awardSticker('coruja');
  const texts = Object.values(state.progress.lessons).filter((l) => l.textId).length;
  if (texts >= 1) awardSticker('historia');
}

/* ---------- diagnóstico ---------- */
export function setPlacement(unitId, results) {
  state.progress.startUnit = unitId;
  state.diagnostic = {
    at: Date.now(),
    unitId,
    accuracy: results.length ? results.filter((r) => r.ok).length / results.length : 0,
    results: results.map((r) => ({ type: r.type, skill: r.skill, ok: r.ok })),
  };
  save(true);
}

/* ---------- configurações ---------- */
export function setSetting(path, value) {
  const parts = path.split('.');
  let obj = state.settings;
  for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]] || (obj[parts[i]] = {});
  obj[parts[parts.length - 1]] = value;
  save(true);
}

/* ---------- backup ---------- */
export function exportJSON() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString(), app: 'Gabi' }, null, 2);
}

export function importJSON(text) {
  const data = migrate(JSON.parse(text));
  if (!data || typeof data !== 'object' || !data.progress) throw new Error('Arquivo inválido');
  const base = defaultState();
  const merged = { ...base, ...data };
  merged.settings = { ...base.settings, ...(data.settings || {}) };
  merged.settings.llm = { ...base.settings.llm, ...((data.settings || {}).llm || {}) };
  for (const k of Object.keys(merged)) state[k] = merged[k];
  save(true);
}

export function resetProgress() {
  const keep = { settings: state.settings, child: state.child, onboarded: state.onboarded };
  Object.assign(state, defaultState(), keep);
  save(true);
}

/* ---------- níveis por fase, chefe e baú ---------- */
export function unitLevel(unitId) {
  const u = state.progress.units[unitId];
  return (u && u.level) || 1;
}

/** Sobe de nível com ≥80% de acerto; desce com <50%. */
export function adjustUnitLevel(unitId, accuracy) {
  const u = state.progress.units[unitId] || (state.progress.units[unitId] = { attempts: 0, correct: 0, first: 0 });
  const cur = u.level || 1;
  if (accuracy >= 0.8 && cur < 3) u.level = cur + 1;
  else if (accuracy < 0.5 && cur > 1) u.level = cur - 1;
  save();
  return u.level || 1;
}

export function bossRecord(unitId, unit) {
  return lessonRecord(unitId, unit?.lessons || 4);
}

export function chestAvailable() {
  const d = state.days[dayKey()];
  return !!d && (d.lessons || 0) >= 1 && state.progress.chestDay !== dayKey();
}

export function claimChest() {
  state.progress.chestDay = dayKey();
  save(true);
}

export function resetAll() {
  Object.assign(state, defaultState());
  save(true);
}

/**
 * Recompensa em bloco por um jogo concluído (XP + moedas).
 */
export function awardBonus(points = 20) {
  const before = level();
  state.progress.xp += Math.max(0, points);
  state.progress.coins += Math.round(points / 2);
  save();
  return level() > before;
}