/* Gera app/js/wordlist-pt.js a partir da lista de frequência pt_br_50k.
   Uso: node tools/build-wordlist.mjs */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'tools/data/pt_br_50k.txt';
const OUT = 'app/js/wordlist-pt.js';
const LIMIT = 12000;

// palavras que não devem entrar em um app infantil
const BLOCK = new Set([
  'merda', 'merdas', 'porra', 'porras', 'caralho', 'caralhos', 'foder', 'fodase', 'foda', 'fodas',
  'puta', 'putas', 'putaria', 'cu', 'cus', 'cacete', 'bosta', 'bostas', 'pinto', 'pintos',
  'xoxota', 'buceta', 'penis', 'pênis', 'vagina', 'transar', 'transa', 'trepar', 'gozar',
  'idiota', 'idiotas', 'otario', 'otário', 'otaria', 'otária', 'babaca', 'babacas', 'corno',
]);

const raw = fs.readFileSync(SRC, 'utf8');
const seen = new Set();
const words = [];
for (const line of raw.split('\n')) {
  const token = line.trim().split(/\s+/)[0];
  if (!token) continue;
  const w = token.normalize('NFC').toLowerCase();
  if (!/^[a-záàâãéêíóôõúüç]{2,18}$/.test(w)) continue;
  if (BLOCK.has(w) || seen.has(w)) continue;
  seen.add(w);
  words.push(w);
  if (words.length >= LIMIT) break;
}

const header = `/* As ${words.length.toLocaleString('pt-BR')} palavras mais frequentes do português brasileiro.
   Fonte: github.com/hermitdave/FrequencyWords (OpenSubtitles 2018), licença MIT.
   Gerada por tools/build-wordlist.mjs — não editar à mão. */
`;
const body = `export const PT_WORDS = ${JSON.stringify(words.join(' '))};\n`;
fs.writeFileSync(OUT, header + body, 'utf8');
console.log(`${words.length} palavras -> ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
console.log('primeiras:', words.slice(0, 12).join(' '));
console.log('últimas:', words.slice(-8).join(' '));
console.log('contém obter/talvez/bem:', ['obter', 'talvez', 'bem'].map((w) => `${w}:${seen.has(w)}`).join(' '));
console.log('contém soltara/rispidez/fisionomias/narnianos/sacudindo:', ['soltara', 'rispidez', 'fisionomias', 'narnianos', 'sacudindo']
  .map((w) => `${w}:${seen.has(w)}`).join(' '));
