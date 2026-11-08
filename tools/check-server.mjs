/* Verifica o servidor: compressão, cache, Range de áudio, cabeçalhos e path traversal.
   Requer o servidor rodando em http://localhost:8080 (e, opcionalmente, HTTPS 8443).
   Uso: node tools/check-server.mjs */
const BASE = 'http://localhost:8080';
const fails = [];
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'ok ' : 'FALHA'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) fails.push(name);
};

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { redirect: 'manual', ...opts });
  return r;
}

// saúde
const health = await req('/healthz');
ok('healthz 200', health.status === 200);

// gzip em JS
const gz = await req('/js/main.js', { headers: { 'Accept-Encoding': 'gzip' } });
ok('JS responde 200', gz.status === 200);
ok('JS vem gzip', (gz.headers.get('content-encoding') || '').includes('gzip'));
ok('JS tem Vary', (gz.headers.get('vary') || '').toLowerCase().includes('accept-encoding'));

// sem gzip quando o cliente não pede
const plain = await req('/js/main.js', { headers: { 'Accept-Encoding': 'identity' } });
ok('sem gzip quando não pede', !(plain.headers.get('content-encoding') || '').includes('gzip'));

// cache
const sw = await req('/sw.js');
ok('sw.js no-store', (sw.headers.get('cache-control') || '').includes('no-store'));
const js = await req('/js/store.js');
ok('JS no-cache', (js.headers.get('cache-control') || '').includes('no-cache'));

// segurança
const home = await req('/');
ok('home 200', home.status === 200);
ok('X-Content-Type-Options', home.headers.get('x-content-type-options') === 'nosniff');
ok('X-Frame-Options', home.headers.get('x-frame-options') === 'DENY');
ok('Referrer-Policy', home.headers.get('referrer-policy') === 'no-referrer');
ok('Permissions-Policy', (home.headers.get('permissions-policy') || '').includes('microphone=(self)'));

// HEAD
const head = await req('/js/main.js', { method: 'HEAD' });
ok('HEAD 200', head.status === 200);

// Range de áudio
const idx = await (await req('/audio/index.json')).json();
const first = Object.values(idx).find((f) => String(f).endsWith('.mp3'));
if (first) {
  const audioPath = '/' + String(first).replace(/^\/+/, '');
  const r = await req(audioPath, { headers: { Range: 'bytes=0-99' } });
  ok('Range responde 206', r.status === 206, `status ${r.status}`);
  ok('Range Content-Range', (r.headers.get('content-range') || '').startsWith('bytes 0-99/'));
  const buf = await r.arrayBuffer();
  ok('Range devolve 100 bytes', buf.byteLength === 100, `${buf.byteLength} bytes`);
  const bad = await req(audioPath, { headers: { Range: 'bytes=999999999-' } });
  ok('Range inválido 416', bad.status === 416);
} else {
  ok('encontra mp3 no índice', false);
}

// path traversal
for (const p of ['/../package.json', '/%2e%2e/package.json', '/..%2fpackage.json']) {
  const r = await req(p);
  const body = await r.text();
  ok(`traversal bloqueado ${p}`, !(r.status === 200 && body.includes('"name"')), `status ${r.status}`);
}

console.log(`\n${fails.length ? fails.length + ' falha(s)' : 'servidor OK ✅'}`);
process.exit(fails.length ? 1 : 0);
