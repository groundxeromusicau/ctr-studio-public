const CACHE = 'ctr-studio-open-v2-shell-v6';
const SHELL = ['/', '/studio.html', '/ctr-v2-site.css', '/ctr-studio-v2.css', '/ctr-shuffle.css', '/ctr-studio-v2.js', '/ctr-icon.svg', '/manifest.webmanifest'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request).then(cached => cached || caches.match(event.request.mode === 'navigate' && new URL(event.request.url).pathname.includes('studio') ? '/studio.html' : '/'))));
});
