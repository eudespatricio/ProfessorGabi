/* Exercícios interativos. Cada montador devolve { showHint, destroy }.
   O player recebe eventos: api.onDone(resultado) e api.onWrong(info). */
import { el, shuffle, stripAccents, alignReading, lev, clamp, sleep, norm, readingKey } from './utils.js';
import { speak, speakSyllables, stopSpeaking, sfx, haptic } from './audio.js';
import {
  listen, abortListening, asrSupported, requestMic, getMicPermission, asrErrorMessage, bestAlternative,
} from './speech.js';
import { readingFeedback } from './tutor.js';
import { openGuided } from './guided.js';
import { state } from './store.js';

const SPEAK_OPTIONS = new Set(['rhyme', 'same-initial', 'blend']);

export function mountExercise(item, host, api) {
  host.innerHTML = '';
  switch (item.type) {
    case 'build-word':
    case 'dictation':
      return mountBuild(item, host, api);
    case 'read-word':
    case 'read-phrase':
      return mountRead(item, host, api, { multiline: false });
    case 'read-text':
      return mountRead(item, host, api, { multiline: true });
    default:
      return mountChoice(item, host, api);
  }
}

function speakerBtn(text, cls = '') {
  const b = el('button', {
    class: `opt-speak ${cls}`.trim(), type: 'button', 'aria-label': 'Ouvir',
    'on:click': (e) => { e.stopPropagation(); sfx('tap'); speak(text); },
  }, '🔊');
  return b;
}

/* ============================ MÚLTIPLA ESCOLHA ============================ */
function mountChoice(item, host, api) {
  let attempts = 0;
  let locked = false;
  let done = false;

  const wrap = el('div', { class: 'col' });
  const card = el('div', { class: 'card q-card' });

  if (item.type === 'comprehension') {
    card.append(el('div', { class: 'q', text: item.question || item.prompt }));
    if (item.prompt) card.append(el('div', { class: 'q-sub', text: item.prompt }));
  } else {
    card.append(el('div', { class: 'q', text: item.prompt }));
    if (item.displayWord) {
      card.append(el('div', { class: 'word-big', text: item.displayWord }));
    } else if (item.display) {
      const w = el('div', { class: 'word-big' });
      const [a, b] = item.display.split('_');
      w.append(document.createTextNode(a || ''));
      w.append(el('span', { class: 'slot-inline', text: b === undefined ? '' : '?' }));
      w.append(document.createTextNode(b || ''));
      card.append(w);
    }
    if (item.emoji) card.append(el('div', { class: 'emoji-big', text: item.emoji }));
  }

  const row = el('div', { class: 'row row--between mt' });
  row.append(el('div', { class: 'grow' }));
  row.append(el('button', {
    class: 'btn btn--sm btn--soft', type: 'button', 'on:click': () => { stopSpeaking(); speak(item.say || item.prompt); },
  }, '🔊 Ouvir'));
  card.append(row);
  wrap.append(card);

  const options = el('div', { class: `options options--${item.layout || '3'}` });
  item.options.forEach((opt, i) => {
    const btn = el('button', { class: `option ${item.big ? 'option--big' : ''}`.trim(), type: 'button' });
    btn.style.setProperty('--i', String(i));
    if (opt.emoji) btn.append(el('span', { class: 'option__emoji', text: opt.emoji }));
    const text = el('span', { class: 'option__text' });
    text.append(el('span', { class: 'option__value', text: String(opt.label) }));
    if (opt.sub) text.append(el('span', { class: 'tiny muted', text: opt.sub }));
    btn.append(text);
    if (SPEAK_OPTIONS.has(item.type)) btn.append(speakerBtn(String(opt.label)));
    btn.addEventListener('click', () => {
      if (locked) return;
      if (i === item.correct) {
        locked = true; done = true;
        btn.classList.add('option--ok');
        sfx('ok'); haptic();
        revealAnswer();
        api.onDone({ ok: true, attempts });
      } else {
        attempts++;
        btn.classList.add('option--bad', 'option--dim');
        sfx('soft'); haptic(20);
        setTimeout(() => btn.classList.remove('option--bad'), 520);
        if (SPEAK_OPTIONS.has(item.type)) speak(String(opt.label));
        api.onWrong({ attempts, got: opt.label });
      }
    });
    options.append(btn);
  });
  wrap.append(options);
  host.append(wrap);

  function revealAnswer() {
    if (item.syllables?.length) {
      const rowSyl = el('div', { class: 'syl-row' });
      item.syllables.forEach((s) => rowSyl.append(el('span', { class: 'syl', text: s })));
      wrap.append(rowSyl);
    }
  }

  const showHint = () => {
    // elimina uma alternativa errada e lê a pergunta devagar
    const buttons = [...options.children];
    const wrong = buttons.find((b, i) => i !== item.correct && !b.classList.contains('option--dim'));
    wrong?.classList.add('option--dim');
    speak(item.say || item.prompt, { rate: 0.7 });
    return true;
  };
  return { showHint, destroy: () => stopSpeaking() };
}

