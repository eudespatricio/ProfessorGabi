/* Filtro de voz: pt-PT nunca pode entrar na conversa. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isBrazilianVoice, isEligibleVoice, isFemaleVoice, normalizeVoiceLang } from '../app/js/audio.js';

test('normaliza pt_BR e pt-BR para pt-br', () => {
  assert.equal(normalizeVoiceLang('pt_BR'), 'pt-br');
  assert.equal(normalizeVoiceLang('pt-BR'), 'pt-br');
  assert.equal(normalizeVoiceLang('pt_PT'), 'pt-pt');
});

test('aceita vozes brasileiras', () => {
  assert.equal(isBrazilianVoice({ lang: 'pt_BR', name: 'Portuguese Brazil' }), true);
  assert.equal(isBrazilianVoice({ lang: 'pt-BR', name: 'Google português do Brasil' }), true);
  assert.equal(isBrazilianVoice({ lang: 'pt', name: 'Portuguese Brazil' }), true);
  assert.equal(isBrazilianVoice({ lang: 'pt_BR', name: 'Microsoft Francisca Online (Natural)' }), true);
});

test('rejeita vozes de Portugal', () => {
  assert.equal(isBrazilianVoice({ lang: 'pt_PT', name: 'Portuguese Portugal' }), false);
  assert.equal(isBrazilianVoice({ lang: 'pt-PT', name: 'Microsoft Duarte Online (Natural)' }), false);
  assert.equal(isBrazilianVoice({ lang: 'pt', name: 'Portuguese (Portugal)' }), false);
  assert.equal(isBrazilianVoice({ lang: 'en-US', name: 'English' }), false);
});

test('rejeita vozes masculinas conhecidas', () => {
  assert.equal(isFemaleVoice({ lang: 'pt_BR', name: 'Microsoft Antônio Online (Natural)' }), false);
  assert.equal(isFemaleVoice({ lang: 'pt-BR', name: 'Microsoft Daniel' }), false);
  assert.equal(isFemaleVoice({ lang: 'pt_BR', name: 'Microsoft Duarte' }), false);
  assert.equal(isFemaleVoice({ lang: 'pt-BR', name: 'Microsoft Francisca Online (Natural)' }), true);
  assert.equal(isEligibleVoice({ lang: 'pt_BR', name: 'Portuguese Brazil' }), true);
  assert.equal(isEligibleVoice({ lang: 'pt_BR', name: 'Microsoft Antônio Online (Natural)' }), false);
});
