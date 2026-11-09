/* Laboratório de voz: compara todas as vozes pt-BR do aparelho e salva a escolhida. */
import { el } from './utils.js';
import * as store from './store.js';
import { listVoices, pickVoice, speak, stopSpeaking, unlockAudio, ensureVoices, ttsSupported } from './audio.js';
import { clearScreen, tabbar, toast } from './ui.js';

const SAMPLE = 'Oi! Eu sou a Gabi. Vamos ler juntos: bola. Bo-la. Duas sílabas!';

export async function renderVoiceLab() {
  const s = clearScreen();
  tabbar('pais');
  unlockAudio();
  await ensureVoices();

  const wrap = el('div', { class: 'wrap stack' });
  const back = el('button', { class: 'btn--back', 'aria-label': 'Voltar', 'on:click': () => { stopSpeaking(); location.hash = '#/pais'; } }, '←');
  wrap.append(el('div', { class: 'row' }, back,
    el('div', { class: 'grow' },
      el('div', { class: 'topbar__title', text: 'Laboratório de voz' }),
      el('div', { class: 'small muted', text: 'Compare as vozes de português do Brasil do aparelho e escolha a mais natural.' }))));

  let rate = store.state.settings.rate ?? 0.9;
  let pitch = store.state.settings.pitch ?? 1;

  if (!ttsSupported()) {
    wrap.append(el('div', { class: 'card card--warn', text: 'Este navegador não tem síntese de voz. Tente o Chrome ou o Edge.' }));
    s.append(wrap);
    return;
  }

  const voices = listVoices();
  if (store.state.settings.voiceURI && !voices.some((v) => v.voiceURI === store.state.settings.voiceURI)) {
    store.setSetting('voiceURI', '');
  }
  const isEdge = /Edg\//.test(navigator.userAgent);
  const naturals = voices.filter((v) => /natural|neural|online/i.test(v.name));

  if (naturals.length) {
    wrap.append(el('div', { class: 'card', style: { background: 'linear-gradient(150deg,#e9fbf7,#fff)' } },
      el('div', { class: 'strong', text: '✅ Vozes neurais encontradas' }),
      el('div', { class: 'small muted', text: `Este navegador oferece ${naturals.length} voz(es) natural(is) em português do Brasil — são as mesmas do Azure, sem custo. Use as que têm “Natural” no nome.` })));
  } else {
    wrap.append(el('div', { class: 'card card--warn' },
      el('div', { class: 'strong', text: 'Dica para melhorar muito o áudio' }),
      el('div', { class: 'small mt', text: 'Abra este app no Microsoft Edge: ele libera as vozes neurais da Microsoft (Francisca, Thalita, Antônio) de graça. No Chrome ficam só as vozes do sistema, mais robóticas.' }),
      el('div', { class: 'small muted mt', text: 'No tablet, instale o Edge e abra o mesmo endereço; depois escolha a voz aqui. No Edge do Android as vozes naturais também costumam aparecer.' })));
  }

  if (!voices.length) {
    wrap.append(el('div', { class: 'card card--warn' },
      el('div', { class: 'strong', text: 'Nenhuma voz pt-BR encontrada' }),
      el('div', { class: 'small mt', text: 'Instale o pacote “Português (Brasil)” no Google TTS/Android ou use o Edge com Francisca/Thalita. Vozes de Portugal não aparecem mais nesta lista.' })));
  }

  // controles de velocidade e tom
  const tune = el('div', { class: 'card' });
  tune.append(el('div', { class: 'card__title', text: 'Ajuste fino' }));
  const rateVal = el('div', { class: 'small muted' });
  const rateInput = el('input', { class: 'input', type: 'range', min: '0.7', max: '1.2', step: '0.05', value: String(rate) });
  const pitchVal = el('div', { class: 'small muted' });
  const pitchInput = el('input', { class: 'input', type: 'range', min: '0.85', max: '1.15', step: '0.01', value: String(pitch) });
  const paintTune = () => {
    rateVal.textContent = `Velocidade: ${rate.toFixed(2)}× ${rate <= 0.8 ? '(bem devagar)' : rate >= 1.05 ? '(rápida)' : ''}`;
    pitchVal.textContent = `Tom: ${pitch.toFixed(2)} ${pitch < 0.97 ? '(mais grave/calmo)' : pitch > 1.03 ? '(mais agudo)' : ''}`;
  };
  rateInput.addEventListener('input', () => { rate = Number(rateInput.value); paintTune(); });
  pitchInput.addEventListener('input', () => { pitch = Number(pitchInput.value); paintTune(); });
  tune.append(el('div', { class: 'field', style: { marginTop: '8px' } }, el('label', { text: 'Velocidade' }), rateInput, rateVal));
  tune.append(el('div', { class: 'field' }, el('label', { text: 'Tom' }), pitchInput, pitchVal));
  tune.append(el('div', { class: 'row row--wrap', style: { gap: '8px' } },
    el('button', { class: 'btn btn--soft btn--sm', 'on:click': () => speak(SAMPLE, { rate, pitch }) }, '▶ Ouvir frase de exemplo'),
    el('button', { class: 'btn btn--ghost btn--sm', 'on:click': () => { store.setSetting('rate', rate); store.setSetting('pitch', pitch); toast('Ajuste salvo', 'ok'); } }, 'Salvar ajuste')));
  paintTune();
  wrap.append(tune);

  const selectedURI = store.state.settings.voiceURI || pickVoice()?.voiceURI || '';
  const list = el('div', { class: 'col' });
  const ordered = voices.slice().sort((a, b) => {
    const score = (v) => (/natural|neural|online/i.test(v.name) ? 40 : 0) + (/francisca|thalita|maria/i.test(v.name) ? 8 : 0) + (/google/i.test(v.name) ? 5 : 0) + (String(v.lang || '').toLowerCase().replace(/_/g, '-') === 'pt-br' ? 6 : 0);
    return score(b) - score(a);
  });

  ordered.forEach((v) => {
    const natural = /natural|neural|online/i.test(v.name);
    const current = v.voiceURI === selectedURI;
    const row = el('div', {
      class: 'card card--flat',
      style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderColor: current ? 'var(--primary)' : '' },
    });
    const info = el('div', { class: 'grow', style: { minWidth: '0' } });
    info.append(el('div', { class: 'strong small', text: v.name }));
    const tags = [];
    if (natural) tags.push('natural (online)');
    else if (v.localService) tags.push('voz do sistema');
    else tags.push('online');
    tags.push(v.lang);
    info.append(el('div', { class: 'tiny muted', text: tags.join(' · ') }));
    row.append(info);
    row.append(el('button', {
      class: 'btn btn--soft btn--sm', 'on:click': () => { stopSpeaking(); speak(SAMPLE, { voiceURI: v.voiceURI, rate, pitch }); },
    }, '▶ Ouvir'));
    if (current) row.append(el('div', { class: 'pill pill--star', text: 'em uso' }));
    else row.append(el('button', {
      class: 'btn btn--primary btn--sm', 'on:click': () => { stopSpeaking(); store.setSetting('voiceURI', v.voiceURI); toast('Voz salva', 'ok'); renderVoiceLab(); },
    }, 'Usar'));
    list.append(row);
  });

  wrap.append(el('div', { class: 'section-title', text: `Vozes em português do Brasil (${voices.length})` }), list);

  wrap.append(el('div', { class: 'card card--soft small muted' },
    el('div', { class: 'strong', text: 'Por que a voz soa melhor em um navegador e não em outro?' }),
    el('div', { class: 'mt', text: 'O app usa a voz que o navegador oferece. Chrome no Windows entrega as vozes antigas do sistema (Daniel/Maria). O Edge entrega as vozes neurais da Microsoft. No Android, o Chrome usa o Google TTS, que é melhor que o do Windows.' }),
    el('div', { class: 'mt', text: 'Se ainda não ficar bom, o próximo passo é gerar os áudios do app com uma voz neural premium — veja docs/AUDIO.md.' })));

  if (isEdge) {
    wrap.append(el('div', { class: 'card', style: { background: '#eaf9f4', borderColor: '#bfe9d1' } },
      el('div', { class: 'small', text: 'Você está no Edge: escolha “Microsoft Francisca Online (Natural)” ou “Thalita multilíngue” para a voz mais natural.' })));
  }

  s.append(wrap);
}
