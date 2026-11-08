/* Servidor estático local (HTTP em 8080 ou HTTPS em 8443).
   Uso: node server/serve.mjs [porta] [--https]
   - gzip para HTML/JS/CSS/JSON (economia de ~70% no primeiro carregamento)
   - Range para áudio (permite streaming/seek)
   - cabeçalhos de segurança básicos + cache correto por tipo
*/
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'app');
const CERTS = path.resolve(__dirname, '..', 'certs');
const USE_HTTPS = process.argv.includes('--https') || process.env.HTTPS === '1';
const PORT = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) || process.env.PORT || (USE_HTTPS ? 8443 : 8080));
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg', '.opus': 'audio/ogg', '.webm': 'video/webm', '.md': 'text/markdown; charset=utf-8',
  '.crt': 'application/x-x509-ca-cert',
};
const COMPRESSIBLE = /\.(html|js|mjs|css|json|webmanifest|svg|txt|md)$/;
const gzipCache = new Map();

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'microphone=(self), camera=(self), geolocation=()',
};

function cacheControl(urlPath, ext) {
  if (['/sw.js', '/index.html', '/manifest.webmanifest'].includes(urlPath)) return 'no-store';
  if (ext === '.mp3' || ext === '.opus') return 'public, max-age=31536000, immutable';
  if (ext === '.png' || ext === '.woff2' || ext === '.jpg' || ext === '.ico') return 'public, max-age=86400';
  return 'no-cache';
}

function compressed(filePath, st) {
  const key = `${filePath}:${st.size}:${st.mtimeMs}`;
  const hit = gzipCache.get(key);
  if (hit) return hit;
  const buf = zlib.gzipSync(fs.readFileSync(filePath), { level: 9 });
  if (gzipCache.size > 60) gzipCache.clear();
  gzipCache.set(key, buf);
  return buf;
}

function sendAudio(req, res, filePath, st, ext, urlPath) {
  const size = st.size;
  const headers = { ...SECURITY_HEADERS, 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cacheControl(urlPath, ext), 'Accept-Ranges': 'bytes' };
  const range = req.headers.range;
  if (!range) {
    res.writeHead(200, { ...headers, 'Content-Length': size });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(filePath).pipe(res);
    return;
  }
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
  if (!m) {
    res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }
  let start = m[1] === '' ? null : Number(m[1]);
  let end = m[2] === '' ? null : Number(m[2]);
  if (start === null) {
    const suffix = end ?? 0;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    end = end === null ? size - 1 : Math.min(end, size - 1);
  }
  if (!Number.isFinite(start) || start > end || start >= size) {
    res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` });
    res.end();
    return;
  }
  res.writeHead(206, {
    ...headers,
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': end - start + 1,
  });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(filePath, { start, end }).pipe(res);
}

function sendFile(req, res, filePath, urlPath, st) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3' || ext === '.opus') { sendAudio(req, res, filePath, st, ext, urlPath); return; }

  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(urlPath, ext),
    'Service-Worker-Allowed': '/',
  };
  const wantsGzip = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
  if (COMPRESSIBLE.test(ext) && wantsGzip) {
    const buf = compressed(filePath, st);
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip', 'Vary': 'Accept-Encoding', 'Content-Length': buf.length });
    if (req.method === 'HEAD') { res.end(); return; }
    res.end(buf);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(filePath).pipe(res);
}

function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('ok');
    return;
  }
  // certificado para instalar no tablet
  if (url.pathname === '/ca.crt') {
    const ca = path.join(CERTS, 'ca.crt');
    if (!fs.existsSync(ca)) { res.writeHead(404); res.end('sem certificado'); return; }
    res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert', 'Content-Disposition': 'attachment; filename="gabi-ca.crt"', ...SECURITY_HEADERS });
    fs.createReadStream(ca).pipe(res);
    return;
  }

  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const resolved = path.resolve(path.join(ROOT, rel));
  if (!resolved.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.stat(resolved, (err, st) => {
    if (err || !st.isFile()) {
      const index = path.join(ROOT, 'index.html');
      fs.stat(index, (e2, st2) => {
        if (e2) { res.writeHead(404); res.end('Não encontrado'); return; }
        sendFile(req, res, index, '/index.html', st2);
      });
      return;
    }
    sendFile(req, res, resolved, url.pathname, st);
  });
}

function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push({ name, address: i.address });
  }
  return out;
}

let server;
if (USE_HTTPS) {
  const keyFile = path.join(CERTS, 'server.key');
  const crtFile = path.join(CERTS, 'server.crt');
  if (!fs.existsSync(keyFile) || !fs.existsSync(crtFile)) {
    console.error('Certificados não encontrados em certs/. Gere com tools/make-cert antes.');
    process.exit(1);
  }
  server = https.createServer({ key: fs.readFileSync(keyFile), cert: fs.readFileSync(crtFile) }, handler);
} else {
  server = http.createServer(handler);
}

server.listen(PORT, HOST, () => {
  const scheme = USE_HTTPS ? 'https' : 'http';
  console.log('');
  console.log(`  🦉  Gabi — servidor ${USE_HTTPS ? 'HTTPS (microfone e instalação liberados)' : 'HTTP (sem microfone)'}`);
  console.log('  ─────────────────────────────────────────');
  console.log(`  Neste computador:  ${scheme}://localhost:${PORT}`);
  for (const a of lanAddresses()) console.log(`  Na rede Wi-Fi:     ${scheme}://${a.address}:${PORT}   (${a.name})`);
  if (USE_HTTPS) console.log(`  Certificado:       ${scheme}://localhost:${PORT}/ca.crt`);
  console.log('  ─────────────────────────────────────────');
});
