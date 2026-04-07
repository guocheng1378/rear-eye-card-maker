const CACHE_NAME = 'jcm-v10';
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
  // UI
  './js/ui/index.js',
  './js/ui/toast.js',
  './js/ui/steps.js',
  './js/ui/code-editor.js',
  './js/ui/elements.js',
  './js/ui/config-panel.js',
  './js/ui/template-market.js',
  './js/ui/card-library-ui.js',
  './js/ui/share.js',
  './js/ui/qr-share.js',
  './js/ui/design-tools.js',
  './js/ui/binding-wizard.js',
  './js/ui/command-palette.js',
  './js/ui/linter-tools.js',
  './js/ui/version-snapshots.js',
  './js/ui/export-adb.js',
  // Compat scripts
  './js/export.js',
  './js/transcode.js',
  './js/storage.js',
  './js/changelog.js',
  './js/card-library.js',
  './js/i18n.js',
  // Templates
  './js/templates/index.js',
  './js/templates/battery.js',
  './js/templates/calendar.js',
  './js/templates/carousel.js',
  './js/templates/clock.js',
  './js/templates/countdown.js',
  './js/templates/custom.js',
  './js/templates/dailyquote.js',
  './js/templates/dashboard.js',
  './js/templates/dualclock.js',
  './js/templates/gradient.js',
  './js/templates/health.js',
  './js/templates/image.js',
  './js/templates/lyrics.js',
  './js/templates/music.js',
  './js/templates/music_real.js',
  './js/templates/notification.js',
  './js/templates/quick_settings.js',
  './js/templates/quote.js',
  './js/templates/ring.js',
  './js/templates/schedule.js',
  './js/templates/status.js',
  './js/templates/steps.js',
  './js/templates/video_wallpaper.js',
  './js/templates/weather.js',
  './js/templates/weather_real.js',
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
