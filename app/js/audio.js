/* Voz da Gabi (TTS pt-BR) e efeitos sonoros sintetizados (sem arquivos). */
import { state } from './store.js';

let voices = [];
let seq = 0;
let ctx = null;
let unlocked = false;
let lastSpeechError = null;

/* Diagnóstico de áudio: aparece em window.__gabi.audio() e na Área dos pais.
   Ajuda a saber, no tablet, se a fala veio do clipe (ElevenLabs) ou do TTS. */
export const clipStats = {
  clipAttempts: 0,
  opusOk: 0,
  mp3Ok: 0,
  opusFail: 0,
  mp3Fail: 0,
  noClip: 0,
  indexFail: 0,
  ttsOk: 0,
  ttsFail: 0,
  last: null,
};

function note(detail) {
  clipStats.last = { ...detail, at: Date.now() };
}

export function audioDiagnostics() {
  const all = window.speechSynthesis?.getVoices?.() || voices;
  const pt = all.filter(isBrazilianVoice);
  const ptPt = all.filter((v) => normalizeVoiceLang(v.lang) === 'pt-pt' || /portugal|europeu|european/i.test(String(v.name || '')));
  return {
    ttsSupported: ttsSupported(),
    opusSupported,
    unlocked,
    voices: all.length,
    ptVoices: pt.length,
    ptPtVoices: ptPt.length,
    voice: pickVoice()?.name || '',
    lastSpeechError,
    clips: { ...clipStats },
  };
}

export function initAudio() {
  loadClipIndex();
  if (opusSupported) loadOpusIndex();
  if (!('speechSynthesis' in window)) return;
  const refresh = () => { voices = window.speechSynthesis.getVoices() || []; };
  refresh();
  window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
  setTimeout(refresh, 400);
  setTimeout(refresh, 1600);
}

export function listVoices() {
  if (!voices.length) voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.filter(isBrazilianVoice);
}

function refreshVoices() {
  voices = window.speechSynthesis?.getVoices?.() || [];
  return voices;
}

/** Espera o navegador carregar a lista de vozes (no Chrome ela chega atrasada). */
export function ensureVoices(timeout = 1600) {
  if (!ttsSupported()) return Promise.resolve([]);
  if (voices.length) return Promise.resolve(voices);
  refreshVoices();
  if (voices.length) return Promise.resolve(voices);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      refreshVoices();
      resolve(voices);
    };
    try { window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true }); } catch { /* ignore */ }
    setTimeout(finish, timeout);
  });
}

/** Normaliza pt_BR/pt-BR e pt_PT/pt-PT para o mesmo formato. */
export function normalizeVoiceLang(lang) {
  return String(lang || '').toLowerCase().replace(/_/g, '-');
}

/** Voz brasileira? pt-PT/Portugal é explicitamente rejeitada. */
export function isBrazilianVoice(v) {
  if (!v) return false;
  const lang = normalizeVoiceLang(v.lang);
  const name = String(v.name || '');
  if (lang === 'pt-pt' || /portugal|europeu|european/i.test(name)) return false;
  if (lang.startsWith('pt-br')) return true;
  if (lang === 'pt' && /brasil|brazil|português do brasil|portugues do brasil/i.test(name)) return true;
  return false;
}

function voiceScore(v) {
  const lang = normalizeVoiceLang(v.lang);
  const name = String(v.name || '');
  let s = 0;
  if (lang.startsWith('pt-br')) s += 72;
  if (/natural|neural|online/i.test(name)) s += 45;
  if (/francisca|thalita|beatriz|yara|maria|luciana/i.test(name)) s += 10;
  if (/google/i.test(name)) s += 8;
  if (v.localService) s -= 4;
  return s;
}

