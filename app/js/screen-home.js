/* Telas: início, trilha, adesivos, histórias e onboarding. */
import { el, pct, clamp, sleep, fmtMinutes } from './utils.js';
import * as store from './store.js';
import { UNITS, UNIT_BY_ID, getUnit, unitIndexOf } from './curriculum.js';
import { TEXTS } from './content.js';
import { speak, stopSpeaking, listVoices, pickVoice, ensureVoices, sfx, unlockAudio, ttsSupported, isBrazilianVoice } from './audio.js';
import { requestMic, listen, asrSupported, asrErrorMessage, getMicPermission } from './speech.js';
import { gabiEl, toast, progressRing, starsHTML, tabbar, hideTabbar, clearScreen, modal, confetti } from './ui.js';
import { greeting, greetingPhrase, greetingLine, childName } from './tutor.js';

/* ================================ INÍCIO ================================ */
export function renderHome() {
  const s = clearScreen();
  tabbar('home');
  const wrap = el('div', { class: 'wrap stack' });

  const rec = store.recommendation(UNITS);
  const streak = store.state.progress.streak.days || 0;
  const coins = store.state.progress.coins || 0;
  const mins = store.todayMinutes();
  const target = store.state.settings.sessionTarget || 10;

  const top = el('div', { class: 'row row--between', style: { marginBottom: '12px' } });
  top.append(el('div', { class: 'row', style: { gap: '10px' } },
    gabiEl('idle', 'gabi--sm'),
    el('div', {}, el('div', { class: 'small muted', text: 'Professora' }), el('div', { class: 'strong', text: 'Gabi' }))));
  const pills = el('div', { class: 'row', style: { gap: '6px' } });
  pills.append(el('div', { class: 'pill pill--flame', text: `🔥 ${streak}` }));
  pills.append(el('div', { class: 'pill pill--coin', text: `⭐ ${coins}` }));
  top.append(pills);
  wrap.append(top);

  const hero = el('div', { class: 'hero', 'data-greeting': 'home' });
  hero.append(gabiEl(streak > 0 ? 'happy' : 'idle', 'gabi--lg'));
  const heroTxt = el('div', { class: 'grow' });
  let greetText = 'Olá';
  let phraseText = 'Vamos aprender brincando?';
  try {
    greetText = greeting();
    phraseText = greetingPhrase();
  } catch { /* mantém o texto padrão: a saudação nunca pode sumir */ }
  heroTxt.append(el('div', { class: 'hero__greet', text: `${greetText}!` }));
  heroTxt.append(el('div', { class: 'hero__name', text: childName() || 'Vamos ler juntos?' }));
  heroTxt.append(el('div', { class: 'hero__line', text: phraseText }));
  const voiceNote = el('div', { class: 'hero__voice', role: 'status' });
  const sayBtn = el('button', {
    class: 'btn btn--sm btn--soft hero__speak', type: 'button',
    'aria-label': 'Ouvir a saudação da Gabi',
    'on:click': async () => {
      if (sayBtn.dataset.busy === '1') return;
      sayBtn.dataset.busy = '1';
      sayBtn.textContent = '🔊 Falando…';
      voiceNote.textContent = '';
      unlockAudio();
      let res = null;
      try {
        res = await speak(greetingLine());
      } finally {
        sayBtn.textContent = '🔊 Ouvir a Gabi';
        delete sayBtn.dataset.busy;
      }
      if (res && res.spoken === false && !store.state.settings.muted) {
        voiceNote.textContent = 'Não consegui falar agora. Confira o volume e se o tablet tem voz em português instalada.';
      }
    },
  }, '🔊 Ouvir a Gabi');
  heroTxt.append(sayBtn, voiceNote);
  if (!store.state.settings.muted) {
    if (!ttsSupported()) {
      voiceNote.textContent = 'Este tablet não tem voz instalada. O texto da saudação continua aqui.';
    } else {
      // no Android a lista de vozes chega atrasada; só avisa se realmente não houver pt-BR
      ensureVoices(2600).then((vs) => {
        if (!vs.some(isBrazilianVoice) && !voiceNote.textContent) {
          voiceNote.textContent = 'Não encontrei voz em português do Brasil neste tablet. Instale a voz pt-BR nas configurações; a voz de Portugal é ignorada.';
        }
      });
    }
  }
  hero.append(heroTxt);
  const heroSky = el('div', { class: 'home-sky' });
  heroSky.append(el('div', { class: 'sky' },
    el('span', { class: 'cloud c1', text: '☁️' }),
    el('span', { class: 'cloud c2', text: '☁️' })));
  heroSky.append(hero);
  wrap.append(heroSky);

  const today = el('div', { class: 'today' });
  const cta = el('div', { class: 'card-cta' });
  const lessonNo = rec.lessonIndex + 1;
  cta.append(el('div', { class: 'card-cta__kicker', text: mins >= target ? 'Meta do dia concluída' : 'Sua próxima aula' }));
  cta.append(el('div', { class: 'card-cta__title', text: rec.unit.titulo }));
  cta.append(el('div', { class: 'card-cta__sub', text: `${rec.unit.emoji}  lição ${lessonNo} de ${rec.unit.lessons} · ${rec.unit.sub}` }));
  cta.append(el('button', {
    class: 'btn btn--block', style: { background: '#fff', color: '#0b6f66', boxShadow: '0 5px 0 rgba(0,0,0,.12)' },
    'on:click': () => { location.hash = `#/licao/${rec.unitId}/${rec.lessonIndex}`; },
  }, mins >= target ? 'Continuar aprendendo ➜' : 'Começar a aula ➜'));
  today.append(cta);

  const goalCard = el('div', { class: 'card card--soft' });
  const goalRow = el('div', { class: 'goal' });
  goalRow.append(progressRing(clamp(mins / target, 0, 1), `${mins}/${target}`));
  const goalTxt = el('div', {});
  goalTxt.append(el('div', { class: 'section-title', text: 'Meta de hoje' }));
  goalTxt.append(el('div', { class: 'strong', text: mins >= target ? 'Meta batida! 🎉' : `${target - mins} min para a meta` }));
  goalTxt.append(el('div', { class: 'small muted', text: 'Pouco e todo dia funciona melhor.' }));
  goalRow.append(goalTxt);
  goalCard.append(goalRow);
  today.append(goalCard);
  wrap.append(today);
  wrap.append(questsCard());

  if (store.chestAvailable()) {
    const chestCard = el('div', { class: 'card card--soft row chest-card', style: { gap: '12px', alignItems: 'center' } });
    const openBtn = el('button', { class: 'btn btn--primary' }, 'Abrir');
    openBtn.addEventListener('click', () => {
      if (openBtn.disabled) return;
      openBtn.disabled = true;
      openBtn.textContent = 'Abrindo…';
      chestCard.classList.add('chest-card--opening');
      sfx('level');
      if (!store.state.settings.reduceMotion) confetti(18);
      setTimeout(() => {
        store.claimChest();
        location.hash = '#/caca?bonus=1';
      }, 750);
    });
    chestCard.append(
      el('div', { class: 'chest-card__icon', text: '🎁' }),
      el('div', { class: 'grow' },
        el('div', { class: 'strong', text: 'Baú do dia' }),
        el('div', { class: 'small muted', text: 'Você bateu a meta! Abra para um desafio bônus valendo XP extra.' })),
      openBtn);
    wrap.append(chestCard);
  }

  const quick = el('div', { class: 'quick' });
  const due = store.reviewDueCount();
  quick.append(quickItem('🔁', 'Revisar', due ? `${due} palavra${due > 1 ? 's' : ''} esperando` : 'Nada pendente', () => { location.hash = '#/revisar'; }, due > 0));
  quick.append(quickItem('📖', 'Histórias', `${TEXTS.length} histórias para ler`, () => { location.hash = '#/historias'; }));
  quick.append(quickItem('🏅', 'Adesivos', `${store.state.stickers.length} de 11`, () => { location.hash = '#/adesivos'; }));
  quick.append(quickItem('📷', 'Modo livro', 'Fotografe a página e leia junto', () => { location.hash = '#/livro'; }));
  quick.append(quickItem('🔎', 'Caça-palavras', 'Encontre as palavras escondidas', () => { location.hash = '#/caca'; }));
  quick.append(quickItem('💬', 'Conversar', 'Bater papo com a Gabi', () => { location.hash = '#/conversar'; }));
  wrap.append(el('div', { class: 'section-title', text: 'Atalhos' }), quick);

  const nextUnits = el('div', { class: 'col', style: { gap: '10px' } });
  UNITS.slice(Math.max(0, unitIndexOf(rec.unitId)), Math.max(0, unitIndexOf(rec.unitId)) + 3).forEach((u) => {
    const p = store.unitProgress(u.id, u);
    const unlocked = store.isUnitUnlocked(u.id, UNITS);
    const row = el('div', {
      class: 'card card--flat row', style: { padding: '12px 14px', cursor: unlocked ? 'pointer' : 'default', opacity: unlocked ? '1' : '.6' },
      'on:click': () => { if (unlocked) location.hash = `#/licao/${u.id}/${store.nextLessonFor(u.id, u)}`; },
    });
    row.append(el('div', { class: 'unit__icon', style: { width: '46px', height: '46px', fontSize: '24px', background: 'var(--violet-soft)' }, text: unlocked ? u.emoji : '🔒' }));
    const mid = el('div', { class: 'grow' });
    mid.append(el('div', { class: 'strong', text: u.titulo }));
    mid.append(el('div', { class: 'small muted', text: `${p.done}/${p.lessons} lições · ${p.mastery}%` }));
    row.append(mid);
    row.append(el('div', { html: starsHTML(Math.min(3, Math.round((p.stars / Math.max(1, p.maxStars)) * 3))) }));
    nextUnits.append(row);
  });
  wrap.append(el('div', { class: 'section-title', text: 'Sua trilha' }), nextUnits);
  wrap.append(el('button', {
    class: 'btn btn--soft btn--block', 'on:click': () => { location.hash = '#/trilha'; },
  }, 'Ver a trilha completa 🗺️'));

  s.append(wrap);
}

