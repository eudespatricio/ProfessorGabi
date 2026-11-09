/* Regrava um conjunto pequeno de clipes antigos que ficaram fora do padrão da Raquel.
   Uso: node tools/replace-low-clips.mjs
   Gera URLs novas (hash com sal) para não reaproveitar cache imutável antigo. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const ENV_PATH = '\\\\wsl.localhost\\Ubuntu\\home\\eudespatricio\\dark_studio_platform\\.env';
const VOICE = 'GDzHdQOi6jjf8zaXhCYD';
const MODEL = 'eleven_multilingual_v2';

const keys = [
  'preto', 'rou', 'muito bem', 'pipa', 'bomba', 'vestido',
  'cil', 'fer', 'fo', 'olho', 'rol', 'tomate',
  'avião', 'flor', 'mor', 'mangueira', 'as', 'cavalo',
  'chor', 'foca', 'lâmpada', 'pia', 'pêssego', 'sa',
  'santo', 'cai', 'guerra', 'nosso',
];

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const txt = fs.readFileSync(ENV_PATH, 'utf8');
  const m = txt.match(/ELEVENLABS_API_KEY\s*=\s*"?([^"\r\n]+)/);
  if (!m) throw new Error('ELEVENLABS_API_KEY não encontrada');
  return m[1].trim();
}

const indexPath = path.join(ROOT, 'app', 'audio', 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const key = readKey();
let chars = 0;
const replacements = [];

for (const [i, k] of keys.entries()) {
  if (!index[k]) throw new Error(`chave ausente no índice: ${k}`);
  const text = k === 'muito bem' ? 'Muito bem!' : k;
  const hash = crypto.createHash('sha1').update(`${k}|raquel-v2`).digest('hex').slice(0, 10);
  const rel = `audio/${hash}.mp3`;
  const file = path.join(ROOT, 'app', rel);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`${k}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000) throw new Error(`${k}: áudio muito curto`);
  fs.writeFileSync(file, buf);
  replacements.push({ k, old: index[k], rel });
  index[k] = rel;
  chars += text.length;
  console.log(`${i + 1}/${keys.length} ${k} -> ${rel} (${buf.length} bytes)`);
}

fs.writeFileSync(indexPath, JSON.stringify(index));
for (const { old, rel } of replacements) {
  if (old !== rel) {
    try { fs.unlinkSync(path.join(ROOT, 'app', old)); } catch { /* ignore */ }
    try { fs.unlinkSync(path.join(ROOT, 'app', 'audio', 'opus', path.basename(old, '.mp3') + '.opus')); } catch { /* ignore */ }
  }
}
console.log(`pronto: ${replacements.length} clipes · ${chars} caracteres/créditos`);
