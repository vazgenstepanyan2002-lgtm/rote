// EuroBaza Admin · Map: живая карта водителей и маршрутизатор отдела доставки (MapLibre GL)
(function(Adm){
 'use strict';
 if (!Adm || !Adm.auth) return;
  const {
    S, g, esc, CUR, TTL, admLoc, trAdm, fm, money, MN, EB_CAT, RU, nm, CAT_ICO_MAP,
    monthName, verFmt, ago, devName, devInfo, auth, db,
    DEFAULT_CREWS, CREW_OFF, CREW_OFF_LBL, WD_SHORT,
    isValidCrewCode, syncCrewsFromLabels, getCrewsConfigList, saveCrewsConfig,
    getCrewDefOff, getCrewOff, getCrewOffLbl, getCarsList,
    SUB_LOG_SEEN_KEY, subLogSeen, subLogUnread, updSubLogBdg, markSubLogSeen, logSubAct,
    OCR_CAT_NAMES, SUB_EMAIL, isSubAdm, admRawName, admTag,
    admVib, toast, showErr, denied,
    parseDev, accByUid, profName, dispName, dispHtml, devs, aggMonths,
    downloadCsv, exportCrewMonthCsv, exportCarDetailCsv, copyReport, detail,
    openDialog, ask, askInput
  } = Adm;
 // ===== Живая карта водителей =====
 const BASE_PT={lat:40.120847,lon:44.514271,name:"База EuroBaza (Арин Берд 7)"};
 const ADM_CDNS=[{css:"https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",js:"https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"},{css:"https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css",js:"https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"}];
 const ADM_SAT_URL="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
 function ensureMapLibre(){
  if(window.maplibregl&&maplibregl.Map)return Promise.resolve();
  if(S._lfProm)return S._lfProm;
  S._lfProm=new Promise((res,rej)=>{let idx=0;const go=()=>{const s0=ADM_CDNS[idx],c=document.createElement("link");c.rel="stylesheet";c.href=s0.css;document.head.appendChild(c);const s=document.createElement("script");s.src=s0.js;s.onload=()=>{if(window.maplibregl&&maplibregl.Map)res();else fail()};const fail=()=>{s.remove();c.remove();idx++;if(idx<ADM_CDNS.length)go();else{S._lfProm=null;rej(new Error("Ошибка загрузки MapLibre"))}};s.onerror=fail;document.head.appendChild(s)};go()});
  return S._lfProm;
 }
function destroyMap(){S._mapTok++;if(S._mapRO){try{S._mapRO.disconnect()}catch(e){}S._mapRO=null}if(S._map){try{S._map.remove()}catch(e){}S._map=null}S._markers={};S._baseMk=null;S._subMk=null;S._subFit=null;S._subRouteTok++;S._didFit=false;S._applyAdmSat=null}
 function fitAllDrivers(){
  if(!S._map||!window.maplibregl)return;
  const now=Date.now(),baseLL=[BASE_PT.lon,BASE_PT.lat],pts=[baseLL];
  devs().forEach(d=>{if(typeof d.u.lat!=="number"||typeof d.u.lon!=="number")return;if(S.MAP_ONLY_ONLINE&&!(now-(d.u.t||0)<TTL))return;pts.push([d.u.lon,d.u.lat])});
  if(pts.length===1)S._map.easeTo({center:baseLL,zoom:13,duration:300});
  else{const b=new maplibregl.LngLatBounds();pts.forEach(p=>b.extend(p));S._map.fitBounds(b,{padding:44,maxZoom:15,duration:350})}
 }
 function syncMapMarkers(){
  if(!S._map||!window.maplibregl)return;
  const now=Date.now(),seen={};
  devs().forEach(d=>{
   if(typeof d.u.lat!=="number"||typeof d.u.lon!=="number")return;
   const live=now-(d.u.t||0)<TTL;if(S.MAP_ONLY_ONLINE&&!live)return;
   seen[d.id]=true;
   const title=dispName(d),spd=typeof d.u.spd==="number"&&d.u.spd>2?" · "+d.u.spd+" км/ч":"";
   const popHtml='<div class="pop-t" data-no-i18n="1">'+esc(title)+'</div><div class="pop-s">'+(live?"🟢 В сети":"⚪ Был(а) "+ago(d.u.gt||d.u.t))+esc(spd)+'</div>';
   const htmlPin='<div class="drv-b'+(live?"":" off")+'"><i></i><span data-no-i18n="1">'+esc(title)+'</span></div>';
   if(S._markers[d.id]){
    S._markers[d.id].setLngLat([d.u.lon,d.u.lat]);
    const el=S._markers[d.id].getElement();if(el)el.innerHTML=htmlPin;
    if(S._markers[d.id].getPopup())S._markers[d.id].getPopup().setHTML(popHtml);
   }else{
    const el=document.createElement("div");el.className="drv-pin";el.innerHTML=htmlPin;
    S._markers[d.id]=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([d.u.lon,d.u.lat]).setPopup(new maplibregl.Popup({offset:18}).setHTML(popHtml)).addTo(S._map);
   }
  });
  Object.keys(S._markers).forEach(id=>{if(!seen[id]){S._markers[id].remove();delete S._markers[id]}});
  if(!S._didFit){S._didFit=true;fitAllDrivers()}
 }
 async function drawSubMap(){
  const cleanLbl=t=>String(t||'').replace(/[\s]*[\u{1F50E}\u{1F4CD}]\s*$/u,'').trim();
  const fmtMin=sec=>{
   const m=Math.max(1,Math.round(sec/60));
   if(m<60)return m+' мин';
   const h=Math.floor(m/60),r=m%60;
   return h+' ч'+(r?' '+r+' мин':'');
  };
  const renderSubHist=()=>{
   const el=g('subMapHist');if(!el)return;
   if(!S._subHist.length){el.innerHTML='';return}
   el.innerHTML='<div class="sec">Недавние проверки</div>'+S._subHist.map((it,idx)=>
    '<div class="subm-hist-it" data-act="submap-hist" data-idx="'+idx+'"><div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-no-i18n="1">'+esc(it.name)+'</div>'
    +(it.km?'<div style="font-size:11.5px;color:#94a3b8;margin-top:2px">'+esc(it.km)+' · '+esc(it.tm)+'</div>':'')
    +'</div><span class="subm-bdg '+(it.inK?'eve':'day')+'">'+(it.inK?'🌙 Вечер':'☀️ День')+'</span>'
    +'<button type="button" class="subm-del" data-act="submap-hdel" data-idx="'+idx+'" aria-label="Удалить">✕</button></div>'
   ).join('');
  };
  const renderSubRes=(pt,routeInfo)=>{
   const el=g('subMapRes');if(!el)return;
   if(!pt){
    el.className='subm-res';
    el.innerHTML='<div class="subm-sub" style="margin:0">Введите адрес выше или нажмите на точку на карте — красная зона показывает Кентрон (запрет днём до 21:00)</div>';
    return;
   }
   el.className='subm-res '+(pt.inK?'eve':'day');
   const zoneSub=pt.zone==='saralanj'?'Дорога Сараландж — камеры штрафа для грузовых днём (до 21:00)':(pt.inK?'Адрес в зоне Кентрон — въезд грузовым до 21:00 запрещён':'Адрес вне запретных зон — ограничений нет');
   let h='<div class="subm-res-top"><div class="subm-verdict">'+(pt.inK?'🌙 Только вечером (после 21:00)':'☀️ Можно ставить днём')+'</div>'
    +'<button type="button" class="subm-del" data-act="submap-clear" aria-label="Удалить">✕</button></div>'
    +'<div class="subm-sub">'+zoneSub+'</div>'
    +'<div class="subm-adr" data-no-i18n="1">📍 '+esc(pt.name)+'</div>';
   if(pt.exact===false){
    h+='<div class="subm-warn">⚠️ Неточный адрес: найден только район или город</div>';
   }
   if(routeInfo){
    h+='<div class="subm-pills">'
     +(routeInfo.tm?'<span class="subm-pill tm">Время: <b>'+esc(routeInfo.tm)+'</b></span>':'')
     +(routeInfo.km?'<span class="subm-pill km">Путь: <b>'+esc(routeInfo.km)+'</b></span>':'')
     +'</div>';
   }
   el.innerHTML=h;
  };
  const clearSubPoint=()=>{
   S._subCurPt=null;
   S._subFit=null;
   S._subRouteTok++;
   if(S._subMk){try{S._subMk.remove()}catch(e){}S._subMk=null}
   if(S._map&&S._map.getSource('sub-route-src')){
    S._map.getSource('sub-route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:[]}});
    if(S._map.getLayer('sub-route-dash'))S._map.setLayoutProperty('sub-route-dash','visibility','none');
    if(S._map.getLayer('sub-route-solid'))S._map.setLayoutProperty('sub-route-solid','visibility','none');
   }
   if(S._map)S._map.easeTo({center:[44.515,40.181],zoom:12.2,duration:300});
   const inp=g('subMapInp'),clr=g('subMapClr');
   if(inp)inp.value='';
   if(clr)clr.hidden=true;
   renderSubRes(null,null);
  };
  window._subClearPt=clearSubPoint;
  window._subRenderHist=renderSubHist;
  const showSubPoint=(pt,saveHist)=>{
   if(!S._map||!window.maplibregl)return;
   const zone=window.ZoneService&&ZoneService.getZone?ZoneService.getZone(pt.lat,pt.lon):(typeof inKentron==='function'&&inKentron(pt.lat,pt.lon)?'kentron':null);
   const inK=!!zone;
   const item={name:cleanLbl(pt.name)||(pt.lat.toFixed(5)+', '+pt.lon.toFixed(5)),lat:pt.lat,lon:pt.lon,exact:pt.exact!==false,inK:inK,zone:zone,km:'',tm:''};
   S._subCurPt=item;
   if(S._subMk){try{S._subMk.remove()}catch(e){}S._subMk=null}
   const mel=document.createElement('div');
   mel.className='subm-mk '+(item.exact?(inK?'eve':'day'):'bad');
   mel.textContent=inK?'🌙':'☀️';
   const popHtml='<div class="pop-t" data-no-i18n="1">'+esc(item.name)+'</div><div class="pop-s">'+(inK?'🌙 Только вечером (после 21:00)':'☀️ Можно ставить днём')+'</div>';
   S._subMk=new maplibregl.Marker({element:mel,anchor:'center'}).setLngLat([item.lon,item.lat]).setPopup(new maplibregl.Popup({offset:18}).setHTML(popHtml)).addTo(S._map);

   const baseLL=[BASE_PT.lon,BASE_PT.lat],ptLL=[item.lon,item.lat];
   const straight=[baseLL,ptLL];
   if(S._map.getSource('sub-route-src')){
    S._map.getSource('sub-route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:straight}});
    if(S._map.getLayer('sub-route-dash'))S._map.setLayoutProperty('sub-route-dash','visibility','visible');
    if(S._map.getLayer('sub-route-solid'))S._map.setLayoutProperty('sub-route-solid','visibility','none');
   }
   S._subFit=()=>{
    if(!S._map)return;
    const b=new maplibregl.LngLatBounds();b.extend(baseLL);b.extend(ptLL);
    S._map.fitBounds(b,{padding:48,maxZoom:15,duration:350});
   };
   S._subFit();

   const approxKm=Math.max(1,Math.round(Math.hypot((item.lat-BASE_PT.lat)*111,(item.lon-BASE_PT.lon)*85)*1.25));
   item.km='~'+approxKm+' км';
   renderSubRes(item,{km:item.km,tm:'…'});
   if(saveHist){
    const idx=S._subHist.findIndex(x=>x.name===item.name);
    if(idx>=0)S._subHist.splice(idx,1);
    S._subHist.unshift(item);
    if(S._subHist.length>6)S._subHist.pop();
    renderSubHist();
   }

   const tok=++S._subRouteTok;
   const routeProm=(window.ZoneService&&ZoneService.fetchSafeRoute)
    ? ZoneService.fetchSafeRoute(BASE_PT,item,!item.inK)
    : (()=>{
     const coords=baseLL.join(',')+';'+ptLL.join(',');
     const loadRoad=u=>fetch(u+coords+'?overview=full&geometries=geojson').then(r=>r.json()).then(j=>{
      const r0=j.routes&&j.routes[0];
      if(!r0||!r0.geometry||!r0.geometry.coordinates||!r0.geometry.coordinates.length)throw 0;
      return r0;
     });
     return loadRoad('https://router.project-osrm.org/route/v1/driving/').catch(()=>loadRoad('https://routing.openstreetmap.de/routed-car/route/v1/driving/'));
    })();
   routeProm.then(r0=>{
    if(tok!==S._subRouteTok||!S._map||S.TAB!=='map')return;
    const rc=r0.geometry&&r0.geometry.coordinates;
    if(!rc||!rc.length)return;
    if(S._map.getSource('sub-route-src')){
     S._map.getSource('sub-route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:rc}});
     if(S._map.getLayer('sub-route-dash'))S._map.setLayoutProperty('sub-route-dash','visibility','none');
     if(S._map.getLayer('sub-route-solid'))S._map.setLayoutProperty('sub-route-solid','visibility','visible');
    }
    item.km=Math.max(1,Math.round((r0.distance||0)/1000))+' км';
    item.tm=fmtMin(r0.duration||0);
    renderSubRes(item,{km:item.km,tm:item.tm});
    renderSubHist();
   }).catch(()=>{
    if(tok!==S._subRouteTok||S.TAB!=='map')return;
    renderSubRes(item,{km:item.km,tm:''});
   });
  };
  window._subShowPt=showSubPoint;

  if(!g('admMap')){
   g('view').innerHTML=''
    +'<div class="subm-srch">'
    +'<div class="subm-inpw"><input id="subMapInp" type="search" autocomplete="off" placeholder="Введите адрес для проверки..."><button type="button" id="subMapClr" class="subm-clr" hidden>✕</button></div>'
    +'<button type="button" id="subMapGo" class="subm-go">Найти</button>'
    +'</div>'
    +'<div id="subMapSug" class="subm-sug"></div>'
    +'<div id="subMapRes" class="subm-res"></div>'
    +'<div class="map-wrap"><div id="admMap"></div><div class="map-bar">'
    +'<button type="button" id="admSatBtn" class="map-btn" data-act="mapsat"></button>'
    +'</div></div>'
    +'<div id="subMapHist"></div>';

   renderSubRes(S._subCurPt,S._subCurPt?{km:S._subCurPt.km,tm:S._subCurPt.tm}:null);
   renderSubHist();

   const inp=g('subMapInp'),clr=g('subMapClr'),goBtn=g('subMapGo'),sugBox=g('subMapSug');
   let _st=null,_picked=null;
   const showSugs=list=>{
    if(!sugBox)return;
    sugBox.innerHTML='';
    (list||[]).forEach(it=>{
     const b=document.createElement('button');
     b.type='button';
     b.className='subm-sug-it';
     b.setAttribute('data-no-i18n','1');
     b.textContent=it.name;
     b.onclick=()=>{
      _picked=it;
      if(inp){inp.value=cleanLbl(it.name);inp.focus()}
      if(clr)clr.hidden=false;
      showSugs([]);
     };
     sugBox.appendChild(b);
    });
   };
   const resolveAndShow=async it=>{
    let lat=it.lat,lon=it.lon,name=cleanLbl(it.name),exact=it.exact!==false;
    if(lat==null||lon==null){
     const q=cleanLbl(it.text||it.name);
     const hit=typeof ADR_CACHE!=='undefined'&&ADR_CACHE.find(x=>x&&x.name===q&&x.lat!=null);
     if(hit){lat=hit.lat;lon=hit.lon;name=hit.name;exact=hit.exact!==false}
     else if(typeof yan==='function'){
      const resEl=g('subMapRes');
      if(resEl){resEl.className='subm-res';resEl.innerHTML='<div class="subm-sub" style="margin:0">Ищу адрес...</div>'}
      const l=await yan(q);
      if(!l.length){toast('Адрес не найден',true);renderSubRes(S._subCurPt,S._subCurPt?{km:S._subCurPt.km,tm:S._subCurPt.tm}:null);return}
      lat=l[0].lat;lon=l[0].lon;name=cleanLbl(l[0].name);exact=l[0].exact;
     }
    }
    if(lat==null||lon==null){toast('Адрес не найден',true);return}
    if(typeof saveAdrCache==='function')saveAdrCache({name:name,lat:lat,lon:lon,exact:exact});
    showSubPoint({name:name,lat:lat,lon:lon,exact:exact},true);
   };
   const runSearch=async()=>{
    const q=(inp&&inp.value||'').trim();
    if(!q)return;
    if(_picked&&cleanLbl(_picked.name)===q){await resolveAndShow(_picked);return}
    showSugs([]);
    if(typeof yan!=='function')return;
    const resEl=g('subMapRes');
    if(resEl){resEl.className='subm-res';resEl.innerHTML='<div class="subm-sub" style="margin:0">Ищу адрес...</div>'}
    const l=await yan(q);
    if(!l.length){toast('Адрес не найден',true);renderSubRes(S._subCurPt,S._subCurPt?{km:S._subCurPt.km,tm:S._subCurPt.tm}:null);return}
    if(l.length===1&&l[0].exact){await resolveAndShow(l[0]);return}
    showSugs(l);
    renderSubRes(S._subCurPt,S._subCurPt?{km:S._subCurPt.km,tm:S._subCurPt.tm}:null);
   };
   if(inp){
    inp.addEventListener('input',()=>{
     _picked=null;
     const q=inp.value.trim();
     if(clr)clr.hidden=!q;
     clearTimeout(_st);
     if(q.length<2){showSugs([]);return}
     _st=setTimeout(async()=>{
      if(typeof sugList!=='function')return;
      const l=await sugList(q);
      if(inp.value.trim()===q)showSugs(l);
     },350);
    });
    inp.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();runSearch()}});
   }
   if(goBtn)goBtn.onclick=runSearch;
   if(clr)clr.onclick=()=>{if(inp){inp.value='';inp.focus()}clr.hidden=true;_picked=null;showSugs([])};

   try{
    const mTok=++S._mapTok;
    await ensureMapLibre();if(mTok!==S._mapTok||S.TAB!=='map'||!g('admMap'))return;
    if(S._mapRO){try{S._mapRO.disconnect()}catch(e){}S._mapRO=null}
    if(S._map){try{S._map.remove()}catch(e){}S._map=null}
    const kentronCenter=[44.515,40.181];
    const baseLL=[BASE_PT.lon,BASE_PT.lat];
    S._map=new maplibregl.Map({container:'admMap',style:'https://tiles.openfreemap.org/styles/dark',center:kentronCenter,zoom:12.2,attributionControl:false});
    S._map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),'top-left');
    const bel=document.createElement('div');bel.className='drv-pin';bel.innerHTML='<div class="drv-b base"><i></i><span>База EuroBaza</span></div>';
    S._baseMk=new maplibregl.Marker({element:bel,anchor:'center'}).setLngLat(baseLL).setPopup(new maplibregl.Popup({offset:18}).setHTML('<div class="pop-t">🏁 '+esc(BASE_PT.name)+'</div>')).addTo(S._map);

    let sr=false,fc=0,om=[],hs=false;
    const own=new Set(['adm-sat-layer','kentron-fill','kentron-line','saralanj-glow','saralanj-line','sub-route-glow','sub-route-dash','sub-route-solid']);
    const boostAdmLabels=sat=>{
     if(!S._map)return;
     const tc=sat?'#ffffff':'#f1f5f9',hc=sat?'#000000':'#0f172a',hw=sat?2:1.2;
     const hyExpr=['coalesce',['get','name:hy'],['get','name:arm'],['get','name:nonlatin'],['get','name'],['get','name_en']];
     om.forEach(l=>{
      if(l.type!=='symbol'||!S._map.getLayer(l.id))return;
      try{
       if(S._map.getLayoutProperty(l.id,'text-field')!==undefined)S._map.setLayoutProperty(l.id,'text-field',hyExpr);
       if(S._map.getPaintProperty(l.id,'text-color')!==undefined){
        S._map.setPaintProperty(l.id,'text-color',tc);
        S._map.setPaintProperty(l.id,'text-halo-color',hc);
        S._map.setPaintProperty(l.id,'text-halo-width',hw);
        S._map.setPaintProperty(l.id,'text-halo-blur',0.5);
       }
      }catch(e){}
     });
    };
    S._applyAdmSat=sat=>{
     if(!S._map||!S._map.getLayer('adm-sat-layer'))return;
     S._map.setLayoutProperty('adm-sat-layer','visibility',sat?'visible':'none');
     om.forEach(l=>{if(!S._map.getLayer(l.id))return;let v=l.vis;if(sat)v=(l.type==='symbol'||(l.type==='line'&&/admin|boundary/i.test(l.id)))?l.vis:'none';try{S._map.setLayoutProperty(l.id,'visibility',v)}catch(e){}});
     boostAdmLabels(sat);
    };
    S._map.on('style.load',()=>{
     if(!S._map)return;sr=true;const st=S._map.getStyle(),ls=(st&&st.layers)?st.layers.slice():[];
     om=ls.filter(l=>!own.has(l.id)).map(l=>({id:l.id,type:l.type,vis:(l.layout&&l.layout.visibility)||'visible'}));
     const sym=ls.find(l=>l.type==='symbol'),fid=sym?sym.id:undefined;hs=!!fid;
     if(!S._map.getSource('adm-sat-src')){S._map.addSource('adm-sat-src',{type:'raster',tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18});S._map.addLayer({id:'adm-sat-layer',type:'raster',source:'adm-sat-src',layout:{visibility:S.ADM_SAT?'visible':'none'}},fid)}
     if(typeof KENTRON_POLY!=='undefined'&&!S._map.getSource('kentron-src')){
      const ring=KENTRON_POLY.map(p=>[p[1],p[0]]);ring.push(ring[0]);
      S._map.addSource('kentron-src',{type:'geojson',data:{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]}}});
      S._map.addLayer({id:'kentron-fill',type:'fill',source:'kentron-src',paint:{'fill-color':'#ef4444','fill-opacity':0.2}},fid);
      S._map.addLayer({id:'kentron-line',type:'line',source:'kentron-src',paint:{'line-color':'#ef4444','line-width':2.4,'line-dasharray':[3,3]}},fid);
     }
     if(typeof SARALANJ_LINE!=='undefined'&&SARALANJ_LINE.length>1&&!S._map.getSource('saralanj-src')){
      const sLine=SARALANJ_LINE.map(p=>[p[1],p[0]]);
      S._map.addSource('saralanj-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:sLine}}});
      S._map.addLayer({id:'saralanj-glow',type:'line',source:'saralanj-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ef4444','line-width':14,'line-opacity':0.28}},fid);
      S._map.addLayer({id:'saralanj-line',type:'line',source:'saralanj-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ef4444','line-width':3.2,'line-dasharray':[3,2]}},fid);
     }
     if(!S._map.getSource('sub-route-src')){
      S._map.addSource('sub-route-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[]}}});
      S._map.addLayer({id:'sub-route-glow',type:'line',source:'sub-route-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0284c7','line-width':10,'line-opacity':0.42}},fid);
      S._map.addLayer({id:'sub-route-dash',type:'line',source:'sub-route-src',layout:{'line-cap':'round','line-join':'round',visibility:'none'},paint:{'line-color':'#38bdf8','line-width':4.5,'line-opacity':0.98,'line-dasharray':[2,2]}},fid);
      S._map.addLayer({id:'sub-route-solid',type:'line',source:'sub-route-src',layout:{'line-cap':'round','line-join':'round',visibility:'none'},paint:{'line-color':'#38bdf8','line-width':4.5,'line-opacity':1}},fid);
     }
     S._applyAdmSat(hs?S.ADM_SAT:true);
     if(S._subCurPt)showSubPoint(S._subCurPt,false);
    });
    S._map.on('click',ev=>{
     if(!ev||!ev.lngLat)return;
     if(ev.originalEvent&&ev.originalEvent.target&&ev.originalEvent.target.closest('.maplibregl-marker,.maplibregl-popup'))return;
     const lat=ev.lngLat.lat,lon=ev.lngLat.lng;
     showSubPoint({name:lat.toFixed(5)+', '+lon.toFixed(5),lat:lat,lon:lon,exact:true},true);
    });
    S._map.on('error',ev=>{if(ev&&ev.sourceId==='adm-sat-src')return;if(!sr&&S._map){fc++;try{if(fc===1)S._map.setStyle('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');else if(fc===2)S._map.setStyle({version:8,sources:{'adm-sat-src':{type:'raster',tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18}},layers:[{id:'adm-sat-layer',type:'raster',source:'adm-sat-src'}]})}catch(e){}}});
    if(typeof ResizeObserver!=='undefined'&&g('admMap')){S._mapRO=new ResizeObserver(()=>{if(S._map)S._map.resize()});S._mapRO.observe(g('admMap'))}
    setTimeout(()=>{if(S._map)S._map.resize()},80);setTimeout(()=>{if(S._map)S._map.resize()},350);
   }catch(e){if(g('subMapRes'))g('subMapRes').innerHTML='<div class="box mut">Ошибка карты: '+esc((e&&e.message)||e)+'</div>';return}
  }
  const icLayers='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
  const sBtn=g('admSatBtn');if(sBtn){sBtn.classList.toggle('on',S.ADM_SAT);sBtn.innerHTML=icLayers+'<span>'+(S.ADM_SAT?'Спутник':'Схема')+'</span>'}
 }

 async function drawMap(){
  if(isSubAdm()){return drawSubMap()}
  const Llist=devs(),now=Date.now();
  const withGeo=Llist.filter(d=>typeof d.u.lat==="number"&&typeof d.u.lon==="number"&&(!S.MAP_ONLY_ONLINE||(now-(d.u.t||0)<TTL)));
  if(!g("admMap")){
   g("view").innerHTML='<div class="map-wrap"><div id="admMap"></div><div class="map-bar"><button type="button" id="admSatBtn" class="map-btn" data-act="mapsat"></button><button type="button" id="mapFilterBtn" class="map-btn" data-act="mapfilter">⚪ Все водители</button></div></div><div id="mapCards"></div>';
   try{
    const mTok=++S._mapTok;
    await ensureMapLibre();if(mTok!==S._mapTok||S.TAB!=="map"||!g("admMap"))return;
    if(S._mapRO){try{S._mapRO.disconnect()}catch(e){}S._mapRO=null}
    if(S._map){try{S._map.remove()}catch(e){}S._map=null}
    const baseLL=[BASE_PT.lon,BASE_PT.lat];
    S._map=new maplibregl.Map({container:"admMap",style:"https://tiles.openfreemap.org/styles/dark",center:baseLL,zoom:12,attributionControl:false});
    S._map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),"top-left");
    const bel=document.createElement("div");bel.className="drv-pin";bel.innerHTML='<div class="drv-b base"><i></i><span>База EuroBaza</span></div>';
    S._baseMk=new maplibregl.Marker({element:bel,anchor:"center"}).setLngLat(baseLL).setPopup(new maplibregl.Popup({offset:18}).setHTML('<div class="pop-t">🏁 '+esc(BASE_PT.name)+'</div>')).addTo(S._map);
    let sr=false,fc=0,om=[],hs=false;
    const boostAdmLabels=sat=>{
     if(!S._map)return;
     const tc=sat?"#ffffff":"#f1f5f9";
     const hc=sat?"#000000":"#0f172a";
     const hw=sat?2:1.2;
     const hyExpr=["coalesce",["get","name:hy"],["get","name:arm"],["get","name:nonlatin"],["get","name"],["get","name_en"]];
     om.forEach(l=>{
      if(l.type!=="symbol"||!S._map.getLayer(l.id))return;
      try{
       if(S._map.getLayoutProperty(l.id,"text-field")!==undefined){
        S._map.setLayoutProperty(l.id,"text-field",hyExpr);
       }
       if(S._map.getPaintProperty(l.id,"text-color")!==undefined){
        S._map.setPaintProperty(l.id,"text-color",tc);
        S._map.setPaintProperty(l.id,"text-halo-color",hc);
        S._map.setPaintProperty(l.id,"text-halo-width",hw);
        S._map.setPaintProperty(l.id,"text-halo-blur",0.5);
       }
      }catch(e){}
     });
    };
    S._applyAdmSat=sat=>{
     if(!S._map||!S._map.getLayer("adm-sat-layer"))return;
     S._map.setLayoutProperty("adm-sat-layer","visibility",sat?"visible":"none");
     om.forEach(l=>{if(!S._map.getLayer(l.id))return;let v=l.vis;if(sat)v=(l.type==="symbol"||(l.type==="line"&&/admin|boundary/i.test(l.id)))?l.vis:"none";try{S._map.setLayoutProperty(l.id,"visibility",v)}catch(e){}});
     boostAdmLabels(sat);
    };
    S._map.on("style.load",()=>{
     if(!S._map)return;sr=true;const st=S._map.getStyle(),ls=(st&&st.layers)?st.layers.slice():[];
     om=ls.filter(l=>l.id!=="adm-sat-layer").map(l=>({id:l.id,type:l.type,vis:(l.layout&&l.layout.visibility)||"visible"}));
     const sym=ls.find(l=>l.type==="symbol"),fid=sym?sym.id:undefined;hs=!!fid;
     if(!S._map.getSource("adm-sat-src")){S._map.addSource("adm-sat-src",{type:"raster",tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18});S._map.addLayer({id:"adm-sat-layer",type:"raster",source:"adm-sat-src",layout:{visibility:S.ADM_SAT?"visible":"none"}},fid)}
     S._applyAdmSat(hs?S.ADM_SAT:true);
    });
    S._map.on("error",ev=>{if(ev&&ev.sourceId==="adm-sat-src")return;if(!sr&&S._map){fc++;try{if(fc===1)S._map.setStyle("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json");else if(fc===2)S._map.setStyle({version:8,sources:{"adm-sat-src":{type:"raster",tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18}},layers:[{id:"adm-sat-layer",type:"raster",source:"adm-sat-src"}]})}catch(e){}}});
    setTimeout(()=>{if(S._map)S._map.resize()},80);setTimeout(()=>{if(S._map)S._map.resize()},350);
   }catch(e){if(g("mapCards"))g("mapCards").innerHTML='<div class="box mut">Ошибка карты: '+esc((e&&e.message)||e)+'</div>';return}
  }
  const icLayers='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>';
  const sBtn=g("admSatBtn");if(sBtn){sBtn.classList.toggle("on",S.ADM_SAT);sBtn.innerHTML=icLayers+'<span>'+(S.ADM_SAT?"Спутник":"Схема")+'</span>'}
  const fBtn=g("mapFilterBtn");if(fBtn){fBtn.classList.toggle("on",S.MAP_ONLY_ONLINE);fBtn.innerHTML='<i class="m-dot'+(S.MAP_ONLY_ONLINE?" on":"")+'"></i><span>'+(S.MAP_ONLY_ONLINE?"Только онлайн":"Все водители")+'</span>'}
  try{syncMapMarkers()}catch(e){}
  let ch='<div class="sec">'+(S.MAP_ONLY_ONLINE?'Сейчас на линии (':'На карте (')+withGeo.length+')</div>';
  if(!withGeo.length)ch+='<div class="empty-box">'+(S.MAP_ONLY_ONLINE?'Сейчас нет водителей в сети с активной геолокацией.':'Пока ни одно устройство не передало координаты.')+'</div>';
  else ch+=withGeo.map(d=>{const live=now-(d.u.t||0)<TTL,spd=typeof d.u.spd==="number"&&d.u.spd>2?" · "+d.u.spd+" км/ч":"";return'<div class="row" data-act="focus" data-id="'+esc(d.id)+'"><span class="dot'+(live?" on":"")+'"></span><div class="rm"><div class="rt" data-no-i18n="1">'+esc(dispName(d))+'</div><div class="rs">'+(live?"сейчас на линии":"обновлено "+ago(d.u.gt||d.u.t))+esc(spd)+'</div></div></div>'}).join("");
  if(g("mapCards"))g("mapCards").innerHTML=ch;
 }

 Object.assign(Adm, { destroyMap, fitAllDrivers, syncMapMarkers, drawSubMap, drawMap });
})(window.Adm);
