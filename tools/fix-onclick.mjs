import fs from 'node:fs';
import path from 'node:path';

const dir = 'app/js';
let changed = 0;
let total = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
  const p = path.join(dir, f);
  const before = fs.readFileSync(p, 'utf8');
  const count = (before.match(/(?<!["'])\bon:[a-z]+:/g) || []).length;
  const after = before.replace(/(?<!["'])\bon:(click|change|input|pointerdown|submit):/g, "'on:$1':");
  if (after !== before) {
    fs.writeFileSync(p, after, 'utf8');
    changed++;
    total += count;
    console.log('  corrigido', f, count);
  }
}
console.log(`arquivos: ${changed}, ocorrências: ${total}`);
