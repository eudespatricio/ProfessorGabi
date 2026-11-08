/* Regressões de leitura em voz alta, sílaba faltando e pecinhas repetidas. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readingKey } from '../app/js/utils.js';
import { similarity, groupPieces } from '../app/js/exercises.js';
import { UNITS, buildLesson, buildMissingSyllableItem } from '../app/js/curriculum.js';

test('leitura: chave fonética cobre L/R finais e O/E átonos', () => {
  assert.equal(readingKey('sol'), readingKey('sou'));
  assert.equal(readingKey('mar'), readingKey('ma'));
  assert.equal(readingKey('mulher'), readingKey('mulhe'));
  assert.equal(readingKey('gato'), readingKey('gatu'));
  assert.equal(readingKey('leite'), readingKey('leiti'));
});

test('leitura: palavras diferentes continuam diferentes', () => {
  assert.notEqual(readingKey('sal'), readingKey('sol'));
  assert.notEqual(readingKey('sapato'), readingKey('sol'));
  assert.notEqual(readingKey('pato'), readingKey('gato'));
});

test('leitura: "sol" dito como "sou" passa no limite da palavra curta', () => {
  assert.ok(similarity('sou', 'sol') >= 0.72);
  assert.ok(similarity('ma', 'mar') >= 0.72);
  assert.ok(similarity('gatu', 'gato') >= 0.72);
  assert.ok(similarity('sal', 'sol') < 0.72);
  assert.ok(similarity('sapato', 'sol') < 0.72);
});

test('montar palavra: pecinhas iguais viram um único botão com contador', () => {
  const groups = groupPieces(['p', 'i', 'r', 'a', 't', 'a']);
  assert.deepEqual(groups.map((g) => [g.piece, g.total, g.left]), [
    ['p', 1, 1], ['i', 1, 1], ['r', 1, 1], ['a', 2, 2], ['t', 1, 1],
  ]);
});

test('sílaba faltando: mostra a lacuna, opções únicas e o índice certo', () => {
  let count = 0;
  for (const unit of UNITS) {
    for (let i = 0; i < unit.lessons; i++) {
      for (const item of buildLesson(unit.id, i).items) {
        if (item.type !== 'missing-syllable') continue;
        count++;
        assert.ok(typeof item.display === 'string' && item.display.includes('_'), `sem lacuna: ${item.word}`);
        const labels = item.options.map((o) => o.label);
        assert.equal(new Set(labels).size, labels.length, `opções repetidas em ${item.word}: ${labels.join(', ')}`);
        assert.ok(item.correct >= 0 && item.correct < item.options.length, `índice inválido em ${item.word}`);
        assert.equal(item.options[item.correct].label, item.syllables[item.blankIndex], `gabarito errado em ${item.word}`);
      }
    }
  }
  assert.ok(count >= 20, `esperava itens de sílaba faltando; veio ${count}`);
});

test('sílaba faltando: palavra com sílaba repetida não gera duas respostas certas', () => {
  for (const word of ['banana', 'jujuba', 'caneca']) {
    const item = buildMissingSyllableItem(word, () => 0);
    const labels = item.options.map((o) => o.label);
    const ci = item.options.findIndex((o) => o.correct);
    assert.ok(ci >= 0, `${word}: sem opção correta`);
    assert.equal(new Set(labels).size, labels.length, `${word}: ${labels.join(', ')}`);
    assert.equal(item.options[ci].label, item.syllables[item.blankIndex], word);
    // só uma opção pode ter o mesmo texto da sílaba correta
    const correctText = item.options[ci].label;
    assert.equal(labels.filter((l) => l === correctText).length, 1, word);
  }
});
