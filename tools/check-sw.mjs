/* Valida o CORE do service worker: todo arquivo listado existe e todo
   módulo/CSS do app (e referência do index.html) está no cache offline.
   Uso: node tools/check-sw.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { APP_VERSION } from '../app/js/version.js';

const APP = path.join(process.cwd(), 'app');
const swSource = fs.readFileSync(path.join(APP, 'sw.js'), 'utf8');
const version = swSource.match(/const VERSION = 'gabi-(v\d+)'/);
if (!version) {
  console.error('VERSION não encontrada em app/sw.js');
  process.exit(1);
}
if (version[1] !== APP_VERSION) {
  console.error(`versão divergente: app/sw.js está em gabi-${version[1]} e app/js/version.js em ${APP_VERSION}`);
  process.exit(1);
}
const audioIndex = swSource.match(/const AUDIO_INDEX = '([^']+)'/);
if (!audioIndex || !fs.existsSync(path.join(APP, audioIndex[1]))) {
  console.error(`índice de áudio do service worker não existe: ${audioIndex?.[1] || '(ausente)'}`);
  process.exit(1);
}
const coreBlock = swSource.match(/const CORE = \[([\s\S]*?)\];/);
if (!coreBlock) {
  console.error('CORE não encontrado em app/sw.js');
  process.exit(1);
}
const norm = (p) => p.replace(/^\.\//, '').replace(/^\//, '').replace(/\\/g, '/');
const core = [...coreBlock[1].matchAll(/'([^']+)'/g)]
  .map((m) => norm(m[1]))
  .filter((p) => p !== '');

const problems = [];
for (const file of core) {
  const target = file === '' ? path.join(APP, 'index.html') : path.join(APP, file);
  if (!fs.existsSync(target)) problems.push(`CORE aponta para arquivo inexistente: ${file}`);
}

// módulos e estilos do app
const local = [];
for (const dir of ['js', 'css']) {
  const full = path.join(APP, dir);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full)) {
    if (/\.(js|css)$/.test(f)) local.push(`${dir}/${f}`);
  }
}
for (const file of local) {
  if (!core.includes(file)) problems.push(`fora do CORE: ${file}`);
}

// referências do index.html
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((u) => !/^(https?:|data:|#|mailto:)/.test(u))
  .map(norm);
for (const ref of refs) {
  if (!core.includes(ref)) problems.push(`index.html referencia e não está no CORE: ${ref}`);
}

const extra = core.filter((f) => !local.includes(f) && !fs.existsSync(path.join(APP, f)) && f !== '');
if (extra.length) problems.push(...extra.map((f) => `entrada suspeita no CORE: ${f}`));

console.log(`CORE: ${core.length} arquivos | módulos/CSS: ${local.length} | refs do index: ${refs.length}`);
if (problems.length) {
  console.error(`\n${problems.length} problema(s):`);
  for (const p of problems) console.error(' - ' + p);
  process.exit(1);
}
console.log('CORE completo e consistente ✅');