export function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  if (!voices.length) refreshVoices();
  const wanted = state.settings.voiceURI;
  if (wanted) {
    const v = voices.find((x) => x.voiceURI === wanted);
    // um voiceURI salvo de Portugal não pode voltar a ser usado
    if (v && isBrazilianVoice(v)) return v;
  }
  const pt = voices.filter(isBrazilianVoice);
  if (!pt.length) return null;
  return pt.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Precisa ser chamado dentro de um gesto do usuário (política de autoplay do Android). */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  if (!ttsSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0.01;
    u.lang = 'pt-BR';
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

function setGabiSpeaking(on) {
  try {
    if (typeof document !== 'undefined') document.body?.classList.toggle('gabi-speaking', !!on);
  } catch { /* ignore */ }
}

export function stopSpeaking() {
  seq++;
  stopClip();
  setGabiSpeaking(false);
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/* ---------- clipes de áudio neurais (ElevenLabs) ---------- */
let clipIndex = null;
let opusIndex = null;
let clipIndexPromise = null;
let opusIndexPromise = null;
const activeClips = new Set();
export const opusSupported = (() => {
  try { return typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="opus"') !== ''; } catch { return false; }
})();
const clipKey = (t) => String(t || '').toLowerCase().replace(/[.!?…:;,]+$/g, '').replace(/\s+/g, ' ').trim();

export function stopClip() {
  for (const a of [...activeClips]) {
    try { a._cancel?.(); } catch { /* ignore */ }
    try { a.pause(); } catch { /* ignore */ }
  }
  activeClips.clear();
}

async function loadClipIndex() {
  if (clipIndex) return clipIndex;
  if (!clipIndexPromise) {
    clipIndexPromise = (async () => {
      try {
        const r = await fetch('audio/index.json');
        if (!r.ok) { clipStats.indexFail++; return {}; }
        clipIndex = await r.json();
        return clipIndex;
      } catch {
        clipStats.indexFail++;
        return {};
      } finally {
        clipIndexPromise = null;
      }
    })();
  }
  return clipIndexPromise;
}

async function loadOpusIndex() {
  if (opusIndex) return opusIndex;
  if (!opusIndexPromise) {
    opusIndexPromise = (async () => {
      try {
        const r = await fetch('audio/index-opus.json');
        if (!r.ok) { clipStats.indexFail++; return {}; }
        opusIndex = await r.json();
        return opusIndex;
      } catch {
        clipStats.indexFail++;
        return {};
      } finally {
        opusIndexPromise = null;
      }
    })();
  }
  return opusIndexPromise;
}

/** Toca uma URL de áudio. Retorna false (em vez de travar) se demorar, falhar ou for cancelado. */
function playUrl(file, rate, kind, token = seq) {
  if (token !== seq) return Promise.resolve(false);
  return new Promise((resolve) => {
    const a = new Audio();
    let settled = false;
    let started = false;
    let watchdog = null;
    activeClips.add(a);

    // Respeita o ajuste de velocidade dos pais (state.settings.rate) e aplica cadência pedagógica
    // suave (×0.90) nos clipes da ElevenLabs, cuja gravação nativa tem ritmo adulto acelerado.
    const rawRate = Number.isFinite(rate) ? rate : (state.settings.rate ?? 0.9);
    const effectiveRate = Number(Math.min(1.15, Math.max(0.55, rawRate * 0.90)).toFixed(2));

    const finish = (ok, why) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      a._cancel = null;
      a.onloadedmetadata = null;
      a.onplaying = null;
      a.onended = null;
      a.onerror = null;
      activeClips.delete(a);
      if (!ok && why !== 'stopped') {
        if (kind === 'opus') clipStats.opusFail++;
        else clipStats.mp3Fail++;
        note({ kind, file, why: why || 'erro' });
      }
      resolve(ok);
    };

    a._cancel = () => finish(false, 'stopped');

    watchdog = setTimeout(() => {
      if (started) return;
      try { a.pause(); } catch { /* ignore */ }
      finish(false, 'timeout');
    }, 1500);

    a.preload = 'auto';
    try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch { /* ignore */ }
    try { a.defaultPlaybackRate = effectiveRate; a.playbackRate = effectiveRate; } catch { /* ignore */ }
    a.onloadedmetadata = () => {
      try { a.defaultPlaybackRate = effectiveRate; a.playbackRate = effectiveRate; } catch { /* ignore */ }
    };
    a.onplaying = () => {
      // uma fala nova pode ter começado enquanto o arquivo carregava: não deixa este clipe entrar
      if (token !== seq) {
        finish(false, 'stopped');
        try { a.pause(); } catch { /* ignore */ }
        return;
      }
      started = true;
      clearTimeout(watchdog);
      if (Math.abs(a.playbackRate - effectiveRate) > 0.01) {
        try { a.playbackRate = effectiveRate; } catch { /* ignore */ }
      }
    };
    a.onended = () => finish(true);
    a.onerror = () => finish(false, `media-${a.error?.code || 'error'}`);
    if (token !== seq) { finish(false, 'stopped'); return; }
    a.src = file;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch((e) => finish(false, e?.name || 'play-rejected'));
  });
}

/** Toca o clipe neural do texto: Opus (menor) com fallback para MP3. */
export async function playClip(text, rate = state.settings.rate ?? 0.9, token = seq) {
  const my = token;
  if (my !== seq) return false;
  const key = clipKey(text);
  clipStats.clipAttempts++;
  const idx = await loadClipIndex();
  if (my !== seq) return false;
  const mp3 = idx[key];
  const opus = opusSupported ? (await loadOpusIndex())[key] : null;
  if (my !== seq) return false;
  if (opus && await playUrl(opus, rate, 'opus', my)) {
    clipStats.opusOk++;
    note({ kind: 'opus', ok: true, key });
    return true;
  }
  // o Opus pode ter sido cancelado por uma fala nova: não começa o MP3 atrasado
  if (my !== seq) return false;
  if (mp3 && await playUrl(mp3, rate, 'mp3', my)) {
    clipStats.mp3Ok++;
    note({ kind: 'mp3', ok: true, key });
    return true;
  }
  if (my !== seq) return false;
  if (!opus && !mp3) {
    clipStats.noClip++;
    note({ kind: 'none', key, why: 'sem clipe' });
  }
  return false;
}

function chunkText(text, max = 120) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const parts = clean.split(/(?<=[.!?…:;])\s+/).filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.length <= max) { out.push(p); continue; }
    let rest = p;
    while (rest.length > max) {
      let cut = rest.lastIndexOf(',', max);
      if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
      if (cut < max * 0.4) cut = max;
      out.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

function speakOne(text, rate, pitch, voice) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (res) => { if (done) return; done = true; clearTimeout(timer); resolve(res); };
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), Math.min(15000, 3500 + text.length * 110));
    try {
      const u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'pt-BR';
      u.rate = rate;
      u.pitch = pitch;
      u.onend = () => finish({ ok: true });
      u.onerror = (e) => finish({ ok: false, error: e?.error || 'error' });
      window.speechSynthesis.speak(u);
    } catch {
      finish({ ok: false, error: 'exception' });
    }
  });
}

