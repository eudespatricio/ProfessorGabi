/* Player de lição: card de ensino, exercícios, feedback da Gabi e resultado. */
import { el, sleep, pct } from './utils.js';
import * as store from './store.js';
import { UNITS, getUnit, buildLesson, buildReviewItems, buildLessonReviewItems, buildDiagnostic, suggestUnitFromDiagnostic } from './curriculum.js';
import { STICKER_BY_ID } from './content.js';
import { mountExercise, mountTeach } from './exercises.js';
import { speak, speakSyllables, stopSpeaking, sfx, haptic } from './audio.js';
import { feedbackFor, lessonSummary, lessonSummaryAudio, readingFeedback, hintFor } from './tutor.js';
import { gabiEl, setGabiMood, confetti, flyingStars, starsHTML, clearScreen, hideTabbar, tabbar, toast, modal } from './ui.js';

/** Toca o alvo neural do exercício sem concatenar textos variáveis que forçam Google TTS. */
function speakExerciseTarget(item) {
  if (!item) return;
  const userRate = store.state.settings.rate ?? 0.9;
  const calmRate = Math.min(userRate, 0.85);
  if (item.sayParts?.length) {
    speakSyllables(item.sayParts);
    return;
  }
  if (item.type === 'read-text' && item.lines?.length) {
    if (item.level === 1) speak(item.lines[0], { rate: calmRate });
    else speak('Vamos ler juntos.');
    return;
  }
  if (item.type === 'read-phrase' && item.target) {
    if (item.level === 1) speak(item.target, { rate: calmRate });
    else speak('Agora leia você.');
    return;
  }
  if (item.type === 'read-word' && item.word) {
    if (item.level === 1) speak(item.word, { rate: calmRate });
    else speak('Agora leia você.');
    return;
  }
  if (item.word) {
    speak(item.word);
    return;
  }
  if (item.say) speak(item.say);
}

let playerAlive = 0;

export function renderLesson(unitId, lessonIndex) {
  const unit = getUnit(unitId);
  const idx = Number(lessonIndex);
  const level = store.unitLevel(unitId);
  const lesson = buildLesson(unitId, idx, { reviewWords: store.dueWords(2), level });
  lesson.items.forEach((it) => { it.level = level; });
  startPlayer({
    items: lesson.items,
    unitId,
    lessonIndex: idx,
    title: lesson.boss ? `Chefe · ${unit.titulo}` : unit.titulo,
    mode: 'lesson',
    textId: lesson.textId || null,
    boss: !!lesson.boss,
  });
}

export function renderReview() {
  const due = store.dueWords(8);
  const items = buildReviewItems(due.length ? due : Object.keys(store.state.srs).slice(0, 6));
  if (!items.length) {
    toast('Nada para revisar agora. Que tal uma lição nova?', 'ok');
    location.hash = '#/trilha';
    return;
  }
  startPlayer({ items, unitId: '__review', lessonIndex: 0, title: 'Revisão', mode: 'review' });
}

export function renderDiagnostic({ firstRun = false } = {}) {
  const items = buildDiagnostic();
  startPlayer({ items, unitId: '__diag', lessonIndex: 0, title: 'Descobrindo o que você sabe', mode: 'diag', firstRun });
}

