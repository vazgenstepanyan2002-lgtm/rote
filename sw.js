
const C='eb-cache-20261117104316';
const PRE=['./','./index.html','./style.css','./app.js','./yandex.js','./ui.js','./map.js','./bonus.js','./i18n.js','./online.js','./manifest.json','./icon-192.png','./icon-512.png','./bg.jpg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>Promise.all(PRE.map(u=>c.add(u).catch(()=>{})))));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))))
    .then(()=>self.clients.claim())
  );
});

// Команда от app.js на немедленное обновление
self.addEventListener('message',e=>{
  if(e.data && e.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

const STATIC=/\.(?:css|js|png|jpe?g|svg|woff2?|ico|json|map)$/i;
const isNav=r=>r.mode==='navigate'||(r.method==='GET'&&(r.headers.get('accept')||'').includes('text/html'));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET')return;
 if(u.pathname.endsWith('/version.json')){
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{const cl=res.clone();caches.open(C).then(c=>c.put(r,cl));return res}).catch(()=>caches.match(r,{ignoreSearch:true})));
  return;
 }
 if(u.origin!==location.origin){
  e.respondWith(fetch(r).then(res=>{if(res.ok&&res.status===200){const cl=res.clone();caches.open(C).then(c=>c.put(r,cl))}return res}).catch(()=>caches.match(r,{ignoreSearch:true})));
  return;
 }
 if(STATIC.test(u.pathname)){
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cl=res.clone();caches.open(C).then(c=>c.put(r,cl))}return res}).catch(()=>caches.match(r,{ignoreSearch:true})));
  return;
 }
 if(isNav(r)){
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{const cl=res.clone();caches.open(C).then(c=>c.put('./index.html',cl));return res}).catch(()=>caches.match('./index.html',{ignoreSearch:true})));
  return;
 }
});
