const CACHE_PREFIX = 'ctr-studio-open-';
const CACHE = `${CACHE_PREFIX}v2-shell-v8`;
const SHELL = ['/', '/studio.html', '/ctr-v2-site.css', '/ctr-studio-v2.css', '/ctr-shuffle.css', '/studio-core.js', '/ctr-studio-v2.js', '/site.js', '/ctr-icon.svg', '/ctr-icon-192.png', '/ctr-icon-512.png', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type === 'basic') caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return caches.match(url.pathname.startsWith('/studio') ? '/studio.html' : '/');
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
