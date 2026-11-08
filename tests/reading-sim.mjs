/* Simula a leitura em voz alta (sem microfone real) e valida a correção da história.
   Uso: node tests/reading-sim.mjs
   Cobre: fala sem sentido não avança; fala certa avança; botão "Continuar com ajuda"
   aparece uma vez; erro da escuta não trava; toque no microfone cancela. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_PORT = 8096;
const CDP_PORT = 9337;
const BASE = `http://127.0.0.1:${APP_PORT}/`;
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

async function evaluate(expression, sessionId) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true }, sessionId);
  if (r?.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r?.result?.result?.value;
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch { /* ainda não */ }
    await sleep(250);
  }
  return false;
}

const UI = `(() => {
  const lineEls = [...document.querySelectorAll('.read-line')];
  return {
    line: document.querySelector('.q-sub')?.textContent || '',
    hint: document.querySelector('.mic__hint')?.textContent || '',
    micHidden: !!document.querySelector('.mic-dock .mic')?.hidden,
    continueBtns: [...document.querySelectorAll('.mic-dock .btn')].filter((b) => b.textContent.trim() === 'Continuar com ajuda').length,
    activeLine: lineEls.findIndex((p) => p.style.opacity === '1'),
    lines: lineEls.map((p) => p.textContent.trim()),
  };
})()`;

const server = spawn(process.execPath, ['server/serve.mjs', String(APP_PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-reading-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--hide-scrollbars',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--window-size=1024,768', 'about:blank'], { stdio: 'ignore' });

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
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `if (!window.webkitSpeechRecognition) window.webkitSpeechRecognition = function FakeASR() {};
             if (!window.SpeechRecognition) window.SpeechRecognition = window.webkitSpeechRecognition;`,
  }, sessionId);
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
  await sleep(1400);
  await evaluate("[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Entendi'))?.click()", sessionId);
  await sleep(1000);

  check('tela de leitura montada', await evaluate("!!document.querySelector('.read-stage .text-read')", sessionId));

  // microfone falso: evita o pedido de permissão do Chrome headless
  await evaluate(`(() => {
    const fake = { getTracks: () => [{ stop() {} }] };
    try {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => fake } });
    } catch { /* ignore */ }
    return true;
  })()`, sessionId);
  await evaluate(`import('./js/speech.js').then((m) => m.__setListenOverride(() => {
    if (window.__throwListen) throw new Error('boom');
    if (window.__slowListen) return new Promise((resolve) => setTimeout(() => resolve({ ok:true, transcript:'nada', alternatives:['nada'] }), 2500));
    return window.__listenResult;
  }))`, sessionId);
  await evaluate("window.__listenResult = { ok:true, transcript:'nada a ver', alternatives:['nada a ver'] }", sessionId);

  const before = await evaluate(UI, sessionId);
  console.log('  história:', JSON.stringify(before));
  check('começa na linha 1', before.activeLine === 0);

  // 1) fala sem sentido não pode avançar nem elogiar
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(900);
  const wrong = await evaluate(UI, sessionId);
  check('fala sem sentido não avança', wrong.activeLine === 0);
  check('fala sem sentido pede para tentar de novo', /Quase|Não ouvi/.test(wrong.hint), wrong.hint);
  check('sem botão de continuar na 1ª tentativa', wrong.continueBtns === 0);

  // 2) três tentativas: aparece um único "Continuar com ajuda"
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(900);
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(900);
  const third = await evaluate(UI, sessionId);
  check('botão de continuar aparece após 3 tentativas', third.continueBtns === 1, JSON.stringify(third));
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(900);
  const fourth = await evaluate(UI, sessionId);
  check('não duplica o botão de continuar', fourth.continueBtns === 1, JSON.stringify(fourth));

  // 3) continuar com ajuda avança e limpa o botão
  await evaluate("[...document.querySelectorAll('.mic-dock .btn')].find(b => b.textContent.trim() === 'Continuar com ajuda').click()", sessionId);
  await sleep(900);
  const next = await evaluate(UI, sessionId);
  check('continuar com ajuda avança para a linha 2', next.activeLine === 1, JSON.stringify(next));
  check('botão de continuar não fica na linha seguinte', next.continueBtns === 0);

  // 4) leitura certa avança
  const line2 = next.lines[1];
  await evaluate(`window.__listenResult = { ok:true, transcript: ${JSON.stringify(line2)}, alternatives: [${JSON.stringify(line2)}] }`, sessionId);
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(1400);
  const read = await evaluate(UI, sessionId);
  check('leitura certa avança para a linha 3', read.activeLine === 2, JSON.stringify(read));

  // 5) exceto na escuta não deixa o microfone travado
  await evaluate('window.__throwListen = true', sessionId);
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(900);
  const crashed = await evaluate(UI, sessionId);
  check('erro da escuta mostra mensagem e libera o microfone', !crashed.micHidden && /Não consegui|Não ouvi/.test(crashed.hint), JSON.stringify(crashed));
  await evaluate('window.__throwListen = false', sessionId);

  // 6) tocar no microfone durante a escuta cancela (não fica 12 s travado)
  await evaluate('window.__slowListen = true', sessionId);
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(700);
  await evaluate("document.querySelector('.mic-dock .mic').click()", sessionId);
  await sleep(400);
  const cancelled = await evaluate(UI, sessionId);
  check('toque no microfone cancela a escuta', cancelled.hint.includes('Paramos'), JSON.stringify(cancelled));
  await sleep(2600);
  const afterCancel = await evaluate(UI, sessionId);
  check('cancelar não avança sozinho depois', afterCancel.activeLine === 2, JSON.stringify(afterCancel));

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
