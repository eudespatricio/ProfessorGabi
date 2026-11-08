/* Testa o reconhecimento quando o Chrome entrega só resultado parcial
   (fala curta de sílaba) e quando não ouve nada. */
import test from 'node:test';
import assert from 'node:assert/strict';

function makeFakeSR({ partial = '', final = '', endWithoutResult = false } = {}) {
  return class FakeSR {
    constructor() { this.lang = ''; this.interimResults = false; this.continuous = false; this.maxAlternatives = 1; }
    start() {
      setTimeout(() => {
        this.onstart?.();
        if (partial) {
          const result = [{ transcript: partial }];
          result.isFinal = false;
          const results = [result];
          this.onresult?.({ results });
        }
        if (final) {
          const result = [{ transcript: final }];
          result.isFinal = true;
          const results = [result];
          this.onresult?.({ results });
        }
        setTimeout(() => this.onend?.(), 20);
      }, 5);
    }
    stop() {}
    abort() { this.onend?.(); }
  };
}

async function loadSpeech(fake) {
  globalThis.window = { SpeechRecognition: fake };
  return import(`../app/js/speech.js?fake=${Math.random()}`);
}

test('sílaba curta: usa o parcial quando o Chrome encerra sem final', async () => {
  const speech = await loadSpeech(makeFakeSR({ partial: 'lo' }));
  const r = await speech.listen({ retry: false });
  assert.equal(r.ok, true);
  assert.equal(r.transcript, 'lo');
});

test('resultado final continua funcionando', async () => {
  const speech = await loadSpeech(makeFakeSR({ partial: 'lo', final: 'lo' }));
  const r = await speech.listen({ retry: false });
  assert.equal(r.ok, true);
  assert.equal(r.transcript, 'lo');
});

test('sem fala nenhuma: devolve erro', async () => {
  const speech = await loadSpeech(makeFakeSR({}));
  const r = await speech.listen({ retry: false });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'no-speech');
});
