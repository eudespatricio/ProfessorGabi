/* Lista as vozes de fala disponíveis no Chrome deste computador. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9337;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-voices-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const t = await send('Target.createTarget', { url: 'http://localhost:8080/' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
await send('Runtime.enable', {}, sid);
await sleep(2500);
const res = await send('Runtime.evaluate', {
  expression: `new Promise(res => { const go = () => { const vs = speechSynthesis.getVoices(); if (!vs.length) { setTimeout(go, 400); return; } res(vs.map(v => ({n:v.name,l:v.lang,local:v.localService,def:v.default}))); }; go(); setTimeout(()=>res([]), 8000); })`,
  awaitPromise: true, returnByValue: true,
}, sid);
const voices = res.result?.result?.value || [];
const pt = voices.filter((v) => /^pt/i.test(v.l) || /portugu/i.test(v.n));
console.log('total de vozes:', voices.length, '| pt:', pt.length);
console.log('\n--- VOZES PT ---');
for (const v of pt) console.log(`  ${v.n} | ${v.l} | local=${v.local} | padrão=${v.def}`);
console.log('\n--- OUTRAS (amostra) ---');
for (const v of voices.filter((x) => !/^pt/i.test(x.l)).slice(0, 8)) console.log(`  ${v.n} | ${v.l}`);
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
