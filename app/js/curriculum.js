/* Currículo: escopo-sequência do português + geração determinística de lições. */
import { wordsOfUnit, wordInfo, TEXTS, TEXT_BY_ID, RIMAS, FRASES, PARLENDAS, SIGHT } from './content.js';
import { EXTRA_UNITS } from './content-units.js';
import { splitSyllables, countSyllables, firstSyllable, rhymeKey, lastSyllable } from './syllables.js';
import { shuffle, pick, rng, sample, unique, stripAccents, norm } from './utils.js';

export const TYPE_SKILL = {
  'count-syllables': 'consciencia',
  'rhyme': 'consciencia',
  'same-initial': 'consciencia',
  'blend': 'consciencia',
  'initial-syllable': 'silabas',
  'build-word': 'escrita',
  'missing-syllable': 'escrita',
  'dictation': 'escrita',
  'read-word': 'leitura',
  'read-phrase': 'leitura',
  'read-text': 'leitura',
  'm-pb': 'ortografia',
  'comprehension': 'compreensao',
};

export const SKILL_LABEL = {
  consciencia: 'Sons e sílabas',
  silabas: 'Leitura de sílabas',
  escrita: 'Montar e escrever',
  leitura: 'Leitura em voz alta',
  ortografia: 'Ortografia (M/N)',
  compreensao: 'Compreensão',
};

/** Unidades do escopo-sequência. */
export const UNITS = [
  {
    id: 'u1', n: 1, titulo: 'Brincar com os sons', sub: 'Sílabas, rimas e sons', emoji: '👏',
    cor: '#7c6cf0', lessons: 3, skills: ['consciencia'],
    teach: {
      titulo: 'Os pedacinhos das palavras',
      fala: 'Vamos brincar com os sons! Toda palavra é feita de pedacinhos chamados sílabas. Escuta: bo… la. Duas sílabas! Bata palmas comigo: bo! la!',
      dica: 'Sílabas são os pedacinhos da palavra.',
    },
  },
  {
    id: 'u2', n: 2, titulo: 'P, B, M, T, D, N', sub: 'Primeiras sílabas e palavras', emoji: '🅰️',
    cor: '#e85d3d', lessons: 4, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Juntando as letras',
      fala: 'Quando a letra P encontra a letra A, nasce o som pa. P de pato! E B com A faz ba, de bola. Junte os pedacinhos e descubra a palavra.',
      dica: 'p + a = pa   ·   b + a = ba   ·   m + a = ma',
    },
  },
  {
    id: 'u3', n: 3, titulo: 'F, V, L, R, S', sub: 'Mais letras, mais palavras', emoji: '🦁',
    cor: '#f5a623', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Novas letras, novos sons',
      fala: 'Agora vamos conhecer F, V, L, R e S. F de fada, V de vaca, L de lua, R de rato e S de sapo. Escuta o começo de cada palavra.',
      dica: 'F de fada · V de vaca · L de lua · R de rato · S de sapo',
    },
  },
  {
    id: 'u4', n: 4, titulo: 'C, G, J, X, Z', sub: 'E também QU e GU', emoji: '🐊',
    cor: '#2bb3a3', lessons: 4, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Letras que mudam de som',
      fala: 'O C tem dois sons: ca, co, cu têm som forte; ce, ci têm som de S. O G também: ga, go, gu têm som forte; ge, gi têm som de J. E o QU é sempre quê: que, qui.',
      dica: 'CA-CO-CU × CE-CI   ·   GA-GO-GU × GE-GI   ·   QUE-QUI',
    },
  },
  {
    id: 'u5', n: 5, titulo: 'CH, LH, NH, RR, SS', sub: 'Dígrafos: duas letras, um som', emoji: '🌈',
    cor: '#7c6cf0', lessons: 4, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Duas letras, um som só',
      fala: 'Algumas letras trabalham em dupla! CH de chuva, LH de milho, NH de banho. E o RR e o SS fazem o som forte e o som do s. Duas letras, um som só.',
      dica: 'CH chuva · LH milho · NH banho · RR carro · SS pássaro',
    },
  },
  {
    id: 'u6', n: 6, titulo: 'M antes de P e B', sub: 'Sons nasais e a regra do M', emoji: '🕵️',
    cor: '#e85d3d', lessons: 5, skills: ['ortografia', 'escrita', 'leitura'],
    teach: {
      titulo: 'A regra do M e do N',
      fala: 'Presta atenção nesta regra: antes de P e de B, a gente escreve M. Antes das outras letras, a gente escreve N. E no fim da palavra, quase sempre M. Vamos treinar!',
      dica: 'M antes de P e B  ·  N antes das outras  ·  M no fim',
    },
  },
  {
    id: 'u7', n: 7, titulo: 'BR, PR, TR, FL...', sub: 'Encontros consonantais', emoji: '🚀',
    cor: '#2f80ed', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Duas consoantes juntas',
      fala: 'Quando duas consoantes ficam juntinhas, as duas aparecem no som: PR de prato, BR de braço, TR de trator? Não… de três! Escuta: pra-to.',
      dica: 'PR prato · BR braço · TR três · FL flor · CL classe',
    },
  },
  {
    id: 'u8', n: 8, titulo: 'Finais R, L, S, M', sub: 'Palavras compridas', emoji: '🎯',
    cor: '#7c6cf0', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'O fim das palavras',
      fala: 'No fim de muitas palavras aparece R, L, S ou M. Escuta: mar, sol, lápis, também. Essas letras fecham a última sílaba.',
      dica: 'mar · sol · lápis · também',
    },
  },
  {
    id: 'u9', n: 9, titulo: 'Histórias', sub: 'Ler e entender', emoji: '📖',
    cor: '#0f8d81', lessons: TEXTS.length, skills: ['leitura', 'compreensao'],
    teach: {
      titulo: 'Hora da história',
      fala: 'Agora você vai ler histórias de verdade! Leia devagar, com carinho. Se travar em uma palavra, é só pedir ajuda: eu leio junto com você.',
      dica: 'Ler devagar ajuda a entender melhor.',
    },
  },
];

