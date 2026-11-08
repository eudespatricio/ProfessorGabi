/* Mostra o que o corretor faria com cada palavra desconhecida de um texto.
   Uso: node tools/explore-text.mjs assets/pagina-teste.clean.txt */
import fs from 'node:fs';
import { candidates, isKnown, fixPlainText } from '../app/js/ocr-fix.js';

const text = fs.readFileSync(process.argv[2] || 'assets/pagina-teste.clean.txt', 'utf8');
const words = [...new Set((text.match(/[\p{L}]{3,}/gu) || []))];
const unknown = words.filter((w) => !isKnown(w.toLowerCase()));
console.log(`palavras: ${words.length} | desconhecidas: ${unknown.length}\n`);
for (const w of unknown) {
  const c = candidates(w.toLowerCase());
  const flag = c.length === 1 ? '  <== seria trocada' : '';
  console.log(w.padEnd(16), c.slice(0, 4).join(' '), flag);
}
const fixed = fixPlainText(text);
console.log(`\ncorreções no texto: ${fixed.fixes}`);
console.log(fixed.text.split('\n').filter((l) => /\b(talvez|ralvez|obter|obrer)\b/.test(l)).join('\n'));
