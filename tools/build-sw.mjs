/* Regenera a lista CORE do service worker a partir dos arquivos em app/.
   Uso: node tools/build-sw.mjs   (idempotente; mantém a VERSION atual) */
import fs from 'node:fs';
import path from 'node:path';

const APP = path.join('app');
const SW = path.join(APP, 'sw.js');
const sw = fs.readFileSync(SW, 'utf8');

const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(https?:|data:|#|mailto:)/.test(u))
  .map((u) => u.replace(/^\.\//, '').replace(/^\//, ''));

const files = new Set(['index.html', 'manifest.webmanifest', ...refs]);
const addDir = (dir, re) => {
  const full = path.join(APP, dir);
  if (!fs.existsSync(full)) return;
  for (const f of fs.readdirSync(full)) if (re.test(f)) files.add(`${dir}/${f}`);
};
addDir('css', /\.css$/);
addDir('js', /\.js$/);
addDir('fonts', /\.woff2$/);
addDir('icons', /\.png$/);

const list = [...files].sort((a, b) => a.localeCompare(b, 'en'));
const block = `const CORE = [\n  './',\n${list.map((f) => `  './${f}',`).join('\n')}\n];`;

if (!/const CORE = \[[\s\S]*?\];/.test(sw)) {
  console.error('bloco CORE não encontrado em app/sw.js');
  process.exit(1);
}
const next = sw.replace(/const CORE = \[[\s\S]*?\];/, block);
if (next === sw) {
  console.log(`CORE já está atualizado (${list.length + 1} entradas)`);
} else {
  fs.writeFileSync(SW, next, 'utf8');
  console.log(`CORE regenerado: ${list.length + 1} entradas`);
}
