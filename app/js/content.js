/* Conteúdo pedagógico do Gabi.
   Banco de palavras organizado por unidade do escopo-sequência, textos
   decodificáveis, rimas, palavras de uso frequente e adesivos. */

import { EXTRA_WORDS, EXTRA_TEXTS } from './content-units.js';

/* palavra | emoji | unidades  (unidades separadas por vírgula) */
const RAW = `
pato 🦆 u1,u2
pipa 🪁 u1,u2
pão 🥖 u2,u6
pé 🦶 u1,u2
pia 🚰 u2
pote 🍯 u2
papai 👨 u2
panela 🍳 u2
pirata 🏴‍☠️ u2
picolé 🍦 u2
porta 🚪 u2
porco 🐷 u2
bola ⚽ u1,u2
boca 👄 u2
bala 🍬 u2
bebê 👶 u2
bolo 🎂 u1,u2
bico 🐦 u2
banana 🍌 u2
bicicleta 🚲 u2,u7
balão 🎈 u2,u6
borboleta 🦋 u2
barco ⛵ u2,u8
mala 🧳 u1,u2
mão ✋ u1,u2,u6
mapa 🗺️ u2
mula 🐴 u2
macaco 🐒 u2
mel 🍯 u2,u8
mesa 🪑 u2
moeda 💰 u2
morango 🍓 u2
médico 🩺 u2
mochila 🎒 u2
mulher 👩 u2
leite 🥛 u2
tatu 🦡 u1,u2
teto 🏠 u2
tomate 🍅 u2
tartaruga 🐢 u2
telefone ☎️ u2
tigre 🐯 u2
tesoura ✂️ u2
tijolo 🧱 u2
tapete 🧶 u2
tênis 👟 u2
dedo ☝️ u1,u2
dado 🎲 u2
dia ☀️ u1,u2
dente 🦷 u2,u6
dinheiro 💰 u2
dragão 🐉 u2,u7
duende 🧝 u2
doce 🍬 u2
navio 🚢 u2
nuvem ☁️ u2,u6
neve ❄️ u2
ninho 🐣 u2,u5
nariz 👃 u2,u8
noite 🌙 u2
ninja 🥷 u2
nota 🎵 u2
nove 9️⃣ u2
fada 🧚 u1,u3
fogo 🔥 u1,u3
faca 🔪 u3
feijão 🥘 u3
flor 🌸 u3,u7
futebol ⚽ u3,u8
festa 🎉 u3,u8
fila 🚶 u3
foca 🐟 u3
farol 🚨 u3,u8
vaca 🐄 u1,u3
vaso 🏺 u3
violão 🎸 u3
vela 🕯️ u3
vovó 👵 u3
vulcão 🌋 u3
vestido 👗 u3
vacina 💉 u3
lua 🌙 u1,u3
lápis ✏️ u3,u8
leão 🦁 u3,u6
livro 📖 u3,u7
limão 🍋 u3,u6
luva 🧤 u3
lobo 🐺 u3
lâmpada 💡 u3,u6
laranja 🍊 u3
lagoa 🏞️ u3
rato 🐀 u1,u3
rosa 🌹 u3
rei 👑 u3
rua 🛣️ u3
roupa 👕 u3
remo 🛶 u3
robô 🤖 u3
rapaz 🧑 u3,u8
sapo 🐸 u1,u3
sol ☀️ u1,u3,u8
sino 🔔 u1,u3
sofá 🛋️ u3
sapato 👟 u3
suco 🧃 u3
sacola 🛍️ u3
semana 📅 u3
sábado 📅 u3
casa 🏠 u1,u4
cachorro 🐶 u4,u5
caneta 🖊️ u4
café ☕ u4
coração ❤️ u4,u6
cavalo 🐴 u4
cenoura 🥕 u4
cidade 🏙️ u4
coelho 🐰 u4,u5
cama 🛏️ u4
gato 🐱 u1,u4
galo 🐓 u4
gema 🥚 u4
gelo 🧊 u4
girafa 🦒 u4
gorro 🧢 u4
gaveta 🗄️ u4
gota 💧 u4
jacaré 🐊 u4
janela 🏠 u4
jarro 🏺 u4,u5
jogo 🎮 u4
jornal 📰 u4
jujuba 🍬 u4
jipe 🚙 u4
jabuti 🐢 u4
pijama 🩳 u4
xícara ☕ u4
xarope 💊 u4
xadrez ♟️ u4
xerife 🤠 u4
xampu 🧴 u4
abacaxi 🍍 u4
peixe 🐟 u4
caixa 📦 u4
bruxa 🧙 u4
táxi 🚕 u4
zebra 🦓 u4
zíper 🤐 u4
zoológico 🦁 u4
zero 0️⃣ u4
buzina 📯 u4
cozinha 🍳 u4
azul 🔵 u4
azeitona 🍇 u4
queijo 🧀 u4
quilo ⚖️ u4
quadro 🖼️ u4
quatro 4️⃣ u4
máquina ⚙️ u4
quintal 🌳 u4
guerra ⚔️ u4
guitarra 🎸 u4
guepardo 🐆 u4
águia 🦅 u4
água 💧 u4
guarda 🛡️ u4
linguiça 🌭 u4
formiga 🐜 u4
foguete 🚀 u4
chuva 🌧️ u5
chave 🔑 u5
chapéu 👒 u5
cheiro 👃 u5
chocolate 🍫 u5
chinelo 🩴 u5
chupeta 🍼 u5
bochecha 😊 u5
cacho 🍇 u5
flecha 🏹 u5
palhaço 🤡 u5
olho 👁️ u5
filhote 🐶 u5
telhado 🏠 u5
milho 🌽 u5
molho 🥫 u5
galho 🌿 u5
velho 👴 u5
baralho 🃏 u5
banho 🚿 u5
sonho 💭 u5
unha 💅 u5
rainha 👸 u5
castanha 🌰 u5
pinhão 🌰 u5
caminhão 🚚 u5
aranha 🕷️ u5
carro 🚗 u5
torre 🗼 u5
terra 🌍 u5
burro 🐴 u5
ferro 🧲 u5
corrida 🏃 u5
arroz 🍚 u5,u8
barriga 🫃 u5
garrafa 🍾 u5
pássaro 🐦 u5
osso 🦴 u5
massa 🍝 u5
passo 👣 u5
classe 🏫 u5,u7
vassoura 🧹 u5
pêssego 🍑 u5
pressa ⏩ u5
assado 🍖 u5
campo 🌾 u6
tempo ⏰ u6
bomba 💣 u6
pombo 🕊️ u6
limpo 🧼 u6
simples ✨ u6
sempre ♾️ u6
campeão 🏆 u6
tambor 🥁 u6
bambu 🎋 u6
samba 💃 u6
compra 🛒 u6
emprego 💼 u6
tampa 🥛 u6
campainha 🔔 u6
tempestade ⛈️ u6
importante ⭐ u6
umbigo 🫀 u6
combinar 🤝 u6
ponte 🌉 u6
banco 🏦 u6
tanque ⛽ u6
anjo 😇 u6
tinta 🎨 u6
cinco 5️⃣ u6
branco ⚪ u6,u7
quando ❓ u6
mundo 🌍 u6
fundo 🔚 u6
onça 🐆 u6
antes ⏮️ u6
santo 😇 u6
canto 🎤 u6
pente 💈 u6
quente 🔥 u6
grande 📏 u6,u7
bem 👍 u6
bom 👌 u6,u8
um 1️⃣ u6
homem 👨 u6
jovem 🧑 u6
hífen ➖ u6
mãe 👩 u6
cão 🐕 u6
irmão 👦 u6
avião ✈️ u6
limões 🍋 u6
botões 🔘 u6
leões 🦁 u6
cães 🐶 u6
prato 🍽️ u7
praia 🏖️ u7
preto ⚫ u7
presente 🎁 u7
professor 👩‍🏫 u7
primo 🧑 u7
braço 💪 u7
brinquedo 🧸 u7
Brasil 🇧🇷 u7,u8
abraço 🤗 u7
criança 🧒 u7
crocodilo 🐊 u7
vidro 🪟 u7
pedra 🪨 u7
fruta 🍎 u7
frio 🥶 u7
fralda 👶 u7
frase 💬 u7
grilo 🦗 u7
grama 🌱 u7
flauta 🎶 u7
blusa 👕 u7
bloco 🧱 u7
clube 🏟️ u7
planta 🌱 u7
placa 🪧 u7
planeta 🪐 u7
atleta 🏃 u7
mar 🌊 u8
carta ✉️ u8
jardim 🌳 u8
caderno 📓 u8
sorte 🍀 u8
sal 🧂 u8
papel 📄 u8
animal 🐾 u8
fácil 👌 u8
difícil 😤 u8
pasta 🍝 u8
ônibus 🚌 u8
luz 💡 u8
vez ⏱️ u8
talvez 🤔 u8
paz 🕊️ u8
voz 🎤 u8
`;

