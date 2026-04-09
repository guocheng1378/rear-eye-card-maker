const CACHE_NAME = 'jcm-v13';
// Core assets precached on install (lightweight)
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './lib/jszip.min.js',
  './manifest.json',
  // Core
  './js/early-init.js',
  './js/utils.js',
  './js/state.js',
  './js/devices.js',
  './js/maml.js',
  './js/live-preview.js',
  './js/history.js',
  './js/canvas.js',
  './js/card-library.js',
  './js/storage.js',
  './js/export.js',
  './js/transcode.js',
  './js/changelog.js',
  './js/i18n.js',
  './js/main.js',
  // Templates
  './js/templates/index.js',
  './js/templates/custom.js',
  './js/templates/animated_clock.js',
  './js/templates/slide_unlock.js',
  './js/templates/smart_battery.js',
  './js/templates/action_buttons.js',
  './js/templates/number_clock.js',
  './js/templates/weather_cp.js',
  './js/templates/persistent_counter.js',
  './js/templates/breathing_light.js',
  './js/templates/brightness_slider.js',
  './js/templates/date_beauty.js',
  './js/templates/dual_clock.js',
  './js/templates/fitness_ring.js',
  './js/templates/music_player.js',
  './js/templates/photo_frame.js',
  './js/templates/pomodoro.js',
  './js/templates/quick_note.js',
  './js/templates/usage.js',
  // UI
  './js/ui/toast.js',
  './js/ui/steps.js',
  './js/ui/code-editor.js',
  './js/ui/elements.js',
  './js/ui/editors/common.js',
  './js/ui/editors/text-editor.js',
  './js/ui/editors/shape-editor.js',
  './js/ui/editors/media-editor.js',
  './js/ui/editors/container-editor.js',
  './js/ui/editors/index.js',
  './js/ui/config-panel.js',
  './js/ui/share.js',
  './js/ui/qr-share.js',
  './js/ui/card-library-ui.js',
  './js/ui/template-market.js',
  './js/ui/design-tools.js',
  './js/ui/layer-panel.js',
  './js/ui/ruler.js',
  './js/ui/eyedropper.js',
  './js/ui/gist-backup.js',
  './js/ui/binding-wizard.js',
  './js/ui/command-palette.js',
  './js/ui/linter-tools.js',
  './js/ui/version-snapshots.js',
  './js/ui/export-adb.js',
  './js/ui/snippets.js',
  './js/ui/batch-ops.js',
  './js/ui/dev-tools.js',
  './js/ui/index.js',
  // Icons
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)))
    .then(() => self.skipWaiting())
  );
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
