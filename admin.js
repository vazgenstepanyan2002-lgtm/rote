// EuroBaza: административная панель (вход через Firebase Auth, чтение users, labels, config)
(function(){
 'use strict';
 const g=id=>document.getElementById(id);
 const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const CUR='֏',TTL=75000;
 const fm=n=>(Math.round((+n||0)*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const money=n=>fm(n)+' '+CUR;
 const MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
 const RU={'Այլ':'Другое','Աթոռ, դարակաշար':'Стулья, стеллажи','Աթոռ սեղաններ':'Стулья, столы','Լվացարան':'Раковина','Կոմոդներ':'Комоды','Մահճակալ':'Кровать','Մոդուլներ':'Модули','Ներքնակներ':'Матрасы','Պահոցներ':'Системы хранения','դուռ':'Дверь','Պուֆիկներ':'Пуфы','Տումբաներ':'Тумбы','Բազմոցներ':'Диваны','Բազկաթոռ':'Кресло','Բազմոց':'Диван','Հավաքածու':'Комплект','Ընդունարան':'Ресепшен','Խոհանոցներ':'Кухни','Հյուրասրահ':'Гостиная','Ննջասենյակներ':'Спальни','Պահարաններ':'Шкафы','Մինչև 1,6':'До 1,6','1,6 ից ավել':'Более 1,6','1,6 մ':'1,6 м','2-3 մ':'2–3 м','մինչև 1,7':'До 1,7','1,7 ից ավել':'Более 1,7','Էքսկլ.':'Эксклюзив','2 դուռ':'2 двери','3 դուռ առանց կոմոդ':'3 двери без комода','3 դուռ կոմոդով':'3 двери с комодом','4 դուռ':'4 двери','5 դուռ':'5 дверей','6 դուռ':'6 дверей'};
 const nm=v=>RU[v]||v;
 const monthName=k=>{const p=String(k||'').split('-');return p.length<2?String(k||'—'):(MN[+p[1]-1]||p[1])+' '+p[0]};
 const verFmt=v=>/^\d{14}$/.test(v||'')?v.slice(6,8)+'.'+v.slice(4,6)+'.'+v.slice(0,4)+' '+v.slice(8,10)+':'+v.slice(10,12):(v||'нет данных');
 function ago(ms){
  if(!ms)return 'давно';
  const s=Math.max(0,Math.round((Date.now()-ms)/1000));
  if(s<60)return 'только что';
  const m=Math.round(s/60);if(m<60)return m+' мин назад';
  const h=Math.round(m/60);if(h<48)return h+' ч назад';
  return Math.round(h/24)+' дн назад';
 }
 function devName(ua){
  ua=ua||'';
  const m=ua.match(/Android [\d.]+; ([^;)]+)/);
  if(m)return m[1].trim();
  return /iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Windows/i.test(ua)?'Windows':/Mac OS/i.test(ua)?'Mac':/Linux/i.test(ua)?'Linux':'Устройство';
 }
 function devInfo(ua){
  ua=ua||'';
  const os=/Android/i.test(ua)?'Android':/iPhone|iPad|iPod/i.test(ua)?'iOS':/Windows/i.test(ua)?'Windows':/Mac OS/i.test(ua)?'macOS':/Linux/i.test(ua)?'Linux':'?';
  const br=/SamsungBrowser/i.test(ua)?'Samsung':/EdgA?\//i.test(ua)?'Edge':/OPR\//i.test(ua)?'Opera':/YaBrowser/i.test(ua)?'Yandex':/Firefox|FxiOS/i.test(ua)?'Firefox':/Chrome|CriOS/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'';
  return os+(br?' · '+br:'');
 }

 // ===== Firebase =====
 const CFG={
  apiKey:'AIzaSyCR8uHLrEMGDd-sbMidapnuaRdFK3fNdng',
  authDomain:'eurobaza-c5aa5.firebaseapp.com',
  databaseURL:'https://eurobaza-c5aa5-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:'eurobaza-c5aa5'
 };
 if(!window.firebase){g('lgMsg').textContent='Не загрузился Firebase. Проверьте интернет и обновите страницу.';return}
 firebase.initializeApp(CFG);
 const auth=firebase.auth(),db=firebase.database();

 let USERS={},LABELS={},FU=0,PUB=undefined,TAB='online',SEL='all';
 const OPEN={};
 let offs=[],tick=null,_tt=null;

 function toast(m,err){const t=g('toast');t.textContent=m;t.className='show'+(err?' err':'');clearTimeout(_tt);_tt=setTimeout(()=>{t.className=''},2600)}
 function showErr(m){const e=g('err');e.textContent=m||'';e.hidden=!m}
 function denied(e){
  const d=(e&&e.code==='PERMISSION_DENIED')||/permission_denied/i.test((e&&e.message)||'');
  showErr(d?'Нет доступа к данным. Проверьте, что правила базы опубликованы и в них указан ваш email.':'Ошибка базы: '+((e&&e.message)||e));
 }
 function listen(path,cb){
  const r=db.ref(path);
  const fn=r.on('value',s=>cb(s.val()),denied);
  offs.push(()=>r.off('value',fn));
 }
 function stop(){offs.forEach(f=>{try{f()}catch(e){}});offs=[];clearInterval(tick);tick=null}
 function start(){
  stop();
  listen('users',v=>{USERS=v||{};showErr('');draw()});
  listen('labels',v=>{LABELS=v||{};draw()});
  listen('config/forceUpdate',v=>{FU=+v||0;draw()});
  loadPub();
  tick=setInterval(draw,15000);
 }
 async function loadPub(){
  try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});PUB=(await r.json()).v||''}catch(e){PUB=null}
  draw();
 }

 // ===== Данные =====
 function parseDev(id,u){
  u=u||{};
  let cur={sum:0,qty:0,cats:[]},hist={};
  try{const c=JSON.parse(u.cur||'');if(c&&typeof c==='object')cur=c}catch(e){}
  try{const h=JSON.parse(u.hist||'{}');if(h&&typeof h==='object')hist=h}catch(e){}
  return{id:id,u:u,cur:cur,hist:hist};
 }
 const devs=()=>Object.keys(USERS).map(k=>parseDev(k,USERS[k])).sort((a,b)=>(b.u.t||0)-(a.u.t||0));
 function aggMonths(list){
  const map={};
  list.forEach(d=>Object.keys(d.hist).forEach(k=>{
   const h=d.hist[k];if(!h)return;
   const m=h.m||'';
   const x=map[m]||(map[m]={m:m,sum:0,qty:0,n:0});
   x.sum+=+h.sum||0;x.qty+=+h.qty||0;x.n++;
  }));
  return Object.keys(map).map(k=>map[k]).sort((a,b)=>a.m<b.m?1:a.m>b.m?-1:0);
 }
 function detail(rows){
  if(!rows||!rows.length)return '<div class="mut">Пусто</div>';
  return rows.map(c=>'<div class="cat"><div class="cath"><span>'+esc(nm(c.name))+'</span><b>'+money(c.sum)+'</b></div>'
   +(c.items||[]).map(it=>'<div class="it"><div class="itn">'+esc(nm(it.name))+'</div>'
    +(it.parts||[]).map(z=>'<div class="pt"><span class="tg">'+esc(z.l||'Шт')+'</span><span>'+fm(z.n)+' × '+fm(z.p)+'</span><b>'+money(z.v)+'</b></div>').join('')
    +'</div>').join('')+'</div>').join('');
 }

 
 
 
 
 // ===== Живая карта водителей =====
 const BASE_PT = { lat: 40.120847, lon: 44.514271, name: "База EuroBaza (Арин Берд 7)" };
 let _lfProm = null, _map = null, _markers = {}, _baseMk = null, _didFit = false, MAP_ONLY_ONLINE = false;

 function ensureLeaflet(){
  if(window.L && L.map) return Promise.resolve();
  if(_lfProm) return _lfProm;
  _lfProm = new Promise((res, rej) => {
   const s = document.createElement("script");
   s.src = "leaflet.min.js";
   s.onload = () => res();
   s.onerror = () => { _lfProm = null; rej(new Error("Ошибка загрузки leaflet.min.js")); };
   document.head.appendChild(s);
  });
  return _lfProm;
 }

 function destroyMap(){
  if(_map){ try{ _map.remove(); }catch(e){} _map = null; }
  _markers = {}; _baseMk = null; _didFit = false;
 }

 function fitAllDrivers(){
  if(!_map || !window.L) return;
  const now = Date.now();
  const baseLL = L.latLng(BASE_PT.lat, BASE_PT.lon);
  const pts = new Array(baseLL);
  devs().forEach(d => {
   if(typeof d.u.lat !== "number" || typeof d.u.lon !== "number") return;
   if(MAP_ONLY_ONLINE && !(now - (d.u.t || 0) < TTL)) return;
   pts.push(L.latLng(d.u.lat, d.u.lon));
  });
  if(pts.length === 1) _map.setView(baseLL, 13);
  else _map.fitBounds(L.latLngBounds(pts), { padding: L.point(36, 36), maxZoom: 15 });
 }

 function syncMapMarkers(){
  if(!_map || !window.L) return;
  const now = Date.now(), seen = {};
  devs().forEach(d => {
   if(typeof d.u.lat !== "number" || typeof d.u.lon !== "number") return;
   const live = now - (d.u.t || 0) < TTL;
   if(MAP_ONLY_ONLINE && !live) return;
   seen[d.id] = true;
   const title = LABELS[d.id] || devName(d.u.ua);
   const spd = typeof d.u.spd === "number" && d.u.spd > 2 ? " · " + d.u.spd + " км/ч" : "";
   const popHtml = '<div class="pop-t">' + esc(title) + '</div>'
    + '<div class="pop-s">' + (live ? "🟢 В сети" : "⚪ Был(а) " + ago(d.u.gt || d.u.t)) + esc(spd) + '</div>';

   const htmlPin = '<div class="drv-b' + (live ? "" : " off") + '"><i></i><span>' + esc(title) + '</span></div>';
   const ic = L.divIcon({ className: "drv-pin", html: htmlPin, iconSize: L.point(0, 0) });
   const ll = L.latLng(d.u.lat, d.u.lon);

   if(_markers[d.id]){
    _markers[d.id].setLatLng(ll);
    _markers[d.id].setIcon(ic);
    if(_markers[d.id].getPopup()) _markers[d.id].setPopupContent(popHtml);
   } else {
    _markers[d.id] = L.marker(ll, { icon: ic }).addTo(_map).bindPopup(popHtml);
   }
  });

  Object.keys(_markers).forEach(id => {
   if(!seen[id]){ _map.removeLayer(_markers[id]); delete _markers[id]; }
  });

  if(!_didFit){ _didFit = true; fitAllDrivers(); }
 }

 async function drawMap(){
  const Llist = devs(), now = Date.now();
  const withGeo = Llist.filter(d => {
   if(typeof d.u.lat !== "number" || typeof d.u.lon !== "number") return false;
   if(MAP_ONLY_ONLINE && !(now - (d.u.t || 0) < TTL)) return false;
   return true;
  });

  if(!g("admMap")){
   g("view").innerHTML = '<div class="map-wrap"><div id="admMap"></div><div class="map-bar"><button type="button" id="mapFilterBtn" class="map-btn" data-act="mapfilter">⚪ Все водители</button></div></div><div id="mapCards"></div>';
   try{
    await ensureLeaflet();
    if(TAB !== "map" || !g("admMap")) return;
    const baseLL = L.latLng(BASE_PT.lat, BASE_PT.lon);
    _map = L.map("admMap", { zoomControl: true }).setView(baseLL, 12);
    const tl = L.tileLayer("https://openstreetmap.org{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(_map);
    let _fb = false;
    tl.on("tileerror", () => {
     if(_fb) return;
     _fb = true;
     tl.setUrl("https://google.com{x}&y={y}&z={z}");
    });
    const baseIc = L.divIcon({ className: "drv-pin", html: '<div class="drv-b base"><i></i><span>База EuroBaza</span></div>', iconSize: L.point(0, 0) });
    _baseMk = L.marker(baseLL, { icon: baseIc }).addTo(_map).bindPopup('<div class="pop-t">🏁 ' + esc(BASE_PT.name) + '</div>');
    setTimeout(() => { if(_map) _map.invalidateSize(); }, 150);
   }catch(e){
    if(g("mapCards")) g("mapCards").innerHTML = '<div class="box mut">Ошибка карты: ' + esc((e && e.message) || e) + '</div>';
    return;
   }
  }

  const fBtn = g("mapFilterBtn");
  if(fBtn){
   fBtn.classList.toggle("on", MAP_ONLY_ONLINE);
   fBtn.textContent = MAP_ONLY_ONLINE ? "🟢 Только онлайн" : "⚪ Все водители";
  }

  try{ syncMapMarkers(); }catch(e){}

  let ch = '<div class="sec">' + (MAP_ONLY_ONLINE ? 'Сейчас на линии (' : 'На карте (') + withGeo.length + ')</div>';
  if(!withGeo.length){
   ch += '<div class="box mut">' + (MAP_ONLY_ONLINE ? 'Сейчас нет водителей в сети с активной геолокацией.' : 'Пока ни одно устройство не передало координаты. Координаты появятся, когда приложение откроют с разрешённой геолокацией.') + '</div>';
  } else {
   ch += withGeo.map(d => {
    const live = now - (d.u.t || 0) < TTL;
    const title = LABELS[d.id] || devName(d.u.ua);
    const spd = typeof d.u.spd === "number" && d.u.spd > 2 ? " · " + d.u.spd + " км/ч" : "";
    return '<div class="row" data-act="focus" data-id="' + esc(d.id) + '"><span class="dot' + (live ? " on" : "") + '"></span>'
     + '<div class="rm"><div class="rt">' + esc(title) + '</div>'
     + '<div class="rs">' + (live ? "сейчас на линии" : "обновлено " + ago(d.u.gt || d.u.t)) + esc(spd) + '</div></div></div>';
   }).join("");
  }
  if(g("mapCards")) g("mapCards").innerHTML = ch;
 }
 // ===== Вкладки =====
 function drawOnline(){
  const L=devs(),now=Date.now();
  const on=L.filter(d=>now-(d.u.t||0)<TTL).length,day=L.filter(d=>now-(d.u.t||0)<864e5).length;
  let h='<div class="tiles"><div class="tile"><b>'+on+'</b><span>онлайн</span></div><div class="tile"><b>'+day+'</b><span>за 24 часа</span></div><div class="tile"><b>'+L.length+'</b><span>всего</span></div></div>';
  if(!L.length)h+='<div class="mut box">Данных пока нет. Устройства появятся, когда откроют обновлённое приложение.</div>';
  h+=L.map(d=>{
   const live=now-(d.u.t||0)<TTL,lab=LABELS[d.id];
   return '<div class="row" data-act="rename" data-id="'+esc(d.id)+'"><span class="dot'+(live?' on':'')+'"></span>'
    +'<div class="rm"><div class="rt">'+esc(lab||devName(d.u.ua))+'</div>'
    +'<div class="rs">'+esc(devInfo(d.u.ua)+' · '+(d.u.lang||'ru')+' · …'+d.id.slice(-4))+'</div>'
    +'<div class="rs">'+(live?'сейчас в приложении':'был(а) '+ago(d.u.t))+' · версия '+esc(verFmt(d.u.v))+(d.u.addr!=null?' · адресов: '+esc(d.u.addr):'')+'</div></div>'
    +'<div class="rv">'+money(d.cur.sum)+'</div>'
    +'<button class="xb" data-act="del" data-id="'+esc(d.id)+'" aria-label="Удалить">✕</button></div>';
  }).join('');
  if(L.length)h+='<div class="mut hint">Нажмите на устройство, чтобы задать ему имя.</div>';
  g('view').innerHTML=h;
 }
 function drawTotals(){
  const L=devs();
  if(SEL!=='all'&&!USERS[SEL])SEL='all';
  let h='<select id="sel"><option value="all">Все устройства</option>'
   +L.map(d=>'<option value="'+esc(d.id)+'"'+(SEL===d.id?' selected':'')+'>'+esc(LABELS[d.id]||devName(d.u.ua)+' …'+d.id.slice(-4))+'</option>').join('')+'</select>';
  if(SEL==='all'){
   const sum=L.reduce((a,d)=>a+(+d.cur.sum||0),0),qty=L.reduce((a,d)=>a+(+d.cur.qty||0),0);
   h+='<div class="hero"><span>Текущий месяц (не сохранён)</span><b>'+money(sum)+'</b><span>'+fm(qty)+' шт</span></div>';
   const ms=aggMonths(L);
   h+='<div class="sec">Сохранённые итоги</div>';
   if(!ms.length)h+='<div class="mut box">Сохранённых итогов пока нет.</div>';
   h+=ms.map(x=>'<div class="mr"><div class="rm"><div class="rt">'+esc(monthName(x.m))+'</div><div class="rs">'+fm(x.qty)+' шт · записей: '+x.n+'</div></div><div class="rv">'+money(x.sum)+'</div></div>').join('');
  }else{
   const d=parseDev(SEL,USERS[SEL]);
   h+='<div class="hero"><span>Текущий месяц (не сохранён)</span><b>'+money(d.cur.sum)+'</b><span>'+fm(d.cur.qty)+' шт</span></div>';
   if((d.cur.cats||[]).length)h+=d.cur.cats.map(c=>'<div class="mr"><div class="rm"><div class="rt">'+esc(nm(c.n))+'</div><div class="rs">'+fm(c.q)+' шт</div></div><div class="rv">'+money(c.s)+'</div></div>').join('');
   h+='<div class="sec">Сохранённые итоги</div>';
   const ks=Object.keys(d.hist).filter(k=>d.hist[k]).sort((a,b)=>{const x=d.hist[a],y=d.hist[b];return (y.m||'')<(x.m||'')?-1:(y.m||'')>(x.m||'')?1:(y.t||0)-(x.t||0)});
   if(!ks.length)h+='<div class="mut box">У этого устройства нет сохранённых итогов.</div>';
   h+=ks.map(k=>{
    const x=d.hist[k],key=SEL+'|'+k,op=!!OPEN[key];
    return '<div class="mr col" data-act="month" data-key="'+esc(key)+'"><div class="mrt"><div class="rm"><div class="rt">'+esc(monthName(x.m))+'</div><div class="rs">'+fm(x.qty)+' шт · сохранено '+esc(ago(x.t))+'</div></div><div class="rv">'+money(x.sum)+'</div><span class="ar">'+(op?'▾':'▸')+'</span></div>'
     +(op?'<div class="dt">'+detail(x.rows)+'</div>':'')+'</div>';
   }).join('');
  }
  g('view').innerHTML=h;
 }
 function drawVer(){
  const L=devs(),by={};
  L.forEach(d=>{const v=d.u.v||'';by[v]=(by[v]||0)+1});
  let h='<div class="hero"><span>Опубликованная версия</span><b>'+(PUB===undefined?'…':PUB===null?'нет связи':esc(verFmt(PUB)))+'</b><span><a href="#" data-act="pub">проверить снова</a></span></div>';
  h+='<div class="sec">Версии на устройствах</div>';
  if(!L.length)h+='<div class="mut box">Данных пока нет.</div>';
  h+=Object.keys(by).sort().reverse().map(v=>{
   const old=PUB&&v!==PUB;
   return '<div class="mr"><div class="rm"><div class="rt">'+esc(verFmt(v))+'</div><div class="rs">'+(old?'не последняя версия':'актуальная')+'</div></div><div class="rv'+(old?' warn':'')+'">'+by[v]+' устр.</div></div>';
  }).join('');
  h+='<div class="sec">Принудительное обновление</div>'
   +'<div class="box">Отправляет всем устройствам команду перезагрузить приложение с сервера. Устройство обновится, когда приложение открыто и в нём не заполняется форма.<br><br>'
   +'Последняя команда: <b>'+(FU?esc(new Date(FU).toLocaleString('ru-RU'))+' ('+esc(ago(FU))+')':'ещё не отправлялась')+'</b></div>'
   +'<button class="btn" data-act="force">🔄 Обновить у всех</button>';
  g('view').innerHTML=h;
 }
 function draw(){
  if(g('panel').hidden)return;
  if(TAB==='totals'&&document.activeElement&&document.activeElement.id==='sel')return;
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===TAB));
  const st=window.scrollY;
  if(TAB!=='map'&&_map)destroyMap();
  if(TAB==='online')drawOnline();
  else if(TAB==='map')drawMap();
  else if(TAB==='totals')drawTotals();
  else drawVer();
  window.scrollTo(0,st);
 }

 
 // ===== Кастомные модальные окна (без системных confirm/prompt) =====
 function openDialog({title, msg, okText, danger, inputVal, placeholder}){
  return new Promise(res => {
   const ov = g("cOv"), box = g("cBox"), ic = g("cIc"), inp = g("cIn"), ok = g("cOk"), no = g("cNo");
   const isInput = inputVal !== undefined;
   box.className = "dlg" + (danger ? " danger" : "");
   g("cT").textContent = title || (danger ? "Удаление записи" : "Подтверждение");
   g("cM").textContent = msg || "";
   g("cM").hidden = !msg;
   ok.textContent = okText || (danger ? "Удалить" : isInput ? "Сохранить" : "Подтвердить");

   if(isInput){
    inp.hidden = false;
    inp.value = inputVal;
    inp.placeholder = placeholder || "";
    ic.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
   } else {
    inp.hidden = true;
    ic.innerHTML = danger
     ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
     : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
   }

   const close = val => {
    ov.classList.remove("show");
    document.removeEventListener("keydown", onKey);
    ok.onclick = no.onclick = ov.onclick = inp.onkeydown = null;
    setTimeout(() => { ov.hidden = true; res(val); }, 180);
   };
   const onKey = e => { if(e.key === "Escape") close(isInput ? null : false); };

   ok.onclick = () => close(isInput ? inp.value : true);
   no.onclick = () => close(isInput ? null : false);
   ov.onclick = e => { if(e.target === ov) close(isInput ? null : false); };
   inp.onkeydown = e => { if(e.key === "Enter"){ e.preventDefault(); close(inp.value); } };
   document.addEventListener("keydown", onKey);

   ov.hidden = false;
   requestAnimationFrame(() => {
    ov.classList.add("show");
    if(isInput){ inp.focus(); inp.select(); } else { ok.focus(); }
   });
  });
 }
 const ask = (msg, opts = {}) => openDialog({ ...opts, msg, danger: opts.danger ?? /удал|очист|сброс/i.test(msg) });
 const askInput = (title, msg, inputVal, placeholder) => openDialog({ title, msg, inputVal, placeholder });

 // ===== Действия =====
 async function force(){
  if(!(await ask('Отправить всем устройствам команду обновления?', { title: 'Обновление приложения', okText: 'Обновить' })))return;
  try{await db.ref('config/forceUpdate').set(firebase.database.ServerValue.TIMESTAMP);toast('Команда отправлена')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 async function rename(id){
  const cur=LABELS[id]||'';
  const v=await askInput('Имя устройства', 'Оставьте поле пустым, чтобы сбросить название', cur, 'Например: Водитель Артак');
  if(v===null)return;
  const t=v.trim().slice(0,40);
  try{if(t)await db.ref('labels/'+id).set(t);else await db.ref('labels/'+id).remove();toast('Сохранено')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 async function del(id){
  if(!(await ask('Удалить запись об этом устройстве из панели? Данные в самом приложении останутся.', { title: 'Удалить устройство', okText: 'Удалить', danger: true })))return;
  try{await db.ref('users/'+id).remove();await db.ref('labels/'+id).remove();toast('Удалено')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 g('view').addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(a==='pub'){e.preventDefault();PUB=undefined;draw();loadPub()}
  else if(a==='force')force();
  else if(a==='del'){e.stopPropagation();del(b.dataset.id)}
  else if(a==='rename')rename(b.dataset.id);
  else if(a==='month'){OPEN[b.dataset.key]=!OPEN[b.dataset.key];draw()}
  else if(a==='mapfilter'){MAP_ONLY_ONLINE=!MAP_ONLY_ONLINE;_didFit=false;drawMap()}
  else if(a==='focus'){const mk=_markers[b.dataset.id];if(mk&&_map){_map.setView(mk.getLatLng(),16,{animate:true});mk.openPopup()}}
 });
 g('view').addEventListener('change',e=>{if(e.target.id==='sel'){SEL=e.target.value;draw()}});
 document.querySelectorAll('.tabs button').forEach(b=>b.onclick=async ()=>{TAB=b.dataset.tab;draw()});

 // ===== Вход и выход =====
 const AUTH_ERR={
  'auth/invalid-credential':'Неверный email или пароль',
  'auth/wrong-password':'Неверный email или пароль',
  'auth/user-not-found':'Неверный email или пароль',
  'auth/invalid-email':'Некорректный email',
  'auth/too-many-requests':'Слишком много попыток. Подождите и повторите',
  'auth/network-request-failed':'Нет связи с сервером',
  'auth/operation-not-allowed':'В Firebase не включён вход по email и паролю'
 };
 async function login(){
  const m=g('lgMsg'),em=g('lgEm').value.trim(),pw=g('lgPw').value;
  if(!em||!pw){m.textContent='Введите email и пароль';return}
  m.textContent='Вхожу...';g('lgGo').disabled=true;
  try{await auth.signInWithEmailAndPassword(em,pw);m.textContent='';g('lgPw').value=''}
  catch(e){m.textContent=AUTH_ERR[e&&e.code]||('Ошибка входа: '+((e&&e.message)||e))}
  g('lgGo').disabled=false;
 }
 g('lgGo').onclick=login;
 g('lgPw').onkeydown=e=>{if(e.key==='Enter')login()};
 g('lgEm').onkeydown=e=>{if(e.key==='Enter')g('lgPw').focus()};
 g('out').onclick=async ()=>auth.signOut();
 auth.onAuthStateChanged(u=>{
  if(u){
   g('login').hidden=true;g('panel').hidden=false;g('who').textContent=u.email||'';
   start();draw();
  }else{
   stop();USERS={};LABELS={};
   g('panel').hidden=true;g('login').hidden=false;
  }
 });
})();
