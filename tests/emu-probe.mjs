/* Sonda o app aberto no emulador via Chrome DevTools (adb forward 9222).
   Uso: node tests/emu-probe.mjs [expressao] */
const res = await fetch('http://127.0.0.1:9222/json');
const targets = await res.json();
const page = targets.find((t) => t.type === 'page' && /localhost:8080|127\.0\.0\.1:8080/.test(t.url)) || targets.find((t) => t.type === 'page');
if (!page) { console.error('nenhuma página encontrada'); process.exit(1); }

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

function evaluate(expression) {
  const msgId = ++id;
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({
      id: msgId, method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true, userGesture: true },
    }));
  }).then((r) => {
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
    return r.result?.result?.value;
  });
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const expr = args[0] || `(async () => ({
  version: window.__gabi?.version || null,
  dataVersion: document.documentElement.dataset.gabiVersion || null,
  hash: location.hash,
  title: document.title,
  greet: document.querySelector('.hero__greet')?.textContent || null,
  name: document.querySelector('.hero__name')?.textContent || null,
  line: document.querySelector('.hero__line')?.textContent || null,
  voiceNote: document.querySelector('.hero__voice')?.textContent || null,
  audio: window.__gabi?.audio?.() || null,
  sw: navigator.serviceWorker?.controller?.scriptURL || null,
  caches: await caches.keys().then(async (keys) => {
    const out = {};
    for (const k of keys) out[k] = (await (await caches.open(k)).keys()).length;
    return out;
  }),
}))()`;

try {
  if (process.argv.includes('--reload')) {
    const msgId = ++id;
    await new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method: 'Page.reload', params: { ignoreCache: false } }));
    });
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(JSON.stringify(await evaluate(expr), null, 2));
} catch (e) {
  console.error('erro:', e.message);
  process.exitCode = 1;
} finally {
  ws.close();
}
