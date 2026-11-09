/* Testes do motor de resposta da conversa (módulo puro, sem DOM). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChildReply, replyToChild, followUpAck, farewell } from '../app/js/talk-reply.js';

test('extrai o bicho favorito, não a palavra genérica "bicho"', () => {
  const p = parseChildReply('meu bicho favorito é o tatu');
  assert.equal(p.focus, 'tatu');
  assert.equal(p.kind, 'animal');
});

test('resposta de "eu gosto de..." não repete a frase crua nem quebra a gramática', () => {
  const r = replyToChild('eu gosto de brincar no parque', { random: () => 0 });
  assert.ok(r.expectsAnswer);
  assert.match(r.text, /parque/i);
  assert.doesNotMatch(r.text, /gosta de eu gosto/i);
  assert.doesNotMatch(r.text, /Você gosta de eu/i);
});

test('resposta de bicho favorito fala do tatu e convida a responder', () => {
  const r = replyToChild('meu bicho favorito é o tatu', { random: () => 0 });
  assert.ok(r.expectsAnswer);
  assert.match(r.text, /tatu/i);
  assert.match(r.text, /\?$/);
});

test('não sei / vazio não quebra e continua a conversa', () => {
  for (const t of ['não sei', '', '   ']) {
    const r = replyToChild(t);
    assert.ok(r.text.length > 5);
    assert.ok(r.expectsAnswer);
    assert.doesNotMatch(r.text, /falou de sei/i);
  }
  assert.equal(parseChildReply('não sei').focus, '');
});

test('follow-up fecha sem outra pergunta', () => {
  const r = followUpAck('no parque eu corro');
  assert.equal(r.expectsAnswer, false);
  assert.doesNotMatch(r.text, /\?/);
});

test('despedida não repete "Adorei conversar com você"', () => {
  for (let i = 0; i < 3; i++) {
    const t = farewell('Ana', { random: () => i / 3 });
    assert.equal((t.match(/Adorei conversar com você/gi) || []).length, 1);
    assert.match(t, /Ana/);
  }
});
