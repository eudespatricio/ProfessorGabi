/* Fotos/verificações dos dois ajustes de exercício (v34):
   - sílaba faltando com lacuna visível
   - pecinhas iguais agrupadas (um "a ×2" em vez de dois "a")
   Uso: node tests/lesson-shots.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_PORT = 8094;
const CDP_PORT = 9338;
const BASE = `http://127.0.0.1:${APP_PORT}/`;
const OUT = path.resolve('tests', 'screenshots');
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
let failed = 0;
function check(label, cond, extra = '') {
  if (cond) console.log('  ✅', label);
  else { failed++; console.log('  ❌', label, extra); }
}

const server = spawn(process.execPath, ['server/serve.mjs', String(APP_PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-lesson-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--hide-scrollbars',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--window-size=1024,768', 'about:blank'], { stdio: 'ignore' });

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
  await evaluate("location.hash = '#/licao/u2/1'", sessionId);
  await sleep(1200);
  await evaluate("[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Entendi'))?.click()", sessionId);
  await sleep(800);

  // item 1: contar sílabas — tenta as opções até acertar
  for (let i = 0; i < 3; i++) {
    if (await evaluate("!!document.querySelector('.option--ok')", sessionId)) break;
    await evaluate(`document.querySelectorAll('.option')[${i}]?.click()`, sessionId);
    await sleep(350);
  }
  await evaluate("[...document.querySelectorAll('.lesson__foot .btn')].find(b => /Continuar|resultado/.test(b.textContent))?.click()", sessionId);
  await sleep(700);

  // item 2: montar "nota" — clica nas sílabas na ordem
  await evaluate("[...document.querySelectorAll('.tile')].find(b => b.textContent.trim() === 'no')?.click()", sessionId);
  await sleep(200);
  await evaluate("[...document.querySelectorAll('.tile')].find(b => b.textContent.trim() === 'ta')?.click()", sessionId);
  await sleep(500);
  await evaluate("[...document.querySelectorAll('.lesson__foot .btn')].find(b => /Continuar|resultado/.test(b.textContent))?.click()", sessionId);
  await sleep(800);

  // item 3: sílaba faltando em "bolo"
  const missing = await evaluate(`(() => {
    const word = document.querySelector('.word-big');
    const slot = document.querySelector('.word-big .slot-inline');
    const opts = [...document.querySelectorAll('.option')].map((b) => b.textContent.trim());
    return { prompt: document.querySelector('.q')?.textContent, word: word?.textContent || '', hasSlot: !!slot, opts };
  })()`, sessionId);
  console.log('  sílaba faltando:', JSON.stringify(missing));
  check('mostra a palavra com lacuna', missing.hasSlot && missing.word.includes('?'), JSON.stringify(missing));
  check('três opções sem repetição', new Set(missing.opts).size === missing.opts.length);
  await shot('lesson-missing-1024x768.png', sessionId);

  // clicar na opção errada não marca como certa; depois acertar
  const wrongIndex = missing.opts.findIndex((o) => !/^bo$/.test(o) && !/^lo$/.test(o));
  if (wrongIndex >= 0) {
    await evaluate(`document.querySelectorAll('.option')[${wrongIndex}]?.click()`, sessionId);
    await sleep(500);
    check('opção errada não vira acerto', !(await evaluate("!!document.querySelector('.option--ok')", sessionId)));
  }
  const boIndex = missing.opts.findIndex((o) => o === 'bo');
  if (boIndex >= 0) {
    await evaluate(`document.querySelectorAll('.option')[${boIndex}]?.click()`, sessionId);
    await sleep(500);
  }
  check('opção certa é aceita', await evaluate("!!document.querySelector('.option--ok')", sessionId));
  await evaluate("[...document.querySelectorAll('.lesson__foot .btn')].find(b => /Continuar|resultado/.test(b.textContent))?.click()", sessionId);
  await sleep(800);

  // item 4: ditado "pirata" — o "a" repetido é um só botão com ×2
  const dict = await evaluate(`(() => {
    const tiles = [...document.querySelectorAll('.tiles .tile')];
    const a = tiles.find((b) => b.querySelector('.tile__label')?.textContent === 'a');
    return {
      prompt: document.querySelector('.q')?.textContent,
      tiles: tiles.length,
      slots: document.querySelectorAll('.slots .slot').length,
      aText: a?.textContent || '',
      aCount: a?.querySelector('.tile__count')?.textContent || '',
      aLabel: a?.getAttribute('aria-label') || '',
    };
  })()`, sessionId);
  console.log('  ditado:', JSON.stringify(dict));
  check('um único botão para as duas letras "a"', dict.aCount === '×2', JSON.stringify(dict));
  check('restam os outros botões (7 grupos para 6 espaços + 2 distratores)', dict.tiles === 7, JSON.stringify(dict));
  await shot('lesson-dictation-1024x768.png', sessionId);

  // clicar duas vezes preenche dois espaços; remover um devolve a peça
  await evaluate("[...document.querySelectorAll('.tiles .tile')].find(b => b.querySelector('.tile__label')?.textContent === 'a')?.click()", sessionId);
  await sleep(150);
  await evaluate("[...document.querySelectorAll('.tiles .tile')].find(b => b.querySelector('.tile__label')?.textContent === 'a')?.click()", sessionId);
  await sleep(250);
  const filled = await evaluate("document.querySelectorAll('.slots .slot--filled').length", sessionId);
  check('"a" preenche dois espaços, um por vez', filled === 2, `filled=${filled}`);
  await evaluate("document.querySelector('.slots .slot--filled')?.click()", sessionId);
  await sleep(250);
  const afterRemove = await evaluate(`(() => {
    const a = [...document.querySelectorAll('.tiles .tile')].find((b) => b.querySelector('.tile__label')?.textContent === 'a');
    return { filled: document.querySelectorAll('.slots .slot--filled').length, count: a?.querySelector('.tile__count')?.textContent || '' };
  })()`, sessionId);
  check('remover do espaço devolve a peça (volta para ×1)', afterRemove.filled === 1 && afterRemove.count === '×1', JSON.stringify(afterRemove));

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
