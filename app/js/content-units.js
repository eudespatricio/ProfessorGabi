/* Unidades extras (u10 a u14): R/RR, S/SS, C/QU, G/GU e Ç/X/CH.
   Mesmo formato de content.js e curriculum.js, para estender o
   escopo-sequência sem tocar nos arquivos originais. */

export const EXTRA_UNITS = [
  {
    id: 'u10', n: 10, titulo: 'R e RR', sub: 'Um R ou dois?', emoji: '🚗',
    cor: '#e85d3d', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Um R fraco, dois R fortes',
      fala: 'Um R só, entre duas vogais, tem som fraco, como em caro e muro. Quando ele dobra, o som fica forte: carro, terra e cachorro!',
      dica: 'caro × carro · muro × murro',
    },
  },
  {
    id: 'u11', n: 11, titulo: 'S e SS', sub: 'Quando dobra o S?', emoji: '🐦',
    cor: '#2f80ed', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Um S ou dois?',
      fala: 'Um S sozinho entre vogais fala com som de Z: casa, mesa e coisa. Quando o S dobra, o som fica forte e chiado: passa, osso e pássaro!',
      dica: 'S = Z (casa) · SS = S forte (passa)',
    },
  },
  {
    id: 'u12', n: 12, titulo: 'C e QU', sub: 'Som de K e de S', emoji: '🧀',
    cor: '#f5a623', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'O C e o QU',
      fala: 'Antes de A, O e U, o C tem som de K: casa, copo e cuca. Antes de E e I ele tem som de S, e o QU sempre traz o som de K: queijo e quilo!',
      dica: 'CA-CO-CU = K · CE-CI = S · QUE-QUI = K',
    },
  },
  {
    id: 'u13', n: 13, titulo: 'G e GU', sub: 'Som de G e de guê', emoji: '🐱',
    cor: '#129c8e', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'O G e o GU',
      fala: 'Antes de A, O e U, o G tem som forte: gato, gota e gude. Antes de E e I ele soa como J, mas o GU traz o som forte de volta: guerra, guitarra e águia!',
      dica: 'GA-GO-GU forte · GE-GI = J · GUE-GUI = G',
    },
  },
  {
    id: 'u14', n: 14, titulo: 'Ç, X e CH', sub: 'Sons escritos de vários jeitos', emoji: '🔑',
    cor: '#7c6cf0', lessons: 3, skills: ['silabas', 'escrita', 'leitura'],
    teach: {
      titulo: 'Ç, X e CH',
      fala: 'O Ç tem sempre som de S: caça, poço e açúcar. O CH tem som de X, como em chave e chuva, e o X também pode soar como CH: peixe e caixa!',
      dica: 'Ç = SS · CH = X · X = CH',
    },
  },
];

