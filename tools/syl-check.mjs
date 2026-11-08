/* Confere a contagem de sílabas das palavras usadas na conversa. */
import { splitSyllables } from '../app/js/syllables.js';

const words = {
  bichos: ['gato', 'sapo', 'macaco', 'borboleta', 'tigre', 'tatu'],
  comida: ['pipoca', 'banana', 'abacaxi', 'bolo', 'tomate', 'cenoura'],
  escola: ['lápis', 'caderno', 'mochila', 'régua', 'professora', 'cola'],
  brincadeiras: ['bola', 'pipa', 'boneca', 'carrinho', 'bicicleta', 'pião'],
  casa: ['cama', 'janela', 'quintal', 'cozinha', 'sofá', 'porta'],
};
for (const [theme, list] of Object.entries(words)) {
  console.log(theme.padEnd(13), list.map((w) => `${w}:${splitSyllables(w).length}`).join('  '));
}
