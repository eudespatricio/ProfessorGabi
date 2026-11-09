/* Conversa com a Gabi: modo roteiro (offline) e modo IA (opcional). */
import { el, sleep, pick } from './utils.js';
import * as store from './store.js';
import { speak, stopSpeaking, sfx, unlockAudio } from './audio.js';
import { listen, asrSupported, requestMic, asrErrorMessage } from './speech.js';
import { clearScreen, tabbar, gabiEl, confetti } from './ui.js';
import { childName } from './tutor.js';
import { similarity } from './exercises.js';
import { splitSyllables } from './syllables.js';

const TONGUE_TWISTERS = [
  // bichos
  { themes: ['bichos'], text: 'O rato roeu a roupa do rei de Roma.' },
  { themes: ['bichos'], text: 'Três pratos de trigo para três tigres tristes.' },
  { themes: ['bichos'], text: 'A aranha arranha a jarra; a jarra arranha a aranha.' },
  { themes: ['bichos'], text: 'Sabia que a sabiá sabia assobiar?' },
  { themes: ['bichos'], text: 'Um ninho de mafagafos tem sete mafagafinhos.' },
  // comida
  { themes: ['comida'], text: 'O doce perguntou ao doce qual é o doce mais doce.' },
  { themes: ['comida'], text: 'A pipoca estala na panela quente.' },
  { themes: ['comida', 'casa'], text: 'Pouco pão, pouco pó, pouco pão com pó.' },
  // escola
  { themes: ['escola'], text: 'Luzia lustrava o lustre listrado.' },
  { themes: ['escola'], text: 'O livro do Lipe tem letras lilás.' },
  { themes: ['escola'], text: 'A professora passou a prova; o aluno achou a prova pesada.' },
  { themes: ['brincadeiras'], text: 'Bia brinca de bola com o Beto no quintal.' },
  { themes: ['brincadeiras', 'bichos'], text: 'O pião do Piau girou no chão.' },
  // casa
  { themes: ['casa'], text: 'A casa é sua, mas a sua casa não é a minha.' },
  { themes: ['casa'], text: 'O gato do quintal arranhou o portão.' },
  // tempo
  { themes: ['tempo'], text: 'O tempo perguntou ao tempo quanto tempo o tempo tem.' },
  { themes: ['tempo'], text: 'Se o tempo tem tempo, quanto tempo o tempo tem?' },
  // corpo
  { themes: ['corpo'], text: 'O peito do pé de Pedro é preto.' },
  { themes: ['corpo'], text: 'O dedo do Dudu doeu de tanto dedilhar.' },
  // nomes
  { themes: ['nomes'], text: 'A Rita tem um rato que rói a roupa do rei.' },
  { themes: ['nomes'], text: 'O Mário mora no morro e o morro tem muro.' },
];

const THEMES = [
  {
    id: 'bichos', emoji: '🐾', label: 'Bichos',
    words: ['gato', 'sapo', 'macaco', 'borboleta', 'tigre', 'tatu'],
    questions: ['Qual é o seu bicho favorito?', 'Que bicho você acha mais engraçado?'],
    cheer: 'Adoro bichos!',
  },
  {
    id: 'comida', emoji: '🍎', label: 'Comida',
    words: ['pipoca', 'banana', 'abacaxi', 'bolo', 'tomate', 'cenoura'],
    questions: ['Qual comida você mais gosta?', 'Qual é o seu lanche preferido?'],
    cheer: 'Hmm, comida é um ótimo assunto!',
  },
  {
    id: 'escola', emoji: '🎒', label: 'Escola',
    words: ['lápis', 'caderno', 'mochila', 'régua', 'professora', 'cola'],
    questions: ['O que você mais gosta na escola?', 'Qual é a sua matéria favorita?'],
    cheer: 'Escola rende boas histórias!',
  },
  {
    id: 'brincadeiras', emoji: '🪁', label: 'Brincadeiras',
    words: ['bola', 'pipa', 'boneca', 'carrinho', 'bicicleta', 'peteca'],
    questions: ['Qual brincadeira você mais gosta?', 'Com quem você gosta de brincar?'],
    cheer: 'Brincadeira é comigo mesma!',
  },
  {
    id: 'casa', emoji: '🏠', label: 'Casa',
    words: ['cama', 'janela', 'quintal', 'cozinha', 'sofá', 'porta'],
    questions: ['Qual é o seu lugar preferido da casa?', 'O que você mais gosta de fazer em casa?'],
    cheer: 'Nossa casa tem cada história!',
  },
];

const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

