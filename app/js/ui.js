/* Componentes visuais compartilhados: Gabi (SVG), barras, modais, avisos. */
import { $, el, pick, sleep } from './utils.js';
import { state } from './store.js';

let uid = 0;

/** Coruja professora em SVG, com humores. */
export function gabiEl(mood = 'idle', cls = '') {
  const d = el('div', { class: `gabi ${cls}`.trim(), 'data-mood': mood, 'aria-hidden': 'true' });
  d.innerHTML = gabiSVG();
  return d;
}

/** Atualiza o humor (data-mood) de todas as Gabis visíveis na tela. */
export function setGabiMood(mood = 'idle') {
  try {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.gabi').forEach((g) => {
      g.setAttribute('data-mood', mood);
    });
  } catch { /* ignore */ }
}

export function gabiSVG() {
  const id = `g${++uid}`;
  return `
<svg viewBox="0 0 120 120" role="img" aria-label="Gabi, a coruja professora">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF9A6B"/><stop offset="1" stop-color="#E2542F"/>
    </linearGradient>
  </defs>
  <g class="gabi-body">
    <path d="M28 40 L18 12 L46 26 Z" fill="#C24E2E"/>
    <path d="M92 40 L102 12 L74 26 Z" fill="#C24E2E"/>
    <ellipse cx="60" cy="68" rx="42" ry="40" fill="url(#${id})"/>
    <ellipse cx="60" cy="83" rx="27" ry="23" fill="#FFEBD6"/>
    <ellipse class="wing wing--l" cx="19" cy="72" rx="9" ry="20" fill="#D9563A" transform="rotate(-8 19 72)"/>
    <ellipse class="wing wing--r" cx="101" cy="72" rx="9" ry="20" fill="#D9563A" transform="rotate(8 101 72)"/>
    <g class="eyes-open">
      <circle cx="45" cy="59" r="16" fill="#FFFDF7"/>
      <circle cx="75" cy="59" r="16" fill="#FFFDF7"/>
      <circle class="pupil" cx="45" cy="61" r="9" fill="#2E2A26"/>
      <circle class="pupil" cx="75" cy="61" r="9" fill="#2E2A26"/>
      <circle cx="41.5" cy="57" r="3" fill="#fff" opacity=".95"/>
      <circle cx="71.5" cy="57" r="3" fill="#fff" opacity=".95"/>
      <ellipse class="lid" cx="45" cy="59" rx="16" ry="16" fill="#E9673F"/>
      <ellipse class="lid" cx="75" cy="59" rx="16" ry="16" fill="#E9673F"/>
    </g>
    <g class="eyes-happy">
      <path d="M36 62 q9 -11 18 0" stroke="#2E2A26" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M66 62 q9 -11 18 0" stroke="#2E2A26" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    </g>
    <path class="beak" d="M60 68 L51 77 Q60 84 69 77 Z" fill="#F5A623"/>
    <circle cx="27" cy="74" r="6" fill="#FF7A59" opacity=".45"/>
    <circle cx="93" cy="74" r="6" fill="#FF7A59" opacity=".45"/>
    <g stroke="#F5A623" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M48 105 v9 M48 114 l-7 5 M48 114 l7 5"/>
      <path d="M72 105 v9 M72 114 l-7 5 M72 114 l7 5"/>
    </g>
    <g class="cap">
      <path d="M60 4 L96 19 L60 34 L24 19 Z" fill="#2E2A26"/>
      <path d="M46 24 v10 q14 9 28 0 V24" fill="#3A342E"/>
      <path d="M96 19 v15" stroke="#F5A623" stroke-width="3" stroke-linecap="round"/>
      <circle cx="96" cy="36" r="4" fill="#F5A623"/>
    </g>
    <g fill="none" stroke="#129C8E" stroke-width="3" stroke-linecap="round">
      <path class="wave" d="M104 48 q7 9 0 18"/>
      <path class="wave" d="M111 42 q11 15 0 30"/>
      <path class="wave" d="M118 36 q15 21 0 42"/>
    </g>
  </g>
</svg>`;
}

export function toast(msg, type = '') {
  const root = $('#toast-root');
  if (!root) return;
  const t = el('div', { class: `toast ${type ? 'toast--' + type : ''}`, text: msg });
  root.append(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2400);
  setTimeout(() => t.remove(), 2800);
}

export function confetti(n = 22) {
  if (state.settings.reduceMotion) return;
  const fx = $('#fx');
  if (!fx) return;
  const icons = ['⭐', '✨', '🎉', '💛', '🌟', '🎈'];
  for (let i = 0; i < n; i++) {
    const s = el('span', { class: 'confetti', text: pick(icons) });
    s.style.left = `${Math.random() * 92 + 2}%`;
    s.style.animationDelay = `${Math.random() * 0.35}s`;
    s.style.fontSize = `${18 + Math.random() * 18}px`;
    fx.append(s);
    setTimeout(() => s.remove(), 2000);
  }
}

export function flyingStars(n = 3) {
  if (state.settings.reduceMotion) return;
  const fx = $('#fx');
  if (!fx) return;
  for (let i = 0; i < n; i++) {
    const s = el('span', { class: 'flying-star', text: '⭐' });
    s.style.left = `${50 + (i - 1) * 12}%`;
    s.style.top = '58%';
    s.style.animationDelay = `${i * 0.12}s`;
    fx.append(s);
    setTimeout(() => s.remove(), 1600);
  }
}

export function starsHTML(n, total = 3) {
  let s = '';
  for (let i = 0; i < total; i++) s += `<span class="${i < n ? 'on' : 'off'}">★</span>`;
  return `<span class="stars">${s}</span>`;
}

