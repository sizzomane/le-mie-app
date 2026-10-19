// Service worker: keeps the whole app available offline.
const CACHE = 'viaggi-v10';
const FILES = [
  './',
  'index.html',
  'fonts.css',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vendor/pdf.min.js',
  'vendor/pdf.worker.min.js',
  'fonts/be-vietnam-pro-latin-400-normal.woff2',
  'fonts/be-vietnam-pro-latin-500-normal.woff2',
  'fonts/be-vietnam-pro-latin-700-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-400-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-500-normal.woff2',
  'fonts/be-vietnam-pro-latin-ext-700-normal.woff2',
  'fonts/be-vietnam-pro-vietnamese-400-normal.woff2',
  'fonts/be-vietnam-pro-vietnamese-500-normal.woff2',
  'fonts/be-vietnam-pro-vietnamese-700-normal.woff2',
  'fonts/bricolage-grotesque-latin-700-normal.woff2',
  'fonts/bricolage-grotesque-latin-ext-700-normal.woff2',
  'fonts/bricolage-grotesque-vietnamese-700-normal.woff2'
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version never stores old files
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // App page: network first (so updates arrive when online), cache as fallback.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }
  // Everything else: cache first.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
