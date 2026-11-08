/* Gera as faixas de áudio do Gabi com ElevenLabs e monta o índice de clipes.
   Uso: node tools/render-audio.mjs --only=word --limit=5
        node tools/render-audio.mjs --only=all
   Chave: .env do dark_studio_platform (ou ELEVENLABS_API_KEY no ambiente). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WORDS, FRASES, TEXTS } from '../app/js/content.js';
import { splitSyllables } from '../app/js/syllables.js';

const args = process.argv.slice(2);
const arg = (name, def = '') => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const ENV_PATH = arg('env', '\\\\wsl.localhost\\Ubuntu\\home\\eudespatricio\\dark_studio_platform\\.env');
const ONLY = arg('only', 'all').split(',').map((s) => s.trim()).filter(Boolean);
const LIMIT = Number(arg('limit', '0'));
const CONCURRENCY = Number(arg('concurrency', '3'));
const VOICE = arg('voice', 'GDzHdQOi6jjf8zaXhCYD'); // Raquel (pt-BR)
const MODEL = arg('model', 'eleven_multilingual_v2');
const OUT_DIR = path.resolve('app/audio');
const INDEX_FILE = path.join(OUT_DIR, 'index.json');

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const txt = fs.readFileSync(ENV_PATH, 'utf8');
  const m = txt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/);
  if (!m) throw new Error('Chave não encontrada no .env');
  return m[1].trim();
}

const normKey = (t) => String(t).toLowerCase().replace(/[.!?…:;,]+$/g, '').replace(/\s+/g, ' ').trim();

function buildManifest() {
  const map = new Map();
  const add = (text, kind) => {
    const k = normKey(text);
    if (k && k.length >= 1 && !map.has(k)) map.set(k, { text, kind });
  };
  for (const w of WORDS.values()) {
    add(w.w, 'word');
    for (const s of splitSyllables(w.w)) add(s, 'syl');
  }
  FRASES.forEach((f) => add(f, 'phrase'));
  TEXTS.forEach((t) => t.linhas.forEach((l) => add(l, 'line')));
  [
    'Vamos ler juntos.', 'Muito bem!', 'Isso!', 'Quase!', 'Vamos com calma.', 'Ouça e repita.',
    'Agora leia você.', 'Boa leitura!', 'Parabéns!', 'Vamos praticar?', 'Olhe a sílaba.', 'Leia devagar.',
    'Vamos bater palmas juntos.', 'Escute de novo.', 'Você consegue!', 'Muito orgulho de você.',
  ].forEach((s) => add(s, 'ui'));
  return map;
}

async function tts(text, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
      }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = (await res.text()).slice(0, 200);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  throw new Error('falhou após tentativas');
}

const key = readKey();
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = [...buildManifest().entries()].filter(([, v]) => ONLY.includes('all') || ONLY.includes(v.kind));

// definições do glossário (faladas no cartão de palavra)
if (ONLY.includes('def') || ONLY.includes('all')) {
  const { GLOSSARY } = await import('../app/js/glossary.js');
  for (const g of Object.values(GLOSSARY)) {
    const k = g && g.d ? normKey(g.d) : '';
    if (k && !manifest.some(([kk]) => kk === k)) manifest.push([k, { text: g.d, kind: 'def' }]);
  }
}
const total = LIMIT ? Math.min(LIMIT, manifest.length) : manifest.length;
const index = fs.existsSync(INDEX_FILE) ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) : {};
let done = 0;
let chars = 0;
const started = Date.now();

console.log(`voz ${VOICE} · modelo ${MODEL} · ${total} clipes de ${manifest.length} disponíveis`);

async function worker(queue) {
  while (queue.length) {
    const [k, v] = queue.shift();
    if (index[k] && fs.existsSync(path.join('app', index[k]))) { done++; continue; }
    try {
      // eslint-disable-next-line no-await-in-loop
      const buf = await tts(v.text);
      const name = `${crypto.createHash('sha1').update(k).digest('hex').slice(0, 10)}.mp3`;
      fs.writeFileSync(path.join(OUT_DIR, name), buf);
      index[k] = `audio/${name}`;
      chars += v.text.length;
      done++;
      if (done % 10 === 0) {
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
        console.log(`  ${done}/${total} · ${Math.round((Date.now() - started) / 1000)}s · ~${chars} caracteres`);
      }
    } catch (e) {
      console.error(`  ERRO em “${v.text}”: ${e.message}`);
    }
  }
}

const queue = manifest.slice(0, total);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
console.log(`pronto: ${done} clipes · ${Object.keys(index).length} no índice · ~${chars} caracteres · ${Math.round((Date.now() - started) / 1000)}s`);
