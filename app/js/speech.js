/* Reconhecimento de fala (Web Speech API) com tratamento de erros do Chrome Android.
   Limitações reais: exige internet, uma fala por vez, sem `continuous` no Android,
   e a precisão cai com voz infantil — por isso NUNCA punimos por falha de escuta. */

const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
export const asrSupported = !!SR;

let current = null;
let micPermission = 'unknown'; // unknown | granted | denied | unavailable
let listenOverride = null;

/** Somente para testes automatizados: substitui a escuta por resultados fixos. */
export function __setListenOverride(fn) { listenOverride = fn; }

export const getMicPermission = () => micPermission;

export function asrErrorMessage(code) {
  switch (code) {
    case 'no-speech': return 'Não consegui te ouvir. Vamos tentar de novo?';
    case 'not-allowed':
    case 'service-not-allowed': return 'Preciso da permissão do microfone. Peça ajuda para um adulto.';
    case 'audio-capture': return 'Não achei o microfone do tablet.';
    case 'network': return 'A escuta precisa de internet agora. Você pode tocar em “Eu li”.';
    case 'timeout': return 'Fiquei esperando… Vamos tentar mais uma vez?';
    case 'aborted': return 'Tudo bem, paramos.';
    default: return 'Não consegui te ouvir dessa vez.';
  }
}

export async function requestMic() {
  if (!navigator.mediaDevices?.getUserMedia) { micPermission = 'unavailable'; return false; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    micPermission = 'granted';
    return true;
  } catch (e) {
    micPermission = 'denied';
    console.warn('microfone:', e?.name);
    return false;
  }
}

export function abortListening() {
  if (current) {
    try { current.abort(); } catch { /* ignore */ }
    current = null;
  }
}

/**
 * Escuta uma fala curta.
 * @returns {Promise<{ok:boolean, transcript:string, alternatives:string[], error?:string, aborted?:boolean}>}
 */
export function listen({ lang = 'pt-BR', timeout = 12000, onPartial, onState, retry = true } = {}) {
  if (listenOverride) return Promise.resolve(listenOverride({ lang, timeout, onPartial, onState, retry }));
  if (!asrSupported) return Promise.resolve({ ok: false, transcript: '', alternatives: [], error: 'unsupported' });
  abortListening();

  return new Promise((resolve) => {
    let settled = false;
    let gotAny = false;
    let lastPartial = '';
    let timer = null;
    let attemptsLeft = retry ? 1 : 0;
    let currentAttempt = null;
    let retrying = false;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (current === currentAttempt) current = null;
      onState?.('idle');
      resolve(payload);
    };

    const payloadFrom = (result) => {
      const alternatives = [];
      for (let i = 0; i < result.length; i++) {
        const t = (result[i].transcript || '').trim();
        if (t) alternatives.push(t);
      }
      const transcript = alternatives[0] || '';
      return { ok: !!transcript, transcript, alternatives };
    };

    function startAttempt() {
      if (settled) return;
      gotAny = false;
      lastPartial = '';
      retrying = false;
      let recognition;
      try {
        recognition = new SR();
      } catch {
        finish({ ok: false, transcript: '', alternatives: [], error: 'unsupported' });
        return;
      }
      currentAttempt = recognition;
      current = recognition;
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => onState?.('listening');
      recognition.onresult = (event) => {
        gotAny = true;
        const result = event.results[event.results.length - 1];
        const partial = (result[0]?.transcript || '').trim();
        if (partial) { lastPartial = partial; onPartial?.(partial); }
        if (result.isFinal) {
          const payload = payloadFrom(result);
          // fala curta pode chegar só como parcial: aceita o que foi ouvido
          if (payload.ok) finish(payload);
          else if (lastPartial) finish({ ok: true, transcript: lastPartial, alternatives: [lastPartial] });
          else finish(payload);
        }
      };
      recognition.onerror = (event) => {
        const code = event?.error || 'unknown';
        if (code === 'no-speech' && lastPartial && !settled) {
          finish({ ok: true, transcript: lastPartial, alternatives: [lastPartial] });
          return;
        }
        // fala curta ("no-speech") ou microfone ainda ocupado pelo áudio ("audio-capture"):
        // uma nova tentativa real costuma resolver no Chrome Android
        const retriable = code === 'no-speech' || code === 'audio-capture';
        if (retriable && attemptsLeft > 0 && !settled) {
          attemptsLeft--;
          retrying = true;
          try { recognition.abort(); } catch { /* ignore */ }
          if (current === recognition) current = null;
          setTimeout(() => { if (!settled) startAttempt(); }, code === 'audio-capture' ? 500 : 260);
          return;
        }
        finish({ ok: false, transcript: '', alternatives: [], error: code });
      };
      recognition.onend = () => {
        if (settled || retrying) return;
        if (lastPartial) { finish({ ok: true, transcript: lastPartial, alternatives: [lastPartial] }); return; }
        if (currentAttempt === recognition) finish({ ok: false, transcript: '', alternatives: [], error: 'no-speech' });
      };
      recognition.onnomatch = () => {
        if (settled || retrying) return;
        if (lastPartial) finish({ ok: true, transcript: lastPartial, alternatives: [lastPartial] });
        else finish({ ok: false, transcript: '', alternatives: [], error: 'no-speech' });
      };
      try {
        recognition.start();
      } catch {
        if (!settled) finish({ ok: false, transcript: '', alternatives: [], error: 'audio-capture' });
      }
    }

    timer = setTimeout(() => {
      const r = currentAttempt;
      try { r?.stop(); } catch { /* ignore */ }
      setTimeout(() => finish({ ok: false, transcript: '', alternatives: [], error: 'timeout' }), 600);
    }, timeout);

    startAttempt();
  });
}

/** Escolhe a alternativa mais parecida com o alvo (comparação tolerante). */
export function bestAlternative(alternatives, target, compareFn) {
  if (!alternatives?.length) return { text: '', score: 0 };
  let best = { text: alternatives[0], score: -1 };
  for (const alt of alternatives) {
    const score = compareFn(alt, target);
    if (score > best.score) best = { text: alt, score };
  }
  return best;
}
