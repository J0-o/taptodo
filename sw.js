const CACHE_NAME = 'todoapp-v3';
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './assets/fonts.css',
  './assets/vendor/inter/400.css',
  './assets/vendor/inter/600.css',
  './assets/vendor/inter/700.css',
  './assets/vendor/inter/files/inter-cyrillic-400-italic.woff',
  './assets/vendor/inter/files/inter-cyrillic-400-italic.woff2',
  './assets/vendor/inter/files/inter-cyrillic-400-normal.woff',
  './assets/vendor/inter/files/inter-cyrillic-400-normal.woff2',
  './assets/vendor/inter/files/inter-cyrillic-600-italic.woff',
  './assets/vendor/inter/files/inter-cyrillic-600-italic.woff2',
  './assets/vendor/inter/files/inter-cyrillic-600-normal.woff',
  './assets/vendor/inter/files/inter-cyrillic-600-normal.woff2',
  './assets/vendor/inter/files/inter-cyrillic-700-italic.woff',
  './assets/vendor/inter/files/inter-cyrillic-700-italic.woff2',
  './assets/vendor/inter/files/inter-cyrillic-700-normal.woff',
  './assets/vendor/inter/files/inter-cyrillic-700-normal.woff2',
  './assets/vendor/inter/files/inter-cyrillic-ext-400-italic.woff',
  './assets/vendor/inter/files/inter-cyrillic-ext-400-italic.woff2',
  './assets/vendor/inter/files/inter-cyrillic-ext-400-normal.woff',
  './assets/vendor/inter/files/inter-cyrillic-ext-400-normal.woff2',
  './assets/vendor/inter/files/inter-cyrillic-ext-600-italic.woff',
  './assets/vendor/inter/files/inter-cyrillic-ext-600-italic.woff2',
  './assets/vendor/inter/files/inter-cyrillic-ext-600-normal.woff',
  './assets/vendor/inter/files/inter-cyrillic-ext-600-normal.woff2',
  './assets/vendor/inter/files/inter-cyrillic-ext-700-italic.woff',
  './assets/vendor/inter/files/inter-cyrillic-ext-700-italic.woff2',
  './assets/vendor/inter/files/inter-cyrillic-ext-700-normal.woff',
  './assets/vendor/inter/files/inter-cyrillic-ext-700-normal.woff2',
  './assets/vendor/inter/files/inter-greek-400-italic.woff',
  './assets/vendor/inter/files/inter-greek-400-italic.woff2',
  './assets/vendor/inter/files/inter-greek-400-normal.woff',
  './assets/vendor/inter/files/inter-greek-400-normal.woff2',
  './assets/vendor/inter/files/inter-greek-600-italic.woff',
  './assets/vendor/inter/files/inter-greek-600-italic.woff2',
  './assets/vendor/inter/files/inter-greek-600-normal.woff',
  './assets/vendor/inter/files/inter-greek-600-normal.woff2',
  './assets/vendor/inter/files/inter-greek-700-italic.woff',
  './assets/vendor/inter/files/inter-greek-700-italic.woff2',
  './assets/vendor/inter/files/inter-greek-700-normal.woff',
  './assets/vendor/inter/files/inter-greek-700-normal.woff2',
  './assets/vendor/inter/files/inter-greek-ext-400-italic.woff',
  './assets/vendor/inter/files/inter-greek-ext-400-italic.woff2',
  './assets/vendor/inter/files/inter-greek-ext-400-normal.woff',
  './assets/vendor/inter/files/inter-greek-ext-400-normal.woff2',
  './assets/vendor/inter/files/inter-greek-ext-600-italic.woff',
  './assets/vendor/inter/files/inter-greek-ext-600-italic.woff2',
  './assets/vendor/inter/files/inter-greek-ext-600-normal.woff',
  './assets/vendor/inter/files/inter-greek-ext-600-normal.woff2',
  './assets/vendor/inter/files/inter-greek-ext-700-italic.woff',
  './assets/vendor/inter/files/inter-greek-ext-700-italic.woff2',
  './assets/vendor/inter/files/inter-greek-ext-700-normal.woff',
  './assets/vendor/inter/files/inter-greek-ext-700-normal.woff2',
  './assets/vendor/inter/files/inter-latin-400-italic.woff',
  './assets/vendor/inter/files/inter-latin-400-italic.woff2',
  './assets/vendor/inter/files/inter-latin-400-normal.woff',
  './assets/vendor/inter/files/inter-latin-400-normal.woff2',
  './assets/vendor/inter/files/inter-latin-600-italic.woff',
  './assets/vendor/inter/files/inter-latin-600-italic.woff2',
  './assets/vendor/inter/files/inter-latin-600-normal.woff',
  './assets/vendor/inter/files/inter-latin-600-normal.woff2',
  './assets/vendor/inter/files/inter-latin-700-italic.woff',
  './assets/vendor/inter/files/inter-latin-700-italic.woff2',
  './assets/vendor/inter/files/inter-latin-700-normal.woff',
  './assets/vendor/inter/files/inter-latin-700-normal.woff2',
  './assets/vendor/inter/files/inter-latin-ext-400-italic.woff',
  './assets/vendor/inter/files/inter-latin-ext-400-italic.woff2',
  './assets/vendor/inter/files/inter-latin-ext-400-normal.woff',
  './assets/vendor/inter/files/inter-latin-ext-400-normal.woff2',
  './assets/vendor/inter/files/inter-latin-ext-600-italic.woff',
  './assets/vendor/inter/files/inter-latin-ext-600-italic.woff2',
  './assets/vendor/inter/files/inter-latin-ext-600-normal.woff',
  './assets/vendor/inter/files/inter-latin-ext-600-normal.woff2',
  './assets/vendor/inter/files/inter-latin-ext-700-italic.woff',
  './assets/vendor/inter/files/inter-latin-ext-700-italic.woff2',
  './assets/vendor/inter/files/inter-latin-ext-700-normal.woff',
  './assets/vendor/inter/files/inter-latin-ext-700-normal.woff2',
  './assets/vendor/inter/files/inter-vietnamese-400-italic.woff',
  './assets/vendor/inter/files/inter-vietnamese-400-italic.woff2',
  './assets/vendor/inter/files/inter-vietnamese-400-normal.woff',
  './assets/vendor/inter/files/inter-vietnamese-400-normal.woff2',
  './assets/vendor/inter/files/inter-vietnamese-600-italic.woff',
  './assets/vendor/inter/files/inter-vietnamese-600-italic.woff2',
  './assets/vendor/inter/files/inter-vietnamese-600-normal.woff',
  './assets/vendor/inter/files/inter-vietnamese-600-normal.woff2',
  './assets/vendor/inter/files/inter-vietnamese-700-italic.woff',
  './assets/vendor/inter/files/inter-vietnamese-700-italic.woff2',
  './assets/vendor/inter/files/inter-vietnamese-700-normal.woff',
  './assets/vendor/inter/files/inter-vietnamese-700-normal.woff2',
  './assets/vendor/material-symbols/rounded.css',
  './assets/vendor/material-symbols/material-symbols-rounded.woff2',
  './themes.js',
  './todo-utils.js',
  './storage.js',
  './images.js',
  './interactions.js',
  './render.js',
  './app.js',
  './manifest.webmanifest',
  './themes/dark.css',
  './themes/light.css',
  './themes/heatmap.css',
  './themes/sepia.css',
  './icon/favicon.ico',
  './icon/favicon-16x16.png',
  './icon/favicon-32x32.png',
  './icon/apple-touch-icon.png',
  './icon/icon-192.png',
  './icon/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  const isManifestRequest = requestUrl.pathname.endsWith('/manifest.webmanifest') || requestUrl.pathname.endsWith('manifest.webmanifest');

  if (isManifestRequest) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
