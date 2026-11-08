/* Fotos e medidas do app rodando no emulador (Android Chrome) em viewport de tablet.
   Requer: adb reverse tcp:8080 tcp:8080 e adb forward tcp:9222 localabstract:chrome_devtools_remote
   Uso: node tests/emu-tablet.mjs */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('tests', 'screenshots');
const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
const page = targets.find((t) => t.type === 'page');
if (!page) { console.error('página não encontrada; abra o app no emulador'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message)); else resolve(msg);
  }
};
function send(method, params = {}) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
  return r.result?.result?.value;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  console.log('  📸', path.relative(process.cwd(), file));
}
const METRICS = `(() => {
  const dock = document.querySelector('.mic-dock');
  const mic = document.querySelector('.mic-dock .mic');
  const body = document.querySelector('.lesson__body');
  const rd = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
  return {
    viewport: { w: innerWidth, h: innerHeight },
    dock: rd(dock), mic: rd(mic),
    body: body ? { top: body.scrollTop, height: body.scrollHeight, client: body.clientHeight } : null,
    micVisible: !!mic && mic.getBoundingClientRect().bottom <= innerHeight && mic.getBoundingClientRect().top >= 0,
    textLines: document.querySelectorAll('.read-line').length,
  };
})()`;

let failed = 0;
const check = (label, ok, extra = '') => { if (ok) console.log('  ✅', label); else { failed++; console.log('  ❌', label, extra); } };

try {
  await send('Page.enable');

  for (const [w, h, tag] of [[1024, 768, '1024x768'], [768, 1024, '768x1024']]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
    await evaluate("location.hash = '#/'");
    await sleep(900);
    const home = await evaluate(`(() => {
      const greet = document.querySelector('.hero__greet');
      const name = document.querySelector('.hero__name');
      const line = document.querySelector('.hero__line');
      const b = greet && greet.getBoundingClientRect();
      return { greet: greet?.textContent, name: name?.textContent, line: line?.textContent,
        visible: !!b && b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= innerHeight,
        note: document.querySelector('.hero__voice')?.textContent || '' };
    })()`);
    console.log(`  home ${tag}:`, JSON.stringify(home));
    check(`saudação visível no tablet ${tag}`, home.visible && !!home.greet && !!home.name);
    await shot(`emu-tablet-home-${tag}.png`);

    await evaluate("location.hash = '#/licao/u9/0'");
    await sleep(1200);
    await evaluate("[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Entendi'))?.click()");
    await sleep(1200);
    const m = await evaluate(METRICS);
    console.log(`  história ${tag}:`, JSON.stringify(m));
    check(`microfone visível na história ${tag}`, m.micVisible);
    check(`5 linhas na história ${tag}`, m.textLines === 5);
    await shot(`emu-tablet-story-${tag}.png`);
  }

  await send('Emulation.clearDeviceMetricsOverride');
  console.log(failed ? `\n${failed} falha(s)` : '\nTUDO OK ✅');
} finally {
  ws.close();
  process.exit(failed ? 1 : 0);
}
