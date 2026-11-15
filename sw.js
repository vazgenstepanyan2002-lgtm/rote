const C='eb-cache';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.endsWith('/version.json'))return;
 const nav=r.mode==='navigate',key=nav?r.url:r;
 e.respondWith((async()=>{
  try{
   const res=await fetch(key,{cache:'no-store'});
   if(res.status===200){try{const c=await caches.open(C);await c.put(key,res.clone())}catch(_){}}
   return res;
  }catch(err){
   const c=await caches.open(C);
   return (await c.match(key,{ignoreSearch:true}))||(nav?((await c.match(new URL('./',location).href))||(await c.match(new URL('index.html',location).href))):undefined)||Response.error();
  }
 })());
});