const RETRY_ERRORS = new Set(['voice-unavailable', 'language-unavailable', 'synthesis-failed', 'audio-busy', 'network']);
const IGNORED_SPEECH_ERRORS = new Set(['interrupted', 'canceled']);

/**
 * Fala um texto em pt-BR, fatiado em utterances curtas (o Android corta falas longas).
 * @param {string} text
 * @param {{rate?:number, pitch?:number, interrupt?:boolean, clip?:boolean, voiceURI?:string}} opts
 * @returns {Promise<{spoken:boolean, via:'clip'|'tts'|'muted'|'unsupported'|'empty'|'superseded', error?:string}>}
 */
export async function speak(text, opts = {}) {
  if (!text) return { spoken: false, via: 'empty' };
  if (state.settings.muted) return { spoken: false, via: 'muted' };
  const rate = opts.rate ?? state.settings.rate ?? 0.9;
  const pitch = opts.pitch ?? state.settings.pitch ?? 1;
  if (opts.interrupt !== false) {
    stopClip();
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }
  const my = ++seq;
  setGabiSpeaking(true);
  try {
    // 1) clipe neural gravado (ElevenLabs) — melhor qualidade e offline
    if (opts.clip !== false && !opts.voiceURI) {
      const played = await playClip(text, rate, my);
      if (played) return { spoken: true, via: 'clip' };
    }
    if (my !== seq) return { spoken: false, via: 'superseded' };
    // 2) voz do navegador como reserva
    if (!ttsSupported()) return { spoken: false, via: 'unsupported' };
    if (opts.interrupt !== false) {
      // no Android o motor de voz costuma engasgar se falarmos logo após cancel()
      const isAndroid = /Android/i.test(navigator.userAgent || '');
      await new Promise((r) => setTimeout(r, isAndroid ? 300 : 110));
    }
    if (my !== seq) return { spoken: false, via: 'superseded' };
    if (!voices.length) await ensureVoices(2000);
    if (!voices.length) await ensureVoices(700);
    if (my !== seq) return { spoken: false, via: 'superseded' };
    // Sem voz pt-BR, não usa a voz de Portugal como fallback silencioso.
    if (!voices.some(isBrazilianVoice)) {
      lastSpeechError = 'no-pt-br';
      note({ kind: 'tts', why: 'sem voz pt-BR' });
      return { spoken: false, via: 'unsupported', error: 'no-pt-br' };
    }
    let voice = pickVoice();
    if (opts.voiceURI) {
      const chosen = voices.find((v) => v.voiceURI === opts.voiceURI);
      if (chosen && isBrazilianVoice(chosen)) voice = chosen;
    }

    const chunks = chunkText(text);
    let any = false;
    for (let i = 0; i < chunks.length; i++) {
      if (my !== seq) return { spoken: any, via: 'superseded' };
      let res = await speakOne(chunks[i], rate, pitch, voice);
      if (!res.ok && my === seq && voice && RETRY_ERRORS.has(res.error)) {
        // a voz escolhida pode não existir no tablet: tenta a voz padrão do sistema
        lastSpeechError = res.error;
        res = await speakOne(chunks[i], rate, pitch, null);
      }
      // uma fala nova (ou stopSpeaking) pode ter interrompido esta: não conta como falha
      if (my !== seq) return { spoken: any, via: 'superseded' };
      if (res.ok) any = true;
      else if (!IGNORED_SPEECH_ERRORS.has(res.error)) lastSpeechError = res.error;
      if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 110));
    }
    if (any) {
      clipStats.ttsOk++;
      return { spoken: true, via: 'tts' };
    }
    clipStats.ttsFail++;
    return { spoken: false, via: 'tts', error: lastSpeechError || 'no-start' };
  } finally {
    if (my === seq) setGabiSpeaking(false);
  }
}

