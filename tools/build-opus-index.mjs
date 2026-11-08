/* Gera app/audio/index-opus.json a partir do index.json e dos arquivos em opus/.
   Uso: node tools/build-opus-index.mjs */
import fs from 'node:fs';
import path from 'node:path';

const AUDIO = path.join('app', 'audio');
const idx = JSON.parse(fs.readFileSync(path.join(AUDIO, 'index.json'), 'utf8'));
const opus = {};
const missing = [];
for (const [key, file] of Object.entries(idx)) {
  const name = path.basename(String(file)).replace(/\.mp3$/i, '.opus');
  if (fs.existsSync(path.join(AUDIO, 'opus', name))) opus[key] = `audio/opus/${name}`;
  else missing.push(key);
}
fs.writeFileSync(path.join(AUDIO, 'index-opus.json'), JSON.stringify(opus), 'utf8');
const size = fs.statSync(path.join(AUDIO, 'index-opus.json')).size;
console.log(`opus: ${Object.keys(opus).length}/${Object.keys(idx).length} clipes | índice ${(size / 1024).toFixed(1)} KB | faltando ${missing.length}`);
if (missing.length) console.log('sem opus:', missing.slice(0, 10).join(', '));
