/* Auditoria de UI: roda todas as rotas em 5 viewports e reporta
   overflow horizontal, elementos estourando, texto cortado, alvos pequenos e erros de JS.
   Uso: node tools/ui-audit.mjs [--shots] */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP = 9351;
const BASE = 'http://localhost:8080/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOTS = process.argv.includes('--shots');

const ROUTES = [
  ['home', '#/'],
  ['trilha', '#/trilha'],
  ['licao', '#/licao/u1/0'],
  ['revisar', '#/revisar'],
  ['diag', '#/diag'],
  ['pais', '#/pais'],
  ['vozes', '#/vozes'],
  ['livro', '#/livro'],
  ['caca', '#/caca'],
  ['adesivos', '#/adesivos'],
  ['historias', '#/historias'],
  ['conversar', '#/conversar'],
  ['onboarding', '#/onboarding'],
];
const VIEWPORTS = [
  [360, 640, 'celular-pequeno'],
  [390, 844, 'celular'],
  [768, 1024, 'tablet-retrato'],
  [1024, 768, 'tablet-deitado'],
  [1280, 800, 'desktop'],
];

const STATE = {
  onboarded: true,
  child: { name: 'Ana', avatar: '🦊' },
  settings: { muted: true, sound: false, rate: 0.9, voiceURI: '', readScale: 1, reduceMotion: true, sessionTarget: 10, freeMode: false, pin: '', llm: { enabled: false } },
  progress: { xp: 240, coins: 90, streak: { last: '', days: 4, best: 4 }, startUnit: 'u1', units: {}, lessons: {} },
  skills: {},
  stickers: [],
  days: {},
  history: [],
};

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gabi-ui-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${CDP}/json/version`); if (r.ok) break; } catch {} await sleep(250); }
const v = await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const send = (method, params = {}, sid) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sid ? { sessionId: sid } : {}) })); });
const events = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') events.push(m.params?.exceptionDetails?.text || 'exception');
};
const t = await send('Target.createTarget', { url: 'about:blank' });
const sid = (await send('Target.attachToTarget', { targetId: t.result.targetId, flatten: true })).result.sessionId;
for (const d of ['Runtime', 'Page', 'Log']) await send(`${d}.enable`, {}, sid).catch(() => {});

const evalJs = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sid);
  if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text };
  return r.result?.result?.value;
};

await send('Page.navigate', { url: BASE }, sid);
await sleep(1800);
await evalJs(`localStorage.setItem('gabi.state.v1', ${JSON.stringify(JSON.stringify(STATE))}); location.hash = '#/'; location.reload();`);
await sleep(2200);

const AUDIT = `(() => {
  const vw = window.innerWidth;
  const out = { overflowX: document.documentElement.scrollWidth > vw + 1, scrollWidth: document.documentElement.scrollWidth, vw, right: [], tap: [], clipped: [], contrast: [] };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight + 200;
  };
  const label = (el) => {
    const cls = (el.className && typeof el.className === 'string') ? '.' + el.className.split(/\\s+/).slice(0,3).join('.') : '';
    const txt = (el.textContent || '').trim().replace(/\\s+/g,' ').slice(0, 36);
    return (el.tagName || '') + cls + (txt ? ' "' + txt + '"' : '');
  };
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 && r.left < vw) out.right.push({ sel: label(el), right: Math.round(r.right), width: Math.round(r.width) });
    const s = getComputedStyle(el);
    if ((s.overflowY === 'hidden' || s.overflow === 'hidden') && el.scrollHeight > el.clientHeight + 2 && (el.textContent || '').trim()) {
      const cr = el.getBoundingClientRect();
      const childOverflow = [...el.children].some((c) => {
        const rr = c.getBoundingClientRect();
        return rr.bottom > cr.bottom + 2 || rr.top < cr.top - 2;
      });
      if (childOverflow) out.clipped.push({ sel: label(el), client: el.clientHeight, scroll: el.scrollHeight });
    }
  });
  document.querySelectorAll('button, a, [role="button"], .option, .book-word').forEach((el) => {
    if (!visible(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.tap.push({ sel: label(el), w: Math.round(r.width), h: Math.round(r.height) });
  });
  const parseC = (c) => { const m = /rgba?\\(([^)]+)\\)/.exec(c || ''); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null; // gradiente: não dá para medir com segurança
      const c = parseC(cs.backgroundColor);
      if (c && c.a > 0.01) layers.push(c);
      if (c && c.a >= 0.99) break;
    }
    let out2 = { r: 255, g: 255, b: 255 };
    for (let i = layers.length - 1; i >= 0; i--) {
      const c = layers[i];
      out2 = { r: c.r * c.a + out2.r * (1 - c.a), g: c.g * c.a + out2.g * (1 - c.a), b: c.b * c.a + out2.b * (1 - c.a) };
    }
    return out2;
  };
  document.querySelectorAll('body *').forEach((el) => {
    if (!visible(el)) return;
    const direct = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (!/[\\p{L}\\p{N}]/u.test(direct)) return; // ignora ★, emojis e símbolos
    const s = getComputedStyle(el);
    const fg = parseC(s.color);
    if (!fg || fg.a < 0.5) return;
    const bg = bgOf(el);
    if (!bg) return;
    const size = parseFloat(s.fontSize) || 16;
    const bold = Number(s.fontWeight) >= 600;
    const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (r < need) out.contrast.push({ sel: label(el), ratio: Math.round(r * 100) / 100, need, size: Math.round(size), fg: s.color, bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')' });
  });
  out.right = out.right.slice(0, 8);
  out.tap = out.tap.slice(0, 8);
  out.clipped = out.clipped.slice(0, 8);
  out.contrast = out.contrast.slice(0, 12);
  out.wsCells = document.querySelectorAll('.ws-cell').length;
  out.wsWords = document.querySelectorAll('.ws-word').length;
  return out;
})()`;

const report = {};
let problems = 0;
for (const [w, h, name] of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 }, sid);
  await sleep(250);
  report[name] = {};
  console.log(`\n== ${name} ${w}x${h} ==`);
  for (const [route, hash] of ROUTES) {
    events.length = 0;
    await evalJs(`location.hash = ${JSON.stringify(hash)}`);
    await sleep(650);
    const a = await evalJs(AUDIT);
    const errs = events.slice(0, 5);
    const bad = a && !a.__error && (a.overflowX || a.right.length || a.tap.length || a.clipped.length || (a.contrast || []).length || errs.length);
    if (bad) problems++;
    report[name][route] = { ...a, errors: errs };
    console.log(`${route.padEnd(11)} overflow=${a?.overflowX ? 'SIM' : 'ok'} right=${a?.right?.length || 0} tap=${a?.tap?.length || 0} clipped=${a?.clipped?.length || 0} contrast=${a?.contrast?.length || 0} err=${errs.length}`);
    if (bad) {
      for (const x of a.right || []) console.log(`   direita: ${x.sel} (right ${x.right})`);
      for (const x of a.tap || []) console.log(`   toque: ${x.sel} ${x.w}x${x.h}`);
      for (const x of a.clipped || []) console.log(`   cortado: ${x.sel} ${x.client}/${x.scroll}`);
      for (const x of a.contrast || []) console.log(`   contraste: ${x.sel} ${x.ratio} (<${x.need}) ${x.size}px ${x.fg} em ${x.bg}`);
      for (const e of errs) console.log(`   erro: ${e}`);
    }
    if (SHOTS && (name === 'tablet-retrato' || (name === 'celular-pequeno' && ['home', 'caca', 'pais'].includes(route)))) {
      const shot = await send('Page.captureScreenshot', { format: 'png' }, sid);
      if (shot.result?.data) fs.writeFileSync(path.join('tests', 'screenshots', `ui-${route}-${w}.png`), Buffer.from(shot.result.data, 'base64'));
    }
  }
}
fs.writeFileSync(path.join('tests', 'ui-audit.json'), JSON.stringify(report, null, 2));
console.log(`\nTelas com problema: ${problems}`);
ws.close(); chrome.kill();
try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(problems ? 1 : 0);