UNITS.push(...EXTRA_UNITS);
EXTRA_UNITS.forEach((u, i) => { u.n = 9 + i; });
const storiesUnit = UNITS.find((u) => u.id === 'u9');
if (storiesUnit) storiesUnit.n = 9 + EXTRA_UNITS.length;
UNITS.sort((a, b) => a.n - b.n);

export const UNIT_BY_ID = new Map(UNITS.map((u) => [u.id, u]));
export const getUnit = (id) => UNIT_BY_ID.get(id);
export const unitIndexOf = (id) => UNITS.findIndex((u) => u.id === id);

/* ---------- helpers ---------- */

/** Normaliza: o item expõe `correct` como índice; opções perdem a flag. */
function finalize(item) {
  if (!item || !item.options) return item;
  let ci = item.options.findIndex((o) => o.correct);
  if (ci < 0 && typeof item.correct === 'number') ci = item.correct;
  item.correct = ci;
  item.options = item.options.map(({ correct, ...rest }) => rest);
  return item;
}

function makeChoice({ id, type, word, prompt, say, opts, layout, big, explain, extra = {} }) {
  const shuffled = shuffle(opts.map((o, i) => ({ ...o, correct: i === 0 })));
  const correct = shuffled.findIndex((o) => o.correct);
  return {
    kind: 'ex', type, id, word, skill: TYPE_SKILL[type],
    prompt, say, options: shuffled, correct, layout: layout || (shuffled.length === 2 ? '2' : '3'),
    big: !!big, explain, ...extra,
  };
}

function firstSyllables(pool) {
  return unique(pool.map((p) => firstSyllable(p.w)).filter(Boolean));
}

