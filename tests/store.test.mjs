import test from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../app/js/store.js';
import { dayKey } from '../app/js/utils.js';
import { UNITS } from '../app/js/curriculum.js';

const item = (over = {}) => ({
  type: 'read-word', skill: 'leitura', word: 'campo', ...over,
});

test('tentativa correta: sobe a caixa da revisão e atualiza habilidades', () => {
  Object.assign(store.state, store.defaultState());
  const r = store.recordAttempt({ unitId: 'u6', lessonIndex: 0, item: item(), ok: true });
  assert.ok(r.gained >= 10);
  assert.equal(store.state.skills.leitura.n, 1);
  assert.equal(store.state.skills.leitura.ok, 1);
  assert.equal(store.state.srs.campo.box, 1);
  assert.ok(store.state.srs.campo.due > dayKey());
});

test('tentativa errada: zera a caixa, registra erro e volta na revisão', () => {
  const r = store.recordAttempt({ unitId: 'u6', lessonIndex: 0, item: item(), ok: false });
  assert.equal(r.gained, 2);
  assert.equal(store.state.srs.campo.box, 0);
  assert.equal(store.state.errors.campo, 1);
  assert.ok(store.dueWords(10).includes('campo'));
  assert.equal(store.weakWords(5)[0].word, 'campo');
});

test('sequência de dias e XP', () => {
  const before = store.state.progress.xp;
  store.recordAttempt({ unitId: 'u6', lessonIndex: 1, item: item(), ok: true });
  assert.ok(store.state.progress.xp > before);
  assert.ok(store.state.progress.streak.days >= 1);
  assert.equal(store.level(), store.levelFromXp(store.state.progress.xp));
});

test('lição concluída libera a próxima unidade', () => {
  Object.assign(store.state, store.defaultState());
  const u1 = UNITS[0];
  for (let i = 0; i < u1.lessons; i++) {
    store.markLessonComplete('u1', i, { stars: 3, total: 7, correct: 7 });
    for (let k = 0; k < 7; k++) {
      store.recordAttempt({ unitId: 'u1', lessonIndex: i, item: { type: 'count-syllables', skill: 'consciencia', word: 'bola' }, ok: true });
    }
  }
  const p = store.unitProgress('u1', u1);
  assert.equal(p.done, u1.lessons);
  assert.ok(p.mastery > 60);
  assert.equal(store.isUnitUnlocked('u2', UNITS), true);
  assert.equal(store.isUnitUnlocked('u5', UNITS), false);
});

test('modo livre libera tudo', () => {
  store.state.settings.freeMode = true;
  assert.equal(store.isUnitUnlocked('u8', UNITS), true);
  store.state.settings.freeMode = false;
});

test('backup exporta e importa', () => {
  Object.assign(store.state, store.defaultState());
  store.recordAttempt({ unitId: 'u2', lessonIndex: 0, item: item({ word: 'bola' }), ok: true });
  const json = store.exportJSON();
  Object.assign(store.state, store.defaultState());
  assert.equal(store.state.progress.xp, 0);
  store.importJSON(json);
  assert.ok(store.state.progress.xp > 0);
  assert.ok(store.state.srs.bola);
});

test('recomendação aponta para uma unidade válida', () => {
  const rec = store.recommendation(UNITS);
  assert.ok(rec.unitId && rec.unit);
  assert.ok(rec.lessonIndex >= 0 && rec.lessonIndex < rec.unit.lessons);
});

test('estado atual nasce na versão 2', () => {
  assert.equal(store.defaultState().version, 2);
  assert.equal(store.STATE_VERSION, 2);
});

test('migrate aceita backup v1, limita histórico e completa campos', () => {
  const old = {
    version: 1,
    progress: { xp: 10 },
    history: Array.from({ length: 500 }, (_, i) => ({ i })),
  };
  const m = store.migrate(old);
  assert.equal(m.version, 2);
  assert.equal(m.history.length, 300);
  assert.equal(m.history.at(-1).i, 499);
  assert.deepEqual(m.reading, { alone: 0, helped: 0, syllables: 0 });
  assert.equal(m.diagnostic, null);
});

test('migrate tolera entrada inválida', () => {
  assert.equal(store.migrate(null), null);
  assert.equal(store.migrate(undefined), null);
});