function startPlayer({ items, unitId, lessonIndex, title, mode, firstRun = false, textId = null, boss = false }) {
  const myRun = ++playerAlive;
  const alive = () => myRun === playerAlive;

  const screen = clearScreen();
  screen.classList.add('screen--flush');
  hideTabbar();

  let scored = items.filter((i) => i.kind === 'ex');
  const results = [];
  const reviewResults = [];
  let reviewItems = [];
  let inReview = false;
  let reviewSkipped = false;
  let finished = false;
  let idx = 0;
  let current = null;
  let handle = null;
  let speakTimer = null;
  let locked = false;
  let gained = 0;
  let newStickers = [];
  let attemptsTotal = 0;
  let attemptsThis = 0;
  let combo = 0;
  const t0 = Date.now();

  const root = el('div', { class: 'lesson lesson--game' });
  const bar = el('div', { class: 'lesson__bar' });
  const backBtn = el('button', { class: 'btn--back', 'aria-label': 'Sair', 'on:click': tryExit }, '←');
  const gabiMini = gabiEl('idle', 'gabi--sm');
  const dots = el('div', { class: 'dots grow' });
  const counter = el('div', { class: 'small muted nowrap' });
  const comboBadge = el('div', { class: 'combo', hidden: true, text: '🔥 x2' });
  const xpPill = el('div', { class: 'hud__xp', html: `⭐ <span>${store.state.progress.xp}</span>` });
  const replay = el('button', {
    class: 'btn--icon', 'aria-label': 'Ouvir de novo',
    'on:click': () => { if (current) { stopSpeaking(); speakExerciseTarget(current); } },
  }, '🔊');
  bar.append(backBtn, gabiMini, dots, counter, comboBadge, xpPill, replay);
  const body = el('div', { class: 'lesson__body' });
  const foot = el('div', { class: 'lesson__foot' });
  root.append(bar, body, foot);
  screen.append(root);

  function renderDots() {
    dots.innerHTML = '';
    scored.forEach((it, i) => {
      const cls = i < idx ? 'done' : i === idx ? 'now' : '';
      dots.append(el('i', { class: `dot ${cls}` }));
    });
    counter.textContent = `${Math.min(idx + 1, scored.length)}/${scored.length}`;
  }

  async function tryExit() {
    clearTimeout(speakTimer);
    if (mode === 'diag') { location.hash = '#/'; return; }
    // sair no meio da revisão não pode perder a lição que já terminou
    if (inReview) { finish(); return; }
    const done = results.length;
    if (done === 0) { location.hash = '#/trilha'; return; }
    const yes = await modal({
      title: 'Sair da aula?',
      body: '<p>O que você já fez fica salvo. Quer sair agora?</p>',
      actions: [{ label: 'Continuar estudando', value: false }, { label: 'Sair', value: true, primary: true }],
    });
    if (yes) { stopSpeaking(); location.hash = '#/trilha'; }
  }

  function show(i) {
    if (!alive() || finished) return;
    idx = i;
    current = (inReview ? reviewItems : items)[i];
    attemptsThis = 0;
    locked = false;
    clearTimeout(speakTimer);
    try { handle?.destroy?.(); } catch { /* ignore */ }
    handle = null;
    body.innerHTML = '';
    foot.innerHTML = '';
    renderDots();
    body.scrollTop = 0;

    if (current.kind === 'teach') {
      body.append(el('div', { class: 'small muted center', text: mode === 'diag' ? 'Antes de começar' : 'Antes de praticar' }));
      handle = mountTeach(current, body, { onDone: () => next() });
      return;
    }

    handle = mountExercise(current, body, {
      onWrong: (info) => { attemptsTotal++; attemptsThis++; onWrong(info); },
      onDone: (res) => onDone(res),
    });
    // o exercício limpa o host ao montar; o banner entra depois, na frente dele
    if (inReview) {
      body.prepend(el('div', { class: 'review-banner' },
        el('div', { class: 'review-banner__kicker', text: 'Revisão rápida' }),
        el('div', { class: 'small muted', text: 'Fixando o que você acabou de aprender.' })));
    }

    setGabiMood('idle');
    const hintBtn = el('button', {
      class: 'btn btn--soft', type: 'button',
      'on:click': async () => {
        setGabiMood('thinking');
        const h = hintFor(current);
        const handled = handle?.showHint?.();
        if (!handled && h?.speak) speak(h.speak);
        const b = el('div', { class: 'feedback feedback--model', style: { marginTop: '10px' } },
          el('div', { class: 'feedback__icon', text: '💡' }),
          el('div', {}, el('div', { class: 'feedback__title', text: 'Dica da Gabi' }),
            el('div', { class: 'feedback__text', text: h?.text || 'Vamos com calma.' })));
        foot.innerHTML = '';
        foot.append(b, hintBtn);
        hintBtn.remove();
      },
    }, '💡 Dica');
    foot.append(el('div', { class: 'row row--between' }, el('div', { class: 'small muted', text: 'Escolha ou responda' }), hintBtn));
    if (inReview) {
      foot.append(el('button', {
        class: 'btn btn--ghost btn--sm btn--block', style: { marginTop: '8px' },
        'on:click': () => { stopSpeaking(); reviewSkipped = true; finish(); },
      }, 'Pular revisão'));
    }

    if (current.say || current.word || current.sayParts) {
      clearTimeout(speakTimer);
      speakTimer = setTimeout(() => { if (alive() && !locked) speakExerciseTarget(current); }, 380);
    }
  }

  function onWrong(info) {
    if (!alive() || finished) return;
    sfx('soft');
    setGabiMood('thinking');
    if (current.type?.startsWith('read-')) {
      const fb = readingFeedback(info.accuracy || 0, info.missed || [], attemptsThis);
      speak(fb.audio || 'Vamos ler juntos.');
    } else {
      const fb = feedbackFor(current, { ok: false });
      speak(fb.audio || 'Quase!');
    }
    const line = el('div', { class: 'feedback feedback--nudge', style: { marginTop: '12px' } },
      el('div', { class: 'feedback__icon', text: '🌱' }),
      el('div', {},
        el('div', { class: 'feedback__title', text: attemptsThis > 1 ? 'Vamos com calma' : 'Quase!' }),
        el('div', { class: 'feedback__text', text: attemptsThis > 1 ? (current.explain?.err || 'Tente mais uma vez.') : (current.explain?.rule || 'Olhe com atenção e tente de novo.') })));
    body.querySelectorAll('.feedback--nudge').forEach((n) => n.remove());
    body.append(line);
    line.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function onDone(res) {
    if (!alive() || locked || finished) return;
    locked = true;
    clearTimeout(speakTimer);
    stopSpeaking();

    if (res.teach) { next(); return; }

    const rec = store.recordAttempt({
      unitId,
      lessonIndex,
      item: current,
      ok: !!res.ok,
      firstTry: (res.attempts ?? attemptsThis) === 0,
      ms: Date.now() - t0,
      helped: !!res.helped,
      selfReported: !!res.selfReported,
    });
    gained += rec.gained || 0;
    if (rec.sticker) newStickers.push(rec.sticker);

    // HUD: XP subindo e combo de acertos de primeira
    combo = res.ok && (res.attempts ?? attemptsThis) === 0 ? combo + 1 : 0;
    xpPill.innerHTML = `⭐ <span>${store.state.progress.xp}</span>`;
    xpPill.classList.remove('bump'); void xpPill.offsetWidth; xpPill.classList.add('bump');
    const floatXp = el('span', { class: 'xp-float', text: `+${rec.gained || 0}` });
    xpPill.append(floatXp);
    setTimeout(() => floatXp.remove(), 950);
    if (combo >= 2) {
      comboBadge.hidden = false;
      comboBadge.textContent = `🔥 x${combo}`;
      comboBadge.classList.remove('pop'); void comboBadge.offsetWidth; comboBadge.classList.add('pop');
    } else {
      comboBadge.hidden = true;
    }
    if (rec.levelUp) { sfx('level'); confetti(18); }

    const entry = {
      ok: !!res.ok,
      type: current.type,
      skill: current.skill,
      word: current.word,
      accuracy: res.accuracy,
      selfReported: !!res.selfReported,
      helped: !!res.helped,
    };
    if (inReview) reviewResults.push(entry); else results.push(entry);

    if (res.ok) { sfx('great'); flyingStars(3); haptic(15); }

    const fb = current.type?.startsWith('read-')
      ? readingFeedback(res.accuracy ?? (res.ok ? 1 : 0), res.missed || [], res.attempts ?? 0)
      : feedbackFor(current, res);
    setGabiMood(fb.mood || (res.ok ? 'happy' : 'thinking'));

    const card = el('div', { class: `feedback ${res.ok ? 'feedback--ok' : 'feedback--nudge'}`, style: { marginTop: '14px' } },
      el('div', { class: 'feedback__icon', text: res.ok ? '🌟' : '🌱' }),
      el('div', { class: 'grow' },
        el('div', { class: 'feedback__title', text: fb.title }),
        el('div', { class: 'feedback__text', text: fb.text }),
        fb.rule ? el('div', { class: 'feedback__rule', text: fb.rule }) : null));
    body.append(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    speak(fb.audio || (res.ok ? 'Muito bem!' : 'Vamos com calma.'));

    foot.innerHTML = '';
    const list = inReview ? reviewItems : items;
    const last = idx >= list.length - 1;
    const label = inReview ? (last ? 'Ver resultado ✨' : 'Continuar revisão ➜') : (last ? 'Ver resultado ✨' : 'Continuar ➜');
    foot.append(el('button', {
      class: 'btn btn--primary btn--block btn--xl',
      'on:click': () => next(),
    }, label));
  }

  function next() {
    if (!alive()) return;
    clearTimeout(speakTimer);
    stopSpeaking();
    const list = inReview ? reviewItems : items;
    if (idx + 1 >= list.length) {
      if (!inReview && startReview()) return;
      finish();
      return;
    }
    show(idx + 1);
  }

  function startReview() {
    if (inReview || mode !== 'lesson' || boss || finished) return false;
    const built = buildLessonReviewItems({ unitId, lessonIndex, items, results, textId });
    if (!built.length) return false;
    inReview = true;
    reviewItems = built;
    scored = reviewItems.filter((i) => i.kind === 'ex');
    idx = 0;
    locked = false;
    show(0);
    return true;
  }

  function finish() {
    if (finished || !alive()) return;
    clearTimeout(speakTimer);
    finished = true;
    const scoredResults = results;
    const total = scoredResults.length || 1;
    const correct = scoredResults.filter((r) => r.ok).length;
    const acc = correct / total;
    const durationSec = Math.round((Date.now() - t0) / 1000);

    if (!alive()) return;
    hideTabbar();

    if (mode === 'diag') {
      store.addTime(durationSec);
      const suggested = suggestUnitFromDiagnostic(scoredResults);
      store.setPlacement(suggested, scoredResults);
      renderPlacement(suggested, { firstRun, acc, correct, total });
      return;
    }

    if (mode === 'review') {
      store.addTime(durationSec);
      renderOutcome({
        mode, title: 'Revisão', stars: acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1,
        correct, total, acc, gained, newStickers, durationSec,
      });
      return;
    }

    const stars = acc >= 0.9 ? 3 : acc >= 0.65 ? 2 : 1;
    if (!boss) store.adjustUnitLevel(unitId, acc);
    store.markLessonComplete(unitId, lessonIndex, { stars, total, correct, durationSec, textId });
    store.checkUnitStickers(UNITS);
    const unlocked = store.unitProgress(unitId, getUnit(unitId));
    renderOutcome({
      mode, unitId, lessonIndex, title, stars, correct, total, acc, gained,
      newStickers, durationSec, unitDone: unlocked.complete, accuracy: unlocked.accuracy,
      review: reviewResults, reviewTotal: reviewItems.length, reviewSkipped,
    });
  }

  /* ---- resultado ---- */
  function renderOutcome(o) {
    stopSpeaking();
    const s = clearScreen();
    s.classList.add('screen--flush');
    const box = el('div', { class: 'lesson__body', style: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } });
    const card = el('div', { class: 'result' });
    const medal = el('div', { class: 'result__medal' }, gabiEl(o.stars >= 3 ? 'happy' : 'idle'));
    card.append(medal);
    card.append(el('div', { class: 'result__stars', html: [0, 1, 2].map((i) => `<span class="s ${i < o.stars ? 'on' : ''}">★</span>`).join('') }));
    card.append(el('div', { class: 'result__title', text: o.unitId === 'u9' ? 'História lida!' : o.stars >= 3 ? 'Aula perfeita!' : o.stars === 2 ? 'Muito bem!' : 'Você terminou!' }));
    card.append(el('div', { class: 'q-sub', text: lessonSummary(o.stars, o.correct, o.total) }));
    card.append(el('div', {
      class: 'metrics',
      html: `
        <div class="metric"><div class="metric__v">${o.correct}/${o.total}</div><div class="metric__k">acertos</div></div>
        <div class="metric"><div class="metric__v">+${o.gained}</div><div class="metric__k">estrelinhas</div></div>
        <div class="metric"><div class="metric__v">${Math.max(1, Math.round(o.durationSec / 60))}m</div><div class="metric__k">tempo</div></div>`,
    }));
    const st = [...new Set(o.newStickers)].filter(Boolean);
    if (st.length) {
      const row = el('div', { class: 'chips', style: { justifyContent: 'center', marginTop: '14px' } });
      st.forEach((id) => {
        const def = STICKER_BY_ID.get(id);
        row.append(el('div', { class: 'chip chip--ok', text: `Adesivo novo: ${def ? def.ico + ' ' + def.nome : id}` }));
      });
      card.append(row);
    }
    if (o.reviewSkipped && !(o.review || []).length) {
      card.append(el('div', { class: 'chips', style: { justifyContent: 'center', marginTop: '12px' } },
        el('div', { class: 'chip', text: 'Revisão pulada' })));
    } else if (o.review?.length || o.reviewTotal) {
      const hits = (o.review || []).filter((r) => r.ok).length;
      card.append(el('div', { class: 'chips', style: { justifyContent: 'center', marginTop: '12px' } },
        el('div', { class: 'chip chip--ok', text: `Revisão rápida: ${hits}/${o.reviewTotal || o.review.length}` })));
    }
    box.append(card);
    s.append(box);

    const foot = el('div', { class: 'lesson__foot' });
    if (o.mode === 'review') {
      foot.append(el('button', { class: 'btn btn--primary btn--block btn--xl', 'on:click': () => { location.hash = '#/'; } }, 'Voltar ao início'));
    } else if (o.unitId === 'u9') {
      foot.append(el('button', { class: 'btn btn--primary btn--block btn--xl', 'on:click': () => { location.hash = '#/historias'; } }, 'Escolher outra história'));
    } else {
      const nextUnitIdx = UNITS.findIndex((u) => u.id === o.unitId);
      const unit = getUnit(o.unitId);
      const hasNext = o.unitDone && nextUnitIdx + 1 < UNITS.length;
      if (hasNext) {
        foot.append(el('button', {
          class: 'btn btn--primary btn--block btn--xl',
          'on:click': () => { location.hash = `#/licao/${UNITS[nextUnitIdx + 1].id}/0`; },
        }, `Próxima unidade: ${UNITS[nextUnitIdx + 1].titulo}`));
        foot.append(el('button', { class: 'btn btn--soft btn--block', style: { marginTop: '8px' }, 'on:click': () => { location.hash = '#/'; } }, 'Voltar ao início'));
      } else {
        foot.append(el('button', { class: 'btn btn--primary btn--block btn--xl', 'on:click': () => { location.hash = '#/'; } }, 'Voltar ao início'));
        foot.append(el('button', {
          class: 'btn btn--soft btn--block', style: { marginTop: '8px' },
          'on:click': () => location.hash = `#/licao/${o.unitId}/${o.lessonIndex}`,
        }, 'Repetir esta lição'));
      }
    }
    s.append(foot);
    confetti(o.stars >= 2 ? 26 : 12);
    sfx(o.stars >= 2 ? 'great' : 'ok');
    speak(lessonSummaryAudio(o.stars));
    if (o.unitDone) {
      setTimeout(() => { if (alive()) speak('Parabéns!'); }, 2600);
    }
  }

  function renderPlacement(unitId, meta) {
    const unit = getUnit(unitId);
    const s = clearScreen();
    s.classList.add('screen--flush');
    const box = el('div', { class: 'lesson__body', style: { display: 'flex', flexDirection: 'column', justifyContent: 'center' } });
    const card = el('div', { class: 'result' });
    card.append(gabiEl('happy', 'gabi--lg'));
    card.append(el('div', { class: 'result__title', text: 'Já sei por onde começar!' }));
    card.append(el('div', { class: 'q-sub', text: `Você acertou ${meta.correct} de ${meta.total}. Vamos começar aqui:` }));
    card.append(el('div', { class: 'card card--soft', style: { marginTop: '16px' } },
      el('div', { class: 'emoji-big', text: unit.emoji }),
      el('div', { class: 'unit__title', text: `Unidade ${unit.n} · ${unit.titulo}` }),
      el('div', { class: 'muted small', text: unit.sub })));
    box.append(card);
    s.append(box);
    const foot = el('div', { class: 'lesson__foot' });
    foot.append(el('button', {
      class: 'btn btn--primary btn--block btn--xl',
      'on:click': () => {
        store.state.onboarded = true;
        store.save(true);
        location.hash = `#/licao/${unitId}/0`;
      },
    }, 'Começar a aprender ✨'));
    foot.append(el('button', {
      class: 'btn btn--ghost btn--block', style: { marginTop: '6px' },
      'on:click': () => { store.state.onboarded = true; store.save(true); location.hash = '#/'; },
    }, 'Ver o início'));
    s.append(foot);
    speak(`Pronto! Vamos começar pela unidade ${unit.n}: ${unit.titulo}.`);
  }

  show(0);
}