/* palavra | emoji | unidades */
export const EXTRA_WORDS = [
  /* u10 — R e RR */
  { w: 'caro', e: '💸', u: ['u10'] },
  { w: 'carro', e: '🚗', u: ['u10'] },
  { w: 'muro', e: '🧱', u: ['u10'] },
  { w: 'murro', e: '🤜', u: ['u10'] },
  { w: 'arroz', e: '🍚', u: ['u10'] },
  { w: 'terra', e: '🌍', u: ['u10'] },
  { w: 'ferro', e: '🧲', u: ['u10'] },
  { w: 'burro', e: '🐴', u: ['u10'] },
  { w: 'torre', e: '🗼', u: ['u10'] },
  { w: 'garrafa', e: '🍾', u: ['u10'] },
  { w: 'barriga', e: '🫃', u: ['u10'] },
  { w: 'corrida', e: '🏃', u: ['u10'] },
  { w: 'cachorro', e: '🐶', u: ['u10'] },
  { w: 'morro', e: '⛰️', u: ['u10'] },
  { w: 'barro', e: '🟤', u: ['u10'] },
  { w: 'rua', e: '🛣️', u: ['u10'] },
  { w: 'rato', e: '🐀', u: ['u10'] },
  { w: 'roda', e: '🛞', u: ['u10'] },
  { w: 'rico', e: '💰', u: ['u10'] },
  { w: 'carroça', e: '🛻', u: ['u10'] },

  /* u11 — S e SS */
  { w: 'casa', e: '🏠', u: ['u11'] },
  { w: 'passa', e: '🚶', u: ['u11'] },
  { w: 'osso', e: '🦴', u: ['u11'] },
  { w: 'pássaro', e: '🐦', u: ['u11'] },
  { w: 'massa', e: '🍝', u: ['u11'] },
  { w: 'passo', e: '👣', u: ['u11'] },
  { w: 'classe', e: '🏫', u: ['u11'] },
  { w: 'vassoura', e: '🧹', u: ['u11'] },
  { w: 'pêssego', e: '🍑', u: ['u11'] },
  { w: 'pressa', e: '⏩', u: ['u11'] },
  { w: 'assado', e: '🍖', u: ['u11'] },
  { w: 'isso', e: '✅', u: ['u11'] },
  { w: 'nossa', e: '😮', u: ['u11'] },
  { w: 'nosso', e: '👪', u: ['u11'] },
  { w: 'professora', e: '👩‍🏫', u: ['u11'] },
  { w: 'sino', e: '🔔', u: ['u11'] },
  { w: 'sapo', e: '🐸', u: ['u11'] },
  { w: 'sopa', e: '🍲', u: ['u11'] },
  { w: 'sábado', e: '📅', u: ['u11'] },
  { w: 'travesseiro', e: '🛏️', u: ['u11'] },

  /* u12 — C e QU */
  { w: 'caneca', e: '🍵', u: ['u12'] },
  { w: 'caco', e: '🏺', u: ['u12'] },
  { w: 'caneta', e: '🖊️', u: ['u12'] },
  { w: 'café', e: '☕', u: ['u12'] },
  { w: 'cavalo', e: '🐴', u: ['u12'] },
  { w: 'cadeira', e: '🪑', u: ['u12'] },
  { w: 'camisa', e: '👕', u: ['u12'] },
  { w: 'colher', e: '🥄', u: ['u12'] },
  { w: 'copo', e: '🥤', u: ['u12'] },
  { w: 'escola', e: '🏫', u: ['u12'] },
  { w: 'boneca', e: '🪆', u: ['u12'] },
  { w: 'coração', e: '❤️', u: ['u12'] },
  { w: 'quero', e: '🙋', u: ['u12'] },
  { w: 'quilo', e: '⚖️', u: ['u12'] },
  { w: 'queijo', e: '🧀', u: ['u12'] },
  { w: 'quatro', e: '4️⃣', u: ['u12'] },
  { w: 'quando', e: '❓', u: ['u12'] },
  { w: 'máquina', e: '⚙️', u: ['u12'] },
  { w: 'quinta', e: '📆', u: ['u12'] },
  { w: 'quente', e: '🔥', u: ['u12'] },

  /* u13 — G e GU */
  { w: 'gato', e: '🐱', u: ['u13'] },
  { w: 'gola', e: '👔', u: ['u13'] },
  { w: 'gude', e: '🔮', u: ['u13'] },
  { w: 'guerra', e: '⚔️', u: ['u13'] },
  { w: 'guitarra', e: '🎸', u: ['u13'] },
  { w: 'guindaste', e: '🏗️', u: ['u13'] },
  { w: 'águia', e: '🦅', u: ['u13'] },
  { w: 'água', e: '💦', u: ['u13'] },
  { w: 'formiga', e: '🐜', u: ['u13'] },
  { w: 'foguete', e: '🚀', u: ['u13'] },
  { w: 'língua', e: '👅', u: ['u13'] },
  { w: 'guarda', e: '🛡️', u: ['u13'] },
  { w: 'mangueira', e: '🌿', u: ['u13'] },
  { w: 'gema', e: '🥚', u: ['u13'] },
  { w: 'gelo', e: '🧊', u: ['u13'] },
  { w: 'gorro', e: '🧢', u: ['u13'] },
  { w: 'gota', e: '💧', u: ['u13'] },
  { w: 'guloso', e: '😋', u: ['u13'] },
  { w: 'gaveta', e: '🗄️', u: ['u13'] },
  { w: 'girafa', e: '🦒', u: ['u13'] },

  /* u14 — Ç, X e CH */
  { w: 'caça', e: '🏹', u: ['u14'] },
  { w: 'moça', e: '👩', u: ['u14'] },
  { w: 'começar', e: '🏁', u: ['u14'] },
  { w: 'açúcar', e: '🍬', u: ['u14'] },
  { w: 'poço', e: '🕳️', u: ['u14'] },
  { w: 'pedaço', e: '🍰', u: ['u14'] },
  { w: 'cabeça', e: '🧠', u: ['u14'] },
  { w: 'dança', e: '💃', u: ['u14'] },
  { w: 'chave', e: '🔑', u: ['u14'] },
  { w: 'xícara', e: '☕', u: ['u14'] },
  { w: 'peixe', e: '🐟', u: ['u14'] },
  { w: 'chuva', e: '🌧️', u: ['u14'] },
  { w: 'chão', e: '🟫', u: ['u14'] },
  { w: 'caixa', e: '📦', u: ['u14'] },
  { w: 'bruxa', e: '🧙', u: ['u14'] },
  { w: 'enxada', e: '⛏️', u: ['u14'] },
  { w: 'xarope', e: '💊', u: ['u14'] },
  { w: 'chuveiro', e: '🚿', u: ['u14'] },
  { w: 'abacaxi', e: '🍍', u: ['u14'] },
  { w: 'queixo', e: '🧔', u: ['u14'] },
];

