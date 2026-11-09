/* Stress test real no Chrome do emulador Android, via DevTools (adb forward 9222).
 *
 * Uso:
 *   node tests/stress-emu.mjs                 # bateria completa
 *   node tests/stress-emu.mjs --scenario talk # só conversa
 *   node tests/stress-emu.mjs --scenario audio --slow-index 1500
 *
 * Requisitos no PC:
 *   adb reverse tcp:8080 tcp:8080
 *   adb forward tcp:9222 localabstract:chrome_devtools_remote
 *   node server/serve.mjs 8080
 *
 * O teste NÃO altera o código do app: injeta um auditor de áudio antes do boot,
 * usa o hook público __setListenOverride da escuta e restaura o localStorage no fim.
 */
import fs from 'node:fs';
import path from 'node:path';

const DEVTOOLS = process.env.GABI_DEVTOOLS || 'http://127.0.0.1:9222';
const APP_URL = process.env.GABI_URL || 'http://localhost:8080/';
const EXPECTED_VERSION = process.env.GABI_VERSION || 'v49';
const OUT = path.resolve(process.env.GABI_STRESS_OUT || 'tests/stress-v49');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString();
const log = (...a) => console.log(...a);

/* ------------------------------------------------------------------ */
/* Infra CDP mínima (sem dependências)                                 */
/* ------------------------------------------------------------------ */
class CDP {
  constructor(url) {
    this.url = url;
    this.ws = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
        return;
      }
      for (const h of this.handlers) { try { h(msg); } catch { /* ignore */ } }
    };
  }
  static async connect() {
    let version;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(`${DEVTOOLS}/json/version`);
        if (r.ok) { version = await r.json(); break; }
      } catch { /* ainda subindo */ }
      await sleep(250);
    }
    if (!version) throw new Error(`DevTools não respondeu em ${DEVTOOLS}`);
    const c = new CDP(version.webSocketDebuggerUrl);
    await c.ready;
    c.info = version;
    return c;
  }
  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  on(fn) { this.handlers.push(fn); }
  close() { try { this.ws.close(); } catch { /* ignore */ } }
}

class Page {
  constructor(browser, targetId, sessionId) {
    this.browser = browser;
    this.targetId = targetId;
    this.sessionId = sessionId;
    this.errors = [];
    this.console = [];
    this.closed = false;
  }
  send(method, params = {}) { return this.browser.send(method, params, this.sessionId); }
  async ev(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true, userGesture: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails.exception?.description || r.exceptionDetails.text;
      throw new Error(`page eval: ${d}`);
    }
    return r.result?.value;
  }
  async waitFor(expression, { timeout = 10000, label = expression } = {}) {
    const t0 = Date.now();
    let last;
    while (Date.now() - t0 < timeout) {
      try {
        last = await this.ev(expression);
        if (last) return last;
      } catch (e) { last = e.message; }
      await sleep(120);
    }
    throw new Error(`timeout (${timeout}ms) esperando ${label}${last ? ` — último: ${JSON.stringify(last)}` : ''}`);
  }
  async nav(url) {
    await this.send('Page.navigate', { url });
    await sleep(450);
  }
  async hash(h) {
    await this.ev(`location.hash = ${JSON.stringify(h)}`);
    await sleep(350);
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const file = path.join(OUT, name);
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    log('  📸', path.relative(process.cwd(), file));
    return file;
  }
  async text() { return this.ev('document.body.innerText'); }
  async bubbles() {
    return this.ev(`(() => [...document.querySelectorAll('.bubble')].map((b) => {
      const parts = [...b.children].filter((c) => !c.classList.contains('bubble__name') && !c.classList.contains('bubble__actions'));
      return {
        role: b.classList.contains('bubble--child') ? 'child' : 'gabi',
        text: parts.map((c) => c.textContent.trim()).filter(Boolean).join(' ').trim(),
        cls: b.className,
      };
    }))()`);
  }
  async audioSummary() {
    return this.ev('window.__stressAudio ? window.__stressAudio.summary() : null');
  }
  async audioLog() {
    return this.ev('window.__stressAudio ? window.__stressAudio.log.slice() : []');
  }
  async audioReset() {
    return this.ev('window.__stressAudio && window.__stressAudio.reset()');
  }
  async click(selector, textRe = null, { optional = false } = {}) {
    const re = textRe ? String(textRe) : null;
    const r = await this.ev(`(() => {
      const re = ${re ? `new RegExp(${JSON.stringify(re)})` : 'null'};
      const all = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const hit = re ? all.find((x) => re.test((x.textContent || '').trim())) : all[0];
      if (!hit) return { ok: false, count: all.length, texts: all.map((x) => (x.textContent || '').trim()).slice(0, 12) };
      if (hit.disabled) return { ok: false, disabled: true, text: (hit.textContent || '').trim() };
      hit.click();
      return { ok: true, text: (hit.textContent || '').trim() };
    })()`);
    if (!r?.ok && !optional) throw new Error(`click ${selector}${re ? ` /${re}/` : ''}: ${JSON.stringify(r)}`);
    return r;
  }
  async setListen(text, delay = 350) {
    return this.ev(`import('/js/speech.js').then((m) => m.__setListenOverride(async ({ onPartial }) => {
      const t = ${JSON.stringify(text)};
      try { onPartial?.(t); } catch {}
      await new Promise((r) => setTimeout(r, ${delay}));
      return { ok: true, transcript: t, alternatives: [t] };
    }))`);
  }
  async clearListen() {
    return this.ev(`import('/js/speech.js').then((m) => m.__setListenOverride(null))`);
  }
  async waitAudioIdle(timeout = 12000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const s = await this.ev(`({ media: window.__stressAudio?.active().length || 0, tts: window.__stressAudio?.tts().length || 0 })`);
      if (!s.media && !s.tts) return true;
      await sleep(150);
    }
    return false;
  }
  async close() {
    if (this.closed) return;
    this.closed = true;
    try { await this.browser.send('Target.closeTarget', { targetId: this.targetId }); } catch { /* ignore */ }
  }
}

