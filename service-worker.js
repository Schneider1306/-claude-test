// Простой сервис-воркер для установки PWA и работы офлайн.
// Стратегия: stale-while-revalidate — сначала показываем из кеша, затем обновляем.

const CACHE = 'lfc-cache-v1';
const BASE = '/-claude-test/';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([BASE]).catch(() => undefined))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);

      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);

      // Для навигаций офлайн — отдаём кешированную стартовую страницу.
      if (request.mode === 'navigate') {
        return cached || (await network) || (await cache.match(BASE));
      }

      return cached || (await network) || new Response('', { status: 504 });
    })()
  );
});
