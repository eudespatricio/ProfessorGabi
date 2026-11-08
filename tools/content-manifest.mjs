/* Gera/valida o manifesto canônico do conteúdo (fonte única versionada).
   Uso:
     node tools/content-manifest.mjs            -> valida e resume
     node tools/content-manifest.mjs --write    -> grava content/manifest.json
     node tools/content-manifest.mjs --check    -> falha se o manifesto estiver desatualizado
*/
import fs from 'node:fs';
import path from 'node:path';
import { allWords, TEXTS } from '../app/js/content.js';
import { GLOSSARY } from '../app/js/glossary.js';
import { UNITS } from '../app/js/curriculum.js';
import { splitSyllables } from '../app/js/syllables.js';

const MANIFEST = path.join('content', 'manifest.json');
const WRITE = process.argv.includes('--write');
const CHECK = process.argv.includes('--check');

const clipKey = (t) => String(t || '').toLowerCase().replace(/[.!?…:;,]+$/g, '').replace(/\s+/g, ' ').trim();
const audio = JSON.parse(fs.readFileSync('app/audio/index.json', 'utf8'));
const words = allWords();
const errors = [];
const warnings = [];

// ---------- validações ----------
const byUnit = new Map(UNITS.map((u) => [u.id, { words: [], texts: [] }]));
for (const w of words) {
  for (const u of w.u || []) {
    if (!byUnit.has(u)) errors.push(`palavra "${w.w}" aponta para unidade inexistente: ${u}`);
    else byUnit.get(u).words.push(w.w);
  }
  if (!GLOSSARY[w.w.toLowerCase()]) errors.push(`palavra sem glossário: ${w.w}`);
}
for (const k of Object.keys(GLOSSARY)) {
  if (!words.some((w) => w.w.toLowerCase() === k)) errors.push(`glossário órfão: ${k}`);
}
const textIds = new Set();
for (const t of TEXTS) {
  if (textIds.has(t.id)) errors.push(`texto duplicado: ${t.id}`);
  textIds.add(t.id);
  const u = t.unidade;
  if (!byUnit.has(u)) errors.push(`texto ${t.id} aponta para unidade inexistente: ${u}`);
  else byUnit.get(u).texts.push(t.id);
}
for (const [id, v] of byUnit) {
  const u = UNITS.find((x) => x.id === id);
  const storyTrack = u && !v.words.length && !v.texts.length && (u.skills || []).includes('compreensao') && u.lessons >= TEXTS.length;
  if (!v.words.length && !v.texts.length && !storyTrack) warnings.push(`unidade sem conteúdo: ${id}`);
}

const missingWordAudio = words.filter((w) => !audio[clipKey(w.w)]).map((w) => w.w);
if (missingWordAudio.length) errors.push(`palavra sem áudio: ${missingWordAudio.join(', ')}`);
const missingSyl = new Set();
for (const w of words) {
  for (const s of splitSyllables(w.w)) if (!audio[clipKey(s)]) missingSyl.add(s);
}
if (missingSyl.size) warnings.push(`sílabas sem clipe (caem no TTS): ${[...missingSyl].sort().join(', ')}`);

// ---------- manifesto ----------
const canonical = {
  schemaVersion: 1,
  counts: {
    words: words.length,
    units: UNITS.length,
    texts: TEXTS.length,
    glossary: Object.keys(GLOSSARY).length,
    audioClips: Object.keys(audio).length,
    missingWordAudio: missingWordAudio.length,
    missingSyllables: missingSyl.size,
  },
  units: [...UNITS].sort((a, b) => a.n - b.n).map((u) => ({
    id: u.id, n: u.n, titulo: u.titulo, sub: u.sub, emoji: u.emoji, lessons: u.lessons, skills: u.skills,
    teach: u.teach,
    words: [...(byUnit.get(u.id)?.words || [])].sort(),
    texts: [...(byUnit.get(u.id)?.texts || [])].sort(),
  })),
  words: [...words].sort((a, b) => a.w.localeCompare(b.w, 'pt-BR')).map((w) => {
    const g = GLOSSARY[w.w.toLowerCase()] || {};
    return {
      w: w.w, e: w.e, u: [...w.u].sort(), syllables: splitSyllables(w.w),
      gloss: { d: g.d, ex: g.ex, e: g.e, n: g.n },
      audio: { word: clipKey(w.w), hasClip: !!audio[clipKey(w.w)] },
    };
  }),
  texts: [...TEXTS].sort((a, b) => a.id.localeCompare(b.id)).map((t) => ({
    id: t.id, titulo: t.titulo, unidade: t.unidade, emoji: t.emoji,
    linhas: (t.linhas || []).length, perguntas: (t.perguntas || []).length, palavras: t.palavras || [],
  })),
  audio: { clips: Object.keys(audio).length, missingSyllables: [...missingSyl].sort() },
};

// ---------- saída ----------
console.log(`conteúdo: ${canonical.counts.words} palavras | ${canonical.counts.units} unidades | ${canonical.counts.texts} textos | ${canonical.counts.audioClips} clipes`);
for (const w of warnings) console.log('aviso:', w);
for (const e of errors) console.log('ERRO:', e);

if (WRITE) {
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  const payload = { ...canonical, generatedAt: new Date().toISOString() };
  fs.writeFileSync(MANIFEST, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`manifesto gravado: ${MANIFEST} (${(fs.statSync(MANIFEST).size / 1024).toFixed(1)} KB)`);
}

if (CHECK) {
  if (!fs.existsSync(MANIFEST)) {
    errors.push(`manifesto ausente: rode node tools/content-manifest.mjs --write`);
  } else {
    const saved = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    delete saved.generatedAt;
    const a = JSON.stringify(saved);
    const b = JSON.stringify(canonical);
    if (a !== b) errors.push('manifesto desatualizado: rode node tools/content-manifest.mjs --write');
    else console.log('manifesto em sincronia ✅');
  }
}

if (errors.length) {
  console.error(`\n${errors.length} erro(s) de conteúdo`);
  process.exit(1);
}
if (!WRITE && !CHECK) console.log('conteúdo consistente ✅');