/* ======================== MONTAR PALAVRA / DITADO ======================== */

/** Agrupa pecinhas iguais: duas letras "a" viram um botão "a ×2". */
export function groupPieces(pieces) {
  const groups = new Map();
  for (const piece of pieces) {
    const key = String(piece);
    let group = groups.get(key);
    if (!group) {
      group = { piece: key, total: 0 };
      groups.set(key, group);
    }
    group.total++;
  }
  return [...groups.values()].map((g) => ({ ...g, left: g.total }));
}

function mountBuild(item, host, api) {
  let attempts = 0;
  let locked = false;
  const slots = new Array(item.slots).fill(null);

  const wrap = el('div', { class: 'col' });
  const card = el('div', { class: 'card q-card' });
  card.append(el('div', { class: 'q', text: item.prompt }));
  if (item.showWord) {
    card.append(el('div', { class: 'word-big', text: item.answer }));
    card.append(el('div', { class: 'q-sub', text: 'Copie os pedacinhos na ordem certa.' }));
  } else {
    if (item.emoji) card.append(el('div', { class: 'emoji-big', text: item.emoji }));
    else card.append(el('div', { class: 'q-sub', text: 'Escute com atenção.' }));
    card.append(el('button', {
      class: 'btn btn--soft mt', type: 'button',
      'on:click': () => { stopSpeaking(); speak(item.answer, { rate: 0.75 }); },
    }, '🔊 Ouvir a palavra'));
  }
  wrap.append(card);

  const slotsRow = el('div', { class: 'slots slots--drop' });
  const slotEls = slots.map((_, i) => {
    const s = el('button', { class: 'slot', type: 'button', 'aria-label': `Espaço ${i + 1}` }, '·');
    s.addEventListener('click', () => {
      if (locked) return;
      const val = slots[i];
      if (!val) return;
      slots[i] = null;
      s.textContent = '·';
      s.classList.remove('slot--filled');
      s.setAttribute('aria-label', `Espaço ${i + 1}`);
      val.group.left++;
      paintGroup(val.group);
    });
    slotsRow.append(s);
    return s;
  });
  wrap.append(slotsRow);

  const tileRow = el('div', { class: 'tiles' });
  const groups = groupPieces(item.pieces);
  groups.forEach((group, i) => {
    const b = el('button', {
      class: `tile ${item.mode === 'letter' ? 'tile--letter' : ''}`.trim(),
      type: 'button', style: { '--i': String(i) },
    });
    b.append(el('span', { class: 'tile__label', text: group.piece }));
    if (group.total > 1) {
      group.badge = el('span', { class: 'tile__count', text: `×${group.left}` });
      b.append(group.badge);
    }
    group.el = b;
    b.setAttribute('aria-label', group.total > 1 ? `${group.piece}, ${group.left} de ${group.total} pecinhas` : group.piece);
    b.addEventListener('click', () => place(group));
    tileRow.append(b);
  });
  wrap.append(tileRow);
  host.append(wrap);

  function paintGroup(group) {
    if (group.badge) group.badge.textContent = `×${group.left}`;
    if (group.el) {
      group.el.classList.toggle('tile--used', group.left === 0);
      group.el.disabled = group.left === 0;
      group.el.setAttribute('aria-label', group.total > 1
        ? `${group.piece}, ${group.left} de ${group.total} pecinhas`
        : group.piece);
    }
  }

  function place(group) {
    if (locked || group.left <= 0) return;
    const free = slots.findIndex((s) => s === null);
    if (free < 0) return;
    slots[free] = { piece: group.piece, group };
    group.left--;
    const s = slotEls[free];
    s.textContent = group.piece;
    s.classList.add('slot--filled');
    s.setAttribute('aria-label', `Espaço ${free + 1}, ${group.piece}`);
    sfx('tap');
    paintGroup(group);
    if (slots.every((x) => x)) check();
  }

  function check() {
    const answer = slots.map((t) => t.piece).join('');
    if (stripAccents(answer) === stripAccents(item.answer)) {
      locked = true;
      sfx('great'); haptic();
      slotsRow.style.borderColor = '#7fd3a8';
      slotsRow.style.background = '#eafaf0';
      api.onDone({ ok: true, attempts });
    } else {
      attempts++;
      sfx('soft'); haptic(20);
      slotsRow.animate?.(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }],
        { duration: 320 },
      );
      api.onWrong({ attempts, got: answer });
    }
  }

  const showHint = () => {
    const next = item.syllables?.[0] || item.answer[0];
    speak(`A primeira parte é ${next}.`, { rate: 0.7 });
    return true;
  };
  return { showHint, destroy: () => stopSpeaking() };
}