/** @type {Map<string,{w:string,e:string,u:string[]}>} */
export const WORDS = new Map();
for (const line of RAW.trim().split('\n')) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 2) continue;
  const [w, e, u] = parts;
  WORDS.set(w.toLowerCase(), {
    w,
    e: e && e !== '-' ? e : '🔤',
    u: (u || 'u2').split(','),
  });
}

for (const x of EXTRA_WORDS) {
  const k = String(x.w).toLowerCase();
  const cur = WORDS.get(k);
  if (cur) cur.u = [...new Set([...cur.u, ...x.u])];
  else WORDS.set(k, { w: x.w, e: x.e || '🔤', u: x.u });
}

export const allWords = () => [...WORDS.values()];
export const wordsOfUnit = (unitId) => allWords().filter((x) => x.u.includes(unitId));
export const wordInfo = (w) => WORDS.get(String(w).toLowerCase()) || { w, e: '🔤', u: [] };
export const emojiOf = (w) => wordInfo(w).e;

/* ---------- rimas ---------- */
export const RIMAS = [
  ['pato', 'gato', 'rato', 'sapato'],
  ['bola', 'sacola'],
  ['pão', 'mão', 'cão', 'irmão', 'avião', 'balão', 'coração', 'limão'],
  ['dia', 'pia'],
  ['panela', 'janela', 'vela'],
  ['faca', 'vaca'],
  ['mala', 'bala'],
  ['rua', 'lua'],
  ['mel', 'papel'],
  ['bico', 'pico'],
].filter((g) => g.every((w) => WORDS.has(w)));

