/* Garante que nenhum arquivo do app foi salvo com encoding corrompido (mojibake).
   O caso real: app/sw.js ficou com "navega????????o" e "Sem conex????o" na v32. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = path.join(ROOT, 'app');
const EXTRA = [
  path.join(ROOT, 'package.json'),
  path.join(ROOT, 'ESTADO.md'),
  path.join(ROOT, 'MAPA.md'),
  path.join(ROOT, 'REJEITADOS.md'),
];

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'audio' || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(js|mjs|css|html|json|webmanifest|md)$/i.test(name)) out.push(full);
  }
  return out;
}

// "Ã" seguido de Latin-1 (Ã©, Ã£...), "Â" idem, emoji mojibake (ðŸ), U+FFFD e "????".
const BAD = /\ufffd|\?\?\?\?|Ã[\u0080-\u00ff\u0192]|Â[\u0080-\u00ff]|ðŸ/;

test('arquivos do app não têm sinais de mojibake', () => {
  const bad = [];
  for (const file of [...walk(APP), ...EXTRA]) {
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (BAD.test(line)) bad.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(bad, [], `Encoding corrompido:\n${bad.join('\n')}`);
});
