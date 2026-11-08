/* Calcula contraste WCAG de cores candidatas. Uso: node tools/contrast.mjs */
const lum = (hex) => {
  const h = hex.replace('#', '');
  const p = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]);
};
const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pairs = [
  ['#FFF7EC', ['#8b8078', '#7a6f66', '#6f665e', '#6b625a', '#675e56', '#5f574f']],
  ['#FFFFFF', ['#8b8078', '#6f665e', '#6b625a']],
  ['#FFE6DD', ['#e85d3d', '#c04428', '#b83c22', '#a83620']],
  ['#F4EDE4', ['#8b8078', '#6b625a', '#675e56']],
];
for (const [bg, list] of pairs) {
  console.log(`fundo ${bg}:` + list.map((c) => ` ${c}=${ratio(bg, c).toFixed(2)}`).join(''));
}
console.log('branco sobre primary #e85d3d =', ratio('#ffffff', '#e85d3d').toFixed(2));
console.log('teal #0f8d81 sobre branco =', ratio('#ffffff', '#0f8d81').toFixed(2));
console.log('teal #0b6f66 sobre branco =', ratio('#ffffff', '#0b6f66').toFixed(2));
