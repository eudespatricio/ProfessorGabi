/* Respostas curtas da conversa: parser de intenção + despedida.
   Módulo puro (sem DOM) para ser testado no Node e reutilizado pela tela de conversa. */

const STOP = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'no', 'na', 'nos', 'nas', 'em', 'por', 'para', 'pra', 'com', 'sem', 'que', 'e',
  'eu', 'meu', 'minha', 'meus', 'minhas', 'favorito', 'favorita', 'muito', 'mais',
  'gosto', 'adoro', 'amo', 'curto', 'brincar', 'jogar', 'ler', 'correr', 'pular',
  'é', 'e', 'sou', 'ser', 'ter', 'tem', 'não', 'nao', 'sim', 'sei', 'nada', 'coisa',
  'legal', 'engraçado', 'engracado', 'divertido', 'bonito', 'também', 'tambem',
  'lá', 'la', 'aqui', 'isso', 'isto', 'aquilo', 'tudo',
]);

const ANIMALS = /bicho|animal|gato|cachorro|tatu|sapo|pássaro|passaro|leão|leao|tigre|macaco|borboleta|peixe|cavalo|coelho|panda|urso|girafa|elefante|formiga|abelha/;
const FOODS = /comida|pizza|bolo|fruta|banana|maçã|maca|pipoca|arroz|feijão|feijao|sorvete|chocolate|lanche|suco|leite|pão|pao|queijo|tomate|cenoura/;
const PLACES = /parque|praça|praca|casa|escola|praia|clube|quintal|rua|festa|cidade|sítio|sitio|fazenda|zoológico|zoologico/;
const ACTIONS = /brincar|jogar|correr|pular|ler|desenhar|dançar|dancar|nadar|andar|cantar|conversar|cozinhar|viajar/;

function cleanText(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function pick(list, random = Math.random) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function stripWord(w) {
  return w.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}

function lastMeaningful(text) {
  const parts = String(text || '').split(/\s+/).map(stripWord).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const w = parts[i].toLowerCase();
    if (!STOP.has(w) && w.length > 2) return parts[i];
  }
  return '';
}

function kindOf(topic, focus) {
  const t = `${topic} ${focus}`.toLowerCase();
  if (ANIMALS.test(t)) return 'animal';
  if (FOODS.test(t)) return 'food';
  if (PLACES.test(t)) return 'place';
  if (ACTIONS.test(t)) return 'activity';
  return 'generic';
}

/**
 * Extrai a informação principal da fala da criança.
 * @returns {{clean:string, focus:string, phrase:string, topic:string, kind:string, mode:string}}
 */
export function parseChildReply(raw) {
  const clean = cleanText(raw);
  if (!clean) return { clean, focus: '', phrase: '', topic: '', kind: 'empty', mode: 'empty' };

  const favorite = clean.match(/(?:meu|minha)\s+(.+?)\s+favorit[oa]\s+(?:é|e)\s+(?:o\s+|a\s+|os\s+|as\s+)?(.+)/i);
  if (favorite) {
    const topic = favorite[1].trim();
    const focus = favorite[2].replace(/[.!?…]+$/u, '').trim();
    return { clean, focus, phrase: focus, topic, kind: kindOf(topic, focus), mode: 'favorite' };
  }

  const liked = clean.match(/(?:^|\s)(?:eu\s+)?(?:gosto|adoro|amo|curto)\s+(?:muito\s+)?(?:de\s+|por\s+)?(.+)/i);
  if (liked) {
    const phrase = liked[1].replace(/[.!?…]+$/u, '').trim();
    return { clean, focus: lastMeaningful(phrase), phrase, topic: '', kind: kindOf('', phrase), mode: 'like' };
  }

  const opinion = clean.match(/^(.+?)\s+(?:é|e)\s+(?:muito\s+)?(?:legal|engraçad[oa]|engracad[oa]|divertid[oa]|bonit[oa]|maneir[oa])/i);
  if (opinion) {
    const focus = opinion[1].trim();
    return { clean, focus: lastMeaningful(focus), phrase: focus, topic: '', kind: kindOf('', focus), mode: 'opinion' };
  }

  return { clean, focus: lastMeaningful(clean), phrase: clean, topic: '', kind: kindOf('', clean), mode: 'generic' };
}

