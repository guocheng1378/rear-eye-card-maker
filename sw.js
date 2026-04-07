const CACHE_NAME = 'jcm-v11';
// Core assets precached on install (lightweight)
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './lib/jszip.min.js',
  './js/main.js',
  './js/state.js',
  './js/utils.js',
  './js/devices.js',
  './js/maml.js',
  './js/live-preview.js',
  './js/ui/index.js',
  './js/ui/toast.js',
  './js/ui/steps.js',
  './js/ui/config-panel.js',
  './js/templates/index.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  var url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  var isDoc = e.request.mode === 'navigate';
  var isCode = /\.(js|css|html?)$/i.test(url.pathname);

  if (isDoc || isCode) {
    // Network-first: always try fresh, fall back to cache
    e.respondWith(
      fetch(e.request).then(function (resp) {
        // Update cache in background
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (r) {
          return r || (isDoc ? caches.match('./index.html') : r);
        });
      })
    );
  } else {
    // Cache-first for images, icons, fonts
    e.respondWith(
      caches.match(e.request).then(function (r) {
        if (r) return r;
        return fetch(e.request).then(function (resp) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, clone); });
          return resp;
        });
      })
    );
  }
});
