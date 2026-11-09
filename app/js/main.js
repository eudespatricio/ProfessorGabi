/* Ponto de entrada: configurações, rotas e instalação da PWA. */
import * as store from './store.js';
import { initAudio, unlockAudio, ttsSupported, audioDiagnostics } from './audio.js';
import { APP_VERSION } from './version.js';
import { renderHome, renderTrilha, renderStickers, renderHistorias, renderOnboarding } from './screen-home.js';
import { renderLesson, renderReview, renderDiagnostic } from './screen-lesson.js';
import { renderParent } from './screen-parent.js';
import { renderVoiceLab } from './screen-voice.js';
import { renderBook } from './screen-book.js';
import { renderSearch } from './screen-search.js';
import { renderTalk } from './screen-talk.js';
import { clearScreen, tabbar, toast } from './ui.js';
import { el } from './utils.js';

function applySettings() {
  const st = store.state.settings;
  document.documentElement.style.setProperty('--read-scale', String(st.readScale || 1));
  document.documentElement.classList.toggle('reduce-motion', !!st.reduceMotion);
}

function route() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const query = new URLSearchParams(queryPart || '');

  if (!store.state.onboarded && parts[0] !== 'onboarding' && parts[0] !== 'diag') {
    location.replace('#/onboarding');
    return;
  }

  try {
    switch (parts[0]) {
      case undefined:
        renderHome(); break;
      case 'trilha':
        renderTrilha(); break;
      case 'licao':
        renderLesson(parts[1] || 'u1', Number(parts[2] || 0)); break;
      case 'revisar':
        renderReview(); break;
      case 'diag':
        renderDiagnostic({ firstRun: !store.state.onboarded }); break;
      case 'pais':
        renderParent(); break;
      case 'vozes':
        renderVoiceLab(); break;
      case 'livro':
        renderBook(); break;
      case 'caca':
        renderSearch({ bonus: query.get('bonus') === '1' }); break;
      case 'adesivos':
        renderStickers(); break;
      case 'historias':
        renderHistorias(); break;
      case 'conversar':
        renderTalk(); break;
      case 'onboarding':
        renderOnboarding(); break;
      default:
        renderHome();
    }
  } catch (err) {
    console.error('Erro ao abrir a tela', err);
    const s = clearScreen();
    s.append(el('div', { class: 'wrap card card--warn', style: { marginTop: '20px' } },
      el('div', { class: 'card__title', text: 'Ops! Algo deu errado.' }),
      el('div', { class: 'small muted mt', text: String(err?.message || err) }),
      el('button', { class: 'btn btn--soft mt', 'on:click': () => { location.hash = '#/'; } }, 'Voltar ao início')));
  }
  // a tabbar some nas telas que ocupam a tela toda
  if (['licao', 'revisar', 'diag', 'onboarding'].includes(parts[0])) {
    document.getElementById('tabbar').hidden = true;
  }
  const banner = document.getElementById('install-banner');
  if (banner) banner.hidden = parts.length > 0;
}

const INSTALL_DISMISSED = 'gabi.install.dismissed';

function installBanner() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  // só na tela inicial e só se a família ainda não fechou o aviso
  const onHome = () => !location.hash || location.hash === '#/' || location.hash === '#';
  if (!onHome() || localStorage.getItem(INSTALL_DISMISSED) === '1') return;
  const elBar = el('div', {
    class: 'card',
    id: 'install-banner',
    style: {
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(84px + env(safe-area-inset-bottom))',
      zIndex: '75', width: 'min(92vw, 460px)', display: 'flex', gap: '10px', alignItems: 'center',
      padding: '10px 12px', borderRadius: '18px',
    },
  });
  elBar.append(el('div', { style: { fontSize: '22px' }, text: '📲' }));
  elBar.append(el('div', { class: 'grow small', text: 'Instale o Gabi no tablet para abrir com um toque, sem internet.' }));
  const btn = el('button', { class: 'btn btn--primary btn--sm', text: 'Instalar' });
  btn.addEventListener('click', async () => {
    const p = window.__gabiInstall;
    if (!p) return;
    p.prompt();
    const choice = await p.userChoice;
    if (choice?.outcome === 'accepted') { elBar.remove(); toast('Gabi instalado!', 'ok'); }
    window.__gabiInstall = null;
  });
  const close = el('button', { class: 'btn btn--ghost btn--sm', text: '✕', 'aria-label': 'Fechar' });
  close.addEventListener('click', () => { try { localStorage.setItem(INSTALL_DISMISSED, '1'); } catch { /* ignore */ } elBar.remove(); });
  elBar.append(btn, close);
  document.body.append(elBar);
}

function boot() {
  store.load();
  applySettings();
  initAudio();

  // visível no console e em chrome://inspect — útil para conferir o tablet
  document.documentElement.dataset.gabiVersion = APP_VERSION;
  window.__gabi = { version: APP_VERSION, audio: () => audioDiagnostics() };
  console.info(`Gabi ${APP_VERSION}`);

  document.getElementById('boot').hidden = true;
  document.getElementById('app').hidden = false;

  document.addEventListener('pointerdown', () => unlockAudio(), { once: true });
  document.addEventListener('keydown', () => unlockAudio(), { once: true });

  window.addEventListener('hashchange', () => {
    if (location.hash) route();
    else renderHome();
  });

  if (!location.hash) {
    if (store.state.onboarded) renderHome();
    else { location.hash = '#/onboarding'; }
  } else {
    route();
  }

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update().catch(() => {}))
      .catch((e) => console.warn('SW:', e?.message));
  }

  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__gabiInstall = e;
    installBanner();
  });

  window.addEventListener('appinstalled', () => {
    toast('Pronto! O Gabi está na tela inicial do tablet.', 'ok');
  });

  if (!ttsSupported()) {
    setTimeout(() => toast('Este navegador não tem voz. O app funciona, mas a Gabi não fala.', 'warn'), 1200);
  }
}

boot();