/* ------------------------------------------------------------------ */
/* Auditor de áudio injetado antes de qualquer módulo do app           */
/* ------------------------------------------------------------------ */
function injectedAudit() {
  if (window.__stressAudio) return;
  const state = {
    log: [],
    media: new Map(),
    tts: new Map(),
    seq: 0,
    lastStop: null,
  };
  const now = () => performance.now();
  const hash = () => location.hash || '#/';
  const stack = () => {
    try { return String(new Error().stack || '').split('\n').slice(2, 7).join(' | '); } catch { return ''; }
  };
  const srcOf = (el) => {
    try { return el.currentSrc || el.src || ''; } catch { return ''; }
  };
  const idOf = (el) => {
    if (!el.__stressAudioId) el.__stressAudioId = ++state.seq;
    return el.__stressAudioId;
  };
  const activeSnap = () => [...state.media.entries()].map(([id, v]) => ({
    id, src: v.src, ms: Math.round(now() - v.start),
  }));
  const ttsSnap = () => [...state.tts.entries()].map(([id, v]) => ({ id, text: v.text }));
  const note = (type, data = {}) => {
    const rec = { t: Math.round(now()), wall: Date.now(), type, hash: hash(), ...data };
    state.log.push(rec);
    if (state.log.length > 3000) state.log.shift();
  };

  // índice atrasado: reproduz cold start / tablet lento sem tocar no app
  const params = new URLSearchParams(location.search);
  const slowIndex = Number(params.get('slowIndex') || 0);
  if (slowIndex > 0) {
    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/audio\/index(-opus)?\.json/.test(url)) {
        note('slow-index-fetch', { url, delay: slowIndex });
        return new Promise((resolve, reject) => {
          setTimeout(() => origFetch(input, init).then(resolve, reject), slowIndex);
        });
      }
      return origFetch(input, init);
    };
  }

  const onPlaying = (e) => {
    const el = e.currentTarget;
    const id = idOf(el);
    if (!state.media.has(id)) state.media.set(id, { src: srcOf(el), start: now() });
    const active = activeSnap();
    note('media-playing', { id, src: srcOf(el), rate: el.playbackRate, active });
    if (state.media.size > 1) {
      note('overlap-media', { id, src: srcOf(el), active, stack: stack() });
    }
    if (state.lastStop && now() - state.lastStop.at < 900 && state.lastStop.src !== srcOf(el)) {
      note('start-after-stop', { id, src: srcOf(el), lastStop: state.lastStop.src, gap: Math.round(now() - state.lastStop.at) });
    }
  };
  const onPause = (e) => {
    const el = e.currentTarget;
    const id = idOf(el);
    if (state.media.has(id)) {
      state.media.delete(id);
      state.lastStop = { at: now(), src: srcOf(el), id };
      note('media-pause', { id, src: srcOf(el), currentTime: Math.round((el.currentTime || 0) * 1000) / 1000 });
    }
  };
  const onEnded = (e) => {
    const el = e.currentTarget;
    const id = idOf(el);
    if (state.media.has(id)) {
      state.media.delete(id);
      note('media-ended', { id, src: srcOf(el) });
    }
  };
  const onError = (e) => {
    const el = e.currentTarget;
    const id = idOf(el);
    state.media.delete(id);
    note('media-error', { id, src: srcOf(el), code: el.error && el.error.code });
  };
  const onEmptied = (e) => {
    const id = idOf(e.currentTarget);
    if (state.media.has(id)) { state.media.delete(id); note('media-emptied', { id }); }
  };

  const proto = window.HTMLMediaElement && HTMLMediaElement.prototype;
  if (proto && !proto.__stressPatched) {
    proto.__stressPatched = true;
    const origPlay = proto.play;
    proto.play = function (...args) {
      const el = this;
      const id = idOf(el);
      note('play-call', {
        id, src: srcOf(el), rate: el.playbackRate, volume: el.volume,
        active: activeSnap(), stack: stack(),
      });
      if (!el.__stressHooked) {
        el.__stressHooked = true;
        el.addEventListener('playing', onPlaying);
        el.addEventListener('pause', onPause);
        el.addEventListener('ended', onEnded);
        el.addEventListener('error', onError);
        el.addEventListener('emptied', onEmptied);
      }
      if (state.media.size > 0) {
        note('play-while-active', { id, src: srcOf(el), active: activeSnap() });
      }
      return origPlay.apply(this, args);
    };
  }

  const synth = window.speechSynthesis;
  if (synth && !synth.__stressPatched) {
    synth.__stressPatched = true;
    const origSpeak = synth.speak.bind(synth);
    synth.speak = function (u) {
      const text = String((u && u.text) || '').trim();
      const volume = u && u.volume != null ? u.volume : 1;
      if (!text || volume < 0.05) return origSpeak(u);
      const id = ++state.seq;
      const rec = { id, text: text.slice(0, 180) };
      note('tts-call', { id, text: rec.text, volume, active: activeSnap(), stack: stack() });
      try {
        u.addEventListener('start', () => {
          state.tts.set(id, rec);
          note('tts-start', { id, text: rec.text, active: activeSnap() });
          if (state.media.size > 0) note('overlap-tts-media', { id, text: rec.text, active: activeSnap() });
          if (state.tts.size > 1) note('overlap-tts', { id, text: rec.text, tts: ttsSnap() });
        });
        const end = () => {
          if (state.tts.delete(id)) note('tts-end', { id, text: rec.text });
        };
        u.addEventListener('end', end);
        u.addEventListener('error', end);
      } catch { /* ignore */ }
      return origSpeak(u);
    };
    const origCancel = synth.cancel.bind(synth);
    synth.cancel = function () {
      note('tts-cancel', { active: activeSnap(), tts: ttsSnap() });
      return origCancel();
    };
  }

  window.__stressAudio = {
    log: state.log,
    active: activeSnap,
    tts: ttsSnap,
    lastStop: () => state.lastStop,
    summary() {
      const overlaps = state.log.filter((e) => e.type.startsWith('overlap-'));
      const types = {};
      for (const e of state.log) types[e.type] = (types[e.type] || 0) + 1;
      let maxConcurrent = 0;
      for (const e of state.log) if (e.active) maxConcurrent = Math.max(maxConcurrent, e.active.length);
      return {
        events: state.log.length,
        overlaps: overlaps.length,
        overlapKinds: [...new Set(overlaps.map((e) => e.type))],
        maxConcurrent,
        active: activeSnap(),
        tts: ttsSnap(),
        types,
        last: state.log.slice(-8),
      };
    },
    reset() {
      state.log.length = 0;
      state.media.clear();
      state.tts.clear();
      state.lastStop = null;
    },
  };
  note('audit-ready', {
    ua: navigator.userAgent,
    viewport: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
  });
}

const AUDIT_SOURCE = `(${injectedAudit.toString()})();`;

const FAKE_SR_SOURCE = `(() => {
  class FakeSR {
    constructor() {
      this.lang = ''; this.interimResults = false; this.continuous = false; this.maxAlternatives = 1;
      window.__fakeSR.created++; window.__fakeSR.last = this;
    }
    start() {
      this._started = true; window.__fakeSR.started++;
      setTimeout(() => { try { this.onstart?.(); } catch {} }, 20);
    }
    abort() {
      window.__fakeSR.aborted++; this._aborted = true;
      try { this.onerror?.({ error: 'aborted' }); } catch {}
      try { this.onend?.(); } catch {}
    }
    stop() { window.__fakeSR.stopped++; }
  }
  window.__fakeSR = { created: 0, started: 0, stopped: 0, aborted: 0, last: null };
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
})();`;

/* ------------------------------------------------------------------ */
/* Helpers de cenário                                                  */
/* ------------------------------------------------------------------ */
const STATE_KEY = 'gabi.state.v1';
const SEED = {
  onboarded: true,
  child: { name: 'Ana', avatar: '🦊' },
  settings: {
    muted: false, sound: false, rate: 1, voiceURI: '', readScale: 1,
    reduceMotion: true, sessionTarget: 10, freeMode: true, pin: '',
    llm: { enabled: false },
  },
  progress: {
    xp: 0, coins: 0, streak: { last: '', days: 0, best: 0 }, startUnit: 'u2',
    units: {}, lessons: {},
  },
  skills: {}, srs: {}, errors: {}, stickers: [], days: {}, history: [],
};

const GABI_SEED = {
  ...SEED,
  child: { name: 'Gabi', avatar: '🦊' },
};

const GABRIELA_SEED = {
  ...SEED,
  child: { name: 'Gabriela', avatar: '🦊' },
};

const MUTED_SEED = {
  ...SEED,
  settings: { ...SEED.settings, muted: true },
};

const results = { started: stamp(), app: APP_URL, devtools: DEVTOOLS, scenarios: [], checks: [], findings: [] };

