/* Verifica a profundidade do mapa (parallax) e a entrada dos modais.
   Uso: node tools/check-map.mjs */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9357;
const BASE = 'http://localhost:8080/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-map-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=768,1024', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errors = [];
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params?.exceptionDetails?.text || 'exception');
};
const t = await send('Target.createTarget', { url: 'about:blank' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
await send('Runtime.enable', {}, sid);
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
await evalJs(`localStorage.setItem('gabi.state.v1', JSON.stringify({
  onboarded: true, child: { name: 'Ana', avatar: '🦊' },
  settings: { muted: true, sound: false, reduceMotion: false },
  progress: { xp: 240, coins: 90, streak: { last: '', days: 4, best: 4 }, startUnit: 'u1', units: {}, lessons: {} },
  days: {}, history: []
})); location.hash = '#/trilha'; location.reload();`);
await sleep(2400);

ok('mapa monta', await evalJs(`!!document.querySelector('.adventure')`));
ok('parallax começa em 0', (await evalJs(`getComputedStyle(document.querySelector('.adventure')).getPropertyValue('--par').trim()`)) === '0' || (await evalJs(`document.querySelector('.adventure').style.getPropertyValue('--par')`)) === '');
const before = await evalJs(`getComputedStyle(document.querySelector('.cloud.c1')).transform`);
ok('nuvem tem transform', before && before !== 'none', String(before));

await evalJs(`(() => { const s = document.getElementById('screen'); s.scrollTop = 420; s.dispatchEvent(new Event('scroll')); })()`);
await sleep(300);
const par = await evalJs(`document.querySelector('.adventure').style.getPropertyValue('--par')`);
ok('parallax reage ao scroll', Number(par) > 0, String(par));
const after = await evalJs(`getComputedStyle(document.querySelector('.cloud.c1')).transform`);
ok('nuvem se desloca', after !== before, `${before} -> ${after}`);
const shadow = await evalJs(`getComputedStyle(document.querySelector('.trail-card')).boxShadow`);
ok('cartão tem profundidade (sombra em camadas)', /rgba?\(/.test(String(shadow)) && String(shadow).split(',').length > 6, String(shadow).slice(0, 60));

await evalJs(`import('/js/ui.js').then((m) => { window.__ui = m; m.modal({ title: 'Teste', body: 'ok' }); })`);
await sleep(400);
ok('modal abre', await evalJs(`!!document.querySelector('.modal__card')`));
const anim = await evalJs(`getComputedStyle(document.querySelector('.modal__card')).animationName`);
ok('modal entra animado', String(anim).includes('modalCardIn'), String(anim));
await evalJs(`window.__ui?.closeModal()`);

ok('sem erro de JavaScript', errors.length === 0, errors.slice(0, 2).join(' | '));
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(fails.length ? 1 : 0);
