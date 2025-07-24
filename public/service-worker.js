const CACHE_NAME = 'bolt-pwa-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  // Adicione outros arquivos essenciais do seu app aqui
];

// Instala e faz cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Limpa caches antigos na ativação
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Busca recursos no cache, depois na rede, com fallback offline
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request)
          .then((fetchRes) => {
            // Opcional: salva novas respostas no cache
            if (
              fetchRes &&
              fetchRes.status === 200 &&
              fetchRes.type === 'basic'
            ) {
              const resClone = fetchRes.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, resClone);
              });
            }
            return fetchRes;
          })
          .catch(() => {
            // Fallback offline para HTML
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          })
      );
    })
  );
});
