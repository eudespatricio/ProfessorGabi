/* Compara os modos de pré-processamento do OCR na mesma imagem.
   Uso: node tools/ocr-compare.mjs [imagem] */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9343;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imgPath = process.argv[2] || 'assets/pagina-teste.jpg';
const b64 = fs.readFileSync(imgPath).toString('base64');
const mime = imgPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-cmp-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=1200,1600', 'about:blank'], { stdio: 'ignore' });
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
await send('Page.navigate', { url: 'http://localhost:8080/' }, sid);
await sleep(2500);

const expr = `(async () => {
  window.__imgData = ${JSON.stringify(`data:${mime};base64,${b64}`)};
  try {
    const m = await import('/js/screen-book.js');
    const blob = await (await fetch(window.__imgData)).blob();
    const file = new File([blob], 'pagina.jpg', { type: '${mime}' });
    const res = {};
    for (const mode of ['otsu', 'normalize', 'sauvola']) {
      const out = await m.imageToText(file, null, { mode });
      const clean = m.sanitizeOcr(out.text, out.lines);
      res[mode] = { conf: out.confidence, text: clean.text, dropped: clean.dropped, lines: out.lines.length };
    }
    window.__res = res;
  } catch (e) { window.__err = String(e && e.stack || e); }
  window.__done = true;
})()`;
await send('Runtime.evaluate', { expression: expr, awaitPromise: false }, sid);

let data = null;
for (let i = 0; i < 300; i++) {
  await sleep(1000);
  const r = await send('Runtime.evaluate', { expression: '({done: window.__done, err: window.__err, res: window.__res})', returnByValue: true }, sid);
  data = r.result?.result?.value || data;
  if (data?.done) break;
  if (i % 15 === 0) console.log('  aguardando…', i, 's');
}

const want = ['sua voz', 'percebeu', 'anos', 'rei', 'lançará', 'rio', 'ouvir'];
console.log('\nerro:', data?.err || 'nenhum');
for (const [mode, r] of Object.entries(data?.res || {})) {
  console.log(`\n===== ${mode} | conf ${r.conf} | linhas ${r.lines} | removidas ${r.dropped} =====`);
  const low = r.text.toLowerCase();
  console.log('achou:', want.map((w) => `${w}:${low.includes(w) ? 'sim' : 'nao'}`).join('  '));
  console.log(r.text.split('\n').slice(0, 12).join('\n'));
}
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
