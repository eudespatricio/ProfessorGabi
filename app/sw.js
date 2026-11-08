/* Service Worker: app + áudio offline depois da primeira visita.
   - CORE: casca do app (HTML, CSS, JS, fontes, ícones)
   - ÁUDIO: clipes Opus (4 MB) e índices, em cache próprio que sobrevive a upgrades
   - Navegação: rede primeiro, cache como rede de segurança
   - Demais arquivos: cache primeiro, atualizando em segundo plano */
const VERSION = 'gabi-v37';
const AUDIO_CACHE = 'gabi-audio-v1';
const AUDIO_INDEX = 'audio/index-opus.json';
const CORE = [
  './',
  './css/app.css',
  './css/game.css',
  './css/polish.css',
  './fonts/atkinson-400.woff2',
  './fonts/atkinson-700.woff2',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/audio.js',
  './js/content-units.js',
  './js/content.js',
  './js/curriculum.js',
  './js/exercises.js',
  './js/glossary.js',
  './js/guided.js',
  './js/main.js',
  './js/ocr-fix.js',
  './js/screen-book.js',
  './js/screen-home.js',
  './js/screen-lesson.js',
  './js/screen-parent.js',
  './js/screen-search.js',
  './js/screen-talk.js',
  './js/screen-voice.js',
  './js/speech.js',
  './js/store.js',
  './js/syllables.js',
  './js/tutor.js',
  './js/ui.js',
  './js/utils.js',
  './js/version.js',
  './js/word-card.js',
  './js/wordlist-pt.js',
  './manifest.webmanifest',
];

let precachePromise = null;
let opusUrlsCache = null;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const results = await Promise.all(CORE.map(async (url) => {
      try { await cache.add(url); return true; } catch { return false; }
    }));
    const failed = results.map((ok, i) => (ok ? null : CORE[i])).filter(Boolean);
    // Sem o CORE completo, não ativa esta versão: melhor continuar na antiga do que
    // apagar o cache e deixar o app quebrado offline.
    if (failed.length) {
      throw new Error(`sem rede para ${failed.length} arquivo(s) do CORE: ${failed.join(', ')}`);
    }
    // Ativa a nova versão imediatamente sem travar a instalação em 20s de download de áudio.
    // O pré-cache de áudio roda em segundo plano sem bloquear o boot nem a troca do SW.
    precacheAudio(15000).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await migrateAudioFrom(keys);
    await Promise.all(keys
      .filter((k) => k !== VERSION && k !== AUDIO_CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Áudio tem cache próprio e imutável, inclusive para pedidos com Range.
  if (url.pathname.includes('/audio/')) {
    event.respondWith(audioResponse(req));
    return;
  }

  // navegação: rede com timeout curto (1.2s) e cache como resposta imediata se o servidor demorar
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 1200) : null;
      try {
        const fresh = await fetch(req, ctrl ? { signal: ctrl.signal } : undefined);
        clearTimeout(timer);
        const cache = await caches.open(VERSION);
        cache.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        clearTimeout(timer);
        const cached = await caches.match('./index.html');
        return cached || new Response('Sem conexão', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      fetch(req).then((res) => {
        if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res)).catch(() => {});
      }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const c = await caches.open(VERSION);
        c.put(req, res.clone()).catch(() => {});
      }
      return res;
    } catch {
      return new Response('', { status: 504 });
    }
  })());
});

/* ------------------------------ áudio offline ------------------------------ */

async function audioResponse(req) {
  const cache = await caches.open(AUDIO_CACHE);
  const hit = await cache.match(req.url);
  if (hit) return hit;

  // áudio que já tinha sido cacheado por uma versão anterior do app
  const appCache = await caches.open(VERSION);
  const old = await appCache.match(req.url);
  if (old) {
    cache.put(req.url, old.clone()).catch(() => {});
    return old;
  }

  try {
    const res = await fetch(req);
    // Só guardamos a resposta inteira (200). Um 206 parcial não serve para tocar offline.
    if (res && res.status === 200) cache.put(req.url, res.clone()).catch(() => {});
    return res;
  } catch {
    return new Response('', { status: 504 });
  }
}

/** Baixa os clipes Opus e os índices para o cache de áudio, sem travar o app. */
async function precacheAudio(maxMs = 20000) {
  if (precachePromise) return precachePromise;
  const started = Date.now();
  precachePromise = (async () => {
    const cache = await caches.open(AUDIO_CACHE);
    for (const file of ['audio/index.json', AUDIO_INDEX]) {
      try {
        if (await cache.match(file)) continue;
        const res = await fetch(file);
        if (res && res.ok) await cache.put(file, res);
      } catch { /* segue com o que der */ }
    }

    const urls = await opusUrls();
    const queue = urls.slice();
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length && Date.now() - started < maxMs) {
        const file = queue.shift();
        try {
          if (await cache.match(file)) continue;
          const res = await fetch(file);
          if (res && res.status === 200) await cache.put(file, res);
        } catch { /* uma falha não impede as outras */ }
      }
    });
    await Promise.all(workers);
  })().finally(() => { precachePromise = null; });
  return precachePromise;
}

async function opusUrls() {
  if (opusUrlsCache) return opusUrlsCache;
  try {
    const res = (await caches.match(AUDIO_INDEX)) || (await fetch(AUDIO_INDEX));
    if (res && res.ok) {
      const index = await res.json();
      opusUrlsCache = [...new Set(Object.values(index).filter((u) => typeof u === 'string' && /(^|\/)audio\/opus\//.test(u)))];
      return opusUrlsCache;
    }
  } catch { /* offline sem índice: tenta de novo na próxima */ }
  return opusUrlsCache || [];
}

async function audioStatus() {
  const [urls, cache] = await Promise.all([opusUrls(), caches.open(AUDIO_CACHE)]);
  const keys = await cache.keys();
  const have = new Set(keys.map((r) => new URL(r.url).pathname));
  const cached = urls.filter((u) => have.has(new URL(u, self.location.href).pathname)).length;
  return { version: VERSION, total: urls.length, cached };
}

/** Aproveita o áudio que tinha sido guardado no cache da versão antiga. */
async function migrateAudioFrom(keys) {
  const dest = await caches.open(AUDIO_CACHE);
  for (const key of keys) {
    if (key === VERSION || key === AUDIO_CACHE) continue;
    let cache;
    try { cache = await caches.open(key); } catch { continue; }
    let requests = [];
    try { requests = await cache.keys(); } catch { continue; }
    for (const req of requests) {
      if (!new URL(req.url).pathname.includes('/audio/')) continue;
      try {
        if (await dest.match(req.url)) continue;
        const res = await cache.match(req);
        if (res) await dest.put(req.url, res);
      } catch { /* segue */ }
    }
  }
}

/* ------------------------------- mensagens ------------------------------- */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  const reply = (payload) => {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
    else if (event.source) event.source.postMessage(payload);
  };
  if (data.type === 'gabi-audio-status') {
    event.waitUntil((async () => {
      try { reply({ type: 'gabi-audio-status', ok: true, ...(await audioStatus()) }); }
      catch (e) { reply({ type: 'gabi-audio-status', ok: false, error: String(e?.message || e) }); }
    })());
  }
  if (data.type === 'gabi-precache-audio') {
    event.waitUntil((async () => {
      try {
        await precacheAudio(60000);
        reply({ type: 'gabi-precache-audio', ok: true, ...(await audioStatus()) });
      } catch (e) {
        reply({ type: 'gabi-precache-audio', ok: false, error: String(e?.message || e) });
      }
    })());
  }
});