/* ---------- palavras de uso frequente (leitura automática) ---------- */
export const SIGHT = [
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
  'e', 'é', 'em', 'no', 'na', 'nos', 'nas', 'com', 'para', 'por',
  'que', 'não', 'sim', 'eu', 'você', 'ele', 'ela', 'meu', 'minha',
  'seu', 'sua', 'tem', 'vai', 'foi', 'muito', 'aqui', 'ali', 'ao', 'à',
  'também', 'depois', 'antes', 'está', 'estão', 'era', 'eram', 'são',
];

/* ---------- textos decodificáveis ----------
   `unidade` = quando costuma ser liberado; `palavras` = foco;
   `perguntas` = compreensão literal/inferencial simples. */
export const TEXTS = [
  {
    id: 't1', titulo: 'O gato de Bia', unidade: 'u2', emoji: '🐱',
    palavras: ['gato', 'leite', 'tapete', 'mia'],
    linhas: [
      'Bia tem um gato.',
      'O gato é preto.',
      'O gato mia: miau!',
      'Bia dá leite ao gato.',
      'O gato bebe o leite e dorme no tapete.',
    ],
    perguntas: [
      { q: 'Quem tem um gato?', opcoes: ['Bia', 'Davi', 'A fada'], ok: 0 },
      { q: 'O que o gato faz?', opcoes: ['Mia', 'Late', 'Canta'], ok: 0 },
    ],
  },
  {
    id: 't2', titulo: 'A bola de Davi', unidade: 'u2', emoji: '⚽',
    palavras: ['bola', 'azul', 'papai', 'joga'],
    linhas: [
      'Davi tem uma bola.',
      'A bola é azul.',
      'Davi joga a bola para o papai.',
      'O papai pega a bola.',
      'Davi fica feliz!',
    ],
    perguntas: [
      { q: 'De quem é a bola?', opcoes: ['Davi', 'Do papai', 'Da Bia'], ok: 0 },
      { q: 'De que cor é a bola?', opcoes: ['Azul', 'Preta', 'Verde'], ok: 0 },
    ],
  },
  {
    id: 't3', titulo: 'O pato e a pata', unidade: 'u3', emoji: '🦆',
    palavras: ['pato', 'pata', 'lagoa', 'milho'],
    linhas: [
      'O pato nada na lagoa.',
      'A pata nada também.',
      'O pato diz: quá, quá!',
      'A pata come milho.',
      'Os dois dormem na grama.',
    ],
    perguntas: [
      { q: 'Onde o pato nada?', opcoes: ['Na lagoa', 'Na piscina', 'No mar'], ok: 0 },
      { q: 'O que a pata come?', opcoes: ['Milho', 'Bolo', 'Peixe'], ok: 0 },
    ],
  },
  {
    id: 't4', titulo: 'A fada e a lua', unidade: 'u3', emoji: '🧚',
    palavras: ['fada', 'lua', 'pedido', 'céu'],
    linhas: [
      'A fada olha a lua.',
      'A lua é grande e branca.',
      'A fada faz um pedido.',
      'A lua brilha no céu.',
      'A fada dorme feliz.',
    ],
    perguntas: [
      { q: 'O que a fada olha?', opcoes: ['A lua', 'O sol', 'O mar'], ok: 0 },
      { q: 'Como é a lua?', opcoes: ['Grande e branca', 'Pequena e azul', 'Quente'], ok: 0 },
    ],
  },
  {
    id: 't5', titulo: 'O sapo e o sol', unidade: 'u3', emoji: '🐸',
    palavras: ['sapo', 'sol', 'suco', 'laranja'],
    linhas: [
      'O sapo pula na grama.',
      'O sol é quente.',
      'O sapo toma suco de laranja.',
      'O sapo fica feliz e canta.',
    ],
    perguntas: [
      { q: 'Onde o sapo pula?', opcoes: ['Na grama', 'Na cama', 'No telhado'], ok: 0 },
      { q: 'O que o sapo toma?', opcoes: ['Suco', 'Leite', 'Café'], ok: 0 },
    ],
  },
  {
    id: 't6', titulo: 'O carro do papai', unidade: 'u5', emoji: '🚗',
    palavras: ['carro', 'lava', 'limpo', 'praia'],
    linhas: [
      'O papai tem um carro.',
      'O carro é vermelho.',
      'O papai lava o carro.',
      'O carro fica limpo.',
      'Depois, a família vai à praia.',
    ],
    perguntas: [
      { q: 'O que o papai lava?', opcoes: ['O carro', 'A bola', 'A casa'], ok: 0 },
      { q: 'Para onde a família vai?', opcoes: ['À praia', 'À escola', 'Ao campo'], ok: 0 },
    ],
  },
  {
    id: 't7', titulo: 'A chuva e o milho', unidade: 'u5', emoji: '🌧️',
    palavras: ['chuva', 'milho', 'vovô', 'vovó'],
    linhas: [
      'A chuva cai no milho.',
      'O milho fica grande.',
      'O vovô colhe o milho.',
      'A vovó faz um bolo de milho.',
      'Que cheiro bom!',
    ],
    perguntas: [
      { q: 'Quem colhe o milho?', opcoes: ['O vovô', 'A vovó', 'A Bia'], ok: 0 },
      { q: 'O que a vovó faz?', opcoes: ['Um bolo', 'Um suco', 'Uma bola'], ok: 0 },
    ],
  },
  {
    id: 't8', titulo: 'O campo do vovô', unidade: 'u6', emoji: '🌾',
    palavras: ['campo', 'pombo', 'milho', 'telhado'],
    linhas: [
      'O vovô mora no campo.',
      'No campo tem um pombo.',
      'O pombo come milho.',
      'O vovô também come milho.',
      'O pombo voa para o telhado.',
    ],
    perguntas: [
      { q: 'Onde o vovô mora?', opcoes: ['No campo', 'Na cidade', 'Na praia'], ok: 0 },
      { q: 'Para onde o pombo voa?', opcoes: ['Para o telhado', 'Para a escola', 'Para o mar'], ok: 0 },
    ],
  },
  {
    id: 't9', titulo: 'Cinco patos', unidade: 'u6', emoji: '🦆',
    palavras: ['cinco', 'patos', 'ninho', 'ovos'],
    linhas: [
      'Cinco patos nadam na lagoa.',
      'Um pato pula na água.',
      'Dois patos cantam.',
      'Os patos vão para o ninho.',
      'No ninho tem três ovos.',
    ],
    perguntas: [
      { q: 'Quantos patos nadam?', opcoes: ['Cinco', 'Três', 'Dois'], ok: 0 },
      { q: 'Quantos ovos tem no ninho?', opcoes: ['Três', 'Dois', 'Cinco'], ok: 0 },
    ],
  },
  {
    id: 't10', titulo: 'Na praia', unidade: 'u7', emoji: '🏖️',
    palavras: ['praia', 'prato', 'criança', 'areia'],
    linhas: [
      'A família vai à praia.',
      'O prato fica na mesa, não na areia.',
      'A criança come fruta e brinca com a bola.',
      'O sol é quente.',
      'Todos voltam para casa.',
    ],
    perguntas: [
      { q: 'Onde o prato fica?', opcoes: ['Na mesa', 'Na areia', 'No chão'], ok: 0 },
      { q: 'O que a criança come?', opcoes: ['Fruta', 'Bolo', 'Milho'], ok: 0 },
    ],
  },
  {
    id: 't11', titulo: 'O livro da vovó', unidade: 'u8', emoji: '📖',
    palavras: ['livro', 'vovó', 'história', 'sozinha'],
    linhas: [
      'A vovó lê um livro para a Bia.',
      'O livro conta a história de uma fada.',
      'A fada voa sobre o mar.',
      'A Bia escuta com atenção.',
      'Depois, ela lê sozinha.',
    ],
    perguntas: [
      { q: 'Quem lê o livro?', opcoes: ['A vovó', 'A Bia', 'A fada'], ok: 0 },
      { q: 'Quem voa sobre o mar?', opcoes: ['A fada', 'O pato', 'O gato'], ok: 0 },
    ],
  },
  {
    id: 't12', titulo: 'A aranha e o pássaro', unidade: 'u5', emoji: '🕷️',
    palavras: ['aranha', 'teia', 'pássaro', 'ovos'],
    linhas: [
      'A aranha faz uma teia.',
      'O pássaro faz um ninho.',
      'No ninho tem três ovos.',
      'O pássaro canta: piu, piu!',
      'A aranha olha o pássaro.',
    ],
    perguntas: [
      { q: 'O que a aranha faz?', opcoes: ['Uma teia', 'Um ninho', 'Um bolo'], ok: 0 },
      { q: 'Quantos ovos tem no ninho?', opcoes: ['Três', 'Dois', 'Cinco'], ok: 0 },
    ],
  },
  {
    id: 't13', titulo: 'Bom dia, sol!', unidade: 'u8', emoji: '🌅',
    palavras: ['manhã', 'galo', 'mochila', 'escola'],
    linhas: [
      'Bom dia, sol!',
      'O galo canta.',
      'A menina acorda e toma banho.',
      'Ela come pão com mel.',
      'Depois, ela pega a mochila e vai para a escola.',
    ],
    perguntas: [
      { q: 'Quem canta de manhã?', opcoes: ['O galo', 'O pato', 'O gato'], ok: 0 },
      { q: 'O que a menina come?', opcoes: ['Pão com mel', 'Bolo', 'Fruta'], ok: 0 },
    ],
  },
  {
    id: 't14', titulo: 'Trava-línguas', unidade: 'u8', emoji: '🌀', travaLingua: true,
    palavras: ['rato', 'rei', 'pratos', 'tigres'],
    linhas: [
      'O rato roeu a roupa do rei de Roma.',
      'Três pratos de trigo para três tigres tristes.',
      'A aranha arranha a jarra.',
    ],
    perguntas: [],
  },
];