/* ============================ LEITURA EM VOZ ALTA ============================ */
function similarity(text, target) {
  const a = norm(text);
  const b = norm(target);
  if (!a) return 0;
  if (a === b) return 1;
  // "sol" dito uma vez costuma chegar como "sou": a chave fonética evita reprovar.
  if (readingKey(a) === readingKey(b)) return 1;
  if (a.includes(b) && b.length > 3) return 0.95;
  const maxLen = Math.max(a.length, b.length);
  const levScore = 1 - lev(a, b) / maxLen;
  const align = alignReading(target, text).accuracy;
  return Math.max(levScore * 0.9, align);
}

function mountRead(item, host, api, { multiline = false } = {}) {
  const lines = multiline ? item.lines : [item.target];
  let lineIdx = 0;
  let attempts = 0;
  let locked = false;
  let phase = 'idle';
  const results = [];
  let selfMode = !asrSupported || getMicPermission() === 'denied';
  let usedHelp = false;
  let cancelledListen = false;
  let continueBtn = null;
  let autoSpeakTimer = null;

  const wrap = el('div', { class: `col ${multiline ? 'read-stage' : ''}`.trim() });
  const card = el('div', { class: 'card q-card' });
  card.append(el('div', { class: 'q', text: item.prompt }));
  if (multiline) {
    card.append(el('div', { class: 'q-sub', text: `${item.titulo || 'História'} · linha 1 de ${lines.length}` }));
  }
  wrap.append(card);

  const textBox = el('div', { class: 'text-read', style: { marginTop: '12px' } });
  const lineEls = lines.map((line) => {
    const p = el('div', { class: 'read-line' });
    line.split(/\s+/).forEach((w) => {
      p.append(el('w', { text: w }), document.createTextNode(' '));
    });
    textBox.append(p);
    return p;
  });
  if (!multiline) textBox.classList.add('text-read--center');
  wrap.append(textBox);

  const controls = el('div', { class: `mic-wrap ${multiline ? 'mic-dock' : ''}`.trim() });
  const mic = el('button', { class: 'mic', type: 'button', 'aria-label': 'Falar' }, '🎤');
  const hint = el('div', { class: 'mic__hint', text: '' });
  const altRow = el('div', { class: 'row row--wrap', style: { justifyContent: 'center', gap: '8px' } });
  const selfRow = el('div', { class: 'row row--wrap', style: { justifyContent: 'center', gap: '8px' } });

  const hearBtn = el('button', {
    class: 'btn btn--sm btn--soft', type: 'button',
    'on:click': async () => { clearTimeout(autoSpeakTimer); stopSpeaking(); usedHelp = true; await speak(lines[lineIdx], { rate: 0.62 }); hint.textContent = 'Agora sua vez!'; },
  }, '🔊 Ouvir a Gabi');

  const retryBtn = el('button', {
    class: 'btn btn--sm btn--soft', type: 'button', 'on:click': () => { resetLine(); },
  }, '🔁 Tentar de novo');
  retryBtn.hidden = true;

  const teachBtn = el('button', {
    class: 'btn btn--sm btn--teal', type: 'button',
    'on:click': async () => {
      if (locked) return;
      clearTimeout(autoSpeakTimer);
      stopSpeaking();
      const ws = lines[lineIdx].split(/\s+/).filter(Boolean).slice(0, 2);
      for (const w of ws) {
        // eslint-disable-next-line no-await-in-loop
        await openGuided(w);
      }
      attempts = 0;
      clearMarks(lineIdx);
      hint.textContent = 'Agora leia você! Toque no microfone.';
    },
  }, '👩‍🏫 Me ensina');

  altRow.append(hearBtn, retryBtn, teachBtn);
  if (multiline) {
    // Na história, o microfone e os apoios ficam sempre visíveis (dock fixo no rodapé).
    altRow.classList.add('mic-dock__actions');
    const dockMain = el('div', { class: 'mic-dock__main' });
    const dockText = el('div', { class: 'mic-dock__text' });
    dockText.append(hint, altRow);
    dockMain.append(mic, dockText);
    controls.append(dockMain, selfRow);
  } else {
    controls.append(mic, hint, altRow, selfRow);
  }
  wrap.append(controls);
  host.append(wrap);

  const selfBtn = el('button', {
    class: 'btn btn--sm btn--teal', type: 'button',
    'on:click': () => finishLine({ ok: true, accuracy: 1, missed: [], selfReported: true }),
  }, '✅ Eu li');
  const helpBtn = el('button', {
    class: 'btn btn--sm btn--soft', type: 'button',
    'on:click': async () => {
      clearTimeout(autoSpeakTimer);
      usedHelp = true;
      await speak(lines[lineIdx], { rate: 0.6 });
      hint.textContent = 'A Gabi leu. Agora leia você!';
    },
  }, '🔊 Ouvir primeiro');

  function applySelfMode() {
    mic.hidden = true;
    clearSelfRow();
    selfRow.append(selfBtn, helpBtn);
    hint.textContent = 'Sem microfone: leia e depois toque em “Eu li”.';
  }

  function applyMicMode() {
    mic.hidden = false;
    clearSelfRow();
    hint.textContent = 'Toque no microfone e leia em voz alta.';
  }

  function paintLine(idx) {
    lineEls.forEach((p, i) => {
      p.style.opacity = i === idx ? '1' : '0.4';
      p.querySelectorAll('w').forEach((w) => w.classList.remove('ok', 'miss', 'now'));
    });
    if (multiline) card.querySelector('.q-sub') && (card.querySelector('.q-sub').textContent = `${item.titulo || 'História'} · linha ${idx + 1} de ${lines.length}`);
    if (multiline && idx > 0) {
      // leva a linha atual para o meio da tela; o dock do microfone continua no rodapé
      setTimeout(() => {
        try { lineEls[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { /* ignore */ }
      }, 70);
    }
  }

  function markWords(idx, missed) {
    const p = lineEls[idx];
    const missedKeys = new Set(missed.map((m) => stripAccents(m)));
    p.querySelectorAll('w').forEach((w) => {
      const key = stripAccents(w.textContent.replace(/[^\p{L}\p{N}]/gu, ''));
      w.classList.add(missedKeys.has(key) ? 'miss' : 'ok');
    });
  }

  function clearMarks(idx) {
    lineEls[idx].querySelectorAll('w').forEach((w) => w.classList.remove('ok', 'miss'));
  }

  async function startListening() {
    if (locked) return;
    // se o autofalante ainda ia ler a linha, cala antes de abrir o microfone
    clearTimeout(autoSpeakTimer);
    // tocar no microfone enquanto ele escuta cancela (evita ficar 12 s "travado")
    if (phase === 'listening') {
      cancelledListen = true;
      abortListening();
      hint.textContent = 'Paramos. Toque no microfone quando quiser.';
      return;
    }
    if (asrSupported && getMicPermission() !== 'granted') {
      const ok = await requestMic();
      if (!ok) { selfMode = true; applySelfMode(); return; }
    }
    selfMode = false;
    applyMicMode();
    phase = 'listening';
    mic.classList.add('mic--listen');
    mic.textContent = '👂';
    mic.setAttribute('aria-label', 'Parar de ouvir');
    hint.textContent = 'Estou ouvindo…';
    stopSpeaking();
    await sleep(multiline ? 450 : 300);
    let res;
    try {
      res = await listen({
        onPartial: (t) => { hint.textContent = `“${t}”`; },
      });
    } catch {
      res = { ok: false, transcript: '', alternatives: [], error: 'unknown' };
    } finally {
      mic.classList.remove('mic--listen');
      mic.textContent = '🎤';
      mic.setAttribute('aria-label', 'Falar');
      phase = 'idle';
    }
    if (locked) return;
    if (cancelledListen) { cancelledListen = false; return; }
    handleRecognition(res);
  }

  function handleRecognition(res) {
    if (res.error === 'retry') { hint.textContent = 'Não ouvi. Fala mais pertinho do tablet?'; return; }
    if (res.error && res.error !== 'no-speech') {
      hint.textContent = asrErrorMessage(res.error);
      if (res.error === 'network' || res.error === 'not-allowed' || res.error === 'service-not-allowed') {
        selfMode = true;
        applySelfMode();
      }
      return;
    }
    const target = lines[lineIdx];
    const best = bestAlternative(res.alternatives, target, similarity);
    const accuracy = res.transcript ? similarity(res.transcript, target) : 0;
    const threshold = target.split(/\s+/).length > 3 ? 0.65 : 0.72;
    const missedWords = best.text ? alignReading(target, best.text).missed : target.split(/\s+/);

    if (res.transcript && accuracy >= threshold) {
      markWords(lineIdx, []);
      hint.textContent = res.transcript ? `Você leu: “${res.transcript}”` : '';
      sfx('ok');
      finishLine({ ok: true, accuracy, missed: [] });
    } else {
      attempts++;
      markWords(lineIdx, missedWords);
      sfx('soft');
      hint.textContent = res.transcript ? `Quase! Ouvi: “${res.transcript}”` : asrErrorMessage(res.error || 'no-speech');
      api.onWrong({ attempts, accuracy, missed: missedWords, read: best.text });
      retryBtn.hidden = false;
      if (attempts >= 3 && !continueBtn) {
        continueBtn = el('button', {
          class: 'btn btn--sm btn--soft', type: 'button',
          'on:click': () => { usedHelp = true; finishLine({ ok: false, accuracy, missed: missedWords, helped: true }); },
        }, 'Continuar com ajuda');
        selfRow.append(continueBtn);
      }
    }
  }

  function clearSelfRow() {
    selfRow.innerHTML = '';
    continueBtn = null;
  }

  function resetLine() {
    attempts = 0;
    clearTimeout(autoSpeakTimer);
    clearMarks(lineIdx);
    retryBtn.hidden = true;
    if (continueBtn) { continueBtn.remove(); continueBtn = null; }
    hint.textContent = 'Toque no microfone e leia de novo.';
  }

  function finishLine(result) {
    if (locked) return;
    locked = true;
    clearTimeout(autoSpeakTimer);
    stopSpeaking();
    results.push({ ...result, line: lineIdx });
    setTimeout(() => {
      locked = false;
      if (lineIdx + 1 < lines.length) {
        lineIdx++;
        attempts = 0;
        retryBtn.hidden = true;
        clearSelfRow();
        if (selfMode) applySelfMode(); else applyMicMode();
        paintLine(lineIdx);
        hint.textContent = 'Agora esta linha. Toque no microfone.';
        if (multiline) speak('Agora esta linha. Leia em voz alta.', { rate: 0.9 });
      } else {
        const avgAcc = results.reduce((a, r) => a + (r.accuracy || 0), 0) / results.length;
        const allOk = results.every((r) => r.ok);
        // encerra a área de leitura para não confundir a criança
        mic.hidden = true;
        clearSelfRow();
        altRow.hidden = true;
        hint.textContent = allOk ? 'Leitura concluída!' : 'Leitura concluída com ajuda.';
        api.onDone({
          ok: allOk,
          accuracy: avgAcc,
          attempts,
          helped: usedHelp || results.some((r) => r.helped),
          selfReported: results.some((r) => r.selfReported),
          missed: results.flatMap((r) => r.missed || []),
        });
      }
    }, 620);
  }

  mic.addEventListener('click', startListening);

  if (selfMode) applySelfMode(); else applyMicMode();
  paintLine(0);
  if (item.level === 1) {
    autoSpeakTimer = setTimeout(() => { if (!locked) speak(lines[0], { rate: 0.62 }); }, 700);
  }

  return {
    showHint: async () => {
      clearTimeout(autoSpeakTimer);
      usedHelp = true;
      await speak(lines[lineIdx], { rate: 0.6 });
      return true;
    },
    destroy: () => { clearTimeout(autoSpeakTimer); locked = true; cancelledListen = true; abortListening(); stopSpeaking(); },
  };
}

/* ============================ CARD DE ENSINO ============================ */
export function mountTeach(item, host, api) {
  const wrap = el('div', { class: 'col', style: { alignItems: 'stretch' } });
  const card = el('div', { class: 'card card--teach' });
  card.append(el('div', { class: 'emoji-big', text: item.emoji || '🦉' }));
  card.append(el('div', { class: 'q', text: item.titulo }));
  card.append(el('div', { class: 'q-sub', text: item.dica || '' }));
  wrap.append(card);
  const row = el('div', { class: 'row', style: { gap: '10px' } });
  row.append(el('button', {
    class: 'btn btn--soft grow', type: 'button', 'on:click': () => { stopSpeaking(); speak(item.fala); },
  }, '🔊 Ouvir de novo'));
  row.append(el('button', {
    class: 'btn btn--primary grow', type: 'button', 'on:click': () => api.onDone({ ok: true, teach: true }),
  }, 'Entendi!'));
  wrap.append(row);
  host.append(wrap);
  setTimeout(() => speak(item.fala), 260);
  return { showHint: () => false, destroy: () => stopSpeaking() };
}

export { similarity };
