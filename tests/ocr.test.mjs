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

test('sanitizeOcr remove espiral de caderno, rabiscos manuscritos e fragmentos de ilustração', async () => {
  const { sanitizeOcr } = await import('../app/js/screen-book.js');
  const noisyLines = [
    { text: 'SUN À Fara Cara A', conf: 42, words: ['SUN', 'À', 'Fara', 'Cara', 'A'], wordConfs: [35, 40, 48, 52, 30] },
    { text: 'LEITURA Lição incompleta d', conf: 51, words: ['LEITURA', 'Lição', 'incompleta', 'd'], wordConfs: [88, 45, 50, 22] },
    {
      text: 'o e Um presente inesperado E Debe;',
      conf: 74,
      words: ['o', 'e', 'Um', 'presente', 'inesperado', 'E', 'Debe;'],
      wordConfs: [38, 41, 93, 96, 95, 44, 39],
      wordLefts: [18, 42, 140, 195, 310, 920, 960],
      wordRights: [30, 55, 180, 295, 430, 940, 1020],
    },
    {
      text: 'Ca Hoje, na rua da escola, aconteceu uma cena interessante. Um',
      conf: 86,
      words: ['Ca', 'Hoje,', 'na', 'rua', 'da', 'escola,', 'aconteceu', 'uma', 'cena', 'interessante.', 'Um'],
      wordConfs: [41, 95, 96, 96, 96, 95, 96, 96, 95, 96, 94],
      wordLefts: [15, 140, 210, 250, 300, 340, 430, 560, 620, 690, 830],
      wordRights: [40, 195, 240, 290, 330, 415, 545, 605, 675, 815, 870],
    },
    {
      text: 'E A Fa EE cm gato branquinho e uma gata pretinha estavam cuidando de seu',
      conf: 82,
      words: ['E', 'A', 'Fa', 'EE', 'cm', 'gato', 'branquinho', 'e', 'uma', 'gata', 'pretinha', 'estavam', 'cuidando', 'de', 'seu'],
      wordConfs: [32, 40, 38, 29, 44, 95, 94, 96, 96, 95, 94, 96, 95, 96, 95],
    },
    {
      text: 'RO E FE á rm filhote quando um caminhão passou próximo aos três e freou.',
      conf: 83,
      words: ['RO', 'E', 'FE', 'á', 'rm', 'filhote', 'quando', 'um', 'caminhão', 'passou', 'próximo', 'aos', 'três', 'e', 'freou.'],
      wordConfs: [30, 35, 28, 42, 39, 96, 96, 96, 95, 96, 95, 96, 95, 96, 95],
    },
    { text: 'Acervo Editora Núcleo', conf: 90, words: ['Acervo', 'Editora', 'Núcleo'], wordConfs: [90, 92, 89] },
  ];
  const res = sanitizeOcr('', noisyLines);
  assert.ok(!/\b(SUN|Fara|Debe|EE|RO|FE|rm|cm|Acervo)\b/.test(res.text), `Ruído remanescente: ${res.text}`);
  assert.match(res.text, /Um presente inesperado/);
  assert.match(res.text, /Hoje, na rua da escola, aconteceu uma cena interessante\. Um gato branquinho/);
  assert.match(res.text, /filhote quando um caminhão passou próximo aos três e freou\./);
});
