/* Leitura guiada: ouve a criança, isola a sílaba que travou, modela e faz repetir.
   Funciona também sem microfone (modo "eu repeti"). */
import { el, sleep, norm, lev, readingKey } from './utils.js';
import { speak, speakSyllables, stopSpeaking, sfx, haptic } from './audio.js';
import { listen, asrSupported, getMicPermission, requestMic, asrErrorMessage } from './speech.js';
import { splitSyllables } from './syllables.js';
import * as store from './store.js';

const key = (w) => norm(w).replace(/\s+/g, '');
const rKey = (w) => readingKey(w).replace(/\s+/g, '');

/** Comparação tolerante para sílaba/palavra falada (inclui sílabas de 2 letras). */
export function saidOk(said, target) {
  const a = key(said);
  const b = key(target);
  if (!a || !b) return false;
  if (a === b) return true;
  const rkA = rKey(said);
  const rkB = rKey(target);
  if (rkA && rkB && (rkA === rkB || rkA.includes(rkB))) return true;
  if (a.includes(b)) return true;
  if (b.length === 2) {
    // sílabas de 2 letras (ex: "to", "la", "pé"): aceita se a vogal bate ou distância <= 1 com mesma inicial/vogal
    if (lev(rkA, rkB) <= 1 && (rkA[0] === rkB[0] || rkA.slice(-1) === rkB.slice(-1))) return true;
  }
  const d = lev(rkA || a, rkB || b);
  return d <= (b.length >= 5 ? 2 : 1) && b.length >= 2;
}

/**
 * Abre o treino guiado de uma palavra. Retorna promessa com o resultado.
 * @param {string} word
 * @param {{onDone?:(r:{ok:boolean,helped:boolean,cancelled?:boolean,syllables:number})=>void}} opts
 */
