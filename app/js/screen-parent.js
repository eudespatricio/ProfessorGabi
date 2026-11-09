/* Área dos pais: progresso, ajustes, privacidade e backup. */
import { el, pct, download, fmtMinutes, clamp } from './utils.js';
import * as store from './store.js';
import { UNITS, SKILL_LABEL } from './curriculum.js';
import { wordsOfUnit, TEXTS } from './content.js';
import { speak, listVoices, pickVoice, ttsSupported, unlockAudio, opusSupported, audioDiagnostics } from './audio.js';
import { requestMic, listen, asrSupported, asrErrorMessage } from './speech.js';
import { APP_VERSION, APP_AUTHOR, APP_COPYRIGHT } from './version.js';
import { clearScreen, tabbar, pinGate, modal, toast, gabiEl, starsHTML, progressRing } from './ui.js';

let tab = 'resumo';

export async function renderParent() {
  const ok = await pinGate();
  if (!ok) { location.hash = '#/'; return; }
  tabbar('pais');
  paint();
}

function paint() {
  const s = clearScreen();
  const wrap = el('div', { class: 'wrap stack' });
  const head = el('div', { class: 'row row--between' });
  head.append(el('div', {},
    el('div', { class: 'topbar__title', text: 'Área dos pais' }),
    el('div', { class: 'small muted', text: `${store.state.child.name || 'Criança'} · nível ${store.level()} · ${store.state.progress.xp} XP` })));
  head.append(el('button', { class: 'btn--icon', 'on:click': () => { location.hash = '#/'; }, 'aria-label': 'Voltar' }, '←'));
  wrap.append(head);

  const tabs = el('div', { class: 'tabs' });
  [['resumo', 'Progresso'], ['conteudo', 'Conteúdo'], ['ajustes', 'Ajustes'], ['backup', 'Dados']].forEach(([id, label]) => {
    tabs.append(el('button', { class: tab === id ? 'active' : '', 'on:click': () => { tab = id; paint(); } }, label));
  });
  wrap.append(tabs);

  if (tab === 'resumo') wrap.append(summaryTab());
  if (tab === 'conteudo') wrap.append(contentTab());
  if (tab === 'ajustes') wrap.append(settingsTab());
  if (tab === 'backup') wrap.append(backupTab());
  s.append(wrap);
}

/* ------------------------------- CONTEÚDO ------------------------------- */
function contentTab() {
  const box = el('div', { class: 'col' });
  const all = new Set();
  UNITS.forEach((u) => wordsOfUnit(u.id).forEach((w) => all.add(w.w)));
  const lessons = UNITS.reduce((a, u) => a + u.lessons, 0);

  box.append(el('div', { class: 'card card--soft' },
    el('div', { class: 'card__title', text: 'Tudo o que o Gabi ensina' }),
    el('div', { class: 'small muted mt', text: `${all.size} palavras diferentes · ${lessons} lições · ${TEXTS.length} histórias · ${UNITS.length} fases · 8 tipos de exercício` }),
    el('div', { class: 'tiny muted mt', text: 'Toque em uma palavra para ouvir. Use isso para conversar sobre o que ela está aprendendo.' })));

  UNITS.forEach((u) => {
    const ws = wordsOfUnit(u.id);
    const card = el('div', { class: 'card' });
    const head = el('div', { class: 'content-unit__head' });
    head.append(el('div', { class: 'content-unit__ico', text: u.emoji }));
    const mid = el('div', { class: 'grow' });
    mid.append(el('div', { class: 'strong', text: `${u.n}. ${u.titulo}` }));
    mid.append(el('div', { class: 'tiny muted', text: u.sub }));
    head.append(mid);
    head.append(el('div', { class: 'content-unit__nums', text: `${u.lessons} lições · ${ws.length} palavras` }));
    card.append(head);

    const row = el('div', { class: 'content-words' });
    if (ws.length) {
      ws.slice(0, 24).forEach((w) => row.append(el('button', {
        class: 'chip', type: 'button', 'on:click': () => speak(w.w),
      }, `${w.e} ${w.w}`)));
      if (ws.length > 24) row.append(el('span', { class: 'chip', text: `+${ws.length - 24}` }));
    } else {
      TEXTS.forEach((t, i) => row.append(el('button', {
        class: 'chip', type: 'button', 'on:click': () => { location.hash = `#/licao/u9/${i}`; },
      }, `${t.emoji} ${t.titulo}`)));
    }
    card.append(row);
    box.append(card);
  });
  return box;
}