/* Textos decodificáveis das unidades extras (t15 a t22). */
export const EXTRA_TEXTS = [
  {
    id: 't15', titulo: 'O carro do vovô', unidade: 'u10', emoji: '🚗',
    palavras: ['carro', 'rua', 'roda', 'cachorro'],
    linhas: [
      'O vovô tem um carro.',
      'O carro é vermelho e anda na rua.',
      'O cachorro corre atrás do carro.',
      'A roda do carro gira rápido.',
      'O vovô sorri e chama o cachorro.',
    ],
    perguntas: [
      { q: 'Quem tem um carro?', opcoes: ['O vovô', 'O cachorro', 'A Bia'], ok: 0 },
      { q: 'O que a roda faz?', opcoes: ['Gira', 'Canta', 'Dorme'], ok: 0 },
    ],
  },
  {
    id: 't16', titulo: 'O burro e a torre', unidade: 'u10', emoji: '🐴',
    palavras: ['burro', 'torre', 'morro', 'ferro'],
    linhas: [
      'O burro sobe o morro.',
      'No alto do morro tem uma torre.',
      'A torre é de ferro.',
      'O burro leva a carroça.',
      'Ele descansa na terra e olha a torre.',
    ],
    perguntas: [
      { q: 'Onde o burro sobe?', opcoes: ['No morro', 'Na rua', 'Na torre'], ok: 0 },
      { q: 'De que é feita a torre?', opcoes: ['De ferro', 'De barro', 'De gelo'], ok: 0 },
    ],
  },
  {
    id: 't17', titulo: 'A sopa da vovó', unidade: 'u11', emoji: '🍲',
    palavras: ['sopa', 'massa', 'osso', 'assado'],
    linhas: [
      'No sábado, a vovó faz sopa.',
      'A sopa tem massa e osso.',
      'O vovô come a sopa toda.',
      'Depois, ele come o assado.',
      'A vovó fica feliz e sorri.',
    ],
    perguntas: [
      { q: 'O que a vovó faz no sábado?', opcoes: ['Sopa', 'Bolo', 'Suco'], ok: 0 },
      { q: 'O que o vovô come depois?', opcoes: ['O assado', 'A sopa', 'O pêssego'], ok: 0 },
    ],
  },
  {
    id: 't18', titulo: 'A vassoura da professora', unidade: 'u11', emoji: '🧹',
    palavras: ['vassoura', 'classe', 'sapo', 'professora'],
    linhas: [
      'A professora varre a classe.',
      'Ela usa a vassoura.',
      'Um sapo pula na classe.',
      'A professora pega o sapo com cuidado.',
      'Ela leva o sapo para o jardim.',
    ],
    perguntas: [
      { q: 'Quem varre a classe?', opcoes: ['A professora', 'O sapo', 'A vovó'], ok: 0 },
      { q: 'Para onde a professora leva o sapo?', opcoes: ['Para o jardim', 'Para a sopa', 'Para a sala'], ok: 0 },
    ],
  },
  {
    id: 't19', titulo: 'O café do papai', unidade: 'u12', emoji: '☕',
    palavras: ['café', 'caneca', 'queijo', 'quente'],
    linhas: [
      'O papai faz café na caneca.',
      'O café está quente.',
      'Ele come pão com queijo.',
      'A menina quer leite na caneca.',
      'O papai dá o leite e ela fica feliz.',
    ],
    perguntas: [
      { q: 'O que o papai faz?', opcoes: ['Café', 'Sopa', 'Suco'], ok: 0 },
      { q: 'O que a menina quer?', opcoes: ['Café', 'Leite', 'Queijo'], ok: 1 },
    ],
  },
  {
    id: 't20', titulo: 'A águia e a água', unidade: 'u13', emoji: '🦅',
    palavras: ['águia', 'água', 'formiga', 'gota'],
    linhas: [
      'A águia voa alto.',
      'Ela vê a água do rio.',
      'A águia desce e bebe uma gota.',
      'A formiga olha a águia.',
      'Depois, a águia voa de novo.',
    ],
    perguntas: [
      { q: 'Quem bebe água?', opcoes: ['A águia', 'A formiga', 'O gato'], ok: 0 },
      { q: 'O que a formiga faz?', opcoes: ['Olha a águia', 'Bebe água', 'Voa'], ok: 0 },
    ],
  },
  {
    id: 't21', titulo: 'A chave da bruxa', unidade: 'u14', emoji: '🔑',
    palavras: ['chave', 'bruxa', 'caixa', 'peixe'],
    linhas: [
      'A bruxa tem uma chave.',
      'A chave abre a caixa.',
      'Na caixa tem um peixe de brinquedo.',
      'A bruxa ri e dá o peixe para a menina.',
      'A menina fica feliz.',
    ],
    perguntas: [
      { q: 'O que a bruxa tem?', opcoes: ['Uma chave', 'Uma caixa', 'Um peixe'], ok: 0 },
      { q: 'O que tem na caixa?', opcoes: ['Um peixe', 'Uma chave', 'Uma xícara'], ok: 0 },
    ],
  },
  {
    id: 't22', titulo: 'O abacaxi da moça', unidade: 'u14', emoji: '🍍',
    palavras: ['abacaxi', 'moça', 'xícara', 'dança'],
    linhas: [
      'A moça corta o abacaxi.',
      'O abacaxi é doce.',
      'Ela põe o abacaxi na xícara.',
      'O menino come e dança.',
      'Que festa boa!',
    ],
    perguntas: [
      { q: 'O que a moça corta?', opcoes: ['O abacaxi', 'A xícara', 'A chave'], ok: 0 },
      { q: 'Como é o abacaxi?', opcoes: ['Salgado', 'Doce', 'Frio'], ok: 1 },
    ],
  },
];
