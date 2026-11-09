/* Gera somente os clipes que faltam no índice, com a mesma voz/modelo do pacote.
   Uso:
     node tools/render-delta.mjs --dry-run
     node tools/render-delta.mjs --limit=1 --write
     node tools/render-delta.mjs --write
   Chave: ELEVENLABS_API_KEY ou .env do dark_studio_platform. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildCandidates } from './audio-delta-candidates.mjs';

const args = process.argv.slice(2);
const arg = (name, def = '') => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const WRITE = args.includes('--write');
const MAX_CHARS = Number(arg('max-chars', '30000'));
const LIMIT = Number(arg('limit', '0'));
const CONCURRENCY = Number(arg('concurrency', '3'));
const VOICE = arg('voice', 'GDzHdQOi6jjf8zaXhCYD'); // Raquel, pt-BR
const MODEL = arg('model', 'eleven_multilingual_v2');
const ENV_PATH = arg('env', '\\\\wsl.localhost\\Ubuntu\\home\\eudespatricio\\dark_studio_platform\\.env');
const APP_AUDIO = path.join('app', 'audio');
const INDEX_FILE = path.join(APP_AUDIO, 'index.json');

const normKey = (t) => String(t).toLowerCase().replace(/[.!?…:;,]+$/g, '').replace(/\s+/g, ' ').trim();

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const txt = fs.readFileSync(ENV_PATH, 'utf8');
  const m = txt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/);
  if (!m) throw new Error('ELEVENLABS_API_KEY não encontrada');
  return m[1].trim();
}

const key = readKey();
const index = fs.existsSync(INDEX_FILE) ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')) : {};
const candidates = buildCandidates();
const missing = [];
const seen = new Set();
for (const c of candidates) {
  const k = normKey(c.text);
  if (!k || seen.has(k) || index[k]) continue;
  seen.add(k);
  missing.push({ ...c, key: k });
}
missing.sort((a, b) => a.priority - b.priority || a.text.length - b.text.length);

let chosen = [];
let chars = 0;
for (const c of missing) {
  if (chars + c.text.length > MAX_CHARS) continue;
  chosen.push(c);
  chars += c.text.length;
  if (LIMIT && chosen.length >= LIMIT) break;
}

const by = {};
for (const c of chosen) {
  by[c.kind] ??= { n: 0, chars: 0 };
  by[c.kind].n++;
  by[c.kind].chars += c.text.length;
}
console.log(`voz ${VOICE} · modelo ${MODEL}`);
console.log(`delta: ${missing.length} clipes / ${missing.reduce((a, c) => a + c.text.length, 0)} caracteres`);
console.log(`selecionado: ${chosen.length} clipes / ${chars} caracteres (orçamento ${MAX_CHARS})`);
console.log(JSON.stringify(by, null, 2));
if (!WRITE) {
  console.log('dry-run: nada foi chamado; use --write para gerar.');
  process.exit(0);
}
if (!chosen.length) {
  console.log('nada a gerar.');
  process.exit(0);
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

const queue = [...chosen];
let done = 0;
let generatedChars = 0;
const started = Date.now();
async function worker() {
  while (queue.length) {
    const item = queue.shift();
    if (!item) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const buf = await tts(item.text);
      const name = `${crypto.createHash('sha1').update(item.key).digest('hex').slice(0, 10)}.mp3`;
      fs.writeFileSync(path.join(APP_AUDIO, name), buf);
      index[item.key] = `audio/${name}`;
      done++;
      generatedChars += item.text.length;
      if (done % 10 === 0 || done === chosen.length) {
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
        console.log(`  ${done}/${chosen.length} · ${Math.round((Date.now() - started) / 1000)}s · ${generatedChars} caracteres`);
      }
    } catch (e) {
      console.error(`  ERRO em “${item.text.slice(0, 80)}”: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
console.log(`pronto: ${done}/${chosen.length} clipes · ${generatedChars} caracteres · ${Object.keys(index).length} no índice · ${Math.round((Date.now() - started) / 1000)}s`);
