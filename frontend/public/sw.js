// Service Worker - Central Gás (PWA)
const CACHE = 'central-gas-v1';
const ESTATICOS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// Instalação: faz cache dos arquivos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESTATICOS)));
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first para /api, cache-first para o resto
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ erro: 'Sem conexão' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((resp) => {
          if (event.request.method === 'GET' && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        }).catch(() => caches.match('/index.html'))
      );
    })
  );
});
