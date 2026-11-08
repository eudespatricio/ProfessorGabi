/* Cartão de palavra: emoji, áudio, sílabas, significado e exemplo. */
import { el } from './utils.js';
import { speak, stopSpeaking } from './audio.js';
import { splitSyllables } from './syllables.js';
import { openGuided } from './guided.js';
import { GLOSSARY } from './glossary.js';
import { emojiOf } from './content.js';
import { modal, closeModal } from './ui.js';

export function showWordCard(raw) {
  const key = String(raw || '').toLowerCase().trim();
  if (!key) return;
  const g = GLOSSARY[key] || null;
  const syl = splitSyllables(key);
  let defTimer = null;

  const clearCardAudio = () => {
    if (defTimer) { clearTimeout(defTimer); defTimer = null; }
    stopSpeaking();
  };

  const body = el('div', { class: 'col', style: { gap: '8px' } });
  body.append(el('div', { class: 'emoji-big', style: { fontSize: '48px', textAlign: 'center' }, text: (g && g.e) || emojiOf(key) }));
  body.append(el('div', { class: 'word-big', style: { fontSize: '2.1rem' }, text: key }));
  const rowSyl = el('div', { class: 'syl-row' });
  syl.forEach((s) => rowSyl.append(el('span', { class: 'syl', text: s })));
  body.append(rowSyl);

  if (g) {
    body.append(el('div', { class: 'card card--soft' },
      el('div', { class: 'section-title', text: 'O que significa' }),
      el('div', { class: 'strong', text: g.d }),
      el('div', { class: 'small muted mt', text: `Exemplo: ${g.ex}` })));
  } else {
    body.append(el('div', { class: 'small muted', text: 'Ainda não tenho o significado desta palavra — mas posso te ajudar a ler.' }));
  }

  const actions = el('div', { class: 'row', style: { gap: '8px' } });
  actions.append(el('button', {
    class: 'btn btn--soft grow',
    'on:click': async () => {
      clearCardAudio();
      await speak(key, { rate: 0.85 });
      if (g?.d) {
        defTimer = setTimeout(() => { defTimer = null; speak(g.d, { rate: 0.9 }); }, 280);
      }
    },
  }, '🔊 Ouvir'));
  actions.append(el('button', {
    class: 'btn btn--primary grow',
    'on:click': async () => { clearCardAudio(); closeModal(); await openGuided(key); },
  }, '👩‍🏫 Treinar sílabas'));
  body.append(actions);

  modal({
    title: 'Palavra',
    body,
    actions: [{ label: 'Fechar', value: true, primary: true }],
  }).finally(clearCardAudio);
}
