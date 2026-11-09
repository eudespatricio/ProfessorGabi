/* Monta a lista de falas determinísticas que ainda não têm clipe.
   Não chama API: serve para auditar o delta e o orçamento de créditos.
   Uso: node tools/audio-delta-candidates.mjs */
import fs from 'node:fs';
import { UNITS, buildLesson, buildDiagnostic } from '../app/js/curriculum.js';
import { TONGUE_TWISTERS, THEMES, MOODS } from '../app/js/screen-talk.js';
import { followUpAck } from '../app/js/talk-reply.js';
import { splitSyllables } from '../app/js/syllables.js';

const SPEAK_OPTIONS = new Set(['rhyme', 'same-initial', 'blend']);
const NAMES = ['Gabi', 'Gabriela'];
const ENDINGS = ['Você pode voltar quando quiser!', 'Volta logo para conversar de novo!', 'Até a próxima!'];
const normKey = (t) => String(t).toLowerCase().replace(/[.!?…:;,]+$/g, '').replace(/\s+/g, ' ').trim();

export function buildCandidates() {
  const map = new Map();
  const add = (text, kind, priority) => {
    if (text == null) return;
    if (Array.isArray(text)) { text.forEach((t) => add(t, kind, priority)); return; }
    const s = String(text).replace(/\s+/g, ' ').trim();
    if (!s) return;
    const key = normKey(s);
    if (!key || map.has(key)) return;
    map.set(key, { text: s, kind, priority });
  };

  // 1) Fala de lição/exercício: cartão de ensino, comando e alvo de leitura
  for (const unit of UNITS) {
    const max = (unit.lessons || 4) + 1;
    for (let i = 0; i < max; i++) {
      let lesson;
      try { lesson = buildLesson(unit.id, i, { level: 3 }); } catch { continue; }
      for (const item of lesson.items || []) {
        add(item.fala, 'lesson-teach', 1);
        add(item.say, 'lesson-say', 1);
        add(item.prompt, 'lesson-prompt', 2);
        add(item.word, 'lesson-word', 1);
        if (item.type === 'read-phrase' || item.type === 'read-word') add(item.target, 'lesson-target', 1);
        if (SPEAK_OPTIONS.has(item.type)) for (const opt of item.options || []) add(opt.label, 'lesson-option', 2);
      }
    }
  }
  for (const item of buildDiagnostic()) {
    add(item.fala, 'lesson-teach', 1);
    add(item.say, 'lesson-say', 1);
    add(item.prompt, 'lesson-prompt', 2);
    add(item.word, 'lesson-word', 1);
    if (SPEAK_OPTIONS.has(item.type)) for (const opt of item.options || []) add(opt.label, 'lesson-option', 2);
  }

  // 2) Falas com o nome da criança (por enquanto só as duas do teste)
  for (const n of NAMES) {
    add(`Oi, ${n}! Hoje tem surpresa: escolhe uma cartinha para descobrir o assunto do nosso papo!`, 'talk-name', 1);
    add(`Oi, ${n}! Antes de conversar, escolhe uma cartinha surpresa!`, 'talk-name', 1);
    add(`Agora me conta, ${n}: como você está hoje?`, 'talk-name', 1);
    add(`Então, ${n}, como você está hoje?`, 'talk-name', 1);
    add(`Bora começar, ${n}! Como você está hoje?`, 'talk-name', 1);
    for (const e of ENDINGS) add(`Adorei conversar com você, ${n}. ${e}`, 'talk-name', 1);
    add(`Oi, ${n}! Eu sou a Gabi. Vamos aprender juntos.`, 'home-name', 1);
  }

  // 3) Roteiro da conversa
  for (const t of THEMES) {
    add(`Boa escolha! ${t.cheer}`, 'talk-cheer', 1);
    for (const q of t.questions) add(q, 'talk-question', 1);
    for (const w of t.words) {
      const parts = splitSyllables(w);
      add(`Palavra nova: ${w}! Bata palmas e me diga: quantas sílabas tem?`, 'talk-syl', 1);
      add(`Isso! ${w}: ${parts.join(' · ')}. ${parts.length} sílabas. Você contou muito bem.`, 'talk-syl', 1);
      add(`Quase! Escuta: ${parts.join(' … ')}. São ${parts.length} sílabas.`, 'talk-syl', 2);
    }
  }
  for (const m of MOODS) {
    for (const r of m.replies) add(r, 'talk-mood', 1);
    for (const f of m.follows) add(f, 'talk-mood', 1);
  }
  const themeById = Object.fromEntries(THEMES.map((x) => [x.id, x]));
  for (const t of TONGUE_TWISTERS) {
    add(t.text, 'talk-twister', 1);
    const label = themeById[t.themes[0]]?.label || 'Bichos';
    add(`Trava-língua de ${label.toLowerCase()}: “${t.text}” Repita comigo.`, 'talk-twister-intro', 2);
  }
  for (const r of [
    'Isso! Você repetiu direitinho.', 'Muito bem! Saiu bonito.', 'Perfeito! Você prestou atenção em cada palavra.',
    'Quase! Escuta de novo e tenta mais devagar.', 'Ficou perto! Vamos tentar mais uma vez, bem devagar.',
  ]) add(r, 'talk-echo', 1);
  for (const i of [0, 0.99]) add(followUpAck('no parque eu corro', { random: () => i }).text, 'talk-followup', 1);

  // 4) Home/onboarding (saudação com nome, sem a linha de streak do dia)
  const OPENERS = [
    'Vamos nos divertir aprendendo?', 'Que tal descobrir uma palavra nova hoje?', 'Pronta para brincar com as letras?',
    'Hoje tem leitura, jogo e muita risada!', 'Vamos começar com uma historinha?',
    'Vamos nos divertir aprendendo?', 'Bora treinar a leitura brincando?', 'Que tal uma palavra nova agora?',
    'Vamos ler juntos e dar muita risada?', 'Escolhe uma aula e vamos nessa?',
    'Vamos nos divertir aprendendo?', 'Antes de descansar, que tal uma historinha?', 'Vamos fechar o dia lendo juntos?',
    'Uma palavra nova antes de dormir?', 'Bora brincar de ler um pouquinho?',
  ];
  const GREETS = ['Bom dia', 'Boa tarde', 'Boa noite'];
  for (let i = 0; i < 15; i++) {
    for (const n of NAMES) add(`${GREETS[Math.floor(i / 5)]}, ${n}! ${OPENERS[i]}`, 'home-greeting', 1);
  }
  add('Vamos ler juntos! Bola. Bo-la. Duas sílabas!', 'home-sample', 2);

  // 5) Outras falas fixas/determinísticas
  add('Você encontrou todas as palavras!', 'misc-search', 1);
  add('Oi! Eu sou a Gabi. Vamos ler juntos?', 'misc-parent', 1);
  add('Agora eu falo assim. Vamos ler juntos!', 'misc-parent', 1);
  add('O rato roeu a roupa do rei de Roma.', 'misc-parent', 1);
  add('Oi! Eu sou a Gabi. Vamos ler juntos: bola. Bo-la. Duas sílabas!', 'misc-voice', 2);
  for (const unit of UNITS) add(`Pronto! Vamos começar pela unidade ${unit.n}: ${unit.titulo}.`, 'misc-placement', 2);

  return [...map.values()];
}

if (process.argv[1] && process.argv[1].endsWith('audio-delta-candidates.mjs')) {
  const index = JSON.parse(fs.readFileSync('app/audio/index.json', 'utf8'));
  const rows = buildCandidates();
  const seen = new Set();
  const missing = rows.filter((r) => {
    const k = normKey(r.text);
    if (!k || seen.has(k) || index[k]) return false;
    seen.add(k);
    return true;
  });
  const by = {};
  for (const r of rows) {
    const k = normKey(r.text);
    if (!k || index[k]) continue;
    by[r.kind] ??= { n: 0, chars: 0 };
    by[r.kind].n++;
    by[r.kind].chars += r.text.length;
  }
  const total = missing.reduce((a, r) => a + r.text.length, 0);
  console.log(`candidatos: ${rows.length} | já no índice: ${rows.length - missing.length} | delta: ${missing.length} clipes / ${total} caracteres`);
  console.log(JSON.stringify(by, null, 2));
}