/** Fala sílabas separadas, com pausa — priorizando clipes neurais da ElevenLabs. */
export async function speakSyllables(parts, opts = {}) {
  stopSpeaking();
  if (state.settings.muted) return;
  const my = ++seq;
  setGabiSpeaking(true);
  try {
    const voice = pickVoice();
    const hasBr = voices.some(isBrazilianVoice);
    const baseRate = state.settings.rate ?? 0.9;
    const rate = opts.rate ?? Math.max(0.55, baseRate - 0.15);
    await new Promise((r) => setTimeout(r, 200));
    for (const p of parts) {
      if (my !== seq) return;
      const syl = String(p || '').trim();
      if (!syl) continue;
      const played = await playClip(syl, rate, my);
      if (!played && my === seq && hasBr && ttsSupported()) {
        await speakOne(syl, rate, 1, voice);
      }
      if (my !== seq) return;
      await new Promise((r) => setTimeout(r, 380));
    }
  } finally {
    if (my === seq) setGabiSpeaking(false);
  }
}

export function speakSlow(text) {
  return speak(text, { rate: Math.max(0.5, (state.settings.rate || 0.9) - 0.25) });
}

/* ---------- efeitos sonoros ---------- */
function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, at, dur, type = 'sine', vol = 0.09) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export function sfx(kind) {
  if (state.settings.muted || state.settings.sound === false) return;
  try {
    switch (kind) {
      case 'tap': tone(520, 0, 0.06, 'triangle', 0.05); break;
      case 'ok': tone(659, 0, 0.12, 'sine', 0.08); tone(880, 0.1, 0.16, 'sine', 0.07); break;
      case 'great':
        [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.2, 'sine', 0.08));
        break;
      case 'soft': tone(392, 0, 0.14, 'sine', 0.06); tone(330, 0.13, 0.2, 'sine', 0.06); break;
      case 'star': tone(880, 0, 0.1, 'triangle', 0.07); tone(1175, 0.08, 0.18, 'triangle', 0.06); break;
      case 'level':
        [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.26, 'triangle', 0.075));
        break;
      case 'clap': tone(180, 0, 0.08, 'square', 0.04); tone(240, 0.02, 0.06, 'square', 0.03); break;
      default: tone(440, 0, 0.08, 'sine', 0.05);
    }
  } catch { /* áudio indisponível */ }
}

/** Pequena vibração (quando suportado). */
export function haptic(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}
