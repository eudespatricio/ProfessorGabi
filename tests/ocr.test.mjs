/* Testes do corretor de OCR (app/js/ocr-fix.js). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixWord, candidates, isKnown, applyDictionary, fixPlainText } from '../app/js/ocr-fix.js';

test('lista traz as palavras comuns esperadas', () => {
  assert.equal(isKnown('obter'), true);
  assert.equal(isKnown('talvez'), true);
  assert.equal(isKnown('bem'), true);
  assert.equal(isKnown('soltara'), false);
});

test('corrige erro de uma letra em palavra desconhecida e com baixa confiança', () => {
  assert.equal(fixWord('obrer', 81), 'obter');
  assert.equal(fixWord('ralvez', 65), 'talvez');
});

test('não mexe em palavra conhecida', () => {
  assert.equal(fixWord('voz', 40), 'voz');
  assert.equal(fixWord('é', 54), 'é');
  assert.equal(fixWord('quase', 30), 'quase');
});

test('não mexe quando o OCR está confiante', () => {
  assert.equal(fixWord('obrer', 92), 'obrer');
});

test('não mexe em nome próprio nem em palavra com maiúscula no meio', () => {
  assert.equal(fixWord('Aslam', 40), 'Aslam');
  assert.equal(fixWord('UmMentas', 30), 'UmMentas');
});

test('não mexe em palavra com hífen ou apóstrofo', () => {
  assert.equal(fixWord('sentir-se', 30), 'sentir-se');
  assert.equal(fixWord('d’água', 30), 'd’água');
});

test('dígito com forma de letra é corrigido quando seguro', () => {
  assert.equal(fixWord('c0m', 0), 'com');
  assert.equal(fixWord('5eu', 0), 'seu');
  // "8" pode ser "b" ou "g": não arrisca
  assert.equal(fixWord('8em', 0), '8em');
});

test('candidatos vêm ordenados por frequência', () => {
  const c = candidates('obrer');
  assert.equal(c[0], 'obter');
});

test('applyDictionary preserva pontuação e conta as correções', () => {
  const lines = [{
    text: 'Para obrer este fruto,',
    conf: 90,
    words: ['Para', 'obrer', 'este', 'fruto,'],
    wordConfs: [95, 81, 96, 96],
  }];
  const out = applyDictionary(lines);
  assert.equal(out.fixes, 1);
  assert.equal(out.lines[0].text, 'Para obter este fruto,');
});

test('segundo passe corrige palavra juntada de duas linhas', () => {
  const out = fixPlainText('centenas de anos e ralvez para sempre.');
  assert.equal(out.fixes, 1);
  assert.match(out.text, /talvez/);
});

test('segundo passe junta hífen com dígito ambíguo usando o dicionário', () => {
  const out = fixPlainText('via era a cora-\n8em e a bondade.');
  assert.equal(out.fixes, 1);
  assert.match(out.text, /coragem/);
});

test('segundo passe corrige dígito dentro de palavra curta', () => {
  const out = fixPlainText('c0m você');
  assert.equal(out.fixes, 1);
  assert.equal(out.text, 'com você');
});

test('segundo passe corrige consoante dobrada com letra faltando', () => {
  const out = fixPlainText('fosse a ammosfera do mundo novo');
  assert.equal(out.fixes, 1);
  assert.match(out.text, /atmosfera/);
});

test('segundo passe não troca palavra válida rara', () => {
  const out = fixPlainText('Helena soltara os cabelos e as fisionomias.');
  assert.equal(out.fixes, 0);
  assert.match(out.text, /soltara/);
  assert.match(out.text, /fisionomias/);
});
