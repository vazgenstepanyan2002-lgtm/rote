const CACHE_NAME = 'eurobaza-v20261123204537';
const ASSETS = [
  './',
  'index.html',
  'admin.html',
  'style.css',
  'app.js',
  'yandex.js',
  'ocr.js',
  'ui.js',
  'map.js',
  'bonus.js',
  'i18n.js',
  'online.js',
  'auth.js',
  'admin.js',
  'leaflet.min.css',
  'leaflet.min.js',
  'manifest.json',
  'auto-translations.json',
  'bg.jpg',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(ASSETS.map(u => cache.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('version.json')) return;

  e.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (e.data && e.data.type === 'NOTIFY') {
    const title = e.data.title || 'EuroBaza';
    const body = e.data.body || '';
    const tag = e.data.tag || 'eurobaza-chat';
    const act = e.data.action || 'OPEN_CHAT';
    const uid = e.data.uid || '';
    e.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: tag,
        renotify: true,
        vibrate: new Array(180, 90, 180),
        data: { url: e.data.url || './', action: act, uid: uid }
      })
    );
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const targetUrl = d.url || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) {
          c.postMessage({ type: d.action || 'OPEN_CHAT', uid: d.uid || '' });
          return c.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
