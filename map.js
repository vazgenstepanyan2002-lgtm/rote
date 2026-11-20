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
#mapBox{flex:1;min-height:0;background:#090e1a;position:relative;overflow:hidden}
#mapInfo{flex-shrink:0;padding:11px 14px calc(12px + env(safe-area-inset-bottom,0px));background:rgba(13,19,31,.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid rgba(255,255,255,.14);box-shadow:0 -10px 28px rgba(0,0,0,.45);z-index:500;max-height:22vh;overflow-y:auto}
.map-stats{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
.map-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-size:13px;font-weight:700;color:#f1f5f9}
.map-pill b{color:#fde047}
.map-pill.tm b{color:#34d399}
.map-pill.km b{color:#38bdf8}
.map-note{margin-top:7px;font-size:12.5px;color:#94a3b8;display:flex;align-items:center;gap:6px;line-height:1.35}
.map-note i{display:inline-block;width:7px;height:7px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8;flex-shrink:0}
#mapInfo .w{color:#fbbf24;font-size:12.5px;font-weight:600;margin-top:6px;padding:6px 9px;border-radius:9px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.28)}
.mk{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;border:2.5px solid #0f172a;box-shadow:0 4px 12px rgba(0,0,0,.65),0 0 0 2px rgba(255,255,255,.35);cursor:pointer;user-select:none}
.mk.bad{background:linear-gradient(135deg,#facc15,#eab308);color:#0f172a}
.mk.base{background:linear-gradient(135deg,#34d399,#059669)}
.mk.ok{background:linear-gradient(135deg,#38bdf8,#0284c7)}
.mk.me{background:linear-gradient(135deg,#f43f5e,#e11d48);font-size:11px}
#mapBox .maplibregl-ctrl-group{background:rgba(13,19,31,.88)!important;backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.16)!important;border-radius:13px!important;overflow:hidden;box-shadow:0 8px 22px rgba(0,0,0,.55)!important}
#mapBox .maplibregl-ctrl-group button{width:36px!important;height:36px!important;margin:0!important;padding:0!important;background:transparent!important;border:none!important;border-bottom:1px solid rgba(255,255,255,.12)!important;box-shadow:none!important;border-radius:0!important}
#mapBox .maplibregl-ctrl-group button:last-child{border-bottom:none!important}
#mapBox .maplibregl-ctrl-group button .maplibregl-ctrl-icon{filter:invert(1) brightness(1.15)}
#mapBox .maplibregl-ctrl-attrib{background:rgba(9,14,26,.65)!important;color:rgba(148,163,184,.65)!important;font-size:9.5px!important;border-top-left-radius:8px}
#mapBox .maplibregl-ctrl-attrib a{color:#7dd3fc!important}
#mapBox .maplibregl-popup-content{background:#111827!important;color:#f8fafc!important;border:1px solid rgba(255,255,255,.16);border-radius:14px!important;padding:10px 26px 10px 12px!important;font-size:13px;line-height:1.45;box-shadow:0 10px 26px rgba(0,0,0,.65)}
#mapBox .maplibregl-popup-tip{border-top-color:#111827!important;border-bottom-color:#111827!important}
#mapBox .maplibregl-popup-close-button{width:24px!important;height:24px!important;margin:0!important;padding:0!important;border:none!important;background:transparent!important;box-shadow:none!important;color:#94a3b8!important;font-size:16px!important;right:4px!important;top:4px!important}
`;document.head.appendChild(t)})();
(function(){
 const g=id=>document.getElementById(id);
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const CDNS=[
  {css:'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',js:'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'},
  {css:'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css',js:'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js'}
 ];
 const STYLE_PRIMARY='https://tiles.openfreemap.org/styles/dark';
 const STYLE_FALLBACK='https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
 let _lp=null,_map=null,_tok=0,_fit=null;
 function lock(on){document.documentElement.classList.toggle('lock',on);document.body.classList.toggle('lock',on)}
 function loadMapLibre(){
  if(window.maplibregl&&maplibregl.Map)return Promise.resolve();
  if(_lp)return _lp;
  _lp=new Promise((res,rej)=>{
   let idx=0;
   const go=()=>{
    const src=CDNS[idx];
    const c=document.createElement('link');c.rel='stylesheet';c.href=src.css;document.head.appendChild(c);
    const s=document.createElement('script');s.src=src.js;
    s.onload=()=>{if(window.maplibregl&&maplibregl.Map)res();else fail()};
    const fail=()=>{s.remove();c.remove();idx++;if(idx<CDNS.length)go();else{_lp=null;rej(new Error('maplibre'))}};
    s.onerror=fail;
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
  g('mapX').onclick=()=>closeMap();
  g('mapFit').onclick=()=>{if(_fit)_fit()};
  g('mapN').onclick=()=>{if(_map)_map.easeTo({bearing:0,pitch:0,duration:350})};
  return m;
 }
 function closeMap(src){
  _tok++;_fit=null;if(src!=='pop'){try{if(history.state&&history.state.map)setTimeout(()=>history.back(),0)}catch(e){}}
  if(_map){try{_map.remove()}catch(e){}_map=null}
  const m=g('mapM');if(m)m.classList.remove('open');
  lock(false);
 }
 function mkEl(cls,label){
  const el=document.createElement('div');
  el.className='mk '+cls;
  el.textContent=label;
  return el;
 }
 async function openMap(){
  const cur=(window.CUR||[]).filter(x=>!x.done);
  if(!cur||!cur.length){window.toast&&toast('Сначала постройте маршрут','err');return}
  let sv={};try{sv=JSON.parse(localStorage.getItem('R_SAVE')||'{}')||{}}catch(e){}
  const start=sv.startPt&&isFinite(sv.startPt.lat)&&isFinite(sv.startPt.lon)?sv.startPt:null;
  const m=ensureModal(),tok=++_tok;
  m.classList.add('open');lock(true);try{history.pushState({map:1},'')}catch(e){}
  g('mapInfo').textContent='Загружаю карту...';
  try{await loadMapLibre()}catch(e){
   if(tok!==_tok)return;
   closeMap();window.toast&&toast('Не удалось загрузить карту. Проверьте интернет','err');return;
  }
  if(tok!==_tok)return;
  draw(cur,start,sv,tok);
 }
 function draw(cur,start,sv,tok){
  if(_map){try{_map.remove()}catch(e){}_map=null}
  const box=g('mapBox');box.innerHTML='';
  const etas=document.querySelectorAll('#o ol li .eta');
  const ll=[];let bad=0;
  const markers=[];
  if(start){
   ll.push([start.lon,start.lat]);
   markers.push({lngLat:[start.lon,start.lat],cls:'me',lbl:'Вы',html:'<b>Вы здесь</b><br>Старт маршрута'});
  }
  cur.forEach((it,k)=>{
   const name=String(it.name),base=name.indexOf('🏁')===0,inex=name.indexOf('📍')>=0;
   if(inex)bad++;
   ll.push([it.lon,it.lat]);
   const eta=etas[k]?etas[k].textContent:'';
   let h='<b>'+esc(name)+'</b>';
   if(eta)h+='<br>'+esc(eta);
   if(it.sub)h+='<br>'+esc(it.sub);
   if(inex)h+='<br><span style="color:#fbbf24">⚠️ Неточный адрес: Яндекс нашёл только район или город</span>';
   markers.push({lngLat:[it.lon,it.lat],cls:base?'base':inex?'bad':'ok',lbl:base?'🏁':String(k+1),html:h});
  });

  const bounds=new maplibregl.LngLatBounds();
  ll.forEach(pt=>bounds.extend(pt));
  const map=new maplibregl.Map({
   container:box,
   style:STYLE_PRIMARY,
   center:ll[0]||[44.514271,40.120847],
   zoom:12,
   pitchWithRotate:true,
   dragRotate:true,
   touchZoomRotate:true,
   attributionControl:{compact:true}
  });
  _map=map;
  map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-left');

  _fit=()=>{
   if(_map!==map||!ll.length)return;
   if(ll.length===1)map.easeTo({center:ll[0],zoom:15,duration:350});
   else map.fitBounds(bounds,{padding:46,maxZoom:16,bearing:map.getBearing(),pitch:map.getPitch(),duration:350});
  };
  if(ll.length>1)map.fitBounds(bounds,{padding:46,maxZoom:16,duration:0});
  else if(ll.length===1)map.jumpTo({center:ll[0],zoom:15});

  markers.forEach(mk=>{
   const pop=new maplibregl.Popup({offset:18,closeOnClick:true}).setHTML(mk.html);
   new maplibregl.Marker({element:mkEl(mk.cls,mk.lbl),anchor:'center'}).setLngLat(mk.lngLat).setPopup(pop).addTo(map);
  });

  let routeCoords=ll.slice(),routeDashed=true,styleReady=false,usedFallback=false;
  const setupLayers=()=>{
   if(_map!==map)return;
   styleReady=true;
   if(typeof KENTRON_POLY!=='undefined'&&typeof getShift==='function'&&getShift()==='day'&&!map.getSource('kentron-src')){
    const ring=KENTRON_POLY.map(p=>[p[1],p[0]]);
    ring.push(ring[0]);
    map.addSource('kentron-src',{type:'geojson',data:{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]}}});
    map.addLayer({id:'kentron-fill',type:'fill',source:'kentron-src',paint:{'fill-color':'#ef4444','fill-opacity':0.14}});
    map.addLayer({id:'kentron-line',type:'line',source:'kentron-src',paint:{'line-color':'#ef4444','line-width':2,'line-dasharray':[3,3]}});
    map.on('click','kentron-fill',e=>{
     new maplibregl.Popup().setLngLat(e.lngLat).setHTML('<b>⛔ Зона Кентрон</b><br>Въезд грузовым машинам до 21:00 запрещён').addTo(map);
    });
   }
   if(!map.getSource('route-src')){
    map.addSource('route-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:routeCoords}}});
    map.addLayer({id:'route-glow',type:'line',source:'route-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0284c7','line-width':10,'line-opacity':0.34}});
    map.addLayer({id:'route-dash',type:'line',source:'route-src',layout:{'line-cap':'round','line-join':'round',visibility:routeDashed?'visible':'none'},paint:{'line-color':'#38bdf8','line-width':4.5,'line-opacity':0.95,'line-dasharray':[2,2]}});
    map.addLayer({id:'route-solid',type:'line',source:'route-src',layout:{'line-cap':'round','line-join':'round',visibility:routeDashed?'none':'visible'},paint:{'line-color':'#38bdf8','line-width':4.5,'line-opacity':0.98}});
   }
  };
  map.on('style.load',setupLayers);
  map.on('error',()=>{
   if(!styleReady&&!usedFallback&&_map===map){
    usedFallback=true;
    try{map.setStyle(STYLE_FALLBACK)}catch(e){}
   }
  });
  setTimeout(()=>{if(_map===map){map.resize();if(ll.length>1)map.fitBounds(bounds,{padding:46,maxZoom:16,duration:0})}},160);

  let note='Линия по прямой (загружаю дороги...)';
  function info(){
   let h='<div class="map-stats"><span class="map-pill">Точек: <b>'+cur.length+'</b></span>';
   if(sv.totT&&typeof fmtT==='function')h+='<span class="map-pill tm">Время: <b>'+fmtT(sv.totT)+'</b></span>';
   if(sv.totD)h+='<span class="map-pill km">Путь: <b>'+Math.round(sv.totD/1000)+' км</b></span>';
   h+='</div><div class="map-note"><i></i><span>'+esc(note)+'</span></div>';
   if(bad)h+='<div class="w">⚠️ Неточных адресов: '+bad+' (жёлтые маркеры). Маршрут приведёт в центр района, уточните улицу и дом.</div>';
   g('mapInfo').innerHTML=h;
  }
  info();
  if(ll.length<2){note='';info();return}

  const coords=ll.map(p=>p.join(',')).join(';');
  const q='?overview=full&geometries=geojson';
  const loadRoad=u=>fetch(u+coords+q).then(r=>r.json()).then(j=>{
   const r0=j.routes&&j.routes.at(0);
   const c=r0&&r0.geometry&&r0.geometry.coordinates;
   if(!c||!c.length)throw 0;
   return c;
  });
  loadRoad('https://router.project-osrm.org/route/v1/driving/').catch(()=>loadRoad('https://routing.openstreetmap.de/routed-car/route/v1/driving/')).then(c=>{
   if(tok!==_tok||_map!==map)return;
   routeCoords=c;routeDashed=false;
   if(styleReady&&map.getSource('route-src')){
    map.getSource('route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:c}});
    if(map.getLayer('route-dash'))map.setLayoutProperty('route-dash','visibility','none');
    if(map.getLayer('route-solid'))map.setLayoutProperty('route-solid','visibility','visible');
   }
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
 }
 const o=g('o');
 if(o)new MutationObserver(inject).observe(o,{childList:true});
 inject();
})();
