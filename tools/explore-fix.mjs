/* Explora candidatos de correção para calibrar as regras. Uso: node tools/explore-fix.mjs */
import { PT_WORDS } from '../app/js/wordlist-pt.js';

const words = PT_WORDS.split(' ');
const rank = new Map(words.map((w, i) => [w, i]));
const A = 'abcdefghijklmnopqrstuvwxyzáàâãéêíóôõúüç';
const ALPHA = [...A];

function cands(w) {
  const out = new Set();
  for (let i = 0; i < w.length; i++) {
    for (const c of ALPHA) out.add(w.slice(0, i) + c + w.slice(i + 1));
    if (i < w.length - 1) out.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
  }
  return [...out].filter((c) => rank.has(c)).sort((a, b) => rank.get(a) - rank.get(b));
}

for (const w of ['obrer', 'ralvez', 'soltara', 'sacudindo', 'rispidez', 'fisionomias', 'narnianos', '8em', 'voz', 'astucia', 'cora', 'quase']) {
  const c = cands(w);
  console.log(`\n${w} (rank ${rank.get(w) ?? '-'}) ->`, c.slice(0, 6).map((x) => `${x}(${rank.get(x)})`).join(' '));
}