const MOODS = [
  {
    label: 'Bem! 😃',
    replies: [
      'Que bom! Sua energia contagia.',
      'Adoro te ver assim!',
      'Isso me deixa feliz também!',
    ],
    follows: [
      'O que você fez de legal hoje?',
      'Qual foi a melhor parte do seu dia até agora?',
      'Me conta uma coisa boa que aconteceu hoje?',
    ],
  },
  {
    label: 'Mais ou menos 😐',
    replies: [
      'Entendi. Tem dias que são assim.',
      'Tudo bem não estar 100% hoje.',
      'Obrigada por me contar, isso ajuda.',
    ],
    follows: [
      'Quer me contar o que aconteceu?',
      'Tem alguma coisa que deixou seu dia mais ou menos?',
      'O que você queria que fosse diferente hoje?',
    ],
  },
  {
    label: 'Cansada 😴',
    replies: [
      'Tudo bem, descansar também é aprender.',
      'Cansaço pede calma. Vamos devagar.',
      'Sem pressa, viu? A gente vai no seu ritmo.',
    ],
    follows: [
      'O que te deixou cansada hoje?',
      'Me conta uma coisa boa do seu dia?',
      'Quer fazer algo bem leve agora?',
    ],
  },
];

const FAREWELLS = [
  'Adorei conversar com você. Você pode voltar quando quiser!',
  'Foi ótimo te ouvir. Volta logo para conversar de novo!',
  'Que conversa boa! Até a próxima!',
];

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function renderTalk() {
  const s = clearScreen();
  tabbar('home');
  let step = 0;
  let busy = false;
  let alive = true;
  let mood = 0;
  const history = []; // {role:'gabi'|'child', text}
  let theme = null;
  let sylPick = null;
  let sylParts = [];
  let sylN = 3;
  let twisterPool = TONGUE_TWISTERS;
  let queue = [];
  let twister = null;
  let turns = [];

  const onExit = () => {
    alive = false;
    stopSpeaking();
    window.removeEventListener('hashchange', onExit);
  };
  window.addEventListener('hashchange', onExit);

  async function sayAndWait(text, pauseMs = 320) {
    if (!alive) return;
    await speak(text);
    if (!alive) return;
    if (pauseMs > 0) await sleep(pauseMs);
  }

  const twisterIntro = () => {
    const label = THEME_BY_ID[twister.themes[0]]?.label || 'bichos';
    return `Trava-língua de ${label.toLowerCase()}: “${twister.text}” Repita comigo.`;
  };
  function nextTwister() {
    if (!queue.length) {
      const others = twisterPool.filter((t) => t.text !== twister.text);
      queue = shuffle(others.length ? others : TONGUE_TWISTERS.filter((t) => t.text !== twister.text));
    }
    twister = queue.shift() || twister;
  }

  function setupTheme(t) {
    theme = t;
    const themeWords = t.words
      .map((w) => ({ word: w, syl: splitSyllables(w) }))
      .filter((x) => x.syl.length >= 2 && x.syl.length <= 4);
    sylPick = pick(themeWords);
    sylParts = sylPick.syl;
    sylN = sylParts.length;
    const themedPool = TONGUE_TWISTERS.filter((x) => x.themes.includes(t.id));
    twisterPool = themedPool.length ? themedPool : TONGUE_TWISTERS;
    queue = shuffle(twisterPool);
    twister = queue.shift();
    turns = buildTurns();
  }

  const themePill = el('div', { class: 'pill', text: store.state.settings.llm?.enabled ? 'IA' : '🎁 surpresa' });
  const wrap = el('div', { class: 'wrap stack', style: { maxWidth: '760px' } });
  wrap.append(el('div', { class: 'row row--between' },
    el('button', { class: 'btn--back', 'on:click': () => { stopSpeaking(); location.hash = '#/'; } }, '←'),
    el('div', { class: 'topbar__title grow', text: 'Conversar com a Gabi' }),
    themePill));

  const chat = el('div', { class: 'col', style: { gap: '10px' } });
  wrap.append(chat);
  s.append(wrap);

  function bubble(role, text) {
    const row = el('div', { class: 'row', style: { gap: '8px', alignItems: 'flex-end' } });
    if (role === 'gabi') row.append(gabiEl('idle', 'gabi--sm'));
    const b = el('div', { class: `bubble ${role === 'gabi' ? 'bubble--gabi' : 'bubble--child'} grow` });
    if (role === 'gabi') b.append(el('div', { class: 'bubble__name', text: 'Gabi' }));
    b.append(el('div', { text }));
    if (role === 'gabi') {
      const acts = el('div', { class: 'bubble__actions' });
      acts.append(el('button', { class: 'btn btn--sm btn--ghost', 'on:click': () => speak(text) }, '🔊 Ouvir'));
      b.append(acts);
    }
    row.append(b);
    chat.append(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    history.push({ role, text });
  }

  function controls(...nodes) {
    const area = el('div', { class: 'card', style: { marginTop: '6px' } }, ...nodes);
    wrap.append(area);
    return area;
  }

  function clearControls() {
    wrap.querySelectorAll('.card').forEach((c) => c.remove());
  }

  function buildTurns() {
    return [
    {
      id: 'hello',
      say: (n) => pick([
        `Agora me conta${n ? ', ' + n : ''}: como você está hoje?`,
        `Então${n ? ', ' + n : ''}, como você está hoje?`,
        `Bora começar${n ? ', ' + n : ''}! Como você está hoje?`,
      ]),
      options: MOODS.map((m) => m.label),
      reply: (o, i) => { mood = i; return pick(MOODS[i].replies); },
    },
    {
      id: 'follow',
      say: () => pick(MOODS[mood].follows),
      free: true,
    },
    {
      id: 'syllables',
      say: () => `Palavra nova: ${sylPick.word}! Bata palmas e me diga: quantas sílabas tem?`,
      options: ['2 sílabas', '3 sílabas', '4 sílabas'],
      correct: sylN - 2,
      reply: () => `Isso! ${sylPick.word}: ${sylParts.join(' · ')}. ${sylN} sílabas. Você contou muito bem.`,
      wrong: () => `Quase! Escuta: ${sylParts.join(' … ')}. São ${sylN} sílabas.`,
    },
    {
      id: 'echo',
      say: () => twisterIntro(),
      echo: true,
    },
    {
      id: 'free',
      say: () => pick(theme.questions),
      free: true,
    },
    {
      id: 'bye',
      say: (n) => `Adorei conversar com você${n ? ', ' + n : ''}. ${pick(FAREWELLS)}`,
    },
  ];
  }

  function askSurprise() {
    const n = childName();
    const text = pick([
      `Oi${n ? ', ' + n : ''}! Hoje tem surpresa: escolhe uma cartinha para descobrir o assunto do nosso papo!`,
      `Oi${n ? ', ' + n : ''}! Antes de conversar, escolhe uma cartinha surpresa!`,
    ]);
    bubble('gabi', text);
    speak(text);

    const options = shuffle(THEMES).slice(0, 3);
    const row = el('div', { class: 'theme-cards' });
    const cards = options.map((t) => {
      const front = el('span', { class: 'theme-card__face theme-card__front' },
        el('span', { class: 'theme-card__emoji', text: t.emoji }),
        el('b', { text: t.label }));
      const back = el('span', { class: 'theme-card__face theme-card__back', text: '🎁' });
      const inner = el('span', { class: 'theme-card__inner' }, back, front);
      const card = el('button', {
        class: 'theme-card', type: 'button', 'aria-label': 'Abrir cartinha surpresa',
      }, inner);
      card.addEventListener('click', () => revealTheme(t, card, cards));
      return card;
    });
    row.append(...cards);
    controls(el('div', { class: 'section-title', text: 'Escolha uma cartinha' }), row);
  }

  function revealTheme(t, card, cards) {
    if (busy) return;
    busy = true;
    stopSpeaking();
    sfx('tap');
    cards.forEach((c) => { if (c !== card) c.classList.add('theme-card--dim'); });
    card.classList.add('theme-card--picked');
    setTimeout(async () => {
      if (!alive) return;
      sfx('star');
      if (!store.state.settings.reduceMotion) confetti(14);
      clearControls();
      setupTheme(t);
      if (!store.state.settings.llm?.enabled) themePill.textContent = `${t.emoji} ${t.label}`;
      const cheer = `Boa escolha! ${t.cheer}`;
      bubble('gabi', cheer);
      await sayAndWait(cheer, 380);
      if (!alive) return;
      busy = false;
      step = 0;
      await askTurn();
    }, 650);
  }

  async function askTurn() {
    if (!alive) return;
    if (step >= turns.length) { finish(); return; }
    const turn = turns[step];
    const text = turn.say(childName());
    bubble('gabi', text);
    store.addTime(3);

    if (turn.options) {
      const opts = el('div', { class: 'options options--3' });
      turn.options.forEach((o, i) => {
        opts.append(el('button', {
          class: 'option', 'on:click': async () => {
            if (busy || !alive) return;
            busy = true;
            stopSpeaking();
            clearControls();
            bubble('child', o);
            let reply = '';
            if (turn.correct != null) {
              const ok = i === turn.correct;
              sfx(ok ? 'ok' : 'soft');
              reply = ok ? turn.reply() : turn.wrong();
            } else {
              reply = turn.reply(o, i);
            }
            bubble('gabi', reply);
            await sayAndWait(reply, 420);
            if (!alive) return;
            step++;
            busy = false;
            await askTurn();
          },
        }, o));
      });
      const box = controls(el('div', { class: 'section-title', text: 'Sua vez' }), opts);
      requestAnimationFrame(() => box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
      await speak(text);
      return;
    }

    if (turn.echo) {
      await echoTurn(turn, text);
      return;
    }

    if (turn.free) {
      await freeTurn(turn, text);
      return;
    }

    // Turno apenas expositivo (ex.: despedida): aguarda a fala inteira antes de concluir
    await sayAndWait(text, 350);
    if (!alive) return;
    step++;
    await askTurn();
  }

  async function echoTurn(turn, initialSpeech = null) {
    const target = twister.text;
    const title = el('div', { class: 'section-title', text: 'Repita comigo' });
    const mic = el('button', { class: 'mic', 'aria-label': 'Falar' }, '🎤');
    const hint = el('div', { class: 'mic__hint', text: asrSupported ? 'Ouça a frase e toque no microfone para repetir.' : 'Sem microfone: toque em “Pular”.' });
    const row = el('div', { class: 'mic-wrap' },
      ...(asrSupported ? [mic] : []),
      hint,
      el('button', { class: 'btn btn--soft btn--sm', 'on:click': () => { stopSpeaking(); speak(target, { rate: 0.65 }); } }, '🔊 Ouvir de novo'),
      el('button', { class: 'btn btn--soft btn--sm', 'on:click': () => changeTwister(turn) }, '🔁 Trocar'),
      el('button', { class: 'btn btn--ghost btn--sm', 'on:click': () => { stopSpeaking(); clearControls(); step++; askTurn(); } }, 'Pular'));
    controls(title, row);
    if (initialSpeech) speak(initialSpeech);
    if (!asrSupported) return;

    mic.addEventListener('click', async () => {
      if (busy || !alive) return;
      busy = true;
      stopSpeaking();
      hint.textContent = 'Estou ouvindo…';
      await sleep(180);
      const res = await listen({ onPartial: (t) => { hint.textContent = `“${t}”`; } });
      busy = false;
      if (!alive) return;
      if (!res.ok) {
        if (res.error === 'not-allowed' || res.error === 'service-not-allowed') {
          const ok = await requestMic();
          hint.textContent = ok ? 'Agora toque no microfone e repita.' : 'Sem microfone. Use “Pular”.';
          return;
        }
        hint.textContent = asrErrorMessage(res.error);
        return;
      }
      const score = similarity(res.transcript, target);
      const ok = score >= 0.55;
      bubble('child', res.transcript);
      const reply = ok
        ? pick([
          'Isso! Você repetiu direitinho.',
          'Muito bem! Saiu bonito.',
          'Perfeito! Você prestou atenção em cada palavra.',
        ])
        : pick([
          'Quase! Escuta de novo e tenta mais devagar.',
          'Ficou perto! Vamos tentar mais uma vez, bem devagar.',
        ]);
      bubble('gabi', reply);
      if (ok) sfx('ok');
      clearControls();
      const acts = el('div', { class: 'row row--wrap', style: { gap: '10px' } });
      acts.append(el('button', {
        class: 'btn btn--soft',
        'on:click': () => changeTwister(turn),
      }, '🔁 Outro trava-língua'));
      if (ok) {
        acts.append(el('button', {
          class: 'btn btn--primary',
          'on:click': () => { stopSpeaking(); clearControls(); step++; askTurn(); },
        }, 'Continuar ➜'));
      } else {
        acts.append(el('button', {
          class: 'btn btn--primary',
          'on:click': () => { stopSpeaking(); clearControls(); echoTurn(turn); },
        }, '🎤 Tentar de novo'));
      }
      controls(acts);
      await speak(reply);
    });
  }

  function changeTwister(turn) {
    stopSpeaking();
    nextTwister();
    clearControls();
    const intro = twisterIntro();
    bubble('gabi', intro);
    echoTurn(turn, intro);
  }

  async function freeTurn(turn, initialSpeech = null) {
    const mic = el('button', { class: 'mic', 'aria-label': 'Falar' }, '🎤');
    const hint = el('div', { class: 'mic__hint', text: asrSupported ? 'Toque e fale à vontade.' : 'Toque em “Pular” para continuar.' });
    const skip = el('button', { class: 'btn btn--soft btn--sm', 'on:click': () => { stopSpeaking(); clearControls(); step++; askTurn(); } }, 'Pular');
    const row = el('div', { class: 'mic-wrap' }, mic, hint, skip);
    controls(el('div', { class: 'section-title', text: 'Sua vez de falar' }), row);
    if (initialSpeech) speak(initialSpeech);
    if (!asrSupported) return;

    mic.addEventListener('click', async () => {
      if (busy || !alive) return;
      busy = true;
      stopSpeaking();
      hint.textContent = 'Estou ouvindo…';
      await sleep(180);
      const res = await listen({ onPartial: (t) => { hint.textContent = `“${t}”`; } });
      busy = false;
      if (!alive) return;
      if (!res.ok) {
        if (res.error === 'not-allowed' || res.error === 'service-not-allowed') {
          const ok = await requestMic();
          hint.textContent = ok ? 'Agora toque no microfone e fale.' : 'Sem microfone. Toque em “Pular”.';
          return;
        }
        hint.textContent = asrErrorMessage(res.error);
        return;
      }
      bubble('child', res.transcript);
      clearControls();
      const reply = await gabiReply(turn, res.transcript);
      if (!alive) return;
      bubble('gabi', reply);
      step++;
      const next = el('button', { class: 'btn btn--primary btn--block mt', 'on:click': () => { stopSpeaking(); clearControls(); askTurn(); } }, 'Continuar ➜');
      controls(next);
      await speak(reply);
    });
  }

  async function gabiReply(turn, childText) {
    const llm = store.state.settings.llm;
    if (llm?.enabled && llm.key) {
      try {
        const reply = await callLLM(childText);
        if (reply) return reply;
      } catch (e) {
        console.warn('LLM falhou', e);
      }
    }
    // resposta por roteiro: recast + elogio específico
    const clean = childText.replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter((w) => w.length > 2).slice(0, 2);
    if (!words.length) return 'Que legal! Eu gosto de conversar com você.';
    const focus = words[words.length - 1].replace(/[.,!?]/g, '');
    return pick([
      `Que legal! Você gosta de ${clean}? Eu também gosto de aprender coisas novas.`,
      `Adorei saber! ${clean[0].toUpperCase() + clean.slice(1)}. Agora me conta: você faz isso com quem?`,
      `Entendi! Você falou “${focus}”. Essa palavra começa com o som de ${focus[0].toUpperCase()}. Muito bem!`,
    ]);
  }

  function finish() {
    if (!alive) return;
    const end = el('div', { class: 'card card--soft center' },
      el('div', { class: 'emoji-big', text: '🌟' }),
      el('div', { class: 'strong', text: 'Foi ótimo conversar com você!' }),
      el('div', { class: 'small muted', text: 'Falar e ouvir também é treinar leitura.' }));
    wrap.append(end);
    wrap.append(el('div', { class: 'row', style: { gap: '10px' } },
      el('button', { class: 'btn btn--primary grow', 'on:click': () => { onExit(); location.hash = '#/'; } }, 'Voltar ao início'),
      el('button', { class: 'btn btn--soft grow', 'on:click': () => { onExit(); renderTalk(); } }, 'Conversar de novo')));
  }

  async function callLLM(childText) {
    const l = store.state.settings.llm;
    const base = (l.baseUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const sys = `Você é Gabi, uma coruja professora que ajuda uma criança brasileira de 8 anos com dificuldade de leitura e escrita.
Regras rígidas:
- Fale em português do Brasil, com frases curtas (máximo 2 frases, 40 palavras).
- Seja calorosa, engraçada e paciente. Nunca diga que a criança errou; reformule com carinho ("quase!", "vamos junto").
- Faça sempre uma pergunta simples no final para manter a conversa.
- Quando aparecer uma palavra interessante, separe em sílabas oralmente (ex.: bo-la) e convide a criança a repetir.
- Nunca dê conselhos médicos, nunca fale de violência, política, religião ou temas adultos. Se a criança tocar nesses assuntos, diga gentilmente que vocês podem falar de outra coisa e proponha uma palavra para ler.
- Use no máximo 1 emoji. Não use markdown.`;
    const messages = [
      { role: 'system', content: sys },
      ...history.slice(-6).map((h) => ({ role: h.role === 'gabi' ? 'assistant' : 'user', content: h.text })),
      { role: 'user', content: childText },
    ];
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${l.key}` },
      body: JSON.stringify({ model: l.model || 'deepseek-chat', messages, temperature: 0.7, max_tokens: 120 }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    return text ? text.slice(0, 300) : null;
  }

  unlockAudio();
  askSurprise();
}
