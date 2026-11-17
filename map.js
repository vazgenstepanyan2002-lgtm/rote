(function(){if(document.getElementById('mapCss'))return;var t=document.createElement('style');t.id='mapCss';t.textContent=`
.mapm{position:fixed;inset:0;z-index:150;background:#070b14;display:none;flex-direction:column;overscroll-behavior:contain}
.mapm.open{display:flex;animation:cmIn .16s ease-out}
.mapm-h{position:relative;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:rgba(13,19,31,.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.12);z-index:500;flex-shrink:0}
.mapm-h::before{content:'';position:absolute;top:0;left:16px;right:16px;height:1px;background:linear-gradient(90deg,transparent,rgba(56,189,248,.6),rgba(52,211,153,.55),transparent);pointer-events:none}
.mapm-t{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:800;color:#f8fafc;min-width:0;white-space:nowrap}
.mapm-tic{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(56,189,248,.24),rgba(16,185,129,.18));border:1px solid rgba(56,189,248,.45);color:#38bdf8;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mapm-b{display:flex;align-items:center;gap:6px;flex-shrink:0}
.mapm-b button{width:auto!important;height:34px!important;margin:0!important;padding:0 11px!important;border-radius:11px!important;font-size:12.5px!important;font-weight:700!important;background:rgba(255,255,255,.07)!important;border:1px solid rgba(255,255,255,.16)!important;color:#e2e8f0!important;display:inline-flex!important;align-items:center;justify-content:center;gap:5px;box-shadow:none!important;transition:.14s}
.mapm-b button svg{color:#38bdf8;flex-shrink:0}
.mapm-b button:active{transform:scale(.95);border-color:#38bdf8!important}
.mapm-b .mapm-c{width:34px!important;padding:0!important;background:rgba(244,63,94,.14)!important;border-color:rgba(244,63,94,.38)!important;color:#fda4af!important}
#mapBox{flex:1;min-height:0;background:#090e1a;position:relative}
#mapInfo{flex-shrink:0;padding:11px 14px calc(12px + env(safe-area-inset-bottom,0px));background:rgba(13,19,31,.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.14);box-shadow:0 -10px 28px rgba(0,0,0,.45);z-index:500;max-height:34vh;overflow-y:auto}
.map-stats{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.map-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:13px;font-weight:700;color:#f1f5f9}
.map-pill b{color:#fde047}
.map-pill.tm b{color:#34d399}
.map-pill.km b{color:#38bdf8}
.map-note{margin-top:7px;font-size:12.5px;color:#94a3b8;display:flex;align-items:center;gap:6px;line-height:1.35}
.map-note i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8;flex-shrink:0}
#mapInfo .w{color:#fbbf24;font-size:12.5px;font-weight:600;margin-top:6px;padding:6px 9px;border-radius:9px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.28)}
.mkw{background:none!important;border:none!important}
.mk{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;border:2.5px solid #0f172a;box-shadow:0 4px 12px rgba(0,0,0,.65),0 0 0 2px rgba(255,255,255,.35)}
.mk.bad{background:linear-gradient(135deg,#facc15,#eab308);color:#0f172a}
.mk.base{background:linear-gradient(135deg,#34d399,#059669)}
.mk.ok{background:linear-gradient(135deg,#38bdf8,#0284c7)}
.mk.me{background:linear-gradient(135deg,#f43f5e,#e11d48);font-size:11px}
#mapBox .leaflet-tile-pane img{filter:invert(100%) hue-rotate(180deg) brightness(93%) contrast(95%) saturate(82%)}
#mapBox .leaflet-bar{border:1px solid rgba(255,255,255,.16)!important;border-radius:13px!important;overflow:hidden;box-shadow:0 8px 22px rgba(0,0,0,.55)!important;background:rgba(13,19,31,.88)!important;backdrop-filter:blur(12px)}
#mapBox .leaflet-bar a{background:transparent!important;color:#f1f5f9!important;border-bottom:1px solid rgba(255,255,255,.12)!important;width:36px!important;height:36px!important;line-height:36px!important;font-weight:700!important}
#mapBox .leaflet-bar a:last-child{border-bottom:none!important}
#mapBox .leaflet-bar a:active{background:rgba(56,189,248,.22)!important;color:#38bdf8!important}
#mapBox .leaflet-control-attribution{background:rgba(9,14,26,.65)!important;color:rgba(148,163,184,.65)!important;font-size:9.5px!important;border-top-left-radius:8px;padding:1px 6px!important}
#mapBox .leaflet-control-attribution a{color:#7dd3fc!important}
#mapBox .leaflet-popup-content-wrapper,#mapBox .leaflet-popup-tip{background:#111827!important;color:#f8fafc!important;border:1px solid rgba(255,255,255,.16);box-shadow:0 10px 26px rgba(0,0,0,.6)}
#mapBox .leaflet-popup-close-button{color:#94a3b8!important}
`;document.head.appendChild(t)})();
(function(){
 const g=id=>document.getElementById(id);
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const LF_CSS='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
 const LF_JS='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
 const RT_JS='https://cdn.jsdelivr.net/npm/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js';
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
  m.innerHTML='<div class="mapm-h"><span class="mapm-t"><span class="mapm-tic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg></span><span>Карта</span></span><span class="mapm-b"><button class="mdl-x" id="mapN"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg><span>Север</span></button><button class="mdl-x" id="mapFit"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg><span>Весь маршрут</span></button><button class="mdl-x mapm-c" id="mapX" aria-label="Закрыть"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button></span></div><div id="mapBox"></div><div id="mapInfo"></div>';
  document.body.appendChild(m);
  g('mapX').onclick=()=>closeMap();g('mapFit').onclick=()=>{if(_fit)_fit()};g('mapN').onclick=()=>{if(_map&&_map.setBearing)_map.setBearing(0)};g('mapInfo').style.maxHeight='22vh';
  return m;
 }
 function closeMap(src){
  _tok++;_fit=null;if(src!=='pop'){try{if(history.state&&history.state.map)setTimeout(()=>history.back(),0)}catch(e){}}
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
  box.style.touchAction='none';const cv=L.canvas({padding:0.5});
  const map=L.map(box,{preferCanvas:true,renderer:cv,zoomControl:true,dragging:true,touchZoom:true,doubleClickZoom:true,scrollWheelZoom:true,tap:true,inertia:true,zoomAnimation:true,markerZoomAnimation:true,rotate:true,touchRotate:true,bearing:0,rotateControl:{closeOnZeroBearing:false}});_map=map;
  const syncLines=()=>{if(_map===map&&cv&&cv._update)try{cv._update()}catch(e){}};
  map.on('zoom move rotate zoomend moveend viewreset',syncLines);
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
  const drawRoute=(pts,dashed)=>{
   const glow=L.polyline(pts,{color:'#0284c7',weight:10,opacity:.32,lineCap:'round',lineJoin:'round'}).addTo(map);
   const core=L.polyline(pts,{color:'#38bdf8',weight:4.5,opacity:.96,lineCap:'round',lineJoin:'round',dashArray:dashed?'8 8':null}).addTo(map);
   return [glow,core];
  };
  let curLines=drawRoute(ll,true);
  _fit=()=>map.fitBounds(L.latLngBounds(ll),{padding:[30,30],maxZoom:16});_fit();
  setTimeout(()=>{if(_map===map){map.invalidateSize();map.fitBounds(L.latLngBounds(ll),{padding:[30,30],maxZoom:16})}},150);

  let note='Линия по прямой (загружаю дороги...)';
  function info(){
   let h='<div class="map-stats"><span class="map-pill">Точек: <b>'+cur.length+'</b></span>';
   if(sv.totT&&typeof fmtt==='function')h+='<span class="map-pill tm">Время: <b>~'+fmtt(sv.totT)+'</b></span>';
   if(sv.totD)h+='<span class="map-pill km">Путь: <b>'+Math.round(sv.totD/1000)+' км</b></span>';
   h+='</div><div class="map-note"><i></i><span>'+esc(note)+'</span></div>';
   if(bad)h+='<div class="w">⚠ Неточных адресов: '+bad+' (жёлтые маркеры). Маршрут приведёт в центр района, уточните улицу и дом.</div>';
   g('mapInfo').innerHTML=h;
  }
  info();
  if(ll.length<2){note='';info();return}
  const coords=ll.map(p=>p.at(1)+','+p.at(0)).join(';');
  const q='?overview=full&geometries=geojson';
  const loadRoad=u=>fetch(u+coords+q).then(r=>r.json()).then(j=>{
   const r0=j.routes&&j.routes.at(0);
   const c=r0&&r0.geometry&&r0.geometry.coordinates;
   if(!c||!c.length)throw 0;
   return c;
  });
  loadRoad('https://router.project-osrm.org/route/v1/driving/').catch(()=>loadRoad('https://routing.openstreetmap.de/routed-car/route/v1/driving/')).then(c=>{
   if(tok!==_tok||_map!==map)return;
   curLines.forEach(l=>map.removeLayer(l));
   curLines=drawRoute(c.map(x=>[x.at(1),x.at(0)]),false);
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
   const b=document.createElement('button');b.id='mapBtn';b.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg><span>Показать на карте</span>';b.onclick=openMap;nav.before(b);
  }
  const c=window.CUR;
  
 }
 const o=g('o');
 if(o)new MutationObserver(inject).observe(o,{childList:true});
 inject();
})();
