/* Roda o OCR real do app (screen-book.js) no Chrome headless sobre uma imagem
   e imprime: confiança, texto bruto, texto limpo e a confiança de cada linha.
   Uso: node tools/ocr.mjs [caminho-da-imagem] */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const imgPath = process.argv[2] || 'assets/pagina-teste.jpg';
const b64 = fs.readFileSync(imgPath).toString('base64');
const mime = imgPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-ocr-'));
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
    const out = await m.imageToText(file, (p) => { window.__prog = p; });
    window.__raw = out.text; window.__conf = out.confidence; window.__lines = out.lines || [];
    const clean = m.sanitizeOcr(out.text, out.lines);
    window.__clean = clean.text; window.__dropped = clean.dropped;
  } catch (e) { window.__err = String(e && e.stack || e); }
  window.__done = true;
})()`;
await send('Runtime.evaluate', { expression: expr, awaitPromise: false }, sid);

let data = null;
for (let i = 0; i < 180; i++) {
  await sleep(1000);
  const r = await send('Runtime.evaluate', { expression: '({done: window.__done, err: window.__err, conf: window.__conf, raw: window.__raw, clean: window.__clean, dropped: window.__dropped, lines: window.__lines})', returnByValue: true }, sid);
  data = r.result?.result?.value || data;
  if (data?.done) break;
  if (i % 10 === 0) console.log('  aguardando OCR…', i, 's');
}

console.log('\n=== RESULTADO ===');
console.log('erro:', data?.err || 'nenhum');
console.log('confiança geral:', data?.conf);
console.log('linhas:', (data?.lines || []).length, '| removidas:', data?.dropped);
if (data?.lines) {
  console.log('\n--- linhas (conf | texto) ---');
  for (const l of data.lines) console.log(String(l.conf).padStart(3), '|', JSON.stringify(l.text));
}
console.log('\n--- TEXTO LIMPO ---');
console.log((data?.clean || '').trim());
console.log('\n--- TEXTO BRUTO ---');
console.log((data?.raw || '').trim().slice(0, 2000));
fs.writeFileSync('assets/pagina-teste.ocr.txt', (data?.raw || ''), 'utf8');
fs.writeFileSync('assets/pagina-teste.clean.txt', (data?.clean || ''), 'utf8');
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