/* ------------------------------- RESUMO ------------------------------- */
function summaryTab() {
  const box = el('div', { class: 'col' });

  const minsToday = store.todayMinutes();
  const totalMin = Math.round(Object.values(store.state.days).reduce((a, d) => a + (d.sec || 0), 0) / 60);
  const totalEx = Object.values(store.state.days).reduce((a, d) => a + (d.ex || 0), 0);
  const totalOk = Object.values(store.state.days).reduce((a, d) => a + (d.ok || 0), 0);
  const acc = totalEx ? Math.round((totalOk / totalEx) * 100) : 0;

  const metrics = el('div', { class: 'metrics' });
  [
    [`${minsToday} min`, 'hoje'],
    [`${store.state.progress.streak.days || 0}`, 'dias seguidos'],
    [`${totalMin} min`, 'no total'],
    [`${acc}%`, 'acertos'],
  ].forEach(([v, k]) => metrics.append(el('div', { class: 'metric' }, el('div', { class: 'metric__v', text: v }), el('div', { class: 'metric__k', text: k }))));
  box.append(el('div', { class: 'section-title', text: 'Visão geral' }), metrics);

  const rd = store.state.reading || { alone: 0, helped: 0, syllables: 0 };
  box.append(el('div', { class: 'card card--soft' },
    el('div', { class: 'card__title', text: 'Leitura em voz alta' }),
    el('div', { class: 'small mt', text: `${rd.alone} palavras lidas sozinha · ${rd.helped} com ajuda · ${rd.syllables} sílabas treinadas no modo guiado.` }),
    el('div', { class: 'tiny muted mt', text: 'Se “com ajuda” crescer muito e “sozinha” ficar parada, vale usar o Modo livro e reduzir a quantidade de texto por dia.' })));

  // gráfico de minutos
  const days = store.daysSummary(14);
  const maxMin = Math.max(10, ...days.map((d) => d.min));
  const chart = el('div', { class: 'chart' });
  days.forEach((d) => {
    const col = el('div', { class: 'chart__col' });
    const bar = el('div', { class: `chart__bar ${d.min ? '' : 'chart__bar--empty'}`, title: `${d.min} min em ${d.key}` });
    bar.style.height = `${Math.max(3, (d.min / maxMin) * 100)}%`;
    col.append(bar, el('div', { class: 'chart__label', text: d.key.slice(8) }));
    chart.append(col);
  });
  box.append(el('div', { class: 'card' },
    el('div', { class: 'card__title', text: 'Minutos por dia (últimos 14)' }),
    chart,
    el('div', { class: 'small muted', text: 'Referência: 10 a 15 minutos por dia, todos os dias, rendem mais que sessões longas e espaçadas.' })));

  // habilidades
  const rows = el('div', {});
  const table = el('table', { class: 'tbl' });
  table.innerHTML = '<thead><tr><th>Habilidade</th><th>Acertos</th><th>Situação</th></tr></thead>';
  const tbody = el('tbody');
  Object.entries(SKILL_LABEL).forEach(([key, label]) => {
    const sk = store.state.skills[key] || { ok: 0, n: 0 };
    const rate = sk.n ? sk.ok / sk.n : 0;
    const tag = !sk.n ? '<span class="tag tag--new">a começar</span>'
      : rate >= 0.8 ? '<span class="tag tag--ok">consolidando</span>'
        : rate >= 0.55 ? '<span class="tag tag--wip">em treino</span>'
          : '<span class="tag tag--new">precisa de apoio</span>';
    tbody.append(el('tr', { html: `<td>${label}</td><td>${sk.ok}/${sk.n} (${Math.round(rate * 100)}%)</td><td>${tag}</td>` }));
  });
  table.append(tbody);
  rows.append(table);
  box.append(el('div', { class: 'card' }, el('div', { class: 'card__title', text: 'Habilidades' }), el('div', { class: 'mt', html: rows.innerHTML })));

  // palavras difíceis
  const weak = store.weakWords(12);
  const weakCard = el('div', { class: 'card' });
  weakCard.append(el('div', { class: 'card__title', text: 'Palavras que precisam de carinho' }));
  if (!weak.length) {
    weakCard.append(el('div', { class: 'small muted mt', text: 'Nenhum erro registrado ainda. As palavras difíceis aparecem aqui automaticamente.' }));
  } else {
    const chips = el('div', { class: 'chips mt' });
    weak.forEach((w) => {
      chips.append(el('button', {
        class: 'chip chip--bad', 'on:click': () => speak(w.word),
      }, `${w.word} (${w.errors}×)`));
    });
    weakCard.append(chips);
    weakCard.append(el('div', { class: 'tiny muted mt', text: 'Toque para ouvir a palavra. Elas voltam automaticamente nas revisões (1, 3, 7, 16 e 35 dias).' }));
  }
  box.append(weakCard);

  // unidades
  const unitsCard = el('div', { class: 'card' });
  unitsCard.append(el('div', { class: 'card__title', text: 'Unidades' }));
  UNITS.forEach((u) => {
    const p = store.unitProgress(u.id, u);
    const row = el('div', { class: 'row', style: { padding: '8px 0', borderBottom: '1px solid #faf2e8' } });
    row.append(el('div', { style: { width: '30px' }, text: u.emoji }));
    const mid = el('div', { class: 'grow' });
    mid.append(el('div', { class: 'small strong', text: `${u.n}. ${u.titulo}` }));
    const bar = el('div', { class: 'unitbar' });
    bar.append(el('i', { style: { width: `${p.mastery}%` } }));
    mid.append(bar);
    row.append(mid);
    row.append(el('div', { class: 'tiny muted', text: `${p.mastery}%` }));
    unitsCard.append(row);
  });
  box.append(unitsCard);

  box.append(el('div', { class: 'card card--soft' },
    el('div', { class: 'card__title', text: 'Como ajudar em casa' }),
    el('ul', { class: 'small', style: { margin: '8px 0 0 18px', padding: '0', lineHeight: '1.7' } },
      el('li', { text: 'Sente junto, sem pressa. 10 minutos bastam.' }),
      el('li', { text: 'Peça para ela ler em voz alta e elogie o esforço, não só o acerto.' }),
      el('li', { text: 'Quando errar, diga “vamos olhar juntos” em vez de “está errado”.' }),
      el('li', { text: 'Leia para ela todos os dias — ouvir histórias aumenta vocabulário.' }),
      el('li', { text: 'Evite comparar com irmãos ou colegas. Compare com ela mesma de ontem.' }))));

  if (store.state.progress.streak.days >= 4 && (store.state.skills.leitura?.ok || 0) < 3) {
    box.append(el('div', { class: 'card card--warn' },
      el('div', { class: 'strong', text: 'Sinal de atenção' }),
      el('div', { class: 'small', text: 'A leitura em voz alta ainda tem poucos acertos. Se em 4 a 6 semanas de prática regular o progresso continuar parado, vale conversar com a escola e buscar avaliação fonoaudiológica. Isso não é diagnóstico — é cuidado.' })));
  }

  const actions = el('div', { class: 'row row--wrap', style: { gap: '10px' } });
  actions.append(el('button', { class: 'btn btn--soft', 'on:click': () => { location.hash = '#/diag'; } }, '🎯 Refazer diagnóstico'));
  actions.append(el('button', { class: 'btn btn--soft', 'on:click': testMic }, '🎤 Testar microfone'));
  actions.append(el('button', { class: 'btn btn--soft', 'on:click': () => speak('Oi! Eu sou a Gabi. Vamos ler juntos?') }, '🔊 Testar voz'));
  box.append(actions);
  return box;
}

