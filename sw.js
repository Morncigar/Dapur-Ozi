const CACHE_NAME = 'dapur-ozi-admin-v1';

const FILES_TO_CACHE = [
  '/admin',
  '/admin.html',
  '/admin.js',
  '/style.css',
  '/assets/logo-mark.svg',
  '/assets/logo-full.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
