// Network-first service worker: always tries the newest version, falls back to cache when offline.
const CACHE = 'pickle-rush-v6';
const CORE = ['./', 'index.html', 'catalog.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname.includes('/api/') || url.pathname.endsWith('/ws')) return;
  e.respondWith(fetch(e.request).then((res) => {
    const cdn = /(^|\.)(tailwindcss\.com|googleapis\.com|gstatic\.com)$/.test(url.hostname);
    if ((res.ok && url.origin === location.origin) || cdn) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