function questsCard() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const ts = store.todayStats();
  const hist = (store.state.history || []).filter((h) => h.ts >= start.getTime());
  const wordsRead = hist.filter((h) => String(h.type || '').startsWith('read-') && h.ok).length;
  const items = [
    { ok: (ts.lessons || 0) >= 1, ico: '🎯', label: 'Fazer 1 lição', xp: 50 },
    { ok: wordsRead >= 5, ico: '🔤', label: 'Ler 5 palavras em voz alta', xp: 30 },
    { ok: (ts.ex || 0) >= 8, ico: '⚡', label: 'Completar 8 atividades', xp: 20 },
  ];
  const card = el('div', { class: 'card' });
  const head = el('div', { class: 'row row--between' });
  head.append(el('div', { class: 'section-title', text: 'Missões de hoje' }));
  head.append(el('div', { class: 'pill pill--star', text: `${items.filter((i) => i.ok).length}/3` }));
  card.append(head);
  const list = el('div', { class: 'quests' });
  items.forEach((it) => {
    const row = el('div', { class: `quest ${it.ok ? 'done' : ''}` });
    row.append(el('span', { class: 'quest__ico', text: it.ok ? '✅' : it.ico }));
    row.append(el('span', { class: 'quest__label', text: it.label }));
    row.append(el('span', { class: 'quest__xp', text: it.ok ? 'feito!' : `+${it.xp} XP` }));
    list.append(row);
  });
  card.append(list);
  return card;
}

