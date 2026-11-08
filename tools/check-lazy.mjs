/* Verifica que o dicionário do corretor (94 KB) não carrega na abertura do app:
   só deve ser buscado quando o Modo livro usa o OCR.
   Uso: node tools/check-lazy.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9353;
const BASE = 'http://localhost:8080/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-lazy-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=1024,800', 'about:blank'], { stdio: 'ignore' });
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
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  return r.result?.result?.value;
};

await send('Page.navigate', { url: BASE }, sid);
await sleep(1800);
await evalJs(`localStorage.setItem('gabi.state.v1', JSON.stringify({ onboarded: true, child: { name: 'Ana', avatar: '🦊' }, settings: { muted: true, sound: false }, progress: { xp: 0, coins: 0, streak: { last: '', days: 1, best: 1 }, startUnit: 'u1', units: {}, lessons: {} } })); location.hash = '#/'; location.reload();`);
await sleep(2600);

const loaded = () => evalJs(`performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /wordlist-pt|ocr-fix/.test(n))`);
const home = await loaded();
await evalJs(`location.hash = '#/livro'`);
await sleep(1200);
const livro = await loaded();

console.log('Na abertura (home):', home.length ? home : 'nada (correto)');
console.log('Na tela do livro (sem OCR):', livro.length ? livro : 'nada (correto)');
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(home.length ? 1 : 0);