export function progressRing(value, label) {
  const r = 40, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  const wrap = el('div', { class: 'ring' });
  wrap.innerHTML = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <circle class="ring-bg" cx="50" cy="50" r="${r}"></circle>
      <circle class="ring-fg" cx="50" cy="50" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 50 50)"></circle>
      <text x="50" y="57" text-anchor="middle">${label}</text>
    </svg>`;
  return wrap;
}

export function topbar(title, { onBack = null, right = null } = {}) {
  const row = el('div', { class: 'topbar' });
  if (onBack) {
    row.append(el('button', { class: 'btn--back', 'aria-label': 'Voltar', 'on:click': onBack }, '←'));
  }
  row.append(el('div', { class: 'topbar__title grow', text: title }));
  if (right) row.append(right);
  return row;
}

export function tabbar(active = 'home') {
  const nav = $('#tabbar');
  if (!nav) return;
  const items = [
    { id: 'home', ico: '🏠', label: 'Início', href: '#/' },
    { id: 'trilha', ico: '🗺️', label: 'Trilha', href: '#/trilha' },
    { id: 'revisar', ico: '🔁', label: 'Revisar', href: '#/revisar' },
    { id: 'pais', ico: '👨‍👩‍👧', label: 'Pais', href: '#/pais' },
  ];
  nav.innerHTML = '';
  for (const it of items) {
    nav.append(el('button', {
      class: `tab ${active === it.id ? 'active' : ''}`,
      'aria-label': it.label,
      'on:click': () => { location.hash = it.href; },
    }, el('span', { class: 'tab__ico', text: it.ico }), el('span', { text: it.label })));
  }
  nav.hidden = false;
}

export function hideTabbar() {
  const nav = $('#tabbar');
  if (nav) nav.hidden = true;
}

/** Modal genérico. Retorna Promise com o valor da ação escolhida. */
export function modal({ title = '', body = '', actions = [{ label: 'Ok', value: true, primary: true }], dismissible = true, className = '' } = {}) {
  const root = $('#modal-root');
  root.innerHTML = '';
  root.classList.add('open');
  const card = el('div', { class: `modal__card ${className}`.trim() });
  if (title) card.append(el('div', { class: 'modal__title', html: title }));
  if (body) {
    const b = el('div', { class: 'modal__body' });
    if (body instanceof Node) b.append(body);
    else b.innerHTML = body;
    card.append(b);
  }
  const actRow = el('div', { class: 'modal__actions' });
  let resolveFn;
  const done = (v) => { root.classList.remove('open'); root.innerHTML = ''; resolveFn?.(v); };
  actions.forEach((a) => {
    actRow.append(el('button', {
      class: `btn ${a.primary ? 'btn--primary' : a.danger ? 'btn--danger' : 'btn--soft'}`,
      'on:click': () => (a.onClick ? a.onClick(done) : done(a.value)),
    }, a.label));
  });
  card.append(actRow);
  const back = el('div', { class: 'modal', 'on:click': (e) => { if (e.target === back && dismissible) done(null); } }, card);
  root.append(back);
  return new Promise((res) => { resolveFn = res; });
}

export function closeModal() {
  const root = $('#modal-root');
  if (root) { root.classList.remove('open'); root.innerHTML = ''; }
}

/** Portão dos pais por PIN (se configurado). */
export function pinGate() {
  const pin = state.settings.pin;
  if (!pin || pin.length < 4) return Promise.resolve(true);
  return new Promise((resolve) => {
    let typed = '';
    const root = $('#modal-root');
    root.innerHTML = '';
    root.classList.add('open');
    const dots = el('div', { class: 'pin-dots' });
    const paint = () => {
      dots.innerHTML = '';
      for (let i = 0; i < 4; i++) dots.append(el('i', { class: i < typed.length ? 'on' : '' }));
    };
    paint();
    const hint = el('div', { class: 'muted small pin-hint', text: 'Digite o PIN de 4 números.' });
    const pad = el('div', { class: 'pinpad' });
    const card = el('div', { class: 'modal__card' },
      el('div', { class: 'modal__title', text: 'Área dos pais' }),
      hint, dots, pad);
    const finish = (ok) => { closeModal(); resolve(ok); };
    const fail = () => {
      typed = '';
      paint();
      hint.textContent = 'PIN incorreto. Tente de novo.';
      hint.classList.add('pin-hint--err');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 460);
    };
    const push = (d) => {
      if (typed.length >= 4) return;
      typed += d;
      paint();
      if (typed.length === 4) setTimeout(() => { if (typed === pin) finish(true); else fail(); }, 140);
    };
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✕'].forEach((k) => {
      pad.append(el('button', {
        class: 'key',
        'on:click': () => {
          if (k === '⌫') { typed = typed.slice(0, -1); paint(); }
          else if (k === '✕') finish(false);
          else push(k);
        },
      }, k));
    });
    root.append(el('div', { class: 'modal' }, card));
  });
}

export async function confirmDialog(message, { okLabel = 'Sim', cancelLabel = 'Não', danger = false } = {}) {
  const r = await modal({
    title: 'Confirmar',
    body: `<p>${message}</p>`,
    actions: [
      { label: cancelLabel, value: false },
      { label: okLabel, value: true, primary: !danger, danger },
    ],
  });
  return !!r;
}

export function screenRoot() { return $('#screen'); }

export function clearScreen() {
  const s = screenRoot();
  s.innerHTML = '';
  s.classList.remove('screen--flush');
  s.scrollTop = 0;
  return s;
}

export { sleep };