/** Escolhe distratores de sílaba parecidos com o alvo (mesma letra inicial, tamanho). */
function syllableDistractors(pool, correct, n, rand, { sameInitial = false } = {}) {
  const cands = unique(firstSyllables(pool).filter((s) => stripAccents(s) !== stripAccents(correct)));
  const scored = shuffle(cands, rand).map((s) => {
    let score = 0;
    if (s[0] === correct[0]) score += sameInitial ? 3 : 1;
    if (s.length === correct.length) score += 1;
    return { s, score: score + rand() * 0.6 };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((x) => x.s);
}

function wordOptions(pool, correctWord, n, rand, filterFn) {
  const cands = shuffle(pool.filter((p) => p.w !== correctWord && (!filterFn || filterFn(p))), rand);
  return cands.slice(0, n).map((p) => p.w);
}

/* ---------- construtores de exercício ---------- */

function exCountSyllables(word, rand, pool) {
  const syl = splitSyllables(word);
  const n = syl.length;
  const maxN = Math.max(3, n + 1);
  const nums = Array.from({ length: maxN }, (_, i) => i + 1);
  const distract = sample(nums.filter((x) => x !== n), Math.min(2, maxN - 1), rand);
  const opts = [n, ...distract].map((v) => ({ label: String(v), sub: v === 1 ? 'sílaba' : 'sílabas', value: v }));
  return {
    kind: 'ex', type: 'count-syllables', id: `count:${word}`, word, skill: 'consciencia',
    prompt: `Quantas sílabas tem a palavra?`,
    say: `${wordInfo(word).w}. Quantas sílabas tem a palavra ${word}?`,
    displayWord: word,
    options: shuffle(opts).map((o) => ({ ...o, correct: o.value === n })),
    correct: null,
    layout: '3', big: true, syllables: syl,
    explain: {
      ok: `Isso! ${syl.join(' · ')} tem ${n} ${n === 1 ? 'sílaba' : 'sílabas'}.`,
      err: `Vamos bater palmas juntos: ${syl.join('! ')}!`,
      rule: `${syl.join(' · ')} = ${n} ${n === 1 ? 'sílaba' : 'sílabas'}`,
    },
  };
}

function exInitialSyllable(word, rand, pool) {
  const first = firstSyllable(word);
  const distract = syllableDistractors(pool, first, 2, rand);
  if (distract.length < 2) return null;
  return makeChoice({
    id: `ini:${word}`, type: 'initial-syllable', word,
    prompt: 'Com que sílaba começa?',
    say: `Com que sílaba começa a palavra ${word}?`,
    opts: [first, ...distract].map((s) => ({ label: s })),
    layout: '3', big: true,
    explain: {
      ok: `Isso! ${wordInfo(word).w} começa com ${first}.`,
      err: `${wordInfo(word).w} começa com ${first}. Escuta: ${splitSyllables(word).join(' - ')}.`,
      rule: `${first} + ...`,
    },
    extra: { displayWord: word, syllables: splitSyllables(word) },
  });
}

function exRhyme(word, rand, pool) {
  const group = RIMAS.find((g) => g.includes(word));
  if (!group || group.length < 2) return null;
  const partner = pick(group.filter((w) => w !== word), rand);
  const others = wordOptions(pool, word, 2, rand, (p) => !group.includes(p.w) && rhymeKey(p.w) !== rhymeKey(word));
  if (others.length < 2) return null;
  const opts = shuffle([partner, ...others], rand);
  return {
    kind: 'ex', type: 'rhyme', id: `rhyme:${word}`, word, skill: 'consciencia',
    prompt: 'Qual palavra rima?',
    say: `Qual palavra rima com ${word}?`,
    displayWord: word,
    options: opts.map((w) => ({ label: w, emoji: wordInfo(w).e, correct: w === partner })),
    layout: '3',
    explain: {
      ok: `Isso! ${partner} rima com ${word}. As duas terminam com o mesmo som.`,
      err: `${partner} rima com ${word}: ${lastSyllable(word)} e ${lastSyllable(partner)}.`,
      rule: `${word} · ${partner}`,
    },
  };
}

function exSameInitial(word, rand, pool) {
  const first = firstSyllable(word);
  const partnerPool = pool.filter((p) => p.w !== word && stripAccents(firstSyllable(p.w)) === stripAccents(first));
  if (!partnerPool.length) return null;
  const partner = pick(partnerPool, rand).w;
  const others = wordOptions(pool, word, 2, rand, (p) => stripAccents(firstSyllable(p.w)) !== stripAccents(first));
  if (others.length < 2) return null;
  const opts = shuffle([partner, ...others], rand);
  return {
    kind: 'ex', type: 'same-initial', id: `snd:${word}`, word, skill: 'consciencia',
    prompt: 'Qual começa com o mesmo som?',
    say: `Qual palavra começa com o mesmo som de ${word}?`,
    displayWord: word,
    options: opts.map((w) => ({ label: w, emoji: wordInfo(w).e, say: w, correct: w === partner })),
    layout: '3',
    explain: {
      ok: `Isso! ${word} e ${partner} começam com ${first}.`,
      err: `${word} começa com ${first}, e ${partner} também. As outras começam diferente.`,
      rule: `${first} — ${word} · ${partner}`,
    },
  };
}

function exBlend(word, rand, pool) {
  const syl = splitSyllables(word);
  if (syl.length < 2) return null;
  const others = wordOptions(pool, word, 2, rand, (p) => splitSyllables(p.w).length >= 2);
  if (others.length < 2) return null;
  const opts = shuffle([word, ...others], rand);
  return {
    kind: 'ex', type: 'blend', id: `blend:${word}`, word, skill: 'consciencia',
    prompt: 'Qual palavra eu falei?',
    say: `Escuta os pedacinhos: ${syl.join(', ... ')}.`,
    sayParts: syl,
    options: opts.map((w) => ({ label: w, emoji: wordInfo(w).e, correct: w === word })),
    layout: '3',
    explain: {
      ok: `Isso! ${syl.join(' + ')} = ${word}.`,
      err: `Era ${syl.join(' + ')} = ${word}.`,
      rule: `${syl.join(' + ')} = ${word}`,
    },
  };
}

function exBuildWord(word, rand, showWord) {
  const syl = splitSyllables(word);
  if (syl.length < 2) return null;
  const pieces = shuffle(syl.map((s, i) => ({ id: i, label: s })), rand);
  return {
    kind: 'ex', type: 'build-word', id: `build:${word}`, word, skill: 'escrita',
    prompt: 'Monte a palavra',
    say: `Monte a palavra ${word}.`,
    mode: 'syllable',
    answer: word,
    pieces: pieces.map((p) => p.label),
    slots: syl.length,
    showWord,
    emoji: wordInfo(word).e,
    syllables: syl,
    explain: {
      ok: `Isso! ${syl.join(' - ')}. Você montou ${word}!`,
      err: `A palavra é ${word}: ${syl.join(' - ')}.`,
      rule: syl.join(' · '),
    },
  };
}

function exMissing(word, rand) {
  const syl = splitSyllables(word);
  if (syl.length < 2) return null;
  const idx = Math.floor(rand() * syl.length);
  const correct = syl[idx];
  // "banana"/"jujuba"/"caneca" têm sílabas repetidas: a outra sílaba igual não pode
  // virar distrator (geraria duas opções corretas com o mesmo texto).
  const seen = new Set([stripAccents(correct).toLowerCase()]);
  const candidates = [
    ...unique(syl.filter((_, i) => i !== idx)),
    'la', 'to', 'ba', 'po', 'ra', 'ma', 'ca', 'sa', 'na', 'te',
  ];
  const distract = [];
  for (const s of shuffle(candidates, rand)) {
    const key = stripAccents(s).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distract.push(s);
    if (distract.length === 2) break;
  }
  const opts = shuffle([correct, ...distract], rand);
  return {
    kind: 'ex', type: 'missing-syllable', id: `miss:${word}:${idx}`, word, skill: 'escrita',
    prompt: 'Qual sílaba está faltando?',
    say: `Qual sílaba está faltando na palavra ${word}?`,
    mode: 'syllable',
    syllables: syl,
    blankIndex: idx,
    // mostra a palavra com a lacuna: "? lo", "bo ?" ou "pi ? ta"
    display: syl.map((s, i) => (i === idx ? '_' : s)).join(' '),
    options: opts.map((s) => ({ label: s, correct: s === correct })),
    layout: '3', big: true,
    explain: {
      ok: `Isso! ${syl.join(' - ')} forma ${word}.`,
      err: `A sílaba que falta é ${correct}: ${syl.map((s, i) => (i === idx ? `[${s}]` : s)).join(' - ')}.`,
      rule: syl.join(' · '),
    },
  };
}

function exMPB(word, rand) {
  const w = word.toLowerCase();
  const mIdx = w.search(/m(?=[pb])/);
  const nIdx = w.search(/n(?=[tdcgjqfxvszç])/);
  const finalM = w.length > 2 && w.endsWith('m') && /[aeiouáéíóúãõ]m$/.test(w);
  let idx = -1, letter = '', rule = '';
  if (mIdx >= 0) { idx = mIdx; letter = 'm'; rule = 'Antes de P ou B, a letra é M.'; }
  else if (nIdx >= 0) { idx = nIdx; letter = 'n'; rule = 'Antes das outras consoantes, a letra é N.'; }
  else if (finalM) { idx = w.length - 1; letter = 'm'; rule = 'No fim da palavra, a letra é M.'; }
  if (idx < 0) return null;
  const shown = word.slice(0, idx) + '_' + word.slice(idx + 1);
  const other = letter === 'm' ? 'n' : 'm';
  return {
    kind: 'ex', type: 'm-pb', id: `mpb:${word}`, word, skill: 'ortografia',
    prompt: 'Complete a palavra',
    say: `Complete a palavra ${word}.`,
    display: shown,
    emoji: wordInfo(word).e,
    options: shuffle([{ label: letter, correct: true }, { label: other, correct: false }]),
    layout: '2', big: true,
    explain: {
      ok: `Isso! ${word}. ${rule}`,
      err: `É ${word}, com ${letter.toUpperCase()}. ${rule}`,
      rule,
    },
  };
}

function exDictation(word, rand) {
  const letters = [...word];
  if (letters.length < 3 || letters.length > 9) return null;
  const pool = 'abcdefghijlmnopqrstuvxz'.split('').filter((c) => !letters.map((l) => stripAccents(l)).includes(c));
  const distract = sample(pool, 2, rand);
  const pieces = shuffle([...letters, ...distract], rand);
  return {
    kind: 'ex', type: 'dictation', id: `dict:${word}`, word, skill: 'escrita',
    prompt: 'Ouça e escreva',
    say: `Escreva a palavra: ${word}.`,
    mode: 'letter',
    answer: word,
    pieces,
    slots: letters.length,
    explain: {
      ok: `Isso! ${word}.`,
      err: `A palavra é ${word}. Escuta de novo: ${splitSyllables(word).join(' - ')}.`,
      rule: splitSyllables(word).join(' · '),
    },
  };
}

function exReadWord(word) {
  return {
    kind: 'ex', type: 'read-word', id: `read:${word}`, word, skill: 'leitura',
    prompt: 'Leia em voz alta',
    say: `Leia esta palavra em voz alta: ${word}.`,
    target: word,
    emoji: wordInfo(word).e,
    syllables: splitSyllables(word),
    explain: {
      ok: `Muito bem! Você leu ${word}.`,
      err: `Vamos ler juntos: ${splitSyllables(word).join(' - ')}. ${word}.`,
      rule: splitSyllables(word).join(' · '),
    },
  };
}

function exReadPhrase(frase, focus) {
  return {
    kind: 'ex', type: 'read-phrase', id: `phrase:${frase.slice(0, 24)}`, skill: 'leitura',
    word: focus, prompt: 'Leia a frase',
    say: 'Agora leia esta frase em voz alta.',
    target: frase,
    text: frase,
    explain: { ok: 'Que leitura bonita!', err: 'Vamos ouvir e ler juntos, devagar.', rule: '' },
  };
}

function exComprehension(text, pergunta, idx) {
  const opts = pergunta.opcoes.map((o, i) => ({ label: o, correct: i === pergunta.ok }));
  return {
    kind: 'ex', type: 'comprehension', id: `comp:${text.id}:${idx}`, skill: 'compreensao',
    prompt: 'Responda sobre a história',
    say: pergunta.q,
    question: pergunta.q,
    options: shuffle(opts),
    layout: '3',
    explain: {
      ok: 'Isso! Você entendeu a história.',
      err: `Vamos reler: ${text.linhas.join(' ')}`,
      rule: '',
    },
  };
}

function exReadText(text) {
  return {
    kind: 'ex', type: 'read-text', id: `text:${text.id}`, skill: 'leitura',
    prompt: 'Leia a história',
    say: `Vamos ler a história ${text.titulo}. Leia em voz alta, devagar.`,
    target: text.linhas.join(' '),
    lines: text.linhas,
    titulo: text.titulo,
    emoji: text.emoji,
    explain: { ok: 'Que orgulho! Você leu a história inteira.', err: 'Vamos ouvir a história e depois ler juntos.', rule: '' },
  };
}

function teachCard(unit, compact = false) {
  return {
    kind: 'teach', type: 'teach', id: `teach:${unit.id}`,
    titulo: compact ? 'Lembrete' : unit.teach.titulo,
    fala: unit.teach.fala,
    dica: unit.teach.dica,
    emoji: unit.emoji,
  };
}

/* ---------- composição das lições ---------- */

function wordPool(unit) {
  const pool = wordsOfUnit(unit.id);
  return pool.length ? pool : wordsOfUnit('u2');
}

/** Lição de uma unidade fônica: 7 a 8 atividades, ~10 minutos. */
function buildPhonicsLesson(unit, lessonIndex, extra = {}) {
  const rand = rng(`${unit.id}:${lessonIndex}`);
  const pool = wordPool(unit);
  const order = shuffle(unique(pool.map((p) => p.w)), rand);
  const used = new Set();
  let cursor = 0;
  const take = () => {
    while (cursor < order.length) {
      const w = order[cursor++];
      if (!used.has(w)) { used.add(w); return w; }
    }
    return order[Math.floor(rand() * order.length)] || 'bola';
  };
  const items = [teachCard(unit, lessonIndex > 0)];
  const add = (it) => { if (it) items.push(it); };

  if (unit.id === 'u1') {
    add(exCountSyllables(take(), rand, pool));
    add(exInitialSyllable(take(), rand, pool));
    add(exBlend(take(), rand, pool));
    add(exSameInitial(take(), rand, pool));
    add(exRhyme(pick(RIMAS.flat(), rand), rand, pool));
    add(exCountSyllables(take(), rand, pool));
    return { unitId: unit.id, lessonIndex, items: items.map(finalize) };
  }

  add(exCountSyllables(take(), rand, pool));

  if (unit.id === 'u6') {
    const candidates = shuffle(order.filter((w) => w.length > 2 && (/m(?=[pb])/.test(w) || /n(?=[tdcgjqfxvszç])/.test(w) || /[aeiouáéíóúãõ]m$/.test(w))), rand);
    candidates.slice(0, 2).forEach((w, k) => add(exMPB(w, rng(`mpb:${w}:${k}`))));
  }

  add(exBuildWord(take(), rand, lessonIndex === 0));
  add(exMissing(take(), rand));
  add(exDictation(take(), rand));

  const review = (extra.reviewWords || [])[0];
  if (review) add(exBuildWord(review, rand, false) || exReadWord(review));

  add(exReadWord(take()));
  add(exReadPhrase(pick(extra.phrasePool || FRASES, rand), ''));
  return { unitId: unit.id, lessonIndex, items: items.map(finalize) };
}

/** Lição de história (u9): um texto por lição. */
function buildTextLesson(lessonIndex, extra) {
  const text = TEXTS[Math.floor(lessonIndex) % TEXTS.length];
  const rand = rng(`u9:${lessonIndex}`);
  const unit = getUnit('u9');
  const items = [{
    kind: 'teach', type: 'teach', id: `teach:text:${text.id}`,
    titulo: text.titulo, fala: `Agora vamos ler: ${text.titulo}.`, dica: text.emoji, emoji: text.emoji, textId: text.id,
  }];
  items.push(exReadText(text));
  text.perguntas.forEach((p, i) => items.push(exComprehension(text, p, i)));
  if (text.perguntas.length < 2) {
    const foco = text.palavras[0];
    if (foco) items.push(exReadWord(foco));
  }
  items.push({
    kind: 'ex', type: 'read-text', id: `text2:${text.id}`, skill: 'leitura',
    prompt: 'Sua vez de novo, com capricho!',
    say: 'Agora leia a história de novo. Cada vez fica mais fácil.',
    target: text.linhas.join(' '), lines: text.linhas, titulo: text.titulo, emoji: text.emoji,
    explain: { ok: 'Isso mesmo! Ler de novo ajuda a ficar mais rápido.', err: '', rule: '' },
  });
  return { unitId: 'u9', lessonIndex, textId: text.id, items: items.map(finalize) };
}

/** Fase chefe: mistura a unidade atual com a anterior, sem dica de sílaba. */
function buildBossLesson(unit, level = 3, extra = {}) {
  const rand = rng(`boss:${unit.id}`);
  const idx = unitIndexOf(unit.id);
  const prev = UNITS[Math.max(0, idx - 1)];
  const pool = [...wordsOfUnit(unit.id), ...wordsOfUnit(prev?.id || unit.id)];
  const words = shuffle(unique(pool.map((p) => p.w)), rand).slice(0, 8);
  const items = [{
    kind: 'teach', type: 'teach', id: `boss:${unit.id}`, emoji: '👑',
    titulo: `Chefe da fase ${unit.n}`,
    fala: 'Hora do chefe! Vou misturar tudo o que você aprendeu. Sem sílabas na tela: confie em você.',
    dica: 'Leia com calma e use o “Me ensina” se precisar.',
  }];
  words.forEach((w, i) => {
    const options = [exBuildWord(w, rand, false), exMissing(w, rand), exReadWord(w), exMPB(w, rand)].filter(Boolean);
    const item = options[i % options.length];
    if (!item) return;
    item.level = 3;
    item.boss = true;
    items.push(item);
  });
  return { unitId: unit.id, lessonIndex: unit.lessons, items: items.map(finalize), boss: true };
}

export function buildLesson(unitId, lessonIndex, extra = {}) {
  const unit = getUnit(unitId) || UNITS[1];
  if (unitId === 'u9' || unit.id === 'u9') return buildTextLesson(lessonIndex, extra);
  if (lessonIndex >= (unit.lessons || 4)) return buildBossLesson(unit, extra.level || 3, extra);
  return buildPhonicsLesson(unit, lessonIndex, extra);
}

/** Lição avulsa de revisão: itens misturados de palavras devidas. */
export function buildReviewItems(words, rand = rng('review:' + Date.now())) {
  const items = [];
  for (const w of words.slice(0, 8)) {
    const info = wordInfo(w);
    const candidates = [
      exBuildWord(w, rand, false),
      exMissing(w, rand),
      exReadWord(w),
      exMPB(w, rand),
      exDictation(w, rand),
    ].filter(Boolean);
    if (!candidates.length) continue;
    items.push(pick(candidates, rand));
  }
  return items.map(finalize);
}

/**
 * Revisão curta ao fim de uma lição: 2 itens (3 se houve mais de um erro),
 * priorizando as palavras que a criança errou ou leu com ajuda.
 */
export function buildLessonReviewItems({ unitId, lessonIndex, items = [], results = [], textId = null }, rand = rng(`lesson-review:${unitId}:${lessonIndex}:${Date.now()}`)) {
  const words = [];
  const add = (w) => {
    const key = String(w || '').toLowerCase().trim();
    if (!key || words.includes(key)) return;
    words.push(key);
  };

  for (const r of results) if (r?.word && (!r.ok || r.helped)) add(r.word);
  for (const r of results) if (r?.word) add(r.word);
  for (const it of items) if (it?.word) add(it.word);
  const text = textId ? TEXT_BY_ID.get(textId) : null;
  if (text) for (const w of text.palavras || []) add(w);
  if (!words.length) return [];

  if (words.length < 2) {
    for (const info of wordsOfUnit(unitId)) {
      add(info.w);
      if (words.length >= 2) break;
    }
  }

  const missed = results.filter((r) => r?.word && (!r.ok || r.helped)).length;
  const wanted = Math.min(3, Math.max(2, missed + 1));
  const chosen = words.slice(0, wanted);
  const out = [];
  chosen.forEach((word, i) => {
    const candidates = i === 0
      ? [exReadWord(word), exMissing(word, rand), exBuildWord(word, rand, false)]
      : [exMissing(word, rand), exBuildWord(word, rand, false), exReadWord(word)];
    const item = candidates.find(Boolean);
    if (item) out.push(item);
  });
  return out.map(finalize);
}

/** Diagnóstico inicial rápido: uma tarefa de cada nível, adaptativa em dificuldade. */
export function buildDiagnostic() {
  const rand = rng('diag:' + new Date().toDateString());
  const items = [];
  const easy = ['pato', 'bola', 'mala', 'gato', 'fada', 'vaca', 'casa', 'sapo'];
  const mid = ['janela', 'cavalo', 'macaco', 'boneca', 'livro', 'praia', 'carro', 'milho'];
  const hard = ['parque', 'sempre', 'campo', 'bicicleta', 'primavera', 'também', 'projeto', 'estrela'];

  const pickWord = (arr) => pick(arr, rand);
  items.push(exCountSyllables(pickWord(easy), rand, wordsOfUnit('u1')));
  items.push(exInitialSyllable(pickWord(easy), rand, wordsOfUnit('u2')));
  items.push(exRhyme('gato', rand, wordsOfUnit('u2')));
  items.push(exBuildWord(pickWord(mid), rand, true));
  items.push(exReadWord(pickWord(easy)));
  items.push(exMissing(pickWord(mid), rand));
  const mpb = exMPB('campo', rand) || exMPB('dente', rand);
  if (mpb) items.push(mpb);
  items.push(exReadPhrase('O gato bebe leite.', 'leite'));
  items.push(exBuildWord(pickWord(hard), rand, false));
  items.push(exReadWord(pickWord(hard)));
  return items.filter(Boolean);
}

/** Nível sugerido a partir do desempenho no diagnóstico. */
export function suggestUnitFromDiagnostic(results) {  const bySkill = {};
  for (const r of results) {
    if (!r.skill) continue;
    bySkill[r.skill] = bySkill[r.skill] || { ok: 0, n: 0 };
    bySkill[r.skill].n++;
    if (r.ok) bySkill[r.skill].ok++;
  }
  const rate = (s) => (bySkill[s] ? bySkill[s].ok / bySkill[s].n : 0);
  const cons = rate('consciencia');
  const sil = rate('silabas');
  const esc = rate('escrita');
  const lei = rate('leitura');
  const ort = rate('ortografia');
  if (lei >= 0.8 && esc >= 0.8 && ort >= 0.7) return 'u8';
  if (lei >= 0.6 && esc >= 0.6) return 'u6';
  if (lei >= 0.5 && sil >= 0.5) return 'u5';
  if (sil >= 0.6 && esc >= 0.4) return 'u4';
  if (cons >= 0.6 && sil >= 0.3) return 'u3';
  if (cons >= 0.5) return 'u2';
  return 'u1';
}

export { FRASES, PARLENDAS, SIGHT };
export { exMissing as buildMissingSyllableItem };
