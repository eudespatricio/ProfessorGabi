/* Verifica o caminho Opus: suporte do navegador, índice completo, arquivo servido
   com MIME correto e o app realmente pedindo .opus ao tocar um clipe.
   Uso: node tools/check-opus.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9359;
const BASE = 'http://localhost:8080/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-opus-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=768,1024', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const requests = [];
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
};
const t = await send('Target.createTarget', { url: 'about:blank' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
await send('Runtime.enable', {}, sid);
await send('Network.enable', {}, sid);
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
await evalJs(`localStorage.setItem('gabi.state.v1', JSON.stringify({ onboarded: true, child: { name: 'Ana', avatar: '🦊' }, settings: { muted: false, sound: false }, progress: { xp: 0, coins: 0, streak: { last: '', days: 1, best: 1 }, startUnit: 'u1', units: {}, lessons: {} } })); location.reload();`);
await sleep(2400);

const supported = await evalJs(`import('/js/audio.js').then((m) => m.opusSupported)`);
ok('navegador suporta Opus', supported === true, String(supported));

const counts = await evalJs(`Promise.all([
  fetch('audio/index.json').then((r) => r.json()),
  fetch('audio/index-opus.json').then((r) => r.json())
]).then(([a, b]) => ({ mp3: Object.keys(a).length, opus: Object.keys(b).length }))`);
ok('índice Opus cobre o MP3', counts && counts.opus === counts.mp3, JSON.stringify(counts));

const first = await evalJs(`fetch('audio/index-opus.json').then((r) => r.json()).then((o) => Object.values(o)[0])`);
ok('índice Opus tem caminho', String(first).startsWith('audio/opus/'), String(first));
const opusUrl = 'http://localhost:8080/' + String(first).replace(/^\//, '');
const head = await evalJs(`fetch(${JSON.stringify(opusUrl)}, { method: 'HEAD' }).then((r) => ({ status: r.status, type: r.headers.get('content-type'), cache: r.headers.get('cache-control') }))`);
ok('arquivo Opus servido', head && head.status === 200, JSON.stringify(head));
ok('MIME audio/ogg', head && String(head.type).includes('audio/ogg'), String(head?.type));
ok('cache imutável', head && String(head.cache).includes('immutable'), String(head?.cache));

requests.length = 0;
await evalJs(`import('/js/audio.js').then((m) => m.playClip('pato')).catch(() => false)`);
await sleep(1600);
const audioReqs = requests.filter((u) => /\/audio\/.*\.(opus|mp3)/.test(u));
ok('tocar clipe pede .opus', audioReqs.some((u) => u.endsWith('.opus')), audioReqs.slice(-3).join(' | '));

ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(fails.length ? 1 : 0);
