/* Fotos de verificação da tela "Leia a história" (dock do microfone).
   Uso: node tests/story-shot.mjs
   Sobe um servidor próprio de app/ e um Chrome headless em 1024x768, 768x1024 e 800x1280. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { APP_VERSION } from '../app/js/version.js';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_PORT = 8098;
const CDP_PORT = 9334;
const BASE = `http://127.0.0.1:${APP_PORT}/`;
const OUT = path.resolve('tests', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let msgId = 0;
const pending = new Map();
const errors = [];
let ws;

function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

async function evaluate(expression, sessionId, userGesture = false) {
  const r = await send('Runtime.evaluate', {
    expression, returnByValue: true, awaitPromise: true,
    ...(userGesture ? { userGesture: true } : {}),
  }, sessionId);
  if (r?.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
  return r?.result?.result?.value;
}

async function shot(name, sessionId) {
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log('  📸', path.relative(process.cwd(), file));
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch { /* ainda não */ }
    await sleep(250);
  }
  return false;
}

const server = spawn(process.execPath, ['server/serve.mjs', String(APP_PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-story-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--hide-scrollbars',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--window-size=1024,768', 'about:blank'], { stdio: 'ignore' });

const METRICS = `(() => {
  const dock = document.querySelector('.mic-dock');
  const mic = document.querySelector('.mic-dock .mic');
  const body = document.querySelector('.lesson__body');
  const text = document.querySelector('.read-stage .text-read');
  const r = (el) => el ? el.getBoundingClientRect() : null;
  return {
    viewport: { w: innerWidth, h: innerHeight },
    dock: r(dock), mic: r(mic), text: r(text),
    bodyScroll: body ? { top: body.scrollTop, height: body.scrollHeight, client: body.clientHeight } : null,
    dockPosition: dock ? getComputedStyle(dock).position : null,
    micVisible: !!mic && mic.getBoundingClientRect().bottom <= innerHeight && mic.getBoundingClientRect().top >= 0,
    dockVisible: !!dock && dock.getBoundingClientRect().bottom <= innerHeight + 1 && dock.getBoundingClientRect().top >= 0,
    textScrollable: !!body && body.scrollHeight > body.clientHeight,
  };
})()`;

let failed = 0;
function check(label, cond, extra = '') {
  if (cond) console.log('  ✅', label);
  else { failed++; console.log('  ❌', label, extra); }
}

try {
  if (!(await waitFor(`${BASE}healthz`))) throw new Error('servidor não subiu');
  if (!(await waitFor(`http://127.0.0.1:${CDP_PORT}/json/version`))) throw new Error('Chrome CDP não subiu');
  const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) reject(new Error(m.error.message)); else resolve(m);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  };

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);

  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(1200);
  await evaluate(`localStorage.setItem('gabi.state.v1', JSON.stringify({
    onboarded: true,
    child: { name: 'Ana', avatar: '🦊' },
    settings: { muted: true, sound: false, rate: 0.9, voiceURI: '', readScale: 1, reduceMotion: true, sessionTarget: 10, freeMode: true, pin: '', llm: { enabled: false } },
    progress: { xp: 240, coins: 90, streak: { last: '', days: 4, best: 4 }, startUnit: 'u1', units: {}, lessons: {} },
    skills: {}, stickers: [], days: {}, history: []
  })); location.reload();`, sessionId);
  await sleep(1500);
  await evaluate("location.hash = '#/licao/u9/0'", sessionId);
  await sleep(1600);

  // pula o cartão de ensino da história
  await evaluate("[...document.querySelectorAll('.btn')].find(b=>b.textContent.includes('Entendi'))?.click()", sessionId);
  await sleep(1200);

  check('tela de leitura montada', await evaluate("!!document.querySelector('.read-stage .text-read')", sessionId));
  check('dock do microfone presente', await evaluate("!!document.querySelector('.mic-dock .mic')", sessionId));

  const metrics = await evaluate(METRICS, sessionId);
  console.log('  métricas 1024x768:', JSON.stringify(metrics));
  check('microfone visível sem rolar (1024x768)', metrics.micVisible);
  check('dock visível sem rolar (1024x768)', metrics.dockVisible);
  check('dock é sticky', metrics.dockPosition === 'sticky');
  await shot('story-dock-1024x768.png', sessionId);

  // rola o texto e confirma que o dock continua no lugar
  await evaluate("document.querySelector('.lesson__body').scrollTop = 420", sessionId);
  await sleep(500);
  const afterScroll = await evaluate(METRICS, sessionId);
  check('microfone continua visível depois de rolar', afterScroll.micVisible);
  await shot('story-dock-1024x768-scrolled.png', sessionId);

  await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 1, mobile: true }, sessionId);
  await evaluate("document.querySelector('.lesson__body').scrollTop = 0", sessionId);
  await sleep(700);
  const phone = await evaluate(METRICS, sessionId);
  check('microfone visível no celular (360x640)', phone.micVisible);
  await shot('story-dock-360x640.png', sessionId);

  await send('Emulation.setDeviceMetricsOverride', { width: 640, height: 360, deviceScaleFactor: 1, mobile: true }, sessionId);
  await evaluate("document.querySelector('.lesson__body').scrollTop = 0", sessionId);
  await sleep(700);
  const landscape = await evaluate(METRICS, sessionId);
  console.log('  métricas 640x360:', JSON.stringify(landscape));
  check('microfone visível no landscape (640x360)', landscape.micVisible);
  check('texto rolável no landscape (dock sticky de verdade)', landscape.textScrollable);
  await evaluate("document.querySelector('.lesson__body').scrollTop = 260", sessionId);
  await sleep(500);
  const landscapeScrolled = await evaluate(METRICS, sessionId);
  check('microfone visível depois de rolar no landscape', landscapeScrolled.micVisible);
  await shot('story-dock-640x360.png', sessionId);

  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true }, sessionId);
  await evaluate("document.querySelector('.lesson__body').scrollTop = 0", sessionId);
  await sleep(700);
  const portrait = await evaluate(METRICS, sessionId);
  console.log('  métricas 768x1024:', JSON.stringify(portrait));
  check('microfone visível no retrato (768x1024)', portrait.micVisible);
  await shot('story-dock-768x1024.png', sessionId);

  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 1280, deviceScaleFactor: 1, mobile: true }, sessionId);
  await sleep(700);
  const tall = await evaluate(METRICS, sessionId);
  check('microfone visível no tablet alto (800x1280)', tall.micVisible);
  await shot('story-dock-800x1280.png', sessionId);

  // diagnóstico na área dos pais (versão + áudio offline)
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true }, sessionId);
  await evaluate("location.hash = '#/pais'", sessionId);
  await sleep(900);
  await evaluate("[...document.querySelectorAll('.tabs button')].find(b => b.textContent === 'Dados')?.click()", sessionId);
  await sleep(700);
  check(`diagnóstico mostra a versão ${APP_VERSION}`, await evaluate(`document.body.innerText.includes('Versão do app: ${APP_VERSION}')`, sessionId));
  await shot('pais-dados-1024x768.png', sessionId);
  await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Verificar áudio offline'))?.click()", sessionId);
  await sleep(1500);
  const debugAudio = await evaluate(`(async () => {
    const keys = await caches.keys();
    const out = { keys, caches: {} };
    for (const k of keys) {
      const c = await caches.open(k);
      const reqs = await c.keys();
      out.caches[k] = { count: reqs.length, sample: reqs.slice(0, 4).map((r) => r.url) };
    }
    out.controller = !!navigator.serviceWorker.controller;
    try { out.index = await (await fetch('audio/index-opus.json')).json().then((j) => Object.keys(j).length); } catch (e) { out.index = String(e); }
    return out;
  })()`, sessionId);
  console.log('  debug áudio:', JSON.stringify(debugAudio));
  const audioStatus = await evaluate("[...document.querySelectorAll('.card .small')].map(e => e.textContent).find(t => t.includes('Áudio offline')) || ''", sessionId);
  console.log('  status do áudio offline:', JSON.stringify(audioStatus));

  // simula o tablet sem internet e tenta tocar um clipe ElevenLabs do cache
  await send('Network.enable', {}, sessionId);
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }, sessionId);
  await sleep(500);
  const playedOffline = await evaluate("import('./js/audio.js').then(m => m.playClip('gato', 1))", sessionId, true);
  const clips = await evaluate("window.__gabi.audio().clips", sessionId);
  console.log('  clipe offline "gato":', playedOffline, JSON.stringify(clips));
  check('clipe ElevenLabs toca sem internet', playedOffline === true && clips.opusOk >= 1);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, sessionId);

  console.log('\nerros de JS:', errors.length);
  for (const e of errors.slice(0, 5)) console.log('  ⚠️', e);
  check('sem erros de JS', errors.length === 0);
  console.log(failed ? `\n${failed} verificação(ões) falharam` : '\nTUDO OK ✅');
} catch (e) {
  console.error('FALHA:', e.message);
  failed++;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  try { chrome.kill(); } catch { /* ignore */ }
  try { server.kill(); } catch { /* ignore */ }
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(failed ? 1 : 0);
}
