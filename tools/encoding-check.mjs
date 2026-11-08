#!/usr/bin/env node
/* Procura sinais de corrupção de encoding (mojibake) nos arquivos de texto do app.
   Uso: node tools/encoding-check.mjs [--quiet]
   Sai com código 1 se achar algo, para poder rodar no CI. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SKIP_DIRS = new Set(['node_modules', '.git', 'audio', 'certs', 'frames', 'sessions', 'assets']);
const SKIP_FILES = new Set(['tests/encoding.test.mjs', 'tools/encoding-check.mjs']);
const EXTS = new Set(['.js', '.mjs', '.css', '.html', '.json', '.md', '.webmanifest', '.ps1']);

// Sequências típicas de UTF-8 lido como Latin-1 e regravado.
const SIGNS = [
  '\u00c3\u00a9', '\u00c3\u00a3', '\u00c3\u00b5', '\u00c3\u00a7', '\u00c3\u00a1',
  '\u00c3\u00aa', '\u00c3\u00b3', '\u00c3\u00ba', '\u00c3\u00ad', '\u00c3\u00a0',
  '\u00c3\u0089', '\u00c3\u0087', '\u00c3\u0095', '\u00c3\u0081', '\u00c3\u0192',
  '\u00c2\u00ba', '\u00c2\u00aa', '\u00e2\u20ac\u2122', '\u00e2\u20ac\u0153',
  '\u00e2\u20ac\u009d', '\u00e2\u20ac\u201c', '\u00e2\u20ac\u201d', '\u00e2\u0153\u2028',
  '\u00e2\u009c\u00a8', '\u00f0\u0178', '\ufffd', '????',
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  if (SKIP_FILES.has(relative(ROOT, file).replace(/\\/g, '/'))) continue;
  const text = readFileSync(file, 'utf8');
  if (!text) continue;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const sign of SIGNS) {
      if (line.includes(sign)) {
        hits.push({ file: relative(ROOT, file), line: i + 1, sign, text: line.trim().slice(0, 160) });
        break;
      }
    }
  });
}

if (!hits.length) {
  if (!process.argv.includes('--quiet')) console.log('encoding: tudo limpo \u2705');
  process.exit(0);
}
console.log(`encoding: ${hits.length} linha(s) suspeita(s)`);
for (const h of hits.slice(0, 80)) {
  console.log(`${h.file}:${h.line} [${JSON.stringify(h.sign)}] ${h.text}`);
}
process.exit(1);
