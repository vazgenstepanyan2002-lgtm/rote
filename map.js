(function(){
 const g=id=>document.getElementById(id);
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const LF_CSS='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
 const LF_JS='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
 let _lp=null,_map=null,_tok=0;
 function lock(on){document.documentElement.classList.toggle('lock',on);document.body.classList.toggle('lock',on)}
 function loadLeaflet(){
  if(window.L&&L.map)return Promise.resolve();
  if(_lp)return _lp;
  _lp=new Promise((res,rej)=>{
   const c=document.createElement('link');c.rel='stylesheet';c.href=LF_CSS;document.head.appendChild(c);
   const s=document.createElement('script');s.src=LF_JS;
   s.onload=()=>res();
   s.onerror=()=>{_lp=null;s.remove();c.remove();rej(new Error('leaflet'))};
   document.head.appendChild(s);
  });
  return _lp;
 }
 function ensureModal(){
  let m=g('mapM');if(m)return m;
  m=document.createElement('div');m.id='mapM';m.className='mapm';
  m.innerHTML='<div class="mapm-h"><span>🗺 Маршрут на карте</span><button class="mdl-x" id="mapX">✕</button></div><div id="mapBox"></div><div id="mapInfo"></div>';
  document.body.appendChild(m);
  g('mapX').onclick=closeMap;
  return m;
 }
 function closeMap(){
  _tok++;
  if(_map){try{_map.remove()}catch(e){}_map=null}
  const m=g('mapM');if(m)m.classList.remove('open');
  lock(false);
 }
 function icon(cls,label){
  return L.divIcon({className:'mkw',html:'<div class="mk '+cls+'">'+label+'</div>',iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-16]});
 }
 async function openMap(){
  const cur=window.CUR;
  if(!cur||!cur.length){window.toast&&toast('Сначала постройте маршрут','err');return}
  let sv={};try{sv=JSON.parse(localStorage.getItem('R_SAVE')||'{}')||{}}catch(e){}
  const start=sv.startPt&&isFinite(sv.startPt.lat)&&isFinite(sv.startPt.lon)?sv.startPt:null;
  const m=ensureModal(),tok=++_tok;
  m.classList.add('open');lock(true);
  g('mapInfo').textContent='Загружаю карту...';
  try{await loadLeaflet()}catch(e){
   if(tok!==_tok)return;
   closeMap();window.toast&&toast('Не удалось загрузить карту. Проверьте интернет','err');return;
  }
  if(tok!==_tok)return;
  draw(cur,start,sv,tok);
 }
 function draw(cur,start,sv,tok){
  if(_map){try{_map.remove()}catch(e){}_map=null}
  const box=g('mapBox');box.innerHTML='';
  const map=L.map(box,{zoomControl:true});_map=map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const etas=document.querySelectorAll('#o ol li .eta');
  const ll=[];let bad=0;
  if(start){
   ll.push([start.lat,start.lon]);
   L.marker([start.lat,start.lon],{icon:icon('me','Вы'),zIndexOffset:500}).addTo(map).bindPopup('<b>Вы здесь</b><br>старт маршрута');
  }
  cur.forEach((it,k)=>{
   const name=String(it.name),base=name.indexOf('🏁')===0,inex=name.indexOf('📍')>=0;
   if(inex)bad++;
   ll.push([it.lat,it.lon]);
   const eta=etas[k]?etas[k].textContent:'';
   let h='<b>'+esc(name)+'</b>';
   if(eta)h+='<br>'+esc(eta);
   if(it.sub)h+='<br>'+esc(it.sub);
   if(inex)h+='<br><span style="color:#b45309">⚠ Неточный адрес: Яндекс нашёл только район или город</span>';
   L.marker([it.lat,it.lon],{icon:icon(base?'base':inex?'bad':'ok',base?'🏁':String(k+1))}).addTo(map).bindPopup(h);
  });
  const straight=L.polyline(ll,{color:'#0ea5e9',weight:4,opacity:.8,dashArray:'8 8'}).addTo(map);
  map.fitBounds(L.latLngBounds(ll),{padding:[30,30],maxZoom:16});
  setTimeout(()=>{if(_map===map){map.invalidateSize();map.fitBounds(L.latLngBounds(ll),{padding:[30,30],maxZoom:16})}},150);

  let note='Линия по прямой (загружаю дороги...)';
  function info(){
   let h='<div>Точек: <b>'+cur.length+'</b>';
   if(sv.totT&&typeof fmtT==='function')h+=' • ⏱ ~'+fmtT(sv.totT)+(sv.totD?' • '+Math.round(sv.totD/1000)+' км':'');
   h+='</div><div>'+esc(note)+'</div>';
   if(bad)h+='<div class="w">⚠ Неточных адресов: '+bad+' (жёлтые маркеры). Маршрут приведёт в центр района, уточните улицу и дом.</div>';
   g('mapInfo').innerHTML=h;
  }
  info();
  if(ll.length<2){note='';info();return}
  fetch('https://router.project-osrm.org/route/v1/driving/'+ll.map(p=>p[1]+','+p[0]).join(';')+'?overview=full&geometries=geojson',{signal:AbortSignal.timeout(10000)})
   .then(r=>r.json()).then(j=>{
    if(tok!==_tok||_map!==map)return;
    const c=j.routes&&j.routes[0]&&j.routes[0].geometry&&j.routes[0].geometry.coordinates;
    if(!c||!c.length)throw 0;
    map.removeLayer(straight);
    L.polyline(c.map(x=>[x[1],x[0]]),{color:'#0ea5e9',weight:5,opacity:.9}).addTo(map);
    note='Линия построена по дорогам';info();
   }).catch(()=>{
    if(tok!==_tok||_map!==map)return;
    note='Дороги не загрузились, линия по прямой';info();
   });
 }
 window.openMap=openMap;window.closeMap=closeMap;

 function inject(){
  const o=g('o');if(!o)return;
  const nav=o.querySelector('a.nav');
  if(nav&&!g('mapBtn')){
   const b=document.createElement('button');b.id='mapBtn';b.textContent='🗺 Показать на карте';b.onclick=openMap;nav.before(b);
  }
  const c=window.CUR;
  if(c)o.querySelectorAll('ol li').forEach((li,k)=>{if(c[k]&&String(c[k].name).indexOf('📍')>=0)li.classList.add('warn')});
 }
 const o=g('o');
 if(o)new MutationObserver(inject).observe(o,{childList:true});
 inject();
})();
