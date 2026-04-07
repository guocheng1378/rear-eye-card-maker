const CACHE_NAME = 'jcm-v8';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './lib/jszip.min.js',
  // Modules
  './js/main.js',
  './js/state.js',
  './js/utils.js',
  './js/devices.js',
  './js/maml.js',
  './js/canvas.js',
  './js/history.js',
  './js/live-preview.js',
  './js/ui.js',
  // Compat scripts
  './js/export.js',
  './js/transcode.js',
  './js/storage.js',
  './js/changelog.js',
  // Templates
  './js/templates/index.js',
  './js/templates/clock.js',
  './js/templates/quote.js',
  './js/templates/battery.js',
  './js/templates/status.js',
  './js/templates/countdown.js',
  './js/templates/music.js',
  './js/templates/gradient.js',
  './js/templates/weather.js',
  './js/templates/steps.js',
  './js/templates/calendar.js',
  './js/templates/dualclock.js',
  './js/templates/dailyquote.js',
  './js/templates/ring.js',
  './js/templates/dashboard.js',
  './js/templates/image.js',
  './js/templates/custom.js',
  './js/templates/weather_real.js',
  './js/templates/music_real.js',
  // Icons
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
