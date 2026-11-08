/* Smoke test real no Chrome: carrega o app, navega, responde uma questão e tira prints.
   Uso: node tests/smoke.mjs [--keep]  */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_PORT = 8099;
const CDP_PORT = 9333;
const BASE = `http://127.0.0.1:${APP_PORT}/`;
const OUT = path.resolve('tests', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch { /* ainda não */ }
    await sleep(250);
  }
  return false;
}

const server = spawn(process.execPath, ['server/serve.mjs', String(APP_PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--mute-audio', '--hide-scrollbars',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  '--window-size=1024,768', 'about:blank',
], { stdio: 'ignore' });

let ws;
let msgId = 0;
const pending = new Map();
const errors = [];

function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}

async function evaluate(expression, sessionId) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (r?.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' ' + (r.result.exceptionDetails.exception?.description || ''));
  return r?.result?.result?.value;
}

async function shot(name, sessionId) {
  const r = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log('  📸', path.relative(process.cwd(), file));
}

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
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push('exception: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push('console: ' + m.params.args.map((a) => a.value || a.description).join(' '));
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      const txt = m.params.entry.text || '';
      // ruído conhecido do Chrome headless (sem gesto real / sem áudio)
      if (/vibrate|AudioContext|beforeinstallprompt/i.test(txt)) return;
      errors.push('log: ' + txt);
    }
  };

  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true }, sessionId);

  console.log('\n1) Primeira abertura (onboarding)');
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(1600);
  check('app visível', await evaluate("!document.getElementById('app').hidden", sessionId));
  check('onboarding na tela', await evaluate("!!document.querySelector('#child-name')", sessionId));
  await shot('01-onboarding.png', sessionId);

  console.log('\n2) Estado pronto (nome + ajustes) e tela inicial');
  await evaluate(`localStorage.setItem('gabi.state.v1', JSON.stringify({
    onboarded: true,
    child: { name: 'Ana', avatar: '🦊' },
    settings: { muted: true, sound: false, rate: 0.9, voiceURI: '', readScale: 1, reduceMotion: true, sessionTarget: 10, freeMode: false, pin: '', llm: { enabled: false } },
    progress: { xp: 240, coins: 90, streak: { last: '', days: 4, best: 4 }, startUnit: 'u2', units: {}, lessons: {} },
    skills: { leitura: { ok: 6, n: 9 }, consciencia: { ok: 12, n: 13 }, escrita: { ok: 7, n: 9 }, ortografia: { ok: 4, n: 6 }, silabas: { ok: 5, n: 6 } },
    stickers: ['primeira', 'silabas', 'tresdias'],
    days: {}, history: []
  })); location.href = '${BASE}';`, sessionId);
  await sleep(1800);
  check('saudação com o nome', (await evaluate("document.querySelector('.hero__name')?.textContent", sessionId)) === 'Ana');
  check('botão de continuar presente', await evaluate("!!document.querySelector('.card-cta .btn')", sessionId));
  await shot('02-home.png', sessionId);

  console.log('\n3) Aula da unidade 2');
  await evaluate("location.hash = '#/licao/u2/0'", sessionId);
  await sleep(1400);
  check('tela de lição montada', await evaluate("!!document.querySelector('.lesson')", sessionId));
  const primeiroTipo = await evaluate("document.querySelector('.q')?.textContent", sessionId);
  console.log('     primeira pergunta:', JSON.stringify(primeiroTipo));
  await shot('03-licao.png', sessionId);

  // avança o card de ensino, se houver
  const temEntendi = await evaluate("!!document.querySelector('.btn--primary') && document.body.innerText.includes('Entendi')", sessionId);
  if (temEntendi) {
    await evaluate("[...document.querySelectorAll('.btn')].find(b=>b.textContent.includes('Entendi')).click()", sessionId);
    await sleep(900);
  }
  check('exercício com opções', await evaluate("document.querySelectorAll('.option').length >= 2", sessionId));
  await shot('04-exercicio.png', sessionId);

  // responde até acertar (uma tentativa errada mostra a correção pedagógica)
  await evaluate("document.querySelectorAll('.option')[0].click()", sessionId);
  await sleep(700);
  check('retorno pedagógico aparece', await evaluate("!!document.querySelector('.feedback')", sessionId));
  await shot('05-feedback.png', sessionId);

  // tenta as demais alternativas até acertar, como uma criança faria
  for (let i = 1; i < 4; i++) {
    if (await evaluate("!!document.querySelector('.option--ok')", sessionId)) break;
    const clicked = await evaluate(`(() => { const o = document.querySelectorAll('.option')[${i}]; if (!o) return false; o.click(); return true; })()`, sessionId);
    if (!clicked) break;
    await sleep(650);
  }
  check('acerto libera o botão continuar', await evaluate("[...document.querySelectorAll('.lesson__foot .btn')].some(b=>/Continuar|resultado/.test(b.textContent))", sessionId));
  await shot('06-acerto.png', sessionId);

  console.log('\n4) Demais telas');
  await evaluate("location.hash = '#/trilha'", sessionId);
  await sleep(800);
  check('mapa com pelo menos 14 fases', (await evaluate("document.querySelectorAll('.trail-node').length", sessionId)) >= 14);
  check('avatar no mapa', await evaluate("!!document.querySelector('.trail-avatar')", sessionId));
  await shot('06-trilha.png', sessionId);

  await evaluate("location.hash = '#/pais'", sessionId);
  await sleep(900);
  check('área dos pais abre', await evaluate("document.querySelectorAll('.metric').length >= 4", sessionId));
  await shot('07-pais.png', sessionId);

  await evaluate("location.hash = '#/vozes'", sessionId);
  await sleep(1300);
  check('laboratório de voz abre', (await evaluate("document.querySelectorAll('.card').length", sessionId)) >= 3);
  await shot('10-vozes.png', sessionId);

  await evaluate("location.hash = '#/historias'", sessionId);
  await sleep(700);
  check('histórias listadas', (await evaluate("document.querySelectorAll('.card--flat').length", sessionId)) >= 10);

  await evaluate("location.hash = '#/conversar'", sessionId);
  await sleep(900);
  check('conversa inicia com a Gabi', await evaluate("!!document.querySelector('.bubble--gabi')", sessionId));
  await shot('08-conversa.png', sessionId);

  console.log('\n5) PWA e armazenamento');
  const sw = await evaluate("navigator.serviceWorker?.getRegistrations().then(r=>r.length).catch(()=>-1)", sessionId);
  check('service worker registrado', sw >= 1, `retorno=${sw}`);
  const manifest = await evaluate("fetch('manifest.webmanifest').then(r=>r.ok)", sessionId);
  check('manifest acessível', manifest === true);

  console.log('\n6) Tablet em pé (retrato)');
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 1280, deviceScaleFactor: 1, mobile: true }, sessionId);
  await evaluate("location.hash = '#/'", sessionId);
  await sleep(900);
  await shot('09-home-retrato.png', sessionId);

  console.log('\nErros de JavaScript capturados:', errors.length);
  for (const e of errors.slice(0, 12)) console.log('   ⚠️ ', e);
  check('nenhum erro de JavaScript', errors.length === 0, `${errors.length} erro(s)`);

  // não conta falhas de áudio/ASR esperadas no headless
  console.log(`\nResultado: ${failed === 0 ? 'TUDO OK ✅' : failed + ' verificação(ões) falharam ❌'}`);
} catch (e) {
  console.error('\nFALHA NO SMOKE:', e.message);
  failed++;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  try { chrome.kill(); } catch { /* ignore */ }
  try { server.kill(); } catch { /* ignore */ }
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  process.exit(failed ? 1 : 0);
}
