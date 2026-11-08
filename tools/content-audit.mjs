/* Diagnóstico de consistência do conteúdo (palavras, glossário, unidades, textos, áudio).
   Uso: node tools/content-audit.mjs */
import fs from 'node:fs';
import { allWords, TEXTS, RIMAS, FRASES, PARLENDAS, SIGHT } from '../app/js/content.js';
import { GLOSSARY } from '../app/js/glossary.js';
import { UNITS } from '../app/js/curriculum.js';
import { splitSyllables } from '../app/js/syllables.js';

const clipKey = (t) => String(t || '').toLowerCase().replace(/[.!?…:;,]+$/g, '').replace(/\s+/g, ' ').trim();
const audio = JSON.parse(fs.readFileSync('app/audio/index.json', 'utf8'));
const words = allWords();
const keys = words.map((w) => w.w.toLowerCase());

const byUnit = new Map(UNITS.map((u) => [u.id, []]));
const badUnit = [];
for (const w of words) {
  for (const u of w.u || []) {
    if (!byUnit.has(u)) badUnit.push(`${w.w} -> ${u}`);
    else byUnit.get(u).push(w.w);
  }
}

const noGloss = words.filter((w) => !GLOSSARY[w.w.toLowerCase()]);
const orphanGloss = Object.keys(GLOSSARY).filter((k) => !keys.includes(k));
const sylMismatch = words.filter((w) => {
  const g = GLOSSARY[w.w.toLowerCase()];
  return g && Number(g.n) && Number(g.n) !== splitSyllables(w.w).length;
});
const noWordAudio = words.filter((w) => !audio[clipKey(w.w)]);
const noSylAudio = [];
for (const w of words) {
  for (const s of splitSyllables(w.w)) if (!audio[clipKey(s)]) noSylAudio.push(`${w.w}: ${s}`);
}
const textIds = new Set();
const dupTexts = [];
for (const t of TEXTS) {
  if (textIds.has(t.id)) dupTexts.push(t.id);
  textIds.add(t.id);
}
const emptyUnits = UNITS.filter((u) => (byUnit.get(u.id) || []).length === 0 && !TEXTS.some((t) => (t.units || []).includes(u.id)));

console.log('palavras:', words.length, '| glossário:', Object.keys(GLOSSARY).length, '| textos:', TEXTS.length);
console.log('unidades:', UNITS.length, '| rimas:', RIMAS.length, '| frases:', FRASES.length, '| parlendas:', PARLENDAS.length, '| sight:', SIGHT.length);
console.log('\nsem glossário:', noGloss.length, noGloss.slice(0, 8).map((w) => w.w).join(', '));
console.log('glossário órfão:', orphanGloss.length, orphanGloss.slice(0, 8).join(', '));
console.log('sílabas divergentes (g.n):', sylMismatch.length, sylMismatch.slice(0, 8).map((w) => w.w).join(', '));
console.log('unidade inválida:', badUnit.length, badUnit.slice(0, 5).join(', '));
console.log('unidades vazias:', emptyUnits.length, emptyUnits.map((u) => u.id).join(', '));
console.log('textos duplicados:', dupTexts.length, dupTexts.join(', '));
console.log('\náudio: clipes:', Object.keys(audio).length);
console.log('palavra sem áudio:', noWordAudio.length, noWordAudio.slice(0, 10).map((w) => w.w).join(', '));
console.log('sílaba sem áudio:', noSylAudio.length, noSylAudio.slice(0, 10).join(', '));
console.log('\npalavras por unidade:', UNITS.map((u) => `${u.id}:${(byUnit.get(u.id) || []).length}`).join(' '));
