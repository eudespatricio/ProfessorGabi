import test from 'node:test';
import assert from 'node:assert/strict';

import { splitSyllables, countSyllables } from '../app/js/syllables.js';
import { WORDS, TEXTS, RIMAS, STICKERS, wordsOfUnit } from '../app/js/content.js';
import { UNITS, buildLesson, buildDiagnostic, buildReviewItems, suggestUnitFromDiagnostic } from '../app/js/curriculum.js';
import { alignReading, norm, lev } from '../app/js/utils.js';

test('sílabas: a junção das sílabas reconstrói a palavra', () => {
  for (const { w } of WORDS.values()) {
    const syl = splitSyllables(w);
    assert.ok(syl.length >= 1, `sem sílabas: ${w}`);
    assert.equal(syl.join('').toLowerCase(), w.toLowerCase(), `divisão errada em ${w}: ${syl.join('-')}`);
    for (const s of syl) assert.ok(s.length > 0, `sílaba vazia em ${w}`);
  }
});

test('sílabas: casos clássicos do português', () => {
  const cases = {
    bola: ['bo', 'la'], campo: ['cam', 'po'], dento: ['den', 'to'],
    carro: ['car', 'ro'], pássaro: ['pás', 'sa', 'ro'], escola: ['es', 'co', 'la'],
    livro: ['li', 'vro'], compra: ['com', 'pra'], simples: ['sim', 'ples'],
    banho: ['ba', 'nho'], milho: ['mi', 'lho'], chuva: ['chu', 'va'],
    quero: ['que', 'ro'], guerra: ['guer', 'ra'], água: ['á', 'gua'],
    coração: ['co', 'ra', 'ção'], também: ['tam', 'bém'], ônibus: ['ô', 'ni', 'bus'],
    bicicleta: ['bi', 'ci', 'cle', 'ta'], pássaro2: [],
  };
  delete cases.pássaro2;
  for (const [w, exp] of Object.entries(cases)) {
    assert.deepEqual(splitSyllables(w), exp, w);
  }
});

test('sílabas: contagem correta', () => {
  assert.equal(countSyllables('pão'), 1);
  assert.equal(countSyllables('banana'), 3);
  assert.equal(countSyllables('borboleta'), 4);
});

test('conteúdo: todas as palavras têm emoji e unidade', () => {
  for (const info of WORDS.values()) {
    assert.ok(info.e && info.e.length > 0, `emoji ausente em ${info.w}`);
    assert.ok(info.u.length > 0, `unidade ausente em ${info.w}`);
  }
});

test('conteúdo: rimas e adesivos coerentes', () => {
  for (const g of RIMAS) for (const w of g) assert.ok(WORDS.has(w), `rima com palavra inexistente: ${w}`);
  assert.ok(STICKERS.length >= 8);
});

test('conteúdo: histórias têm linhas e perguntas válidas', () => {
  for (const t of TEXTS) {
    assert.ok(t.linhas.length >= 3, t.id);
    for (const p of t.perguntas) {
      assert.ok(p.ok >= 0 && p.ok < p.opcoes.length, `${t.id} resposta inválida`);
    }
  }
});

test('currículo: todas as unidades têm palavras ou histórias', () => {
  for (const u of UNITS) {
    assert.ok(u.lessons > 0, u.id);
    if (u.id !== 'u9') assert.ok(wordsOfUnit(u.id).length >= 8, `poucas palavras em ${u.id}`);
  }
});

test('currículo: lições têm começo, itens válidos e ids únicos', () => {
  for (const u of UNITS) {
    for (let i = 0; i < u.lessons; i++) {
      const lesson = buildLesson(u.id, i);
      assert.ok(lesson.items.length >= 4, `${u.id} lição ${i} tem ${lesson.items.length} itens`);
      assert.equal(lesson.items[0].kind, 'teach', `${u.id}:${i} não começa com ensino`);
      const ids = new Set();
      for (const it of lesson.items) {
        assert.ok(!ids.has(it.id), `id repetido ${it.id}`);
        ids.add(it.id);
        if (it.options) {
          assert.ok(it.options.length >= 2, `opções insuficientes em ${it.id}`);
          assert.ok(Number.isInteger(it.correct), `correct inválido em ${it.id}`);
          assert.ok(it.correct >= 0 && it.correct < it.options.length, `correct fora do intervalo em ${it.id}`);
        }
        if (it.pieces) assert.ok(it.pieces.length >= it.slots, `peças insuficientes em ${it.id}`);
      }
    }
  }
});

test('currículo: exercícios de M antes de P/B existem e explicam a regra', () => {
  let found = 0;
  for (let i = 0; i < 5; i++) {
    const lesson = buildLesson('u6', i);
    const mpb = lesson.items.filter((it) => it.type === 'm-pb');
    for (const it of mpb) {
      found++;
      assert.ok(/[MN]/.test(it.explain.rule), 'regra do M/N ausente');
      assert.ok(it.options.length === 2);
    }
  }
  assert.ok(found >= 4, `poucos exercícios M/PB: ${found}`);
});

test('diagnóstico: monta itens válidos e sugere unidade', () => {
  const items = buildDiagnostic();
  assert.ok(items.length >= 8, `diagnóstico com ${items.length} itens`);
  const results = items.map((it, i) => ({ ok: i > 6, skill: it.skill, type: it.type }));
  const unit = suggestUnitFromDiagnostic(results);
  assert.ok(UNITS.some((u) => u.id === unit), unit);
  const weak = items.map((it) => ({ ok: false, skill: it.skill, type: it.type }));
  assert.equal(suggestUnitFromDiagnostic(weak), 'u1');
  const strong = items.map((it) => ({ ok: true, skill: it.skill, type: it.type }));
  assert.ok(['u8', 'u6'].includes(suggestUnitFromDiagnostic(strong)));
});

test('revisão: gera itens a partir de palavras', () => {
  const items = buildReviewItems(['campo', 'bola', 'pássaro', 'também']);
  assert.ok(items.length >= 3);
  for (const it of items) assert.ok(it.id && it.type);
});

test('leitura: alinhamento tolera omissões do reconhecedor', () => {
  const r = alignReading('O gato bebe leite', 'o gato bebe leite');
  assert.equal(r.accuracy, 1);
  const r2 = alignReading('O gato bebe leite', 'gato bebe leite');
  assert.ok(r2.accuracy > 0.7 && r2.accuracy < 1);
  assert.deepEqual(r2.missed, ['o']);
  const r3 = alignReading('Bia tem um gato preto', 'bia tem um pato preto');
  assert.ok(r3.accuracy >= 0.7);
});

test('texto: normalização e distância', () => {
  assert.equal(norm('  Coração! '), 'coracao');
  assert.equal(lev('bola', 'bola'), 0);
  assert.equal(lev('bola', 'bolha'), 1);
});
