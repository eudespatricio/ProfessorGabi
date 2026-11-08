const files = ['utils', 'syllables', 'content', 'curriculum', 'store', 'audio', 'speech', 'ui', 'tutor', 'exercises', 'screen-home', 'screen-lesson', 'screen-parent', 'screen-talk'];
let bad = 0;
for (const f of files) {
  try {
    await import(`../app/js/${f}.js`);
    console.log('  ok', f);
  } catch (e) {
    bad++;
    console.log('  ERRO', f, '→', e.message);
  }
}
console.log(bad ? `${bad} módulo(s) com erro` : 'todos os módulos carregam');
process.exit(bad ? 1 : 0);
