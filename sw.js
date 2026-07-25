const CACHE_NAME = 'colormatch-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './dist/script.js',
  './img/icon/icon128.png',
  './img/icon/icon512.png',
  './manifest.json',
];

// The app shell must never be a version behind: cache-first served stale code
// for a whole load after every deploy. Static art can stay cache-first.
function isShell(url) {
  return url.pathname.endsWith('/')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.css')
    || url.pathname.endsWith('.js');
}

// Install — cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  const store = (response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
    }
    return response;
  };

  if (isShell(url)) {
    // Network-first: fresh when online, cached copy when not.
    e.respondWith(
      fetch(e.request)
        .then(store)
        .catch(() => caches.match(e.request).then((c) => c || Response.error()))
    );
    return;
  }

  // Cache-first with background refresh for everything else.
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetching = fetch(e.request).then(store).catch(() => cached);
      return cached || fetching;
    })
  );
});