function testMic() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  root.classList.add('open');
  const out = el('div', { class: 'small muted', text: 'Toque em começar e fale algo.' });
  const card = el('div', { class: 'modal__card' },
    el('div', { class: 'modal__title', text: 'Teste do microfone' }),
    el('div', { class: 'small muted', text: asrSupported ? 'A escuta usa internet e o serviço de fala do Google.' : 'Este navegador não suporta escuta de voz.' }),
    out,
    el('div', { class: 'modal__actions' },
      el('button', { class: 'btn btn--soft', 'on:click': () => { root.classList.remove('open'); root.innerHTML = ''; } }, 'Fechar')));
  root.append(el('div', { class: 'modal' }, card));
  (async () => {
    const ok = await requestMic();
    if (!ok) { out.textContent = 'Permissão negada. Verifique o cadeado na barra de endereço.'; return; }
    out.textContent = 'Ouvindo… fale algo.';
    const res = await listen({ onPartial: (t) => { out.textContent = `“${t}”`; } });
    out.textContent = res.ok ? `Funcionou! Ouvi: “${res.transcript}”` : asrErrorMessage(res.error);
  })();
}

/* ------------------------------- AJUSTES ------------------------------- */
function settingsTab() {
  const box = el('div', { class: 'col' });
  const st = store.state.settings;

  const childCard = el('div', { class: 'card' });
  childCard.append(el('div', { class: 'card__title', text: 'Criança' }));
  const nameInput = el('input', { class: 'input', value: store.state.child.name || '', maxlength: '20' });
  childCard.append(el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Nome' }), nameInput));
  childCard.append(el('button', {
    class: 'btn btn--soft btn--sm',
    'on:click': () => { store.state.child.name = nameInput.value.trim(); store.save(true); toast('Nome salvo', 'ok'); },
  }, 'Salvar nome'));
  box.append(childCard);

  const voiceCard = el('div', { class: 'card' });
  voiceCard.append(el('div', { class: 'card__title', text: 'Voz da Gabi' }));
  voiceCard.append(el('div', { class: 'small muted', text: ttsSupported() ? 'Vozes em português do Brasil encontradas no aparelho:' : 'Sem síntese de voz neste navegador.' }));
  const sel = el('select', { class: 'select', style: { marginTop: '8px' } });
  const voices = listVoices();
  if (st.voiceURI && !voices.some((v) => v.voiceURI === st.voiceURI)) store.setSetting('voiceURI', '');
  voices.forEach((v) => {
    const o = el('option', { value: v.voiceURI }, `${v.name} (${v.lang})`);
    if (st.voiceURI === v.voiceURI || (!st.voiceURI && pickVoice()?.voiceURI === v.voiceURI)) o.selected = true;
    sel.append(o);
  });
  if (!voices.length) sel.append(el('option', { value: '' }, 'Voz padrão do tablet (sem voz feminina pt-BR instalada)'));
  sel.addEventListener('change', () => { store.setSetting('voiceURI', sel.value); speak('Agora eu falo assim. Vamos ler juntos!'); });
  voiceCard.append(sel);
  voiceCard.append(el('button', {
    class: 'btn btn--teal btn--sm', style: { marginTop: '10px' },
    'on:click': () => { location.hash = '#/vozes'; },
  }, '🎧 Comparar vozes do Brasil'));

  const rateLabel = el('label', { text: `Velocidade da fala (${Math.round((st.rate ?? 0.9) * 100)}%)` });
  const rate = el('input', { class: 'input', type: 'range', min: '0.6', max: '1.2', step: '0.05', value: String(st.rate), style: { marginTop: '10px' } });
  rate.addEventListener('input', () => {
    const val = Number(rate.value);
    rateLabel.textContent = `Velocidade da fala (${Math.round(val * 100)}%)`;
    store.setSetting('rate', val);
  });
  rate.addEventListener('change', () => {
    const val = Number(rate.value);
    store.setSetting('rate', val);
    speak('Vamos ler juntos.');
  });
  voiceCard.append(el('div', { class: 'field', style: { marginTop: '8px' } }, rateLabel, rate));
  voiceCard.append(el('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap' } },
    el('button', { class: 'btn btn--soft btn--sm', 'on:click': () => speak('Vamos ler juntos.') }, '🔊 Ouvir voz da Gabi (ElevenLabs)'),
    el('button', { class: 'btn btn--ghost btn--sm', 'on:click': () => speak('O rato roeu a roupa do rei de Roma.') }, '🔊 Ouvir frase longa')));
  box.append(voiceCard);

  const a11y = el('div', { class: 'card' });
  a11y.append(el('div', { class: 'card__title', text: 'Leitura e acessibilidade' }));
  const scale = el('input', { class: 'input', type: 'range', min: '0.9', max: '1.35', step: '0.05', value: String(st.readScale) });
  scale.addEventListener('input', () => {
    store.setSetting('readScale', Number(scale.value));
    document.documentElement.style.setProperty('--read-scale', String(scale.value));
  });
  a11y.append(el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Tamanho do texto' }), scale));
  a11y.append(toggleRow('Menos animações', 'Deixa o app mais calmo.', st.reduceMotion, (v) => store.setSetting('reduceMotion', v)));
  a11y.append(toggleRow('Sons', 'Efeitos de acerto e toque.', st.sound !== false, (v) => store.setSetting('sound', v)));
  a11y.append(toggleRow('Modo livre', 'Libera todas as unidades e histórias.', st.freeMode, (v) => store.setSetting('freeMode', v)));
  box.append(a11y);

  const routine = el('div', { class: 'card' });
  routine.append(el('div', { class: 'card__title', text: 'Rotina' }));
  const target = el('select', { class: 'select' });
  [5, 10, 15, 20].forEach((m) => {
    const o = el('option', { value: String(m) }, `${m} minutos por dia`);
    if (st.sessionTarget === m) o.selected = true;
    target.append(o);
  });
  target.addEventListener('change', () => store.setSetting('sessionTarget', Number(target.value)));
  routine.append(el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Meta diária' }), target));
  const pinInput = el('input', { class: 'input', inputmode: 'numeric', maxlength: '4', placeholder: st.pin ? '••••' : 'sem PIN' });
  routine.append(el('div', { class: 'field', style: { marginTop: '8px' } }, el('label', { text: 'PIN dos pais (4 números)' }), pinInput));
  const pinRow = el('div', { class: 'row', style: { gap: '8px' } });
  pinRow.append(el('button', {
    class: 'btn btn--soft btn--sm',
    'on:click': () => {
      const v = pinInput.value.replace(/\D/g, '');
      if (v && v.length !== 4) { toast('O PIN precisa ter 4 números.'); return; }
      store.setSetting('pin', v);
      toast(v ? 'PIN ativado' : 'PIN removido', 'ok');
    },
  }, 'Salvar PIN'));
  pinRow.append(el('button', {
    class: 'btn btn--ghost btn--sm',
    'on:click': () => { store.setSetting('pin', ''); pinInput.value = ''; toast('PIN removido', 'ok'); },
  }, 'Remover'));
  routine.append(pinRow);
  box.append(routine);

  box.append(llmCard());
  box.append(aboutCard());
  return box;
}

function aboutCard() {
  const card = el('div', { class: 'card' });
  card.append(el('div', { class: 'card__title', text: 'Sobre e direitos' }));
  card.append(el('div', { class: 'small', text: 'Professor Gabi — leitura e escrita com carinho.' }));
  card.append(el('div', { class: 'small muted mt', text: `Idealizador e criador: ${APP_AUTHOR}.` }));
  card.append(el('div', { class: 'tiny muted mt', text: APP_COPYRIGHT }));
  return card;
}

function toggleRow(title, hint, checked, onChange) {
  const row = el('div', { class: 'switch' });
  const txt = el('div', { class: 'switch__txt' }, el('div', { class: 'strong', text: title }), el('div', { class: 'switch__hint', text: hint }));
  const t = el('button', { class: 'toggle', role: 'switch', 'aria-checked': checked ? 'true' : 'false', 'aria-label': title });
  t.addEventListener('click', () => {
    const next = t.getAttribute('aria-checked') !== 'true';
    t.setAttribute('aria-checked', next ? 'true' : 'false');
    onChange(next);
  });
  row.append(txt, t);
  return row;
}

function llmCard() {
  const l = store.state.settings.llm || {};
  const card = el('div', { class: 'card' });
  card.append(el('div', { class: 'card__title', text: 'Conversa livre com IA (opcional)' }));
  card.append(el('div', { class: 'small muted', text: 'Sem chave, a Gabi conversa com um roteiro pronto (funciona offline). Com chave de um provedor compatível com OpenAI, ela conversa de forma mais livre — e aí o áudio/texto sai do aparelho.' }));
  let enabled = !!l.enabled;
  card.append(toggleRow('Ativar conversa com IA', 'Requer internet e chave de API.', enabled, (v) => { enabled = v; store.setSetting('llm.enabled', v); }));

  const url = el('input', { class: 'input', value: l.baseUrl || 'https://api.deepseek.com/v1', placeholder: 'https://api.deepseek.com/v1' });
  const model = el('input', { class: 'input', value: l.model || 'deepseek-chat', placeholder: 'deepseek-chat' });
  const key = el('input', { class: 'input', type: 'password', value: l.key || '', placeholder: 'sk-...' });
  card.append(el('div', { class: 'field', style: { marginTop: '10px' } }, el('label', { text: 'Endereço (compatível com OpenAI)' }), url));
  card.append(el('div', { class: 'field' }, el('label', { text: 'Modelo' }), model));
  card.append(el('div', { class: 'field' }, el('label', { text: 'Chave de API (fica só neste tablet)' }), key));
  const row = el('div', { class: 'row', style: { gap: '8px' } });
  row.append(el('button', {
    class: 'btn btn--soft btn--sm',
    'on:click': () => {
      store.setSetting('llm.baseUrl', url.value.trim() || 'https://api.deepseek.com/v1');
      store.setSetting('llm.model', model.value.trim() || 'deepseek-chat');
      store.setSetting('llm.key', key.value.trim());
      store.setSetting('llm.enabled', enabled);
      toast('Configuração salva', 'ok');
    },
  }, 'Salvar'));
  row.append(el('button', {
    class: 'btn btn--ghost btn--sm',
    'on:click': () => { store.setSetting('llm.enabled', false); toast('Conversa com IA desativada', 'ok'); },
  }, 'Desativar'));
  card.append(row);
  return card;
}

/* ------------------------------- BACKUP ------------------------------- */
function backupTab() {
  const box = el('div', { class: 'col' });
  const info = el('div', { class: 'card' });
  const totalEx = Object.values(store.state.days).reduce((a, d) => a + (d.ex || 0), 0);
  info.append(el('div', { class: 'card__title', text: 'Onde ficam os dados' }));
  info.append(el('div', { class: 'small muted mt', text: `Tudo fica salvo apenas neste tablet (${totalEx} exercícios, ${store.state.stickers.length} adesivos). Não há conta, anúncios ou envio de progresso para servidores.` }));
  info.append(el('div', { class: 'small muted mt', text: 'O microfone é usado apenas durante os exercícios de leitura. O áudio vai para o serviço de fala do Google para virar texto e não é armazenado por este app.' }));
  box.append(info);

  box.append(el('div', { class: 'card' },
    el('div', { class: 'card__title', text: 'Backup do progresso' }),
    el('div', { class: 'small muted mt', text: 'Faça um backup de vez em quando: se o tablet for limpo ou o endereço mudar, o progresso pode se perder.' }),
    el('div', { class: 'row row--wrap', style: { gap: '10px', marginTop: '12px' } },
      el('button', {
        class: 'btn btn--soft',
        'on:click': () => {
          download(`gabi-backup-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON());
          toast('Backup baixado', 'ok');
        },
      }, '⬇️ Exportar backup'),
      el('button', { class: 'btn btn--soft', 'on:click': importBackup }, '⬆️ Importar backup'))));

  box.append(diagnosticsCard());

  const offlineBtn = el('button', { class: 'btn btn--soft' }, '⬇️ Baixar todo o áudio para uso offline');
  offlineBtn.addEventListener('click', () => downloadAudio(offlineBtn));
  box.append(el('div', { class: 'card' },
    el('div', { class: 'card__title', text: 'Áudio offline' }),
    el('div', { class: 'small muted mt', text: 'O app já guarda o áudio que você ouve. Este botão baixa todas as faixas de uma vez para funcionar sem internet em qualquer tela.' }),
    el('div', { class: 'mt' }, offlineBtn)));

  box.append(el('div', { class: 'card card--warn' },
    el('div', { class: 'card__title', text: 'Apagar' }),
    el('div', { class: 'senior small muted mt', text: 'Use com cuidado: não tem como desfazer.' }),
    el('div', { class: 'row row--wrap', style: { gap: '10px', marginTop: '10px' } },
      el('button', {
        class: 'btn btn--danger',
        'on:click': async () => {
          const ok = await modal({
            title: 'Apagar só o progresso?',
            body: '<p>As lições, estrelas, adesivos e revisões serão apagados. Nome e ajustes ficam.</p>',
            actions: [{ label: 'Cancelar', value: false }, { label: 'Apagar', value: true, danger: true }],
          });
          if (ok) { store.resetProgress(); toast('Progresso apagado', 'ok'); paint(); }
        },
      }, 'Apagar progresso'),
      el('button', {
        class: 'btn btn--danger',
        'on:click': async () => {
          const ok = await modal({
            title: 'Apagar tudo?',
            body: '<p>Todos os dados, inclusive nome e ajustes, serão removidos deste tablet.</p>',
            actions: [{ label: 'Cancelar', value: false }, { label: 'Apagar tudo', value: true, danger: true }],
          });
          if (ok) { store.resetAll(); location.hash = '#/'; location.reload(); }
        },
      }, 'Apagar tudo'))));

  box.append(el('div', { class: 'card' },
    el('div', { class: 'card__title', text: 'Privacidade (LGPD)' }),
    el('div', { class: 'small muted mt', text: 'Não coletamos dados pessoais, não usamos anúncios e não compartilhamos informações com terceiros. O nome da criança fica apenas neste aparelho. O reconhecimento de fala é feito pelo navegador (Google) e pode exigir internet. Este app não substitui avaliação de profissionais de saúde ou educação.' })));
  return box;
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        store.importJSON(String(fr.result));
        toast('Backup restaurado', 'ok');
        location.reload();
      } catch (e) {
        toast('Arquivo inválido: ' + e.message);
      }
    };
    fr.readAsText(f);
  });
  input.click();
}

/** Cartão de diagnóstico: versão, vozes e estado do áudio offline (útil no tablet). */
function diagnosticsCard() {
  const card = el('div', { class: 'card' });
  card.append(el('div', { class: 'card__title', text: 'Diagnóstico do tablet' }));
  const info = el('div', { class: 'small muted', style: { marginTop: '6px', lineHeight: '1.7' } });
  const paint = () => {
    const d = audioDiagnostics();
    info.innerHTML = '';
    info.append(
      el('div', { text: `Versão do app: ${APP_VERSION}` }),
      el('div', { text: `Vozes no tablet: ${d.voices} (português: ${d.ptVoices})${d.voice ? ` · usando “${d.voice}”` : ''}` }),
      el('div', { text: `Áudio Opus (ElevenLabs): ${d.opusSupported ? 'suportado' : 'não suportado'}` }),
      el('div', { text: `Clipes tocados: ${d.clips.opusOk} Opus · ${d.clips.mp3Ok} MP3 · ${d.clips.noClip} sem clipe` }),
      el('div', { text: `Falas por TTS: ${d.clips.ttsOk} ok · ${d.clips.ttsFail} falha(s)` }),
    );
    if (d.clips.last) {
      const l = d.clips.last;
      info.append(el('div', { class: 'tiny muted', text: `Último áudio: ${l.kind || '?'} ${l.ok ? 'ok' : (l.why || 'erro')} · ${new Date(l.at).toLocaleTimeString('pt-BR')}` }));
    }
    if (d.lastSpeechError) info.append(el('div', { class: 'tiny muted', text: `Último erro de voz: ${d.lastSpeechError}` }));
  };
  paint();
  const status = el('div', { class: 'small', style: { marginTop: '6px' } });
  const btn = el('button', {
    class: 'btn btn--soft btn--sm', style: { marginTop: '10px' },
    'on:click': () => checkAudioOffline(btn, status),
  }, '🎧 Verificar áudio offline');
  card.append(info, btn, status);
  return card;
}

async function checkAudioOffline(btn, status) {
  if (!('serviceWorker' in navigator)) { status.textContent = 'Service worker indisponível neste navegador.'; return; }
  btn.disabled = true;
  status.textContent = 'Conferindo…';
  try {
    const reg = await navigator.serviceWorker.ready;
    const sw = navigator.serviceWorker.controller || reg.active;
    if (!sw) { status.textContent = 'O service worker ainda não assumiu. Feche e abra o app.'; return; }
    const reply = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('sem resposta')), 5000);
      const channel = new MessageChannel();
      channel.port1.onmessage = (e) => { clearTimeout(timer); resolve(e.data); };
      sw.postMessage({ type: 'gabi-audio-status' }, [channel.port2]);
    });
    if (reply?.ok) status.textContent = `Áudio offline: ${reply.cached}/${reply.total} clipes em cache.`;
    else status.textContent = 'Não consegui consultar o áudio offline.';
  } catch {
    status.textContent = 'Não consegui consultar. Abra o app com internet uma vez e tente de novo.';
  } finally {
    btn.disabled = false;
  }
}

/** Baixa todas as faixas de áudio para o cache do service worker (uso offline). */
async function downloadAudio(btn) {
  const label = btn.textContent;
  btn.disabled = true;
  try {
    let idx = await (await fetch('audio/index.json', { cache: 'no-store' })).json();
    if (opusSupported) {
      try {
        const o = await (await fetch('audio/index-opus.json', { cache: 'no-store' })).json();
        if (o && Object.keys(o).length >= Object.keys(idx).length) idx = o;
      } catch { /* mantém MP3 */ }
    }
    const files = [...new Set(Object.values(idx))];
    const queue = files.slice();
    let done = 0;
    const workers = Array.from({ length: 5 }, async () => {
      while (queue.length) {
        const f = queue.shift();
        try { await fetch(f, { cache: 'force-cache' }); } catch { /* segue */ }
        done++;
        if (done % 25 === 0 || done === files.length) btn.textContent = `Baixando áudio… ${done}/${files.length}`;
      }
    });
    await Promise.all(workers);
    localStorage.setItem('gabi.audio.offline', '1');
    btn.textContent = `✅ ${files.length} faixas disponíveis offline`;
    toast('Áudio salvo para uso offline', 'ok');
  } catch {
    btn.disabled = false;
    btn.textContent = label;
    toast('Não consegui baixar o áudio agora.');
  }
}