function quickItem(ico, label, hint, onClick, highlight = false) {
  const b = el('button', { class: 'quick__item', 'on:click': onClick });
  b.append(el('div', { class: 'quick__ico', text: ico }));
  b.append(el('div', { class: 'quick__label', text: label }));
  b.append(el('div', { class: 'quick__hint', text: hint }));
  if (highlight) b.style.boxShadow = '0 0 0 3px #ffe3a3, var(--shadow-sm)';
  return b;
}

/* ================================ TRILHA ================================ */
export function renderTrilha() {
  const s = clearScreen();
  tabbar('trilha');
  const wrap = el('div', { class: 'wrap stack' });

  const rec = store.recommendation(UNITS);
  const doneUnits = UNITS.filter((u) => store.unitProgress(u.id, u).complete).length;

  wrap.append(el('div', { class: 'row row--between' },
    el('div', {},
      el('div', { class: 'topbar__title', text: 'Mapa da aventura' }),
      el('div', { class: 'small muted', text: `${doneUnits} de ${UNITS.length} fases concluídas · ${store.state.stickers.length} adesivos` })),
    el('div', { class: 'pill pill--star', text: `⭐ ${store.state.progress.xp}` })));

  const adventure = el('div', { class: 'adventure' });
  adventure.append(el('div', { class: 'sun' }));
  adventure.append(el('div', { class: 'sky' },
    el('span', { class: 'cloud c1', text: '☁️' }),
    el('span', { class: 'cloud c2', text: '☁️' }),
    el('span', { class: 'cloud c3', text: '☁️' })));

  const trail = el('div', { class: 'trail' });
  const currentId = rec.unitId;

  UNITS.forEach((u, i) => {
    const p = store.unitProgress(u.id, u);
    const unlocked = store.isUnitUnlocked(u.id, UNITS);
    const isCurrent = u.id === currentId;
    const stateCls = !unlocked ? 'locked' : p.complete ? 'done' : isCurrent ? 'current' : 'open';
    const node = el('div', { class: `trail-node ${i % 2 ? 'right' : 'left'} ${stateCls}` });
    node.style.setProperty('--p', String(Math.max(5, p.mastery)));
    node.style.setProperty('--c', u.cor);

    const badge = el('button', {
      class: 'trail-badge', type: 'button',
      'aria-label': `Fase ${u.n}: ${u.titulo}`,
      'on:click': () => {
        if (!unlocked) { toast('Termine a fase anterior para abrir esta.'); sfx('soft'); return; }
        sfx('tap');
        location.hash = `#/licao/${u.id}/${store.nextLessonFor(u.id, u)}`;
      },
    }, el('span', { class: 'trail-emoji', text: unlocked ? u.emoji : '🔒' }));
    node.append(badge);

    const card = el('div', { class: 'trail-card' });
    card.append(el('div', { class: 'trail-kicker', text: isCurrent && unlocked ? 'Você está aqui' : `Fase ${u.n}` }));
    card.append(el('div', { class: 'trail-title', text: u.titulo }));
    card.append(el('div', { class: 'trail-sub', text: u.sub }));
    const meta = el('div', { class: 'trail-meta' });
    meta.append(el('span', { class: 'trail-pill', text: `${p.done}/${p.lessons}` }));
    meta.append(el('span', { class: 'trail-pill', text: `nível ${store.unitLevel(u.id)}/3` }));
    meta.append(el('span', { class: 'trail-stars', html: starsHTML(Math.min(3, Math.round((p.stars / Math.max(1, p.maxStars)) * 3))) }));
    card.append(meta);

    if (p.complete && unlocked) {
      const boss = store.bossRecord(u.id, u);
      card.append(el('button', {
        class: `btn btn--sm ${boss ? 'btn--soft' : 'btn--primary'}`, style: { marginTop: '6px' },
        'on:click': (e) => { e.stopPropagation(); sfx('tap'); location.hash = `#/licao/${u.id}/${u.lessons}`; },
      }, boss ? `👑 Chefe: ${'★'.repeat(boss.stars || 1)}` : '👑 Fase chefe'));
    }
    node.append(card);

    if (isCurrent && unlocked) node.append(el('div', { class: 'trail-avatar', text: store.state.child.avatar || '🦊' }));
    trail.append(node);
  });

  adventure.append(trail);
  wrap.append(adventure);

  // parallax suave: nuvens/sol/grama se movem de forma diferente ao rolar
  const screenEl = document.getElementById('screen');
  if (screenEl) {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (!adventure.isConnected) { screenEl.removeEventListener('scroll', onScroll); return; }
      const p = Math.min(1, Math.max(0, (screenEl.scrollTop || 0) / 700));
      adventure.style.setProperty('--par', p.toFixed(3));
    };
    const onScroll = () => {
      if (store.state.settings.reduceMotion || raf) return;
      raf = requestAnimationFrame(update);
    };
    screenEl.addEventListener('scroll', onScroll, { passive: true });
  }
  wrap.append(el('div', { class: 'card card--soft small muted', text: 'Cada fase abre quando você domina a anterior. Toque na bolinha para jogar.' }));
  s.append(wrap);
}