export function openGuided(word, opts = {}) {
  return new Promise((resolve) => {
    const syl = splitSyllables(word);
    const steps = [...syl, word];
    let i = 0;
    let attempts = 0;
    let helped = false;
    let closed = false;
    let listening = false;
    let speakTimer = null;
    const totalSyll = syl.length;

    const overlay = el('div', { class: 'guided' });
    const card = el('div', { class: 'guided__card' });
    overlay.append(card);
    document.body.append(overlay);

    function finish(result) {
      if (closed) return;
      closed = true;
      stopSpeaking();
      overlay.remove();
      store.recordGuided(word, { ok: result.ok, helped: result.helped, syllables: totalSyll });
      resolve(result);
      opts.onDone?.(result);
    }

    function close() { finish({ ok: false, helped: true, cancelled: true, syllables: totalSyll }); }

    function paintChips() {
      const row = el('div', { class: 'guided__chips' });
      syl.forEach((s, k) => {
        row.append(el('span', {
          class: `guided__chip ${k < i ? 'done' : k === i ? 'now' : ''}`,
          text: s,
        }));
      });
      return row;
    }

    async function speakTarget() {
      if (listening || closed) return;
      stopSpeaking();
      if (i < totalSyll) {
        await speak(syl[i], { rate: 0.62, pitch: 1.02 });
      } else {
        await speakSyllables(syl);
        await sleep(120);
        await speak(word, { rate: 0.62 });
      }
    }

    function draw() {
      card.innerHTML = '';
      const isSyll = i < totalSyll;
      const target = isSyll ? syl[i] : word;

      const head = el('div', { class: 'row' },
        el('div', { class: 'grow' },
          el('div', { class: 'guided__kicker', text: isSyll ? 'Sílaba por sílaba' : 'Agora a palavra inteira' }),
          el('div', { class: 'guided__title', text: isSyll ? `Sílaba ${i + 1} de ${totalSyll}` : 'Junte tudo' })),
        el('button', { class: 'btn--back', 'aria-label': 'Fechar', 'on:click': close }, '✕'));
      card.append(head);
      card.append(paintChips());

      const big = el('div', { class: 'guided__big', text: target });
      if (!isSyll) {
        big.append(el('div', { class: 'guided__small', text: syl.join(' · ') }));
      }
      card.append(big);

      const tip = el('div', { class: 'guided__tip', text: isSyll
        ? 'Escute e repita esta sílaba.'
        : `Escute os pedacinhos e leia a palavra: ${word}.` });
      card.append(tip);

      const actions = el('div', { class: 'guided__actions' });
      const hear = el('button', { class: 'btn btn--soft', 'on:click': () => { sfx('tap'); speakTarget(); } }, '🔊 Ouvir');
      actions.append(hear);

      const selfMode = !asrSupported || getMicPermission() === 'denied';
      if (selfMode) {
        actions.append(el('button', { class: 'btn btn--primary', 'on:click': () => advance(false) }, '✅ Eu repeti'));
      } else {
        const mic = el('button', { class: 'mic mic--small', 'aria-label': 'Falar' }, '🎤');
        mic.addEventListener('click', () => startListen(mic, target, isSyll));
        actions.append(mic);
      }
      actions.append(el('button', {
        class: 'btn btn--ghost',
        'on:click': () => { helped = true; advance(true); },
      }, 'Pular'));
      card.append(actions);

      // caixinha de resposta
      card.append(el('div', { class: 'guided__hint', id: 'guided-hint', text: selfMode ? 'Sem microfone: repita em voz alta e toque em “Eu repeti”.' : 'Toque no microfone e fale.' }));

      setTimeout(() => { speakTimer = null; speakTarget(); }, 260);
    }

    /** Depois de uma falha de escuta, oferece o caminho "eu repeti" em vez de travar a criança. */
    function offerSelfReport(hint, label = '✅ Eu repeti') {
      hint.innerHTML = '';
      hint.append(document.createTextNode('Não consegui te ouvir. '));
      hint.append(el('button', {
        class: 'btn btn--sm btn--soft',
        'on:click': () => { stopSpeaking(); advance(false); },
      }, label));
    }

    async function startListen(mic, target, isSyll) {
      if (listening || closed) return;
      if (speakTimer) { clearTimeout(speakTimer); speakTimer = null; }
      listening = true;
      const hint = document.getElementById('guided-hint');
      stopSpeaking();
      mic.classList.add('mic--listen');
      mic.textContent = '👂';
      hint.textContent = 'Estou ouvindo…';
      await sleep(220); // o áudio da sílaba é curto; espera o alto-falante liberar antes de abrir o microfone
      const res = await listen({ onPartial: (t) => { hint.textContent = `“${t}”`; } });
      mic.classList.remove('mic--listen');
      mic.textContent = '🎤';
      listening = false;
      if (closed) return;

      if (!res.ok) {
        if (res.error === 'not-allowed' || res.error === 'service-not-allowed') {
          const ok = await requestMic();
          if (ok) hint.textContent = 'Agora toque no microfone e fale de novo.';
          else { hint.textContent = 'Sem microfone. Use “Eu repeti” ou “Pular”.'; offerSelfReport(hint, '✅ Eu repeti'); }
          return;
        }
        if (res.error === 'audio-capture' || res.error === 'unsupported') {
          hint.textContent = asrErrorMessage(res.error);
          offerSelfReport(hint);
          return;
        }
        hint.textContent = res.error === 'no-speech' ? 'Não ouvi. Fala mais pertinho do tablet?' : asrErrorMessage(res.error);
        offerSelfReport(hint);
        return;
      }
      const hit = res.alternatives.some((a) => saidOk(a, target)) || saidOk(res.transcript, target);
      hint.textContent = `“${res.transcript}”`;
      if (hit) {
        sfx('ok'); haptic();
        hint.textContent = isSyll ? 'Isso! Repetiu certinho.' : 'Isso! Você leu a palavra!';
        advance(false);
      } else {
        sfx('soft');
        attempts++;
        if (isSyll && attempts < 2) {
          hint.textContent = 'Quase! Escuta de novo e repete bem devagar.';
          setTimeout(() => speak(target, { rate: 0.55 }), 300);
        } else {
          helped = true;
          hint.textContent = 'Vamos juntos: eu falo e você acompanha.';
          setTimeout(() => { advance(true); }, 900);
        }
      }
    }

    function advance(wasHelped) {
      if (wasHelped) helped = true;
      attempts = 0;
      if (i + 1 >= steps.length) {
        finish({ ok: !helped, helped, syllables: totalSyll });
        return;
      }
      i++;
      draw();
    }

    draw();
  });
}

/** Sessão curta de leitura guiada com várias palavras. */
export async function guidedSession(wordsList, { onProgress, onFinish } = {}) {
  const results = [];
  for (let k = 0; k < wordsList.length; k++) {
    const w = wordsList[k];
    onProgress?.(k, wordsList.length, w);
    // eslint-disable-next-line no-await-in-loop
    const r = await openGuided(w);
    results.push({ word: w, ...r });
    if (r.cancelled) break;
    await sleep(300);
  }
  onFinish?.(results);
  return results;
}
