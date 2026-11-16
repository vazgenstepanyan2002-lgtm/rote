(function(){
 const g=id=>document.getElementById(id);
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const LF_CSS='https://cloudflare.com';
 const LF_JS='https://cloudflare.com';
 const RT_JS='https://jsdelivr.net';
 let _lp=null,_map=null,_tok=0,_fit=null;
 function lock(on){document.documentElement.classList.toggle('lock',on);document.body.classList.toggle('lock',on)}
 function loadLeaflet(){
  if(window.L&&L.map)return Promise.resolve();
  if(_lp)return _lp;
  _lp=new Promise((res,rej)=>{
   let tries=0;
   const go=()=>{
    const c=document.createElement('link');c.rel='stylesheet';c.href=LF_CSS;document.head.appendChild(c);
    const s=document.createElement('script');s.src=LF_JS;
    s.onload=()=>{const p=document.createElement('script');p.src=RT_JS;p.onload=p.onerror=()=>res();document.head.appendChild(p)};
    s.onerror=()=>{tries++;if(tries<3){setTimeout(go,700*tries)}else{_lp=null;s.remove();c.remove();rej(new Error('leaflet'))}};
    document.head.appendChild(s);
   };
   go();
  });
  return _lp;
 }
 function ensureModal(){
  let m=g('mapM');if(m)return m;
  m=document.createElement('div');m.id='mapM';m.className='mapm';
  m.innerHTML='<div class="mapm-h"><span class="mapm-t">🗺 Карта</span><span class="mapm-b"><button class="mdl-x" id="mapN">🧭 Север</button><button class="mdl-x" id="mapFit">⤢ Весь маршрут</button><button class="mdl-x mapm-c" id="mapX" aria-label="Закрыть"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button></span></div><div id="mapBox"></div><div id="mapInfo"></div>';
  document.body.appendChild(m);
  g('mapX').onclick=()=>closeMap();g('mapFit').onclick=()=>{if(_fit)_fit()};g('mapN').onclick=()=>{if(_map&&_map.setBearing)_map.setBearing(0)};
  return m;
 }
 function closeMap(src){
  _tok++;_fit=null;if(src!=='pop'){try{if(history.state&&history.state.map)setTimeout(()=>history.back(),0)}catch(e){}}
  if(_map){try{_map.remove()}catch(e){}_map=null}
  const m=g('mapM');if(m)m.classList.remove('open');
  lock(false);
 }
 function icon(cls,label){
  return L.divIcon({className:'mkw',html:'<div class="mk '+cls+'">'+label+'</div>',iconSize:,iconAnchor:,popupAnchor:[0,-16]});
 }
 async function openMap(){
  const cur=window.CUR;
  if(!cur||!cur.length){window.toast&&toast('Сначала постройте маршрут','err');return}
  let sv={};try{sv=JSON.parse(localStorage.getItem('R_SAVE')||'{}')||{}}catch(e){}
  const start=sv.startPt&&isFinite(sv.startPt.lat)&&isFinite(sv.startPt.lon)?sv.startPt:null;
  const m=ensureModal(),tok=++_tok;
  m.classList.add('open');lock(true);try{history.pushState({map:1},'')}catch(e){}
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
  box.style.touchAction='none';const map=L.map(box,{zoomControl:true,dragging:true,touchZoom:true,doubleClickZoom:true,scrollWheelZoom:true,tap:true,inertia:true,rotate:true,touchRotate:true,bearing:0,rotateControl:{closeOnZeroBearing:false}});_map=map;
  let _tc=0;const op=map.getPane('overlayPane');
  const hideL=()=>{op.style.opacity='0'};
  const showL=()=>{if(_tc>0||_map!==map)return;map.eachLayer(l=>{if(l instanceof L.Polyline&&l.redraw)l.redraw()});op.style.opacity=''};
  box.addEventListener('touchstart',e=>{_tc=e.touches.length;if(_tc>1)hideL()},{passive:true});
  box.addEventListener('touchend',e=>{_tc=e.touches.length;if(_tc===0)setTimeout(showL,120)},{passive:true});
  box.addEventListener('touchcancel',()=>{_tc=0;setTimeout(showL,120)},{passive:true});
  map.on('zoomstart',hideL);
  map.on('zoomend moveend',()=>setTimeout(showL,60));
  L.tileLayer('https://openstreetmap.org{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const ll=[];let bad=0;
  if(start){
   ll.push([start.lat,start.lon]);
   L.marker([start.lat,start.lon],{icon:icon('me','Вы'),zIndexOffset:500}).addTo(map).bindPopup('<b>Вы здесь</b><br>старт маршрута');
  }
  cur.forEach((it,k)=>{
   const name=String(it.name),base=name.indexOf('🏁')===0,inex=name.indexOf('📍')>=0;
   if(inex)bad++;
   ll.push([it.lat,it.lon]);
   let h='<b>'+esc(name)+'</b>';
   if(it.sub)h+='<br>'+esc(it.sub);
   if(inex)h+='<br><span style="color:#b45309">⚠ Неточный адрес: Яндекс нашёл только район или город</span>';
   L.marker([it.lat,it.lon],{icon:icon(base?'base':inex?'bad':'ok',base?'🏁':String(k+1))}).addTo(map).bindPopup(h);
  });
  const straight=L.polyline(ll,{color:'#0ea5e9',weight:4,opacity:.8,dashArray:'8 8'}).addTo(map);
  _fit=()=>map.fitBounds(L.latLngBounds(ll),{padding:,maxZoom:16});_fit();
  setTimeout(()=>{if(_map===map){map.invalidateSize();map.fitBounds(L.latLngBounds(ll),{padding:,maxZoom:16})}},150);

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
  fetch('https://project-osrm.org(p=>p+','+p).join(';')+'?overview=full&geometries=geojson',{signal:AbortSignal.timeout(10000)})
   .then(r=>r.json()).then(j=>{
    if(tok!==_tok||_map!==map)return;
    const c=j.routes&&j.routes&&j.routes.geometry&&j.routes.geometry.coordinates;
    if(!c||!c.length)throw 0;
    map.removeLayer(straight);
    L.polyline(c.map(x=>[x,x]),{color:'#0ea5e9',weight:5,opacity:.9}).addTo(map);
    note='Линия построена по дорогам';info();
   }).catch(()=>{
    if(tok!==_tok||_map!==map)return;
    note='Дороги не загрузились, линия по прямой';info();
   });
 }
 window.openMap=openMap;window.closeMap=closeMap;
 window.addEventListener('popstate',()=>{const x=g('mapM');if(x&&x.classList.contains('open'))closeMap('pop')});

 function inject(){
  const o=g('o');if(!o)return;
  const nav=o.querySelector('a.nav');
  if(nav&&!g('mapBtn')){
   const b=document.createElement('button');b.id='mapBtn';b.textContent='🗺 Показать на карте';b.onclick=openMap;nav.before(b);
  }
 }
 const o=g('o');
 if(o)new MutationObserver(inject).observe(o,{childList:true});
 inject();
})();