function check(name, ok, detail = '') {
  results.checks.push({ name, ok: !!ok, detail });
  log(ok ? `  ✅ ${name}` : `  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  return !!ok;
}

function finding(id, severity, title, detail, evidence = {}) {
  const f = { id, severity, title, detail, evidence, at: stamp() };
  results.findings.push(f);
  log(`  🐞 [${severity}] ${title}`);
  return f;
}

async function openPage(browser, { audit = true, fakeSR = false, url = 'about:blank' } = {}) {
  const { targetId } = await browser.send('Target.createTarget', { url });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const page = new Page(browser, targetId, sessionId);
  browser.on((m) => {
    if (m.sessionId && m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '';
      page.errors.push('exception: ' + d);
    } else if (m.method === 'Runtime.consoleAPICalled') {
      const txt = (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      page.console.push(`${m.params.type}: ${txt}`);
      if (m.params.type === 'error') page.errors.push('console: ' + txt);
    } else if (m.method === 'Log.entryAdded') {
      const e = m.params.entry;
      if (e.level === 'error') {
        const t = e.text || '';
        if (!/favicon|beforeinstallprompt|AudioContext|vibrate|net::ERR_ABORTED/i.test(t)) page.errors.push('log: ' + t);
      }
    } else if (m.method === 'Page.javascriptDialogOpening') {
      page.send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
  });
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');
  await page.send('Page.bringToFront');
  if (audit) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: AUDIT_SOURCE });
  if (fakeSR) await page.send('Page.addScriptToEvaluateOnNewDocument', { source: FAKE_SR_SOURCE });
  return page;
}

async function bootApp(page, { url = APP_URL, seed = true, preserve = true, state = SEED } = {}) {
  await page.nav(url);
  if (preserve) {
    const prev = await page.ev(`localStorage.getItem(${JSON.stringify(STATE_KEY)})`);
    if (prev != null) page.__prevState = prev;
  }
  if (seed) {
    await page.ev(`localStorage.setItem(${JSON.stringify(STATE_KEY)}, ${JSON.stringify(JSON.stringify(state))}); localStorage.setItem('gabi.install.dismissed','1');`);
    await page.nav(url);
  }
  await page.waitFor(`!!window.__gabi && document.documentElement.dataset.gabiVersion === '${EXPECTED_VERSION}' && !!document.getElementById("app") && !document.getElementById("app").hidden`, {
    timeout: 25000, label: 'app bootar na versão nova',
  });
  // o controllerchange do SW pode recarregar logo depois; espera a versão estabilizar
  for (let i = 0; i < 20; i++) {
    try {
      const v = await page.ev('window.__gabi?.version || null');
      if (v === EXPECTED_VERSION) break;
    } catch { /* recarregando */ }
    await sleep(400);
  }
  await sleep(500);
  return page;
}

async function reseed(page, state) {
  await page.ev(`localStorage.setItem(${JSON.stringify(STATE_KEY)}, ${JSON.stringify(JSON.stringify(state))})`);
  await page.nav(APP_URL);
  await page.waitFor('!!window.__gabi && !!document.getElementById("app") && !document.getElementById("app").hidden', {
    timeout: 15000, label: 'app reabrir com estado novo',
  });
  await sleep(500);
}

async function restore(page) {
  try {
    if (page.__prevState != null) {
      await page.ev(`localStorage.setItem(${JSON.stringify(STATE_KEY)}, ${JSON.stringify(page.__prevState)})`);
    } else {
      await page.ev(`localStorage.removeItem(${JSON.stringify(STATE_KEY)})`);
    }
  } catch { /* ignore */ }
}

function bubblesByRole(bubbles, role) {
  return bubbles.filter((b) => b.role === role).map((b) => b.text);
}

function lastBubble(page) {
  return page.ev(`(() => {
    const b = [...document.querySelectorAll('.bubble--gabi')].at(-1);
    if (!b) return '';
    const parts = [...b.children].filter((c) => !c.classList.contains('bubble__name') && !c.classList.contains('bubble__actions'));
    return parts.map((c) => c.textContent.trim()).filter(Boolean).join(' ').replace(/\\s+/g, ' ').trim();
  })()`);
}

/* ------------------------------------------------------------------ */
/* Cenários                                                            */
/* ------------------------------------------------------------------ */
async function scenarioBoot(page) {
  log('\n[1] Boot, versão, service worker e aviso de voz');
  // logo após subir a versão, o controllerchange do SW pode recarregar a página
  await sleep(1500);
  await page.waitFor(`window.__gabi?.version === '${EXPECTED_VERSION}'`, { timeout: 15000, label: 'versão estável' });
  const boot = await page.ev(`(async () => ({
    version: window.__gabi?.version,
    dataVersion: document.documentElement.dataset.gabiVersion,
    controller: navigator.serviceWorker?.controller?.scriptURL || null,
    caches: await caches.keys(),
    audio: window.__gabi?.audio?.(),
  }))()`);
  check('app v49 carregado', boot.version === 'v49', JSON.stringify(boot.version));
  check('dataset da versão = v49', boot.dataVersion === 'v49', JSON.stringify(boot.dataVersion));
  check('service worker controlando a página', /\/sw\.js$/.test(boot.controller || ''), String(boot.controller));
  check('cache gabi-v49 presente', boot.caches.includes('gabi-v49'), boot.caches.join(','));
  check('cache de áudio gabi-audio-v1 presente', boot.caches.includes('gabi-audio-v1'), boot.caches.join(','));
  check('há voz pt-BR no tablet', (boot.audio?.ptVoices || 0) > 0, `ptVoices=${boot.audio?.ptVoices}`);
  check('Opus suportado no Chrome do emulador', boot.audio?.opusSupported === true);
  const cacheCounts = await page.ev(`(async () => {
    const out = {};
    for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length;
    return out;
  })()`);
  results.cacheCounts = cacheCounts;
  check('shell offline com 37 arquivos', cacheCounts['gabi-v49'] >= 37, `gabi-v49=${cacheCounts['gabi-v49']}`);
  check('áudio pré-cacheado 1000+', (cacheCounts['gabi-audio-v1'] || 0) >= 1000, `gabi-audio-v1=${cacheCounts['gabi-audio-v1']}`);

  await page.hash('#/');
  await sleep(4500);
  const voiceNote = await page.ev(`document.querySelector('.hero__voice')?.textContent || ''`);
  check('aviso "sem voz pt-BR" não aparece com 2 vozes', !/Não encontrei voz/i.test(voiceNote), voiceNote);
  check('voz ativa não é de Portugal', !/portugal|pt-pt/i.test(boot.audio?.voice || ''), boot.audio?.voice);
  await page.hash('#/vozes');
  await sleep(500);
  const voiceList = await page.ev(`(() => [...document.querySelectorAll('.card--flat .tiny')].map((e) => e.textContent.trim()))()`);
  check('lista de vozes não oferece pt-PT', !voiceList.some((t) => /pt[_-]?pt/i.test(t)), voiceList.join(' | '));
  await page.hash('#/');
  if (/Não encontrei voz/i.test(voiceNote)) {
    finding('S1', 'media', 'Aviso falso de "sem voz em português" na home', 'A home mostra o aviso mesmo com 2 vozes pt-BR disponíveis em window.__gabi.audio().', { voiceNote });
  }
  await page.shot('01-boot-home.png');

  const errors = page.errors.slice();
  check('sem erros de JavaScript no boot', errors.length === 0, errors.slice(0, 3).join(' || '));
  return { boot, cacheCounts, voiceNote };
}

async function scenarioTalkNormal(page) {
  log('\n[2] Conversa roteirizada completa (fluxo feliz, sem áudio para isolar a lógica)');
  await reseed(page, MUTED_SEED);
  await page.audioReset();
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 5000, label: '3 cartinhas' });
  await page.shot('02-conversa-cartinhas.png');

  const clickedCard = await page.click('.theme-card');
  check('cartinha abre', clickedCard.ok, JSON.stringify(clickedCard));
  await page.waitFor(`document.querySelectorAll('.option').length >= 3`, { timeout: 8000, label: 'pergunta de humor' });
  await page.shot('03-conversa-humor.png');

  const mood = await page.click('.option', 'Bem');
  check('humor "Bem" responde', mood.ok, JSON.stringify(mood));
  await page.waitFor(`!!document.querySelector('.mic')`, { timeout: 8000, label: 'turno livre' });
  const freeQuestion = await lastBubble(page);
  check('turno livre faz pergunta de continuidade', /.+\?/.test(freeQuestion), freeQuestion.slice(0, 120));

  // primeiro turno livre: a resposta deve ser gramatical e abrir um follow-up
  await page.setListen('eu gosto de brincar no parque', 250);
  await page.click('.mic');
  await page.waitFor(`document.querySelectorAll('.bubble--child').length >= 2 && !!document.querySelector('.mic')`, { timeout: 8000, label: 'resposta + follow-up' });
  const freeReply = await lastBubble(page);
  check('resposta da Gabi usa frase gramatical', !/gosta de (eu|meu|minha|a gente|você) gosto/i.test(freeReply) && !/Você gosta de eu gosto/i.test(freeReply), freeReply.slice(0, 180));
  check('resposta do 1º turno considera o conteúdo (parque)', /parque/i.test(freeReply), freeReply.slice(0, 180));
  const micAfterFreeReply = await page.ev(`!!document.querySelector('.mic')`);
  check('se a Gabi pergunta, a criança pode responder', micAfterFreeReply, `mic=${micAfterFreeReply}`);
  if (!micAfterFreeReply) {
    finding('C3', 'alta', 'A Gabi faz uma pergunta e o app não deixa a criança responder', 'A resposta termina em pergunta, mas freeTurn só oferece "Continuar"; o microfone some.', { freeReply });
  }
  await page.shot('04-conversa-turno-livre.png');

  // responde o follow-up de verdade
  await page.setListen('no parque eu corro atrás dos patos', 250);
  await page.click('.mic');
  await page.waitFor(`document.querySelectorAll('.bubble--child').length >= 3 && document.body.innerText.includes('Continuar ➜')`, { timeout: 8000, label: 'follow-up respondido' });
  const followAck = await lastBubble(page);
  check('follow-up fecha o turno sem nova pergunta', !/\?\s*$/.test(followAck), followAck.slice(0, 160));
  await page.waitFor(`window.__stressAudio.active().length === 0`, { timeout: 10000, label: 'follow-up terminar' });
  const continueClicked = await page.click('.btn', 'Continuar');
  check('avança do turno livre', continueClicked.ok, JSON.stringify(continueClicked));

  // sílabas
  await page.waitFor(`document.querySelectorAll('.option').length === 3 && document.body.innerText.includes('sílabas')`, { timeout: 8000, label: 'turno de sílabas' });
  const syllableBubble = await lastBubble(page);
  const word = (syllableBubble.match(/Palavra nova:\s*([^!]+)!/i) || [])[1]?.trim();
  const nSyl = word ? await page.ev(`import('/js/syllables.js').then((m) => m.splitSyllables(${JSON.stringify(word)}).length)`) : 0;
  check('palavra do turno de sílabas identificada', !!word && nSyl >= 2, `${word} → ${nSyl}`);
  const sylClick = await page.click('.option', `${nSyl} sílaba`);
  check(`responde ${nSyl} sílabas`, sylClick.ok, JSON.stringify(sylClick));
  await page.waitFor(`!!document.querySelector('.mic') && document.body.innerText.includes('Repita comigo')`, { timeout: 8000, label: 'trava-língua' });
  const twisterBubble = await lastBubble(page);
  const twister = (twisterBubble.match(/[“"](.+?)[”"]/) || [])[1] || '';
  check('trava-língua identificado', twister.length > 8, twister);
  await page.setListen(twister, 250);
  await page.click('.mic');
  await page.waitFor(`document.querySelectorAll('.bubble--child').length >= 5 && document.body.innerText.includes('Continuar ➜')`, { timeout: 8000, label: 'eco respondido' });
  const echoReply = await lastBubble(page);
  check('eco do trava-língua responde', /Isso|Muito bem|Perfeito|Quase|Ficou perto/i.test(echoReply), echoReply.slice(0, 120));
  await page.shot('05-conversa-trava-lingua.png');
  await page.click('.btn', 'Continuar');

  // segundo turno livre: deve falar do tatu e abrir follow-up
  await page.waitFor(`!!document.querySelector('.mic') && document.body.innerText.toLowerCase().includes('sua vez de falar')`, { timeout: 8000, label: 'segundo turno livre' });
  await page.setListen('meu bicho favorito é o tatu', 250);
  await page.click('.mic');
  await page.waitFor(`document.querySelectorAll('.bubble--child').length >= 6 && !!document.querySelector('.mic')`, { timeout: 8000, label: 'segundo turno + follow-up' });
  const freeReply2 = await lastBubble(page);
  check('segundo turno livre responde', freeReply2.length > 4, freeReply2.slice(0, 120));
  check('resposta do 2º turno considera o conteúdo (tatu)', /tatu/i.test(freeReply2), freeReply2.slice(0, 160));
  const micAfterSecondReply = await page.ev(`!!document.querySelector('.mic')`);
  check('segundo follow-up também pode ser respondido', micAfterSecondReply, `mic=${micAfterSecondReply}`);
  await page.waitFor(`window.__stressAudio.active().length === 0`, { timeout: 10000, label: 'segundo turno terminar' });
  await page.shot('06a-conversa-segundo-turno.png');

  // pula o segundo follow-up para chegar à despedida
  const skippedFollow = await page.click('.btn', '^Pular$');
  check('segundo follow-up pode ser pulado', skippedFollow.ok, JSON.stringify(skippedFollow));
  await page.waitFor(`document.body.innerText.includes('Foi ótimo conversar com você!')`, { timeout: 12000, label: 'fim da conversa' });
  await sleep(600);
  await page.shot('06-conversa-fim.png');
  const bubbles = await page.bubbles();
  const gabi = bubblesByRole(bubbles, 'gabi');
  const child = bubblesByRole(bubbles, 'child');
  results.talk = { freeQuestion, freeReply, followAck, twister, echoReply, freeReply2, bubbles };
  check('conversa tem saudação e despedida', gabi.length >= 6 && /Adorei conversar|Foi ótimo/.test(gabi.join(' ')), `${gabi.length} falas da Gabi`);
  check('conversa registra as 6 falas da criança', child.length === 6, `${child.length}: ${child.join(' | ')}`);
  const goodbye = gabi.at(-1) || '';
  const goodbyeRepeats = (goodbye.match(/Adorei conversar com você/gi) || []).length;
  check('despedida não repete a mesma frase', goodbyeRepeats < 2, goodbye.slice(0, 180));
  if (goodbyeRepeats >= 2) {
    finding('C5', 'media', 'Despedida repete "Adorei conversar com você" duas vezes', 'O turno de despedida concatena um prefixo que já é a primeira frase da lista.', { goodbye });
  }
  const endVisible = await page.ev(`(() => {
    const c = [...document.querySelectorAll('.card--soft.center')].at(-1);
    if (!c) return false;
    const r = c.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  })()`);
  check('card final de despedida visível sem rolar', endVisible, `endVisible=${endVisible}`);
  const order = bubbles.map((b) => `${b.role}:${b.text.slice(0, 24)}`);
  results.talk.order = order;
  const summary = await page.audioSummary();
  results.talk.audio = summary;
  check('sem sobreposição de áudio no fluxo feliz', summary.overlaps === 0, JSON.stringify(summary.overlapKinds));
  check('sem erros de JavaScript na conversa', page.errors.length === 0, page.errors.slice(0, 3).join(' || '));
  await page.shot('07-conversa-arvore.png');
  return results.talk;
}

async function scenarioTalkInterrupt(page) {
  log('\n[3] Conversa interrompida: Pular durante a escuta, sair durante a fala e toques rápidos');
  await reseed(page, MUTED_SEED);
  await page.audioReset();
  await page.hash('#/');
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 5000, label: 'cartinhas' });
  // clique imediato: pega a fala de abertura ainda carregando
  await page.click('.theme-card');
  await page.waitFor(`document.querySelectorAll('.option').length >= 3`, { timeout: 8000, label: 'humor' });
  await page.waitFor(`window.__stressAudio.active().length === 0`, { timeout: 10000, label: 'cheer' });
  await page.click('.option', 'Bem');
  await page.waitFor(`!!document.querySelector('.mic')`, { timeout: 8000, label: 'livre' });

  // Pular enquanto a escuta falsa ainda vai responder
  const childBefore = await page.ev(`document.querySelectorAll('.bubble--child').length`);
  await page.setListen('eu gosto de brincar no parque', 1800);
  await page.click('.mic');
  await sleep(250);
  const skipped = await page.click('.btn', '^Pular$');
  check('botão Pular responde durante a escuta', skipped.ok, JSON.stringify(skipped));
  const immediate = await page.ev(`({ options: document.querySelectorAll('.option').length, title: document.body.innerText.includes('quantas sílabas'), cards: document.querySelectorAll('.card').length })`);
  results.skipListening = { childBefore, immediate, before: await page.bubbles() };
  await sleep(2600);
  const after = await page.ev(`({
    options: document.querySelectorAll('.option').length,
    childBubbles: document.querySelectorAll('.bubble--child').length,
    mic: !!document.querySelector('.mic'),
    continueButtons: [...document.querySelectorAll('.btn')].filter((b) => /Continuar/.test(b.textContent)).length,
    title: document.body.innerText.includes('quantas sílabas'),
    text: document.body.innerText.slice(0, 900),
  })`);
  const bubblesAfter = await page.bubbles();
  results.skipListening.after = { ...after, bubbles: bubblesAfter };
  const staleAt = bubblesAfter.findIndex((b) => b.role === 'child' && /eu gosto de brincar no parque/i.test(b.text));
  const syllableAt = bubblesAfter.findIndex((b) => b.role === 'gabi' && /Palavra nova:/i.test(b.text));
  check('Pular descarta a resposta que chega depois', staleAt === -1, `fala atrasada no índice ${staleAt}`);
  check('Pular preserva o turno de sílabas (3 opções)', after.options === 3, `options=${after.options}`);
  check('Pular não insere a fala atrasada depois da pergunta seguinte', staleAt === -1 || syllableAt === -1 || staleAt < syllableAt, `sílabas@${syllableAt}, atrasada@${staleAt}`);
  if (staleAt !== -1 || after.options !== 3) {
    finding('C2', 'alta', 'Pular durante a escuta não cancela a escuta: a resposta atrasada invade o próximo turno', 'Ao tocar Pular enquanto o microfone está ouvindo, a promessa de listen continua; quando o reconhecimento devolve a fala, o app registra a fala da criança e avança outro turno por cima do turno de sílabas.', { childBefore, immediate, after, bubbles: bubblesAfter });
  }
  await page.shot('08-pular-durante-escuta.png');

  // Sair da tela enquanto a Gabi fala
  await page.audioReset();
  await page.hash('#/');
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 5000, label: 'cartinhas 2' });
  await page.click('.theme-card');
  await sleep(900);
  await page.hash('#/');
  await sleep(2500);
  const afterLeave = await page.ev(`({
    media: window.__stressAudio.active().length,
    tts: window.__stressAudio.tts().length,
    speaking: document.body.classList.contains('gabi-speaking'),
    onHome: document.body.innerText.includes('Sua próxima aula'),
  })`);
  results.leaveDuringSpeech = afterLeave;
  check('sair da conversa para o áudio da Gabi', afterLeave.media === 0 && afterLeave.tts === 0, JSON.stringify(afterLeave));
  check('sair da conversa remove o estado "falando"', !afterLeave.speaking, JSON.stringify(afterLeave));
  const leaveSummary = await page.audioSummary();
  results.leaveDuringSpeech.audio = leaveSummary;
  if (afterLeave.media > 0 || leaveSummary.overlaps > 0) {
    finding('A1', 'alta', 'Áudio da conversa continua tocando depois de sair da tela', 'Ao trocar de rota durante a fala, um clipe pendente começa ou continua e se sobrepõe à tela seguinte.', { afterLeave, audio: leaveSummary });
  }

  // Toques rápidos nas cartinhas / opções
  await page.audioReset();
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 5000, label: 'cartinhas 3' });
  await page.ev(`(() => { const c = document.querySelectorAll('.theme-card'); c[0].click(); c[1].click(); c[2].click(); })()`);
  await sleep(400);
  const cardsState = await page.ev(`({ cards: document.querySelectorAll('.theme-card').length, dim: document.querySelectorAll('.theme-card--dim').length, picked: document.querySelectorAll('.theme-card--picked').length })`);
  results.rapidCards = cardsState;
  check('toques rápidos abrem só uma cartinha', cardsState.picked <= 1, JSON.stringify(cardsState));
  const rapidSummary = await page.audioSummary();
  results.rapidCards.audio = rapidSummary;
  check('toques rápidos não sobrepõem áudio', rapidSummary.overlaps === 0, JSON.stringify(rapidSummary.overlapKinds));
  await page.shot('09-toques-rapidos.png');
}

async function scenarioTalkVoice(page) {
  log('\n[8] Conversa com voz: quanto tempo a criança espera até poder responder');
  await reseed(page, SEED);
  await page.audioReset();
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 6000, label: 'cartinhas' });
  const t0 = Date.now();
  await page.click('.theme-card');
  let optionsShown = false;
  let waitError = '';
  try {
    await page.waitFor(`document.querySelectorAll('.option').length >= 3`, { timeout: 30000, label: 'opções de humor' });
    optionsShown = true;
  } catch (e) { waitError = e.message; }
  const delayMs = Date.now() - t0;
  const audio = await page.audioSummary();
  results.talkVoice = { delayMs, optionsShown, waitError, audio };
  check('opções aparecem em até 3s depois da cartinha', optionsShown && delayMs < 3000, `delay=${delayMs}ms shown=${optionsShown}`);
  if (!optionsShown || delayMs >= 3000) {
    finding('C7', 'alta', 'Escolher a cartinha bloqueia a conversa até o áudio terminar', 'O app só mostra a pergunta de humor depois de await sayAndWait(cheer). Com TTS lento/ travado, a criança fica vários segundos sem opção; o busy=true também ignora novos toques.', { delayMs, optionsShown, waitError, audio });
  }
  await page.shot('14-voz-latencia.png');
}

async function scenarioName(page) {
  log('\n[10] Clipes com o nome da criança');
  const seeds = [['Gabi', GABI_SEED], ['Gabriela', GABRIELA_SEED]];
  results.nameClip = {};
  for (const [name, seed] of seeds) {
    await reseed(page, seed);
    await page.hash('#/');
    await page.waitFor(`!!document.querySelector('.hero__speak')`, { timeout: 5000, label: 'home' });
    // espera o cache de áudio novo estar disponível
    for (let i = 0; i < 30; i++) {
      const count = await page.ev(`caches.open('gabi-audio-v1').then((c) => c.keys()).then((k) => k.length).catch(() => 0)`);
      if (count >= 1700) break;
      await sleep(500);
    }
    const before = await page.ev(`window.__gabi.audio().clips`);
    await page.click('.hero__speak');
    await sleep(1500);
    await page.waitAudioIdle(10000);
    const after = await page.ev(`window.__gabi.audio().clips`);
    const playedClip = (after.opusOk + after.mp3Ok) > (before.opusOk + before.mp3Ok);
    const noTts = after.ttsOk === before.ttsOk;
    results.nameClip[name] = { before, after, playedClip, noTts };
    check(`saudação com ${name} usa clipe neural`, playedClip, JSON.stringify({ before, after }));
    check(`saudação com ${name} não cai no TTS`, noTts, JSON.stringify({ before, after }));
    if (!playedClip || !noTts) {
      finding('N1', 'alta', `Clipe com o nome ${name} não está sendo usado`, `A saudação gerada para ${name} não foi usada; verifique a chave do clipe e o cache.`, { name, before, after });
    }
    await page.shot(`16-nome-${name.toLowerCase()}.png`);
  }
}

async function scenarioSearch(page) {
  log('\n[9] Caça-palavras: voz do resultado x última palavra');
  await reseed(page, SEED);
  await page.audioReset();
  await page.hash('#/caca');
  await page.waitFor(`document.querySelectorAll('.ws-cell').length >= 36`, { timeout: 8000, label: 'grade do caça-palavras' });

  const data = await page.ev(`(() => {
    const cells = [...document.querySelectorAll('.ws-cell')];
    const n = Math.round(Math.sqrt(cells.length));
    const grid = Array.from({ length: n }, () => Array(n).fill(''));
    for (const c of cells) grid[Number(c.dataset.r)][Number(c.dataset.c)] = (c.textContent || '').trim().toUpperCase();
    return {
      n,
      grid,
      words: [...document.querySelectorAll('.ws-word__text')].map((w) => w.textContent.trim()),
    };
  })()`);

  const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const candidatesFor = (word) => {
    const key = norm(word).toUpperCase();
    const out = [];
    for (let r = 0; r < data.n; r++) {
      for (let c = 0; c < data.n; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
          if (r + dr * (key.length - 1) < 0 || r + dr * (key.length - 1) >= data.n) continue;
          if (c + dc * (key.length - 1) < 0 || c + dc * (key.length - 1) >= data.n) continue;
          let ok = true;
          for (let i = 0; i < key.length; i++) {
            if (data.grid[r + dr * i][c + dc * i] !== key[i]) { ok = false; break; }
          }
          if (ok) out.push({ start: [r, c], end: [r + dr * (key.length - 1), c + dc * (key.length - 1)] });
        }
      }
    }
    return out;
  };

  const clickCell = (r, c) => page.ev(`(() => {
    const el = document.querySelector('.ws-cell[data-r="${r}"][data-c="${c}"]');
    if (!el) return false;
    el.click();
    return true;
  })()`);

  const doneWords = () => page.ev(`(() => [...document.querySelectorAll('.ws-word')].filter((w) => w.classList.contains('done')).map((w) => w.querySelector('.ws-word__text')?.textContent.trim()).filter(Boolean))()`);

  const solved = new Set();
  let tried = 0;
  const solveOne = async (word) => {
    for (const cand of candidatesFor(word)) {
      tried++;
      const a = await clickCell(...cand.start);
      await sleep(70);
      const b = await clickCell(...cand.end);
      if (!a || !b) continue;
      await sleep(420);
      for (const w of await doneWords()) solved.add(w);
      if (solved.has(word)) return true;
    }
    return false;
  };

  // resolve todas menos uma; a última é a que dispara o resultado
  let remaining = data.words.filter((w) => !solved.has(w));
  while (remaining.length > 1) {
    const word = remaining[0];
    const ok = await solveOne(word);
    if (!ok) {
      check('caça-palavras: todas as palavras localizadas', false, `não achei ${word}`);
      await page.shot('15-caca-falha.png');
      return;
    }
    remaining = data.words.filter((w) => !solved.has(w));
  }
  const lastWord = remaining[0] || data.words[data.words.length - 1];
  await page.waitAudioIdle(10000);
  await page.audioReset();
  const lastOk = await solveOne(lastWord);
  check('caça-palavras: última palavra marcada', lastOk, lastWord);
  const winVisible = await page.ev(`!!document.querySelector('.ws-win') && !document.querySelector('.ws-win').hidden`);
  check('caça-palavras: tela de vitória aparece', winVisible);
  // deixa o resultado começar (o speak tem espera de 300ms no Android) e depois espera acabar
  await sleep(1600);
  await page.waitAudioIdle(12000);
  const summary = await page.audioSummary();
  const logData = await page.audioLog();
  const wordHeard = logData.some((e) => e.type === 'media-playing' || (e.type === 'tts-start' && e.text === lastWord));
  // o resultado agora tem clipe neural; aceita clipe ou TTS como prova de fala
  const resultIndex = JSON.parse(fs.readFileSync(path.join('app', 'audio', 'index.json'), 'utf8'));
  const resultFile = resultIndex['você encontrou todas as palavras'] || '';
  const resultStem = path.basename(resultFile).replace(/\.mp3$/i, '');
  const resultSpoken = logData.some((e) => e.type === 'tts-start' && /Você encontrou todas as palavras/i.test(e.text))
    || (!!resultStem && logData.some((e) => e.type === 'media-playing' && String(e.src || '').includes(resultStem)));
  results.search = { words: data.words, lastWord, tried, winVisible, wordHeard, resultSpoken, summary, log: logData.filter((e) => e.type.startsWith('overlap') || e.type === 'tts-start' || e.type === 'tts-end' || e.type === 'media-playing').slice(-80) };
  check('voz do resultado não sobrepõe a última palavra', summary.overlaps === 0, JSON.stringify(summary.overlapKinds));
  check('última palavra é falada antes do resultado', wordHeard, `lastWord=${lastWord}`);
  check('resultado do caça-palavras é falado', resultSpoken);
  if (!resultSpoken) {
    finding('S3', 'alta', 'Resultado do caça-palavras não é falado', 'A vitória aparece, mas a fala do resultado não chega ao TTS; a criança perde o retorno falado.', { lastWord, summary, log: results.search.log });
  }
  if (summary.overlaps > 0) {
    finding('S1', 'alta', 'Voz do resultado do caça-palavras sobrepõe a última palavra', 'Ao marcar a última palavra, markFound() fala a palavra e finish() fala o resultado em seguida. Em vez de esperar a fala da palavra terminar, o resultado entra por cima (ou corta a palavra).', { lastWord, summary, log: results.search.log });
  } else if (!wordHeard) {
    finding('S2', 'media', 'A última palavra do caça-palavras é cortada pelo resultado', 'O resultado começa antes de a última palavra ser ouvida; a criança não escuta a palavra que acabou de encontrar.', { lastWord, summary, log: results.search.log });
  }
  await page.shot('15-caca-resultado.png');
}

async function scenarioMicExit(page) {
  log('\n[7] Sair da conversa durante a escuta (SpeechRecognition falso)');
  await page.audioReset();
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 5000, label: 'cartinhas' });
  await page.click('.theme-card');
  await page.waitFor(`document.querySelectorAll('.option').length >= 3`, { timeout: 8000, label: 'humor' });
  await page.click('.option', 'Bem');
  await page.waitFor(`!!document.querySelector('.mic')`, { timeout: 8000, label: 'livre' });
  await page.click('.mic');
  await sleep(500);
  const before = await page.ev(`({ started: window.__fakeSR?.started, aborted: window.__fakeSR?.aborted, listening: document.body.classList.contains('gabi-listening') })`);
  results.micExit = { before };
  check('o microfone falso começou a ouvir', before.started >= 1 && before.listening, JSON.stringify(before));
  await page.hash('#/');
  await sleep(700);
  const after = await page.ev(`({ started: window.__fakeSR?.started, aborted: window.__fakeSR?.aborted, stopped: window.__fakeSR?.stopped, listening: document.body.classList.contains('gabi-listening'), onHome: document.body.innerText.includes('Sua próxima aula') })`);
  results.micExit.after = after;
  check('sair da conversa aborta o reconhecimento', after.aborted >= 1, JSON.stringify(after));
  check('sair da conversa desliga o indicador de escuta', !after.listening, JSON.stringify(after));
  if (after.aborted === 0) {
    finding('C6', 'media', 'Sair da conversa durante a escuta não aborta o microfone', 'onExit() chama stopSpeaking(), mas não abortListening(); o SpeechRecognition continua ativo por até 12s (ou até o serviço responder) depois de trocar de tela.', { before, after });
  }
  await page.shot('13-sair-durante-escuta.png');
}

async function scenarioAudioCold(page) {
  log('\n[4] Corrida de áudio em cold start (índice de clipes atrasado 3000ms)');
  await page.audioReset();
  await page.hash('#/');
  await page.hash('#/conversar');
  await page.waitFor(`document.querySelectorAll('.theme-card').length === 3`, { timeout: 6000, label: 'cartinhas' });
  // clica antes de a introdução conseguir carregar o índice
  await page.click('.theme-card');
  await sleep(3200);
  const summary = await page.audioSummary();
  const logData = await page.audioLog();
  results.coldStart = { summary, log: logData };
  check('cold start: sem sobreposição de clipes', summary.overlaps === 0, JSON.stringify(summary.overlapKinds));
  if (summary.overlaps > 0) {
    finding('A2', 'alta', 'Clipes de áudio se sobrepõem quando o índice demora (cold start / tablet lento)', 'Com 1,5s de atraso no índice de áudio, tocar na cartinha antes do fim da fala de abertura faz a fala antiga e a nova tocarem juntas. O playClip antigo não verifica se foi cancelado antes de chamar play().', {
      overlaps: summary.overlaps,
      kinds: summary.overlapKinds,
      events: logData.filter((e) => e.type.startsWith('overlap-') || e.type === 'play-while-active').slice(0, 8),
    });
  }
  await page.shot('10-coldstart.png');
  const bubbles = await page.bubbles();
  results.coldStart.bubbles = bubbles;
}

async function scenarioCopyright(page) {
  log('\n[12] Copyright e créditos');
  await reseed(page, SEED);
  await page.hash('#/pais');
  await page.waitFor(`document.querySelectorAll('.tabs button').length >= 4`, { timeout: 8000, label: 'abas dos pais' });
  await page.click('.tabs button', 'Ajustes', { optional: true });
  await sleep(700);
  const text = await page.ev(`document.body.innerText`);
  const ok = /Sobre e direitos/.test(text)
    && /Idealizador e criador: Eudes Patricio/.test(text)
    && /Todos os direitos reservados/.test(text);
  check('seção Sobre e direitos com Eudes Patricio', ok, text.slice(0, 300));
  await page.ev(`(() => { const sc = document.querySelector('#screen'); if (sc) sc.scrollTop = sc.scrollHeight; window.scrollTo(0, document.documentElement.scrollHeight); })()`);
  await sleep(350);
  await page.shot('18-copyright.png');
}

async function scenarioStatement(page) {
  log('\n[11] Enunciado do exercício falado');
  await reseed(page, SEED);
  await page.hash('#/licao/u1/0');
  await page.waitFor(`!!document.querySelector('.lesson')`, { timeout: 8000, label: 'lição' });
  const teach = await page.click('.btn', 'Entendi', { optional: true });
  if (!teach.ok) {
    check('lição abriu no primeiro exercício', false, JSON.stringify(teach));
    return;
  }
  await page.waitFor(`document.querySelectorAll('.option').length >= 2`, { timeout: 8000, label: 'primeiro exercício' });
  // o enunciado "fogo. Quantas sílabas tem a palavra fogo?" tem ~2,3 s
  await sleep(4500);
  const last = await page.ev(`window.__gabi.audio().clips.last`);
  const key = String(last?.key || '');
  const clips = await page.ev(`window.__gabi.audio().clips`);
  const hasStatement = /quantas sílabas|qual palavra|com que sílaba|monte a palavra|complete a palavra|escreva a palavra|leia esta palavra/i.test(key);
  const spoke = hasStatement || clips.opusOk > 0 || clips.ttsOk > 0;
  results.statement = { key, last, clips };
  check('enunciado completo do exercício tem áudio', spoke, JSON.stringify({ last, clips }));
  if (!spoke) {
    finding('L1', 'alta', 'Enunciado do exercício não é falado', 'O exercício mostra a pergunta, mas o áudio não toca o enunciado completo.', { key, last, clips });
  }
  await page.shot('17-enunciado-licao.png');
}

async function scenarioLessonRapid(page) {
  log('\n[5] Lição completa com avanço rápido e replay');
  await reseed(page, SEED);
  await page.audioReset();
  await page.hash('#/licao/u1/0');
  await page.waitFor(`!!document.querySelector('.lesson')`, { timeout: 8000, label: 'lição' });
  // escuta simulada: devolve a linha que está na tela, sem pedir microfone real
  await page.ev(`if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [], active: true });`);
  await page.ev(`import('/js/speech.js').then((m) => m.__setListenOverride(async () => {
    const line = (document.querySelector('.read-line')?.innerText || 'bola').replace(/\\s+/g, ' ').trim();
    await new Promise((r) => setTimeout(r, 420));
    return { ok: true, transcript: line, alternatives: [line] };
  }))`);
  await page.waitFor(`!document.querySelector('.listening, .gabi-listening')`, { timeout: 1000, label: 'sem escuta presa' }).catch(() => {});
  let steps = 0;
  let sawResult = false;
  for (; steps < 60; steps++) {
    if (await page.ev(`!!document.querySelector('.result')`)) { sawResult = true; break; }
    const teach = await page.ev(`[...document.querySelectorAll('.btn')].some((b) => /Entendi/.test(b.textContent))`);
    if (teach) {
      await page.ev(`[...document.querySelectorAll('.btn')].find((b) => /Entendi/.test(b.textContent)).click()`);
      await sleep(120);
      continue;
    }
    // responde uma escolha (a primeira não eliminada), sem esperar o áudio
    const clickedOption = await page.ev(`(() => {
      const opts = [...document.querySelectorAll('.option')];
      if (!opts.length || document.querySelector('.option--ok')) return false;
      const o = opts.find((x) => !x.classList.contains('option--dim') && !x.classList.contains('option--ok'));
      if (!o) return false;
      o.click(); return true;
    })()`);
    if (clickedOption) {
      await sleep(90);
      // clica no replay no meio do feedback para forçar concorrência
      await page.click('.btn--icon', null, { optional: true });
      await page.click('.lesson__foot .btn', 'Continuar|resultado|Concluir', { optional: true });
      await sleep(80);
      continue;
    }
    const euLi = await page.ev(`(() => { const b = [...document.querySelectorAll('.btn')].find((x) => /Eu li/.test(x.textContent)); if (b) { b.click(); return true; } return false; })()`);
    if (euLi) { await sleep(120); continue; }
    const cont = await page.click('.lesson__foot .btn', 'Continuar|resultado|Concluir', { optional: true });
    if (cont.ok) { await sleep(100); continue; }
    const mic = await page.ev(`!!document.querySelector('.mic') && !document.querySelector('.mic').hidden`);
    if (mic) {
      await page.ev(`document.querySelector('.mic').click()`);
      await sleep(700);
      continue;
    }
    await sleep(200);
  }
  check('lição chega ao resultado', sawResult);
  const summary = await page.audioSummary();
  const lessonLog = await page.audioLog();
  results.lessonRapid = { steps, summary, body: (await page.text()).slice(-1200), log: lessonLog.filter((e) => e.type.startsWith('overlap') || e.type === 'play-while-active' || e.type === 'start-after-stop').slice(-120) };
  check('lição rápida sem sobreposição de áudio', summary.overlaps === 0, JSON.stringify(summary.overlapKinds));
  if (summary.overlaps > 0) {
    finding('A3', 'alta', 'Áudio da lição se sobrepõe ao avançar rápido', 'O timer de 380ms de show() não é cancelado ao trocar de exercício; dois speak() do mesmo item podem disparar juntos.', { steps, summary });
  }
  check('lição rápida sem erros de JavaScript', page.errors.length === 0, page.errors.slice(0, 3).join(' || '));
  await page.clearListen();
  await page.shot('11-licao-rapida.png');
}

async function scenarioNavigation(page) {
  log('\n[6] Navegação rápida entre telas');
  await page.audioReset();
  const routes = ['#/', '#/trilha', '#/pais', '#/vozes', '#/historias', '#/conversar', '#/caca', '#/adesivos', '#/licao/u2/0', '#/'];
  for (const r of routes) {
    await page.hash(r);
    await sleep(180);
  }
  await sleep(1800);
  const state = await page.ev(`({
    screen: document.getElementById('screen')?.innerText.slice(0, 120) || '',
    speaking: document.body.classList.contains('gabi-speaking'),
    media: window.__stressAudio.active().length,
    tts: window.__stressAudio.tts().length,
    modal: document.querySelector('#modal-root.open') ? true : false,
  })`);
  results.navigation = state;
  check('navegação termina em uma tela válida', state.screen.length > 0, state.screen);
  check('navegação não deixa áudio preso', state.media === 0 && state.tts === 0, JSON.stringify(state));
  if (state.media > 0 || state.tts > 0 || state.speaking) {
    finding('A2', 'alta', 'Trocar de tela não interrompe o áudio da tela anterior', 'O roteador não chama stopSpeaking() ao trocar de rota. A fala de um card de ensino ou de um exercício continua no alto-falante depois de voltar para a home; se a próxima tela falar, os dois áudios se sobrepõem.', { state });
  }
  check('navegação não deixa modal preso', !state.modal, JSON.stringify(state));
  check('navegação sem erros de JavaScript', page.errors.length === 0, page.errors.slice(0, 3).join(' || '));
  await page.shot('12-navegacao.png');
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */
async function main() {
  const args = process.argv.slice(2);
  const getArg = (name, fallback = null) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const scenario = getArg('--scenario', 'all');
  const slowIndex = Number(getArg('--slow-index', 3000));
  log(`Stress Professor Gabi v49 — ${stamp()}`);
  log(`DevTools: ${DEVTOOLS} | App: ${APP_URL}`);
  const browser = await CDP.connect();
  log(`Chrome: ${browser.info.Browser}`);
  log('Escuta: os cenários usam o hook __setListenOverride + getUserMedia simulado (sem prompt).');

  let page;
  let prevState;
  try {
    if (scenario === 'all' || scenario === 'boot' || scenario === 'talk' || scenario === 'interrupt' || scenario === 'lesson' || scenario === 'nav' || scenario === 'voice' || scenario === 'search' || scenario === 'name' || scenario === 'statement' || scenario === 'copyright') {
      page = await openPage(browser);
      await bootApp(page);
      prevState = page.__prevState;
      if (scenario === 'all' || scenario === 'boot') await scenarioBoot(page);
      if (scenario === 'all' || scenario === 'talk') await scenarioTalkNormal(page);
      if (scenario === 'all' || scenario === 'interrupt') await scenarioTalkInterrupt(page);
      if (scenario === 'all' || scenario === 'voice') await scenarioTalkVoice(page);
      if (scenario === 'all' || scenario === 'search') await scenarioSearch(page);
      if (scenario === 'all' || scenario === 'name') await scenarioName(page);
      if (scenario === 'all' || scenario === 'copyright') await scenarioCopyright(page);
      if (scenario === 'all' || scenario === 'statement') await scenarioStatement(page);
      if (scenario === 'all' || scenario === 'lesson') await scenarioLessonRapid(page);
      if (scenario === 'all' || scenario === 'nav') await scenarioNavigation(page);
      await restore(page);
      await page.close();
    }
    if (scenario === 'all' || scenario === 'mic') {
      page = await openPage(browser, { fakeSR: true });
      await bootApp(page);
      prevState = page.__prevState;
      await scenarioMicExit(page);
      await restore(page);
      await page.close();
    }
    if (scenario === 'all' || scenario === 'audio') {
      page = await openPage(browser);
      await bootApp(page, { url: `${APP_URL}?slowIndex=${slowIndex}` });
      prevState = page.__prevState;
      await scenarioAudioCold(page);
      await restore(page);
      await page.close();
    }
  } catch (e) {
    log(`\n💥 ${e.message}`);
    results.error = e.stack || e.message;
    check('bateria concluiu sem exceção', false, e.message);
    try { if (page) { await page.shot('99-falha.png'); await restore(page); await page.close(); } } catch { /* ignore */ }
  } finally {
    browser.close();
    results.finished = stamp();
    fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
    const failed = results.checks.filter((c) => !c.ok).length;
    log(`\nResumo: ${results.checks.length - failed}/${results.checks.length} verificações OK | ${results.findings.length} achado(s)`);
    log(`Evidências: ${path.relative(process.cwd(), OUT)}`);
    process.exit(failed || results.error ? 1 : 0);
  }
}

main();