function hexSoft(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},.13)`;
}

/* =============================== ADESIVOS =============================== */
import { STICKERS } from './content.js';

export function renderStickers() {
  const s = clearScreen();
  tabbar('home');
  const wrap = el('div', { class: 'wrap stack' });
  wrap.append(el('div', { class: 'row row--between' },
    el('button', { class: 'btn--back', 'on:click': () => { location.hash = '#/'; } }, '←'),
    el('div', { class: 'topbar__title grow', text: 'Meus adesivos' }),
    el('div', { class: 'pill pill--star', text: `${store.state.stickers.length}/${STICKERS.length}` })));
  const grid = el('div', { class: 'stickers' });
  STICKERS.forEach((st) => {
    const has = store.state.stickers.includes(st.id);
    const card = el('div', { class: `sticker ${has ? '' : 'sticker--locked'}` });
    card.append(el('div', { class: 'sticker__ico', text: st.ico }));
    card.append(el('div', { class: 'sticker__name', text: st.nome }));
    card.append(el('div', { class: 'tiny muted', text: has ? 'conquistado' : st.desc }));
    grid.append(card);
  });
  wrap.append(grid);
  wrap.append(el('div', { class: 'card card--soft small muted', text: 'Os adesivos aparecem quando você pratica. Não precisa correr: cada dia um pouco já é vitória.' }));
  s.append(wrap);
}

/* =============================== HISTÓRIAS =============================== */
export function renderHistorias() {
  const s = clearScreen();
  tabbar('home');
  const wrap = el('div', { class: 'wrap stack' });
  wrap.append(el('div', { class: 'row row--between' },
    el('button', { class: 'btn--back', 'on:click': () => { location.hash = '#/'; } }, '←'),
    el('div', { class: 'topbar__title grow', text: 'Histórias' })));

  // desbloqueia histórias conforme as unidades são concluídas
  const unlockedUnits = new Set(['u2']);
  UNITS.forEach((u) => {
    const p = store.unitProgress(u.id, u);
    if (p.done > 0 || store.state.settings.freeMode) unlockedUnits.add(u.id);
  });

  const list = el('div', { class: 'col' });
  TEXTS.forEach((t, i) => {
    const open = unlockedUnits.has(t.unidade) || store.state.settings.freeMode;
    const rec = store.lessonRecord('u9', i);
    const card = el('div', {
      class: 'card card--flat row', style: { gap: '14px', opacity: open ? '1' : '.55', cursor: open ? 'pointer' : 'default' },
      'on:click': () => {
        if (!open) { toast('Leia as unidades anteriores para abrir esta história.'); return; }
        location.hash = `#/licao/u9/${i}`;
      },
    });
    card.append(el('div', { class: 'unit__icon', text: open ? t.emoji : '🔒' }));
    const mid = el('div', { class: 'grow' });
    mid.append(el('div', { class: 'strong', text: t.titulo }));
    mid.append(el('div', { class: 'small muted', text: `${t.linhas.length} linhas · ${t.palavras.slice(0, 3).join(', ')}` }));
    card.append(mid);
    card.append(el('div', { html: rec ? starsHTML(rec.stars) : '<span class="tiny muted">novo</span>' }));
    list.append(card);
  });
  wrap.append(list);
  s.append(wrap);
}

