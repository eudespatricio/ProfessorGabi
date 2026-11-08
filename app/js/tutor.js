/* A voz pedagógica da Gabi: elogios, correções e dicas.
   Regras: nunca dizer "errado"; elogiar estratégia e esforço; frases curtas. */
import { state } from './store.js';
import { pick } from './utils.js';

const PRAISE_FIRST = ['Isso!', 'Muito bem!', 'Boa!', 'Perfeito!', 'Uau, acertou!', 'Show!'];
const PRAISE_AFTER = ['Agora sim!', 'Conseguiu!', 'Isso mesmo!', 'Olha só, você conseguiu!'];
const NUDGE = ['Quase!', 'Vamos juntos.', 'Respira e olha de novo.', 'Tudo bem, é assim que se aprende.'];

export function childName() {
  return (state.child?.name || '').trim();
}

export function withName(line) {
  const n = childName();
  if (!n) return line;
  return Math.random() < 0.45 ? `${line} ${n}!` : line;
}

export function praise(firstTry = true) {
  return withName(pick(firstTry ? PRAISE_FIRST : PRAISE_AFTER));
}

export function nudge() {
  return pick(NUDGE);
}

/**
 * Monta o retorno pedagógico de um exercício.
 * @returns {{mood:'happy'|'thinking', title:string, text:string, rule:string}}
 */
export function feedbackFor(item, res) {
  const ex = item?.explain || {};
  if (res?.ok) {
    return {
      mood: 'happy',
      title: praise(res.attempts <= 1 && !res.helped),
      text: ex.ok || 'Você acertou!',
      rule: ex.rule || '',
    };
  }
  return {
    mood: 'thinking',
    title: nudge(),
    text: ex.err || 'Vamos ver juntos de novo.',
    rule: ex.rule || '',
  };
}

/** Fala de incentivo ao terminar a lição. */
export function lessonSummary(stars, correct, total) {
  if (stars >= 3) return withName(`Que aula! Você acertou ${correct} de ${total}. Estou muito orgulhosa.`);
  if (stars === 2) return withName(`Muito bem! Você acertou ${correct} de ${total}. Já, já fica ainda melhor.`);
  return withName(`Você fez ${correct} de ${total}. O importante é não desistir: vamos treinar mais um pouquinho.`);
}

/** Dica específica por tipo de exercício. */
export function hintFor(item) {
  const syl = item?.syllables?.join(' - ');
  switch (item?.type) {
    case 'count-syllables':
      return { text: 'Bata palmas para cada pedacinho: ' + (syl || ''), speak: `Bata palmas: ${item.syllables?.join(', ')}.` };
    case 'build-word':
      return { text: 'Começa com: ' + (item.syllables?.[0] || ''), speak: `A primeira sílaba é ${item.syllables?.[0]}.` };
    case 'missing-syllable': {
      const s = item.syllables || [];
      return { text: `${s[item.blankIndex - 1] || ''} … ${s[item.blankIndex + 1] || ''}`, speak: 'Escuta a palavra inteira: ' + (item.word || '') };
    }
    case 'm-pb':
      return { text: item.explain?.rule || 'M antes de P e B.', speak: item.explain?.rule || 'M antes de P e B.' };
    case 'read-word':
    case 'read-phrase':
    case 'read-text':
      return { text: syl ? `Leia em pedacinhos: ${syl}` : 'Leia devagar, com calma.', speak: 'Leia devagar. Se precisar, eu leio junto.' };
    case 'dictation':
      return { text: syl ? `Escute: ${syl}` : 'Escute de novo.', speak: `A palavra é ${item.word}.` };
    default:
      return { text: item?.explain?.rule || 'Pense no som das letras.', speak: item?.explain?.rule || '' };
  }
}

/** Comentário para leitura em voz alta. */
export function readingFeedback(accuracy, missed, attempts) {
  const total = Math.round(accuracy * 100);
  if (accuracy >= 0.85) {
    return { mood: 'happy', title: praise(attempts <= 1), text: `Você leu ${total}% das palavras certinho.` };
  }
  if (accuracy >= 0.6) {
    const m = missed?.[0] ? ` A palavra “${missed[0]}” é a próxima conquista.` : '';
    return { mood: 'happy', title: 'Boa leitura!', text: `Você acertou ${total}% das palavras.${m}` };
  }
  const m = missed?.[0] ? `Vamos ouvir “${missed[0]}” juntos?` : 'Vamos ouvir de novo e ler juntos?';
  return { mood: 'thinking', title: 'Vamos com calma', text: `Você leu ${total}%. ${m}` };
}

/** Frases de abertura por período do dia (variam a cada dia). */
const OPENERS = {
  morning: [
    'Vamos nos divertir aprendendo?',
    'Que tal descobrir uma palavra nova hoje?',
    'Pronta para brincar com as letras?',
    'Hoje tem leitura, jogo e muita risada!',
    'Vamos começar com uma historinha?',
  ],
  afternoon: [
    'Vamos nos divertir aprendendo?',
    'Bora treinar a leitura brincando?',
    'Que tal uma palavra nova agora?',
    'Vamos ler juntos e dar muita risada?',
    'Escolhe uma aula e vamos nessa?',
  ],
  evening: [
    'Vamos nos divertir aprendendo?',
    'Antes de descansar, que tal uma historinha?',
    'Vamos fechar o dia lendo juntos?',
    'Uma palavra nova antes de dormir?',
    'Bora brincar de ler um pouquinho?',
  ],
};

function periodOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** "Bom dia" / "Boa tarde" / "Boa noite", sem pontuação. */
export function greeting() {
  return { morning: 'Bom dia', afternoon: 'Boa tarde', evening: 'Boa noite' }[periodOfDay()];
}

/** Frase descontraída do período, estável no mesmo dia (não muda a cada tela). */
export function greetingPhrase() {
  const list = OPENERS[periodOfDay()];
  const day = Math.floor(Date.now() / 86400000);
  const seed = day + (childName() || '').length;
  return list[seed % list.length];
}

/** Saudação completa para falar: "Bom dia, Gabi! Vamos nos divertir aprendendo?" */
export function greetingLine() {
  const n = childName();
  return `${greeting()}${n ? `, ${n}` : ''}! ${greetingPhrase()}`;
}

export function streakLine() {
  const d = state.progress.streak?.days || 0;
  if (d <= 1) return 'Vamos começar uma sequência?';
  return `${d} dias seguidos! Que constância.`;
}
