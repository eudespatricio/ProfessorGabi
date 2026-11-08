/* Verifica a transição de tela e a abertura animada do baú.
   Uso: node tools/check-chest.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9355;
const BASE = 'http://localhost:8080/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-chest-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=768,1024', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const errors = [];
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params?.exceptionDetails?.text || 'exception');
};
const t = await send('Target.createTarget', { url: 'about:blank' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
await send('Runtime.enable', {}, sid);
await send('Page.enable', {}, sid);
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  return r.result?.result?.value;
};

const fails = [];
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'ok ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) fails.push(name);
};

await send('Page.navigate', { url: BASE }, sid);
await sleep(1800);
await evalJs(`(() => {
  const d = new Date();
  const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const st = {
    onboarded: true,
    child: { name: 'Ana', avatar: '🦊' },
    settings: { muted: true, sound: false, reduceMotion: false },
    progress: { xp: 0, coins: 0, streak: { last: '', days: 1, best: 1 }, startUnit: 'u1', units: {}, lessons: {} },
    days: {}, history: []
  };
  st.days[key] = { lessons: 1, minutes: 12 };
  localStorage.setItem('gabi.state.v1', JSON.stringify(st));
  location.hash = '#/';
  location.reload();
})()`);
await sleep(2400);

ok('baú aparece', await evalJs(`!!document.querySelector('.chest-card')`));
const anim = await evalJs(`getComputedStyle(document.querySelector('#screen > .wrap')).animationName`);
ok('transição de tela ativa', String(anim).includes('screenIn'), String(anim));

await evalJs(`document.querySelector('.chest-card .btn').click()`);
const opening = await evalJs(`document.querySelector('.chest-card')?.classList.contains('chest-card--opening')`);
ok('classe de abertura aplicada', !!opening);

await sleep(300);
const shot = await send('Page.captureScreenshot', { format: 'png' }, sid);
if (shot.result?.data) fs.writeFileSync(path.join('tests', 'screenshots', 'chest-opening.png'), Buffer.from(shot.result.data, 'base64'));

await sleep(900);
const hash = await evalJs(`location.hash`);
ok('navegou para o caça bônus', String(hash).includes('#/caca') && String(hash).includes('bonus=1'), String(hash));
ok('caça-palavras montou', await evalJs(`!!document.querySelector('.ws-grid')`));
ok('sem erro de JavaScript', errors.length === 0, errors.slice(0, 2).join(' | '));

ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(fails.length ? 1 : 0);