TEXTS.push(...EXTRA_TEXTS);

export const TEXT_BY_ID = new Map(TEXTS.map((t) => [t.id, t]));

/* ---------- adesivos ---------- */
export const STICKERS = [
  { id: 'primeira', ico: '🎒', nome: 'Primeira aula', desc: 'Concluir a primeira atividade' },
  { id: 'perfeito', ico: '💎', nome: 'Lição perfeita', desc: 'Acertar tudo em uma lição' },
  { id: 'dez', ico: '🔤', nome: '10 palavras', desc: 'Ler 10 palavras' },
  { id: 'cem', ico: '📚', nome: '100 palavras', desc: 'Ler 100 palavras' },
  { id: 'silabas', ico: '👏', nome: 'Mestre das sílabas', desc: 'Acertar 20 exercícios de sílabas' },
  { id: 'detetive', ico: '🕵️', nome: 'Detetive do M', desc: 'Completar 10 palavras com M ou N' },
  { id: 'historia', ico: '📖', nome: 'Leu uma história', desc: 'Ler um texto completo' },
  { id: 'tresdias', ico: '🔥', nome: '3 dias seguidos', desc: 'Estudar 3 dias seguidos' },
  { id: 'setedias', ico: '🏅', nome: '7 dias seguidos', desc: 'Estudar 7 dias seguidos' },
  { id: 'coruja', ico: '🦉', nome: 'Coruja sabida', desc: 'Concluir 5 unidades' },
  { id: 'nivel5', ico: '🚀', nome: 'Foguete', desc: 'Chegar ao nível 5' },
];
export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));

/* ---------- frases soltas para leitura em voz alta ---------- */
export const FRASES = [
  'O gato bebe leite.',
  'A bola é azul.',
  'Bia come pão com mel.',
  'O pato nada na lagoa.',
  'O papai lava o carro.',
  'A vovó faz um bolo.',
  'O menino joga a bola.',
  'A chuva cai no milho.',
  'O sapo pula na grama.',
  'Cinco patos vão para o ninho.',
  'A fada olha a lua.',
  'O rato roeu a roupa do rei.',
  'O sol nasce de manhã.',
  'A criança lê um livro.',
  'O pombo voa para o telhado.',
  'Meu dedo está no nariz.',
];

/* ---------- trava-línguas e parlendas ---------- */
export const PARLENDAS = [
  { t: 'O rato roeu a roupa do rei de Roma.', foco: 'R' },
  { t: 'Três pratos de trigo para três tigres tristes.', foco: 'TR' },
  { t: 'A aranha arranha a jarra, a jarra arranha a aranha.', foco: 'AN / AR' },
  { t: 'O peito do pé de Pedro é preto.', foco: 'PE / PR' },
  { t: 'Um ninho de mafagafos com sete mafagafinhos.', foco: 'NH' },
];
