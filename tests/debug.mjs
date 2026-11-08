import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_PORT = 8097;
const CDP_PORT = 9331;
const BASE = `http://127.0.0.1:${APP_PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ['server/serve.mjs', String(APP_PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-dbg-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((res) => (ws.onopen = res));
let id = 0; const pending = new Map(); const logs = [];
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
  if (m.method === 'Runtime.consoleAPICalled') logs.push('CONSOLE ' + m.params.type + ' ' + m.params.args.map((a) => a.value || a.description).join(' '));
  if (m.method === 'Log.entryAdded') logs.push('LOG ' + m.params.entry.level + ' ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  if (m.method === 'Network.loadingFailed') logs.push('NETFAIL ' + m.params.errorText + ' ' + m.params.type);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) logs.push('HTTP ' + m.params.response.status + ' ' + m.params.response.url);
};
const t = await send('Target.createTarget', { url: 'about:blank' });
const at = await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true });
const sid = at.result.sessionId;
await send('Page.enable', {}, sid); await send('Runtime.enable', {}, sid); await send('Log.enable', {}, sid); await send('Network.enable', {}, sid);
await send('Page.navigate', { url: BASE }, sid);
await sleep(2500);
const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true }, sid)).result?.result?.value;
console.log('boot hidden:', await ev("document.getElementById('boot')?.hidden"));
console.log('app hidden:', await ev("document.getElementById('app')?.hidden"));
console.log('body text:', await ev("document.body.innerText.slice(0,200)"));
console.log('--- logs ---');
logs.forEach((l) => console.log(l));
ws.close(); chrome.kill(); server.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
