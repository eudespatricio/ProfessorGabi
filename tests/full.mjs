/* Teste de ponta a ponta: joga uma lição inteira (u1, só múltipla escolha) e uma
   história (u9, com o microfone negado para validar o modo "Eu li"). */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_PORT = 8094;
const CDP_PORT = 9335;
const BASE = `http://127.0.0.1:${APP_PORT}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = spawn(process.execPath, ['server/serve.mjs', String(APP_PORT)], { stdio: 'ignore' });
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-full-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--window-size=1024,768', 'about:blank'], { stdio: 'ignore' });

for (let i = 0; i < 60; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); const errs = [];
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
};
const t = await send('Target.createTarget', { url: 'about:blank' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
await send('Page.enable', {}, sid); await send('Runtime.enable', {}, sid);
await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: true }, sid);
await send('Browser.setPermission', { permission: { name: 'audioCapture' }, setting: 'denied', origin: `http://127.0.0.1:${APP_PORT}` }, sid).catch(() => {});

const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sid)).result?.result?.value;
let fails = 0;
let reviewShot = false;
const check = (label, cond, extra = '') => { if (cond) console.log('  ✅', label); else { fails++; console.log('  ❌', label, extra); } };

async function playLesson(url, maxSteps = 40) {
  await ev(`location.hash = '${url}'`);
  await sleep(1200);
  for (let step = 0; step < maxSteps; step++) {
    if (!reviewShot && await ev("!!document.querySelector('.review-banner')")) {
      reviewShot = true;
      await send('Page.captureScreenshot', { format: 'png' }, sid).then((r) => fs.writeFileSync('tests/screenshots/14-revisao-licao.png', Buffer.from(r.result.data, 'base64')));
    }
    if (await ev("!!document.querySelector('.result')")) return true;
    // card de ensino
    if (await ev("[...document.querySelectorAll('.btn')].some(b=>b.textContent.includes('Entendi'))")) {
      await ev("[...document.querySelectorAll('.btn')].find(b=>b.textContent.includes('Entendi')).click()");
      await sleep(700); continue;
    }
    // botão de avançar (antes de "Eu li", que pode continuar visível)
    const cont = await ev("(() => { const b=[...document.querySelectorAll('.lesson__foot .btn')].find(x=>/Continuar|resultado|Concluir/.test(x.textContent)); if(!b) return false; b.click(); return true; })()");
    if (cont) { await sleep(800); continue; }
    // modo sem microfone (história)
    if (await ev("[...document.querySelectorAll('.btn')].some(b=>b.textContent.includes('Eu li'))")) {
      await ev("[...document.querySelectorAll('.btn')].find(b=>b.textContent.includes('Eu li')).click()");
      await sleep(900); continue;
    }
    // microfone bloqueado: tenta ligar para cair no modo "Eu li"
    if (await ev("!!document.querySelector('.mic') && !document.querySelector('.mic').hidden")) {
      await ev("document.querySelector('.mic').click()");
      await sleep(1600); continue;
    }
    // botão de avançar
    // (já verificado acima, antes de "Eu li")
    // múltipla escolha: tenta cada opção até acertar
    const clicked = await ev(`(() => {
      const opts=[...document.querySelectorAll('.option')];
      if(!opts.length) return false;
      if(document.querySelector('.option--ok')) return false;
      const wrong=opts.find(o=>!o.classList.contains('option--dim') && !o.classList.contains('option--ok'));
      if(!wrong) return false;
      wrong.click(); return true;
    })()`);
    if (clicked) { await sleep(700); continue; }
    await sleep(400);
  }
  return false;
}

try {
  await send('Page.navigate', { url: BASE }, sid);
  await sleep(1500);
  await ev(`localStorage.setItem('gabi.state.v1', JSON.stringify({ onboarded:true, child:{name:'Ana',avatar:'🦊'},
    settings:{muted:true,sound:false,rate:1,readScale:1,reduceMotion:true,sessionTarget:10,freeMode:true,pin:'',llm:{enabled:false}},
    progress:{xp:0,coins:0,streak:{last:'',days:0,best:0},startUnit:'u1',units:{},lessons:{}}, skills:{}, srs:{}, errors:{}, stickers:[], days:{}, history:[] }));
    location.href='${BASE}';`);
  await sleep(1500);

  console.log('\nLição completa da unidade 1 (só escolhas)');
  const ok1 = await playLesson('#/licao/u1/0');
  check('chegou ao resultado', ok1);
  check('mostra estrelas', await ev("document.querySelectorAll('.result__stars .s.on').length >= 1"));
  check('métricas de acertos', await ev("/\\d+\\/\\d+/.test(document.querySelector('.metric__v')?.textContent||'')"));
  check('revisão rápida aparece no resultado', /Revisão rápida: \d+\/\d+/.test(await ev('document.body.innerText')));
  check('tela de revisão foi mostrada', reviewShot);
  const lessonDone = await ev("JSON.parse(localStorage.getItem('gabi.state.v1')).progress.lessons['u1:0']?.stars");
  check('progresso salvo no armazenamento', lessonDone >= 1, `stars=${lessonDone}`);
  await send('Page.captureScreenshot', { format: 'png' }, sid).then((r) => fs.writeFileSync('tests/screenshots/11-resultado.png', Buffer.from(r.result.data, 'base64')));

  console.log('\nHistória completa (microfone negado → modo "Eu li")');
  const ok2 = await playLesson('#/licao/u9/0');
  check('chegou ao resultado da história', ok2);
  if (!ok2) {
    console.log('   DOM atual:', (await ev("document.body.innerText"))?.slice(0, 700));
    await send('Page.captureScreenshot', { format: 'png' }, sid).then((r) => fs.writeFileSync('tests/screenshots/13-historia-falha.png', Buffer.from(r.result.data, 'base64')));
  }
  const textDone = await ev("JSON.parse(localStorage.getItem('gabi.state.v1')).progress.lessons['u9:0']?.stars");
  check('história registrada', textDone >= 1, `stars=${textDone}`);
  check('revisão rápida aparece no resultado da história', /Revisão rápida: \d+\/\d+/.test(await ev('document.body.innerText')));
  await send('Page.captureScreenshot', { format: 'png' }, sid).then((r) => fs.writeFileSync('tests/screenshots/12-historia.png', Buffer.from(r.result.data, 'base64')));

  check('sem erros de JavaScript', errs.length === 0, errs[0] || '');
  console.log(`\nResultado: ${fails ? fails + ' falha(s)' : 'TUDO OK ✅'}`);
} catch (e) {
  console.error('FALHA:', e.message); fails++;
} finally {
  try { ws.close(); } catch {}
  try { chrome.kill(); server.kill(); } catch {}
  await sleep(300);
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(fails ? 1 : 0);
}
