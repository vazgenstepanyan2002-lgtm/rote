const CACHE="eb-v3";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","index.html","yandex.js?v=20","manifest.json","bg.jpg?v=4","icon-192.png","icon-512.png"])))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||!e.request.url.startsWith(self.location.origin))return;e.respondWith(caches.match(e.request).then(cached=>{const net=fetch(e.request).then(r=>{const cl=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));return r}).catch(()=>cached);return e.request.destination==="image"&&cached?cached:net}))});