/**
 * Resposta do roteiro (sem LLM) para uma fala da criança.
 * Sempre termina com uma pergunta curta: a conversa deve convidar a criança a responder.
 * @returns {{text:string, expectsAnswer:boolean}}
 */
export function replyToChild(raw, { random = Math.random } = {}) {
  const p = parseChildReply(raw);

  if (p.mode === 'empty' || !p.focus) {
    return {
      text: pick([
        'Sem problema! Quer falar de um bicho, de uma comida ou de um lugar?',
        'Tudo bem! Me conta uma coisa que você gosta de fazer?',
      ], random),
      expectsAnswer: true,
    };
  }

  if (p.mode === 'favorite') {
    if (p.kind === 'animal') {
      return {
        text: `${cap(p.focus)}! Que bicho legal. ${pick([
          `Ele é grande ou pequeno?`,
          `Onde você costuma ver ${p.focus}?`,
          `O que ${p.focus} mais gosta de comer?`,
        ], random)}`,
        expectsAnswer: true,
      };
    }
    if (p.kind === 'food') {
      return {
        text: `${cap(p.focus)}! Que delícia. ${pick([
          `Você gosta dela com o quê?`,
          `Quem faz ${p.focus} na sua casa?`,
          `Você come ${p.focus} em que hora do dia?`,
        ], random)}`,
        expectsAnswer: true,
      };
    }
    if (p.kind === 'place') {
      return {
        text: `${cap(p.focus)}! Lugar bom. ${pick([
          `O que você mais gosta de fazer lá?`,
          `Quem vai com você?`,
          `O que tem de legal nesse lugar?`,
        ], random)}`,
        expectsAnswer: true,
      };
    }
    return {
      text: `${cap(p.focus)}! Que ${p.topic || 'escolha'} legal. Me conta mais sobre isso?`,
      expectsAnswer: true,
    };
  }

  if (p.mode === 'like') {
    if (p.kind === 'activity' || /brincar|jogar|correr|pular|ler|desenhar|dançar|dancar|nadar|cantar/i.test(p.phrase)) {
      return {
        text: `Que legal! Você gosta de ${p.phrase}. ${pick([
          `Do que você mais gosta de brincar?`,
          `Com quem você costuma fazer isso?`,
          `Onde você faz isso?`,
        ], random)}`,
        expectsAnswer: true,
      };
    }
    if (p.kind === 'place') {
      return {
        text: `Que legal! Você gosta de ${p.phrase}. O que você mais faz lá?`,
        expectsAnswer: true,
      };
    }
    return {
      text: `Que legal! Você gosta de ${p.phrase}. ${pick([
        `O que você mais gosta nisso?`,
        `Como você começou a gostar disso?`,
      ], random)}`,
      expectsAnswer: true,
    };
  }

  if (p.mode === 'opinion') {
    return {
      text: `${cap(p.focus)} é uma boa! Me conta mais sobre ${p.focus}?`,
      expectsAnswer: true,
    };
  }

  return {
    text: `Legal! Você falou de ${p.focus}. Me conta mais?`,
    expectsAnswer: true,
  };
}

/** Fecha o segundo turno de um follow-up sem emendar outra pergunta. */
export function followUpAck(raw) {
  const p = parseChildReply(raw);
  if (p.focus) {
    return {
      text: pick([
        `Que legal! ${cap(p.focus)} deve ser divertido.`,
        `Adorei saber! ${cap(p.focus)} é um bom assunto.`,
      ]),
      expectsAnswer: false,
    };
  }
  return { text: 'Entendi! Obrigada por me contar.', expectsAnswer: false };
}

/** Despedida sem duplicar a frase de abertura. */
export function farewell(name, { random = Math.random } = {}) {
  const who = name ? `, ${name}` : '';
  const endings = [
    'Você pode voltar quando quiser!',
    'Volta logo para conversar de novo!',
    'Até a próxima!',
  ];
  return `Adorei conversar com você${who}. ${pick(endings, random)}`;
}