/* =============================== ONBOARDING =============================== */
export function renderOnboarding() {
  const s = clearScreen();
  hideTabbar();
  let step = 0;
  const names = ['Fada', 'Dragão', 'Gato', 'Leão', 'Coruja', 'Sereia', 'Robô', 'Astronauta'];
  const avatars = ['🦊', '🐼', '🦄', '🐯', '🐨', '🐸', '🐙', '🦉'];
  let avatar = avatars[0];

  const wrap = el('div', { class: 'wrap', style: { maxWidth: '720px' } });
  s.append(wrap);

  function paint() {
    wrap.innerHTML = '';
    wrap.append(el('div', { class: 'row', style: { justifyContent: 'center', marginBottom: '8px' } }, gabiEl('happy', 'gabi--lg')));

    if (step === 0) {
      wrap.append(el('div', { class: 'center' },
        el('div', { class: 'hero__greet', text: 'Oi! Eu sou a Gabi' }),
        el('h1', { class: 'hero__name', text: 'Vamos aprender a ler e escrever juntos?' }),
        el('p', { class: 'muted', text: 'Eu falo, escuto e ajudo no que você precisar. Sem pressa e sem bronca.' })));
      const card = el('div', { class: 'card', style: { marginTop: '16px' } });
      card.append(el('div', { class: 'field' },
        el('label', { text: 'Como você se chama?' }),
        el('input', { class: 'input', id: 'child-name', maxlength: '20', placeholder: 'Digite seu nome', value: store.state.child.name || '', autocomplete: 'off' })));
      card.append(el('div', { class: 'section-title', text: 'Escolha seu bichinho' }));
      const grid = el('div', { class: 'row row--wrap', style: { gap: '8px' } });
      avatars.forEach((a) => {
        const b = el('button', {
          class: 'btn', style: { width: '56px', height: '56px', minHeight: '0', padding: '0', fontSize: '26px', borderColor: a === avatar ? 'var(--primary)' : 'var(--line-2)' },
          'on:click': () => { avatar = a; grid.querySelectorAll('button').forEach((x) => x.style.borderColor = 'var(--line-2)'); b.style.borderColor = 'var(--primary)'; sfx('tap'); },
        }, a);
        grid.append(b);
      });
      card.append(grid);
      wrap.append(card);
      wrap.append(el('button', {
        class: 'btn btn--primary btn--block btn--xl', style: { marginTop: '16px' },
        'on:click': () => {
          const name = (document.getElementById('child-name')?.value || '').trim();
          if (!name) { toast('Escreva seu nome para começar.'); return; }
          store.state.child.name = name;
          store.state.child.avatar = avatar;
          store.save(true);
          unlockAudio();
          speak(`Oi, ${name}! Eu sou a Gabi. Vamos aprender juntos.`);
          step = 1; paint();
        },
      }, 'Continuar'));
      unlockAudio();
    }

    if (step === 1) {
      wrap.append(el('div', { class: 'center' },
        el('div', { class: 'hero__greet', text: 'Minha voz' }),
        el('h1', { class: 'hero__name', text: `Oi, ${store.state.child.name}!` }),
        el('p', { class: 'muted', text: 'Toque para me ouvir. Se estiver muito rápida ou lenta, ajuste aqui.' })));
      const card = el('div', { class: 'card', style: { marginTop: '16px' } });
      const sample = 'Vamos ler juntos! Bola. Bo-la. Duas sílabas!';
      if (!ttsSupported()) {
        card.append(el('div', { class: 'card card--warn', text: 'Este navegador não tem voz instalada. O app funciona, mas a Gabi não vai falar.' }));
      }
      const voiceRow = el('div', { class: 'field' });
      voiceRow.append(el('label', { text: 'Voz' }));
      const sel = el('select', { class: 'select' });
      const voices = listVoices();
      voices.forEach((v) => {
        const o = el('option', { value: v.voiceURI }, `${v.name} (${v.lang})`);
        if (pickVoice()?.voiceURI === v.voiceURI) o.selected = true;
        sel.append(o);
      });
      if (!voices.length) sel.append(el('option', { value: '' }, 'Voz padrão do tablet'));
      sel.addEventListener('change', () => { store.setSetting('voiceURI', sel.value); });
      voiceRow.append(sel);
      card.append(voiceRow);

      const rateField = el('div', { class: 'field' });
      rateField.append(el('label', { text: 'Velocidade da fala' }));
      const rate = el('input', { class: 'input', type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(store.state.settings.rate) });
      const rateVal = el('div', { class: 'small muted', text: speedLabel(store.state.settings.rate) });
      rate.addEventListener('input', () => {
        store.setSetting('rate', Number(rate.value));
        rateVal.textContent = speedLabel(Number(rate.value));
      });
      rateField.append(rate, rateVal);
      card.append(rateField);

      card.append(el('div', { class: 'row', style: { gap: '10px', marginTop: '6px' } },
        el('button', { class: 'btn btn--soft grow', 'on:click': () => speak(sample) }, '🔊 Ouvir'),
        el('button', { class: 'btn btn--soft grow', 'on:click': () => speak(sample, { rate: 0.65 }) }, '🐢 Mais devagar')));
      wrap.append(card);

      const nav = el('div', { class: 'row', style: { gap: '10px', marginTop: '16px' } });
      nav.append(el('button', { class: 'btn btn--ghost', 'on:click': () => { step = 0; paint(); } }, '← Voltar'));
      nav.append(el('button', { class: 'btn btn--primary grow', 'on:click': () => { step = 2; paint(); } }, 'Está bom assim ➜'));
      wrap.append(nav);
    }

    if (step === 2) {
      wrap.append(el('div', { class: 'center' },
        el('div', { class: 'hero__greet', text: 'Microfone' }),
        el('h1', { class: 'hero__name', text: 'Eu também quero te ouvir' }),
        el('p', { class: 'muted', text: 'Você vai ler em voz alta e eu digo como foi. O tablet vai pedir permissão para usar o microfone.' })));
      const card = el('div', { class: 'card', style: { marginTop: '16px' } });
      const status = el('div', { class: 'small muted', text: asrSupported ? 'Pronto para testar.' : 'Seu navegador não tem escuta de voz. Você pode usar o modo “Eu li”.' });
      const transcript = el('div', { class: 'feedback feedback--model', style: { marginTop: '10px', display: 'none' } });
      card.append(status, transcript);
      const testBtn = el('button', {
        class: 'btn btn--primary btn--block', style: { marginTop: '10px' },
        'on:click': async () => {
          testBtn.disabled = true;
          const ok = await requestMic();
          if (!ok) { status.textContent = 'Não conseguimos a permissão. Tudo bem: o app também funciona tocando nas respostas.'; testBtn.disabled = false; return; }
          status.textContent = 'Fale alguma coisa: “alô, Gabi!”';
          const res = await listen({ onPartial: (t) => { status.textContent = t; } });
          testBtn.disabled = false;
          transcript.style.display = 'flex';
          transcript.innerHTML = '';
          transcript.append(el('div', { class: 'feedback__icon', text: res.ok ? '🎤' : '🌱' }));
          transcript.append(el('div', {},
            el('div', { class: 'feedback__title', text: res.ok ? 'Eu te ouvi!' : 'Não ouvi dessa vez' }),
            el('div', { class: 'feedback__text', text: res.ok ? `Você disse: “${res.transcript}”` : asrErrorMessage(res.error) })));
          status.textContent = 'Pode testar de novo ou continuar.';
        },
      }, '🎤 Testar microfone');
      card.append(testBtn);
      card.append(el('div', { class: 'tiny muted', text: 'A escuta de voz usa a internet e envia o áudio para o serviço de fala do Google. Nada é gravado por nós.' }));
      wrap.append(card);

      const nav = el('div', { class: 'row', style: { gap: '10px', marginTop: '16px' } });
      nav.append(el('button', { class: 'btn btn--ghost', 'on:click': () => { step = 1; paint(); } }, '← Voltar'));
      nav.append(el('button', {
        class: 'btn btn--primary grow',
        'on:click': () => { step = 3; paint(); },
      }, asrSupported ? 'Vamos lá ➜' : 'Continuar sem microfone ➜'));
      wrap.append(nav);
    }

    if (step === 3) {
      wrap.append(el('div', { class: 'center' },
        el('div', { class: 'hero__greet', text: 'Última parada' }),
        el('h1', { class: 'hero__name', text: 'Vou descobrir o que você já sabe' }),
        el('p', { class: 'muted', text: 'São 10 perguntinhas rápidas. Não é prova: é só para eu começar no lugar certo para você.' })));
      const card = el('div', { class: 'card card--soft', style: { marginTop: '16px' } },
        el('div', { class: 'row', style: { gap: '10px' } },
          el('div', { class: 'emoji-big', text: '🎯' }),
          el('div', {}, el('div', { class: 'strong', text: 'Sem nota e sem tempo' }),
            el('div', { class: 'small muted', text: 'Pode pedir ajuda e tentar de novo.' }))));
      wrap.append(card);
      const nav = el('div', { class: 'row', style: { gap: '10px', marginTop: '16px' } });
      nav.append(el('button', { class: 'btn btn--ghost', 'on:click': () => { step = 2; paint(); } }, '← Voltar'));
      nav.append(el('button', {
        class: 'btn btn--primary grow btn--xl',
        'on:click': () => { unlockAudio(); location.hash = '#/diag'; },
      }, 'Começar 🚀'));
      wrap.append(nav);
      wrap.append(el('button', {
        class: 'btn btn--ghost btn--block', style: { marginTop: '6px' },
        'on:click': () => { store.state.onboarded = true; store.save(true); location.hash = '#/'; },
      }, 'Prefiro escolher a trilha do zero'));
    }
  }
  paint();
}

function speedLabel(r) {
  if (r <= 0.72) return 'Bem devagar 🐢';
  if (r <= 0.88) return 'Devagar, boa para aprender';
  if (r <= 1) return 'Normal';
  return 'Rápida 🐇';
}
