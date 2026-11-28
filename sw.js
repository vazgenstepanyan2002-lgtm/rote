const CACHE_NAME = 'eurobaza-v20261128114347';
const SW_VER = CACHE_NAME.replace(/^eurobaza-v/, '');
const ASSETS = [
  './',
  'index.html',
  'admin.html',
  'style.css',
  'storage.js',
  'geo.js',
  'zones.js',
  'bonus-engine.js',
  'catalog.js',
  'table-viewer.js',
  'app.js',
  'yandex.js',
  'ocr.js',
  'ui.js',
  'map.js',
  'bonus.js',
  'i18n.js',
  'online.js',
  'auth.js',
  'admin-core.js',
  'admin-map.js',
  'admin-bonuses.js',
  'admin-ocr.js',
  'admin-att.js',
  'admin-comms.js',
  'admin-main.js',
  'manifest.json',
  'auto-translations.json',
  'bg.webp',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(ASSETS.map(u =>
        fetch(new Request(u, { cache: 'no-cache' }))
          .then(res => (res && res.status === 200) ? cache.put(u, res) : null)
          .catch(() => {})
      )))
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

  const isImg = /\.(webp|png|jpe?g|svg|ico)$/i.test(url.pathname);
  const reqVer = url.searchParams.get('v');
  const isVersionedAsset = reqVer === SW_VER && /\.(js|css)$/i.test(url.pathname);

  if (isImg || isVersionedAsset) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req, { ignoreSearch: true }).then(cached => {
          if (cached) return cached;
          return fetch(req).then(res => {
            if (res && res.status === 200) {
              cache.put(req, res.clone()).catch(() => {});
            }
            return res;
          });
        })
      ).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  const isHtml = req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html');
  e.respondWith(
    (isHtml ? fetch(req.url, { cache: 'no-cache' }) : fetch(req)).then(res => {
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
