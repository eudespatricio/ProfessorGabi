/* Valida o layout de opção com imagem + botão de ouvir em 393 px.
   Uso: node tools/check-choice-layout.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9361;
const BASE = 'http://localhost:8080/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-choice-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=393,844', 'about:blank'], { stdio: 'ignore' });
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
await send('Page.enable', {}, sid);
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 844, deviceScaleFactor: 2, mobile: true }, sid);
const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  return r.result?.result?.value;
};

await send('Page.navigate', { url: BASE }, sid);
await sleep(1800);
await evalJs(`localStorage.setItem('gabi.state.v1', JSON.stringify({ onboarded: true, child: { name: 'Ana', avatar: '🦊' }, settings: { muted: true, sound: false, reduceMotion: true }, progress: { xp: 0, coins: 0, streak: { last: '', days: 1, best: 1 }, startUnit: 'u1', units: {}, lessons: {} } })); location.hash = '#/licao/u1/0'; location.reload();`);
await sleep(2200);

const info = await evalJs(`(() => {
  const screen = document.getElementById('screen');
  screen.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'wrap stack';
  const title = document.createElement('div');
  title.className = 'q';
  title.textContent = 'Qual palavra eu falei?';
  title.style.textAlign = 'center';
  title.style.fontWeight = '700';
  wrap.appendChild(title);
  const opts = document.createElement('div');
  opts.className = 'options options--3';
  const labels = ['lua', 'bolo', 'pipa'];
  const emojis = ['🌙', '🎂', '🪁'];
  labels.forEach((label, i) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.type = 'button';
    const e = document.createElement('span'); e.className = 'option__emoji'; e.textContent = emojis[i];
    const s = document.createElement('span'); s.textContent = label; s.className = 'opt-label';
    const sp = document.createElement('button'); sp.className = 'opt-speak'; sp.type = 'button'; sp.textContent = '🔊';
    b.append(e, s, sp);
    opts.appendChild(b);
  });
  wrap.appendChild(opts);
  const title2 = document.createElement('div');
  title2.textContent = 'Quantas sílabas tem a palavra?';
  title2.style.textAlign = 'center';
  title2.style.fontWeight = '700';
  title2.style.marginTop = '18px';
  wrap.appendChild(title2);
  const opts2 = document.createElement('div');
  opts2.className = 'options options--3';
  [['1', 'sílaba'], ['3', 'sílabas'], ['2', 'sílabas']].forEach(([n, sub]) => {
    const b = document.createElement('button');
    b.className = 'option';
    b.type = 'button';
    const text = document.createElement('span');
    text.className = 'option__text';
    const value = document.createElement('span');
    value.className = 'option__value';
    value.textContent = n;
    const s = document.createElement('span');
    s.className = 'tiny muted';
    s.textContent = sub;
    text.append(value, s);
    b.append(text);
    opts2.appendChild(b);
  });
  wrap.appendChild(opts2);
  const baseline = getComputedStyle(opts2.querySelector('.option__text')).alignItems;
  screen.appendChild(wrap);
  const out = [];
  [...opts.children].forEach((b) => {
    const label = b.querySelector('.opt-label');
    const speak = b.querySelector('.opt-speak');
    const a = label.getBoundingClientRect();
    const c = speak.getBoundingClientRect();
    const overlap = !(a.right <= c.left || a.left >= c.right || a.bottom <= c.top || a.top >= c.bottom);
    out.push({ text: label.textContent, overlap, clipped: label.scrollWidth > label.clientWidth + 1, boxH: Math.round(b.getBoundingClientRect().height) });
  });
  out.baseline = baseline;
  return { items: out, baseline };
})()`);

await sleep(300);
const shot = await send('Page.captureScreenshot', { format: 'png' }, sid);
if (shot.result?.data) fs.writeFileSync(path.join('tests', 'screenshots', 'choice-layout.png'), Buffer.from(shot.result.data, 'base64'));

const data = info;
const items = data?.items || [];
console.log('baseline do bloco numérico:', data?.baseline);
let bad = 0;
for (const x of items) {
  const ok = !x.overlap && !x.clipped;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'FALHA'} "${x.text}" overlap=${x.overlap} clipped=${x.clipped} altura=${x.boxH}`);
}
const ok = bad === 0 && items.length === 3;
console.log(ok ? 'layout OK ✅' : `${bad} problema(s)`);
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(ok ? 0 : 1);
