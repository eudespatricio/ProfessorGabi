/* Revisão curta ao fim da lição: prioridade, tamanho e origem das palavras. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLesson, buildLessonReviewItems } from '../app/js/curriculum.js';
import { rng } from '../app/js/utils.js';

test('revisão da lição prioriza a palavra errada e monta 2 itens', () => {
  const lesson = buildLesson('u2', 1);
  const exItems = lesson.items.filter((i) => i.kind === 'ex');
  const results = exItems.map((item, i) => ({ ok: i !== 0, word: item.word, helped: false }));
  const review = buildLessonReviewItems({ unitId: 'u2', lessonIndex: 1, items: lesson.items, results }, rng('revisao-teste'));
  assert.ok(review.length >= 2 && review.length <= 3, `itens: ${review.length}`);
  assert.ok(review.every((i) => i.kind === 'ex'));
  assert.equal(review[0].word, results[0].word);
  assert.equal(new Set(review.map((i) => i.id)).size, review.length);
});

test('revisão da história usa as palavras do texto', () => {
  const lesson = buildLesson('u9', 0);
  assert.ok(lesson.textId, 'história sem textId');
  const review = buildLessonReviewItems({ unitId: 'u9', lessonIndex: 0, items: lesson.items, results: [], textId: lesson.textId }, rng('revisao-historia'));
  assert.ok(review.length >= 2);
  assert.ok(review.every((i) => i.type === 'read-word' || i.type === 'build-word' || i.type === 'missing-syllable'));
});

test('revisão não inventa item quando a lição não tem palavra', () => {
  const review = buildLessonReviewItems({ unitId: 'u1', lessonIndex: 0, items: [], results: [] }, rng('vazio'));
  assert.deepEqual(review, []);
});
