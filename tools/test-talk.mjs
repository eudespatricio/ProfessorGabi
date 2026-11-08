/* Verifica no navegador que cada opção de humor gera resposta diferente na conversa.
   Uso: node tools/test-talk.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9349;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-talk-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=1024,768', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const t = await send('Target.createTarget', { url: 'about:blank' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
await send('Runtime.enable', {}, sid);

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  return r.result?.result?.value;
}

const STATE = {
  onboarded: true,
  child: { name: 'Ana', avatar: '🦊' },
  settings: { muted: true, sound: false, rate: 0.9, voiceURI: '', readScale: 1, reduceMotion: true, sessionTarget: 10, freeMode: false, pin: '', llm: { enabled: false } },
  progress: { xp: 0, coins: 0, streak: { last: '', days: 1, best: 1 }, startUnit: 'u1', units: {}, lessons: {} },
  skills: {},
  stickers: [],
  days: {},
  history: [],
};

async function run(optionLabel) {
  await send('Page.navigate', { url: 'http://localhost:8080/' }, sid);
  await sleep(1500);
  await evalJs(`localStorage.setItem('gabi.state.v1', ${JSON.stringify(JSON.stringify(STATE))}); location.hash = '#/conversar'; location.reload();`);
  await sleep(2600);
  const cardClicked = await evalJs(`(() => { const c = document.querySelector('.theme-card'); if (!c) return false; c.click(); return true; })()`);
  await sleep(2400);
  const pill = await evalJs(`document.querySelector('.pill')?.textContent || ''`);
  const cardsGone = await evalJs(`document.querySelectorAll('.theme-card').length === 0`);
  const clicked = await evalJs(`(() => {
    const b = [...document.querySelectorAll('.option')].find((x) => x.textContent.includes(${JSON.stringify(optionLabel)}));
    if (!b) return false; b.click(); return true;
  })()`);
  await sleep(2800);
  const texts = await evalJs(`[...document.querySelectorAll('.bubble--gabi')].map((b) => b.innerText.replace(/\\s+/g,' ').trim())`);
  return { clicked, cardClicked, pill, cardsGone, texts };
}

const bem = await run('Bem');
const cansada = await run('Cansada');
console.log('\nBem   ->', bem.clicked, JSON.stringify(bem.texts));
console.log('Cansada ->', cansada.clicked, JSON.stringify(cansada.texts));
for (const [name, r] of [['Bem', bem], ['Cansada', cansada]]) {
  console.log(`${name}: cartinha=${r.cardClicked} selo="${r.pill}" cartinhas sumiram=${r.cardsGone}`);
}
const replyBem = bem.texts?.[1] || '';
const replyCansada = cansada.texts?.[1] || '';
console.log('\nrespostas diferentes:', replyBem !== replyCansada);
console.log('sequência seguinte (Bem):', bem.texts?.[2] || '(não apareceu)');
console.log('sequência seguinte (Cansada):', cansada.texts?.[2] || '(não apareceu)');
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(replyBem && replyCansada && replyBem !== replyCansada ? 0 : 1);
