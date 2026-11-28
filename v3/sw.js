const CACHE_NAME = 'ogretmenim-v3-shell-2026-11-28-temrin';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest',
  './apple-touch-icon.png', './ogretmenim-icon.png', './icon-192.png', './icon-512.png'
];
const EXTERNAL_ASSETS = [
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(EXTERNAL_ASSETS.map(async asset => {
      const response = await fetch(asset, { mode: 'no-cors' });
      if (response && (response.ok || response.type === 'opaque')) await cache.put(asset, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('ogretmenim-v3-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', fresh.clone());
          return fresh;
        } catch (_) {
          return (await caches.match(request)) || (await caches.match('./index.html'));
        }
      })());
    } else {
      event.respondWith((async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && (fresh.ok || fresh.type === 'opaque')) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (_) {
          return cached || Response.error();
        }
      })());
    }
    return;
  }
  // CDN libraries are cached after their first successful online download.
  if (['script', 'style', 'font'].includes(request.destination) &&
      (url.hostname.includes('gstatic.com') || url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('jsdelivr.net'))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const fresh = await fetch(request);
        if (fresh && (fresh.ok || fresh.type === 'opaque')) await cache.put(request, fresh.clone());
        return fresh;
      } catch (_) {
        return cached || Response.error();
      }
    })());
  }
});
