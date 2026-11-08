/* Integra content-units.js (novas fases e textos) ao conteúdo e ao currículo. */
import fs from 'node:fs';

const p = (f) => `app/js/${f}`;
let content = fs.readFileSync(p('content.js'), 'utf8');
let curr = fs.readFileSync(p('curriculum.js'), 'utf8');

if (!content.includes("from './content-units.js'")) {
  content = content.replace(
    "/* palavra | emoji | unidades  (unidades separadas por vírgula) */",
    "import { EXTRA_WORDS, EXTRA_TEXTS } from './content-units.js';\n\n/* palavra | emoji | unidades  (unidades separadas por vírgula) */",
  );
}
if (!content.includes('for (const x of EXTRA_WORDS)')) {
  content = content.replace(
    'export const allWords = () => [...WORDS.values()];',
    "for (const x of EXTRA_WORDS) WORDS.set(String(x.w).toLowerCase(), { w: x.w, e: x.e || '🔤', u: x.u });\n\nexport const allWords = () => [...WORDS.values()];",
  );
}
if (!content.includes('TEXTS.push(...EXTRA_TEXTS)')) {
  content = content.replace(
    'export const TEXT_BY_ID = new Map(TEXTS.map((t) => [t.id, t]));',
    'TEXTS.push(...EXTRA_TEXTS);\n\nexport const TEXT_BY_ID = new Map(TEXTS.map((t) => [t.id, t]));',
  );
}

if (!curr.includes("from './content-units.js'")) {
  curr = curr.replace(
    "import { wordsOfUnit, wordInfo, TEXTS, TEXT_BY_ID, RIMAS, FRASES, PARLENDAS, SIGHT } from './content.js';",
    "import { wordsOfUnit, wordInfo, TEXTS, TEXT_BY_ID, RIMAS, FRASES, PARLENDAS, SIGHT } from './content.js';\nimport { EXTRA_UNITS } from './content-units.js';",
  );
}
if (!curr.includes('UNITS.push(...EXTRA_UNITS)')) {
  curr = curr.replace(
    'export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));',
    [
      'UNITS.push(...EXTRA_UNITS);',
      'EXTRA_UNITS.forEach((u, i) => { u.n = 9 + i; });',
      "const storiesUnit = UNITS.find((u) => u.id === 'u9');",
      'if (storiesUnit) storiesUnit.n = 9 + EXTRA_UNITS.length;',
      'UNITS.sort((a, b) => a.n - b.n);',
      '',
      'export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));',
    ].join('\n'),
  );
}

fs.writeFileSync(p('content.js'), content);
fs.writeFileSync(p('curriculum.js'), curr);

const c = await import('../app/js/content.js');
const cur = await import('../app/js/curriculum.js');
console.log('palavras:', c.WORDS.size, '| textos:', c.TEXTS.length, '| unidades:', cur.UNITS.length);
console.log('ordem:', cur.UNITS.map((u) => `${u.n}:${u.id}`).join(' '));
