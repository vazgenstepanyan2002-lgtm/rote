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

 let USERS={},LABELS={},ACCOUNTS={},CHAT=[],CHAT_OPEN=false,DMS={},DM_UID=null,FU=0,PUB=undefined,TAB='online',SEL='all';
 const SUB_EMAIL='diannakirakosyan@gmail.com';
 const isSubAdm=()=>((auth.currentUser&&auth.currentUser.email)||'').toLowerCase()===SUB_EMAIL;
 const admRawName=()=>isSubAdm()?'Доставка':'Админ';
 const admTag=()=>isSubAdm()?'delivery':'admin';
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
  listen('accounts',v=>{ACCOUNTS=v||{};draw()});
  if(!isSubAdm())listen('dm',onDmSnap);
  listen('config/forceUpdate',v=>{FU=+v||0;draw()});
  listen('chat',v=>{const obj=v||{};const all=Object.keys(obj).map(k=>Object.assign({k:k},obj[k])).sort((a,b)=>(+a.t||0)-(+b.t||0));const list=all.length>50?(all.slice(0,all.length-50).forEach(x=>db.ref('chat/'+x.k).remove().catch(()=>{})),all.slice(-50)):all;if(_admChatInit){const fresh=list.filter(m=>(+m.t||0)>_admLastNotifT&&!m.adm);if(fresh.length){const lm=fresh[fresh.length-1];_admLastNotifT=+lm.t||Date.now();localStorage.setItem('ADM_CHAT_NOTIF_T',String(_admLastNotifT));if(!CHAT_OPEN||document.hidden)admNotify((lm.name||'Водитель'),String(lm.txt||'').slice(0,140))}}else if(list.length){const mx=Math.max.apply(null,list.map(m=>+m.t||0));if(mx>_admLastNotifT){_admLastNotifT=mx;localStorage.setItem('ADM_CHAT_NOTIF_T',String(_admLastNotifT))}}_admChatInit=true;CHAT=list;if(CHAT_OPEN&&!document.hidden){markAdmChatSeen();renderAdmChat()}else updAdmChatBdg()});
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
 const accByUid=uid=>Object.keys(ACCOUNTS).map(k=>Object.assign({key:k},ACCOUNTS[k])).find(a=>a&&a.uid===uid)||null;
 const profName=d=>d.u.uname||(accByUid(d.id)&&accByUid(d.id).name)||"";
 const dispName=d=>{const lb=LABELS[d.id],pr=profName(d);return lb&&pr&&lb!==pr?lb+" ("+pr+")":(lb||pr||devName(d.u.ua))};
 const dispHtml=d=>{const lb=LABELS[d.id],pr=profName(d);return lb&&pr&&lb!==pr?esc(lb)+' <span style="font-size:12px;font-weight:500;color:#94a3b8">(в профиле: '+esc(pr)+')</span>':esc(lb||pr||devName(d.u.ua))};
 const devs=()=>Object.keys(USERS).map(k=>parseDev(k,USERS[k])).sort((a,b)=>(b.u.t||0)-(a.u.t||0));
 function aggMonths(list){
  const map={};
  list.forEach(d=>{
   const who=dispName(d);
   Object.keys(d.hist).forEach(k=>{
    const h=d.hist[k];if(!h)return;
    const m=h.m||'';
    const x=map[m]||(map[m]={m:m,sum:0,qty:0,n:0,byDev:{}});
    const s=+h.sum||0,q=+h.qty||0;
    x.sum+=s;x.qty+=q;x.n++;
    const bd=x.byDev[d.id]||(x.byDev[d.id]={id:d.id,name:who,sum:0,qty:0});
    bd.sum+=s;bd.qty+=q;
   });
  });
  return Object.keys(map).map(k=>{
   const x=map[k];
   x.devs=Object.keys(x.byDev).map(id=>x.byDev[id]).sort((a,b)=>b.sum-a.sum);
   return x;
  }).sort((a,b)=>a.m<b.m?1:a.m>b.m?-1:0);
 }
 function copyReport(title,items,totQty,totSum){
  if(!items||!items.length){toast('Нет данных для копирования',true);return}
  const lines=['📋 Ведомость EuroBaza — '+title,''];
  items.forEach(it=>lines.push('• '+it.name+': '+fm(it.qty)+' шт — '+money(it.sum)));
  lines.push('','Итого: '+fm(totQty)+' шт — '+money(totSum));
  const txt=lines.join('\n');
  if(navigator.clipboard&&navigator.clipboard.writeText){
   navigator.clipboard.writeText(txt).then(()=>toast('Ведомость скопирована')).catch(()=>toast('Не удалось скопировать',true));
  }else{toast('Буфер обмена недоступен',true)}
 }
 function detail(rows){
  if(!rows||!rows.length)return '<div class="mut">Пусто</div>';
  return rows.map(c=>{
   const cq=(c.items||[]).reduce((a,it)=>a+(it.parts||[]).reduce((b,z)=>b+(+z.n||0),0),0);
   return '<div class="cat"><div class="cath"><span>'+esc(nm(c.name))+'<i class="catq">'+fm(cq)+' шт</i></span><b>'+money(c.sum)+'</b></div>'
    +(c.items||[]).map(it=>'<div class="it"><div class="itn">'+esc(nm(it.name))+'</div>'
     +(it.parts||[]).map(z=>{
      const cls=z.l==='Район'?'reg':(z.l?'city':'one');
      return '<div class="pt"><span class="tg '+cls+'">'+esc(z.l||'Шт')+'</span><span class="ptc"><b>'+fm(z.n)+' шт</b> × '+fm(z.p)+' '+CUR+'</span><b>'+money(z.v)+'</b></div>';
     }).join('')
     +'</div>').join('')+'</div>';
  }).join('');
 }

 
 
 
 
 // ===== Живая карта водителей =====
 const BASE_PT = { lat: 40.120847, lon: 44.514271, name: "База EuroBaza (Арин Берд 7)" };
 let _lfProm = null, _map = null, _markers = {}, _baseMk = null, _didFit = false, MAP_ONLY_ONLINE = true;

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
   const title = dispName(d);
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
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(_map);
    const baseIc = L.divIcon({ className: "drv-pin", html: '<div class="drv-b base"><i></i><span>База EuroBaza</span></div>', iconSize: L.point(0, 0) });
    _baseMk = L.marker(baseLL, { icon: baseIc }).addTo(_map).bindPopup('<div class="pop-t">🏁 ' + esc(BASE_PT.name) + '</div>');
    setTimeout(() => { if(_map) _map.invalidateSize(true); }, 50);
    setTimeout(() => { if(_map) _map.invalidateSize(true); }, 350);
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
    const title = dispName(d);
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
   const live=now-(d.u.t||0)<TTL,acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   const pill=(txt,st)=>'<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:7px;font-size:11px;font-weight:600;line-height:1.2;white-space:nowrap;'+st+'">'+txt+'</span>';
   const pBase='background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cbd5e1;';
   const pPin ='background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.3);color:#fde047;font-weight:700;';
   const pOn  ='background:rgba(16,185,129,.14);border:1px solid rgba(52,211,153,.32);color:#6ee7b7;';
   const pAdr ='background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.28);color:#7dd3fc;';

   const row1=new Array(
    pill('📱 '+esc(devInfo(d.u.ua)),pBase),
    pill('🌐 '+esc((d.u.lang||'ru').toUpperCase()),pBase)
   );
   if(acc&&acc.pin)row1.push(pill('🔑 '+esc(acc.pin),pPin));

   const row2=new Array(
    pill(live?'🟢 В сети':'🕒 '+esc(ago(d.u.t)),live?pOn:pBase),
    pill('📦 '+esc(verFmt(d.u.v)),pBase)
   );
   if(d.u.addr!=null)row2.push(pill('📍 '+esc(d.u.addr),pAdr));

   const blkBadge=blk?' <span style="display:inline-block;background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.45);color:#fca5a5;font-size:10px;font-weight:800;padding:1px 6px;border-radius:99px;vertical-align:middle;margin-left:4px">🚫 БЛОК</span>':'';
   const rowStyle=blk?' style="border-color:rgba(239,68,68,.45);background:linear-gradient(180deg,rgba(45,18,24,.88) 0%,rgba(22,12,16,.95) 100%)"':'';
   const sub=isSubAdm();
   const un=sub?0:dmUnread(d.id);
   const dmBtn=sub?'':'<button class="dm-btn" data-act="dm" data-id="'+esc(d.id)+'" aria-label="Личный чат">✉️'+(un?'<span class="dm-bdg">'+(un>99?'99+':un)+'</span>':'')+'</button>';
   const pinBtn=(!sub&&acc)?'<button class="xb" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.35);color:#fde047" data-act="pin" data-key="'+esc(acc.key)+'" aria-label="ПИН">🔑</button>':'';
   const blkBtn=sub?'':(blk
    ?'<button class="xb" style="background:rgba(16,185,129,.18);border-color:rgba(52,211,153,.4);color:#34d399" data-act="block" data-id="'+esc(d.id)+'" data-key="'+esc(acc?acc.key:'')+'" data-blk="1" aria-label="Разблокировать">✅</button>'
    :'<button class="xb" style="background:rgba(249,115,22,.16);border-color:rgba(249,115,22,.38);color:#fb923c" data-act="block" data-id="'+esc(d.id)+'" data-key="'+esc(acc?acc.key:'')+'" data-blk="0" aria-label="Заблокировать">🚫</button>');
   const delBtn=sub?'':'<button class="xb" data-act="del" data-id="'+esc(d.id)+'" aria-label="Удалить">✕</button>';

   return '<div class="row"'+rowStyle+(sub?' style="cursor:default"':' data-act="rename" data-id="'+esc(d.id)+'"')+'><span class="dot'+(live&&!blk?' on':'')+'"></span>'
    +'<div class="rm"><div class="rt" style="margin-bottom:5px">'+dispHtml(d)+blkBadge+'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">'+row1.join('')+'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:4px">'+row2.join('')+'</div></div>'
    +'<div class="rv">'+money(d.cur.sum)+'</div>'
    +dmBtn+pinBtn+blkBtn+delBtn+'</div>';
  }).join('');
  if(L.length&&!isSubAdm())h+='<div class="mut hint">Нажмите на устройство, чтобы задать ему имя.</div>';
  g('view').innerHTML=h;
 }
 function drawTotals(){
  const L=devs();
  if(SEL!=='all'&&!USERS[SEL])SEL='all';
  const curSelObj=SEL==='all'?null:L.find(x=>x.id===SEL);
  const curSelLabel=curSelObj?dispName(curSelObj):'Все устройства';
  let h='<button type="button" class="sel-btn" data-act="opensel"><span class="sel-btn-l"><span class="sel-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></span><span class="sel-btn-t">'+esc(curSelLabel)+'</span></span><svg class="sel-chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>';
  if(SEL==='all'){
   const curList=L.map(d=>({id:d.id,name:dispName(d),sum:+d.cur.sum||0,qty:+d.cur.qty||0})).filter(x=>x.qty>0||x.sum>0).sort((a,b)=>b.sum-a.sum);
   const sum=curList.reduce((a,x)=>a+x.sum,0),qty=curList.reduce((a,x)=>a+x.qty,0);
   h+='<div class="hero"><span>Текущий месяц (не сохранён)</span><b>'+money(sum)+'</b><span>'+fm(qty)+' шт · водителей: '+curList.length+'</span>'
    +(curList.length?'<button type="button" class="cp-btn" data-act="cpcur">📄 Скопировать текущую ведомость</button>':'')+'</div>';
   if(curList.length){
    h+='<div class="sec">По водителям (текущий месяц)</div>';
    h+=curList.map(x=>'<div class="st-row" data-act="pickdev" data-id="'+esc(x.id)+'"><div><div class="st-nm">'+esc(x.name)+'</div><div class="st-qt">'+fm(x.qty)+' шт</div></div><div class="st-sm">'+money(x.sum)+' ›</div></div>').join('');
   }
   const ms=aggMonths(L);
   h+='<div class="sec">Сохранённые итоги по месяцам</div>';
   if(!ms.length)h+='<div class="mut box">Сохранённых итогов пока нет.</div>';
   h+=ms.map(x=>{
    const key='all|'+x.m,op=!!OPEN[key];
    return '<div class="mr col" data-act="month" data-key="'+esc(key)+'"><div class="mrt"><div class="rm"><div class="rt">'+esc(monthName(x.m))+'</div><div class="rs">'+fm(x.qty)+' шт · водителей: '+x.devs.length+'</div></div><div class="rv">'+money(x.sum)+'</div><span class="ar">'+(op?'▾':'▸')+'</span></div>'
     +(op?'<div class="dt">'
      +x.devs.map(dv=>'<div class="st-row" data-act="pickdev" data-id="'+esc(dv.id)+'"><div><div class="st-nm">'+esc(dv.name)+'</div><div class="st-qt">'+fm(dv.qty)+' шт</div></div><div class="st-sm">'+money(dv.sum)+' ›</div></div>').join('')
      +'<button type="button" class="cp-btn" data-act="cpmonth" data-m="'+esc(x.m)+'">📄 Скопировать ведомость за '+esc(monthName(x.m))+'</button>'
      +'</div>':'')
     +'</div>';
   }).join('');
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
  const sub=isSubAdm();
  const tabsEl=document.querySelector('.tabs');
  if(tabsEl)tabsEl.style.gridTemplateColumns=sub?'repeat(3,1fr)':'repeat(4,1fr)';
  const mapTab=document.querySelector('.tabs button[data-tab="map"]');
  if(mapTab)mapTab.hidden=sub;
  if(sub&&TAB==='map')TAB='online';
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
    if(!isInput){ ok.focus(); }
   });
  });
 }
 const ask = (msg, opts = {}) => openDialog({ ...opts, msg, danger: opts.danger ?? /удал|очист|сброс/i.test(msg) });
 const askInput = (title, msg, inputVal, placeholder) => openDialog({ title, msg, inputVal, placeholder });

 
 function openSelectModal(){
  const L=devs(),now=Date.now();
  const ov=document.createElement('div');
  ov.className='ov';
  const totSum=L.reduce((a,d)=>a+(+d.cur.sum||0),0);
  let items='<div class="sel-it'+(SEL==='all'?' on':'')+'" data-val="all"><div class="sel-it-l"><span class="sel-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span><div><div class="sel-it-nm">Все устройства</div><div class="sel-it-sb">Устройств: '+L.length+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(totSum)+'</span><span class="sel-chk">✓</span></div></div>';
  items+=L.map(d=>{
   const live=now-(d.u.t||0)<TTL;
   const on=SEL===d.id;
   return '<div class="sel-it'+(on?' on':'')+'" data-val="'+esc(d.id)+'"><div class="sel-it-l"><span class="dot'+(live?' on':'')+'"></span><div><div class="sel-it-nm">'+esc(dispName(d))+'</div><div class="sel-it-sb">'+(live?'сейчас в сети':'был(а) '+ago(d.u.t))+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(d.cur.sum)+'</span><span class="sel-chk">✓</span></div></div>';
  }).join('');
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>Выберите водителя</b><button type="button" class="sel-x" aria-label="Закрыть">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');document.removeEventListener('keydown',onKey);setTimeout(()=>ov.remove(),180)};
  const onKey=e=>{if(e.key==='Escape')close()};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');
   if(it){SEL=it.dataset.val;close();draw()}
  };
  document.addEventListener('keydown',onKey);
  requestAnimationFrame(()=>ov.classList.add('show'));
 }

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
  try{const acc=accByUid(id);await db.ref('users/'+id).remove();await db.ref('labels/'+id).remove();if(acc)await db.ref('accounts/'+acc.key).remove();toast('Удалено')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 g('view').addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(a==='pub'){e.preventDefault();PUB=undefined;draw();loadPub()}
  else if(a==='force')force();
  else if(a==='del'){e.stopPropagation();if(!isSubAdm())del(b.dataset.id)}
  else if(a==='rename'){if(!isSubAdm())rename(b.dataset.id)}
  else if(a==='dm'){e.stopPropagation();if(!isSubAdm())openAdmDm(b.dataset.id)}
  else if(a==='block'){e.stopPropagation();const id=b.dataset.id,k=b.dataset.key,isBlk=b.dataset.blk==='1',du=USERS[id]||{};const who=dispName(parseDev(id,du));const ok=await ask(isBlk?'Разблокировать водителя и телефон «'+who+'»?':'Заблокировать водителя и этот телефон («'+who+'»)? Он сразу выйдет и не сможет войти даже под новым именем.',{title:isBlk?'Разблокировка':'Блокировка',okText:isBlk?'Разблокировать':'Заблокировать',danger:!isBlk});if(!ok)return;try{const nv=isBlk?null:true;await db.ref('users/'+id+'/blocked').set(nv);if(k)await db.ref('accounts/'+k+'/blocked').set(nv);if(du.devId)await db.ref('accounts/__dev_'+du.devId).set(isBlk?null:{blocked:true});if(!isBlk)await db.ref('online/'+id).remove();toast(isBlk?'Разблокировано':'Заблокировано')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='pin'){e.stopPropagation();const k=b.dataset.key,cur=ACCOUNTS[k]&&ACCOUNTS[k].pin||'';const np=await askInput('Смена ПИН-кода','Введите новый 4-значный код для водителя',cur,'Например: 1234');if(np===null)return;const clean=np.replace(/\D/g,'');if(clean.length!==4){toast('Нужно ровно 4 цифры',true);return}try{await db.ref('accounts/'+k+'/pin').set(clean);toast('ПИН-код обновлён')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='month'){OPEN[b.dataset.key]=!OPEN[b.dataset.key];draw()}
  else if(a==='pickdev'){e.stopPropagation();SEL=b.dataset.id;draw()}
  else if(a==='opensel'){e.stopPropagation();openSelectModal()}
  else if(a==='cpcur'){e.stopPropagation();const curList=devs().map(d=>({name:dispName(d),sum:+d.cur.sum||0,qty:+d.cur.qty||0})).filter(x=>x.qty>0||x.sum>0).sort((a,b)=>b.sum-a.sum);copyReport('Текущий месяц',curList,curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0))}
  else if(a==='cpmonth'){e.stopPropagation();const mObj=aggMonths(devs()).find(x=>x.m===b.dataset.m);if(mObj)copyReport(monthName(mObj.m),mObj.devs,mObj.qty,mObj.sum)}
  else if(a==='mapfilter'){MAP_ONLY_ONLINE=!MAP_ONLY_ONLINE;_didFit=false;drawMap()}
  else if(a==='focus'){const mk=_markers[b.dataset.id];if(mk&&_map){_map.setView(mk.getLatLng(),16,{animate:true});mk.openPopup()}}
 });
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
 
 let _admChatInit=false,_admLastNotifT=+(localStorage.getItem('ADM_CHAT_NOTIF_T')||0);
 function reqAdmNotify(){
  try{if('Notification' in window && Notification.permission==='default')Notification.requestPermission().catch(()=>{})}catch(e){}
 }
 function admNotify(title,body,opts){
  opts=opts||{};
  try{
   if(!('Notification' in window)||Notification.permission!=='granted')return;
   if(navigator.serviceWorker&&navigator.serviceWorker.controller){
    navigator.serviceWorker.controller.postMessage({type:'NOTIFY',title:title,body:body,tag:opts.tag||'eurobaza-adm-chat',action:opts.action||'OPEN_CHAT',uid:opts.uid||'',url:'admin.html'});
    return;
   }
   new Notification(title,{body:body,icon:'icon-192.png',tag:opts.tag||'eurobaza-adm-chat'});
  }catch(e){}
 }
 let _admDmInit=false,_admDmSeen=(()=>{try{return JSON.parse(localStorage.getItem('ADM_DM_SEEN')||'{}')}catch(e){return{}}})(),_admDmNotif=(()=>{try{return JSON.parse(localStorage.getItem('ADM_DM_NOTIF')||'{}')}catch(e){return{}}})();
 function dmUnread(uid){
  const list=DMS[uid]||[],seen=+(_admDmSeen[uid]||0);
  return list.filter(m=>(+m.t||0)>seen&&!m.adm).length;
 }
 function markAdmDmSeen(uid){
  const list=DMS[uid]||[];
  if(!list.length)return;
  const mx=Math.max.apply(null,list.map(m=>+m.t||0));
  if(mx>0){_admDmSeen[uid]=mx;try{localStorage.setItem('ADM_DM_SEEN',JSON.stringify(_admDmSeen))}catch(e){}}
 }
 function onDmSnap(v){
  const raw=v||{},next={};
  Object.keys(raw).forEach(uid=>{
   const obj=raw[uid]||{};
   const all=Object.keys(obj).map(k=>Object.assign({k:k},obj[k])).sort((a,b)=>(+a.t||0)-(+b.t||0));
   if(all.length>50){all.slice(0,all.length-50).forEach(x=>db.ref('dm/'+uid+'/'+x.k).remove().catch(()=>{}));next[uid]=all.slice(-50)}
   else next[uid]=all;
   if(_admDmInit){
    const prevN=+(_admDmNotif[uid]||0);
    const fresh=next[uid].filter(m=>(+m.t||0)>prevN&&!m.adm);
    if(fresh.length){
     const lm=fresh[fresh.length-1];
     _admDmNotif[uid]=+lm.t||Date.now();
     try{localStorage.setItem('ADM_DM_NOTIF',JSON.stringify(_admDmNotif))}catch(e){}
     if(DM_UID!==uid||document.hidden){
      const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):(lm.name||'Водитель');
      admNotify(who+' (лично)',String(lm.txt||'').slice(0,140),{tag:'eurobaza-dm-'+uid,action:'OPEN_DM',uid:uid});
     }
    }
   }else if(next[uid].length){
    const mx=Math.max.apply(null,next[uid].map(m=>+m.t||0));
    if(mx>(+(_admDmNotif[uid]||0))){_admDmNotif[uid]=mx;try{localStorage.setItem('ADM_DM_NOTIF',JSON.stringify(_admDmNotif))}catch(e){}}
   }
  });
  _admDmInit=true;
  DMS=next;
  if(DM_UID){if(!document.hidden)markAdmDmSeen(DM_UID);renderAdmDm()}
  if(TAB==='online')drawOnline();
 }
 function updAdmChatBdg(){
  const b=g('admChatBdg');if(!b)return;
  const seen=+(localStorage.getItem('ADM_CHAT_SEEN')||0);
  const n=CHAT.filter(m=>(+m.t||0)>seen&&!m.adm).length;
  b.textContent=n>99?'99+':String(n);b.hidden=n===0;
 }
 function markAdmChatSeen(){
  if(!CHAT.length)return;
  const mx=Math.max.apply(null,CHAT.map(m=>+m.t||0));
  if(mx>0)localStorage.setItem('ADM_CHAT_SEEN',String(mx));
  updAdmChatBdg();
 }
 function renderAdmChat(){
  const box=g('achList');if(!box)return;
  if(!CHAT.length){box.innerHTML='<div class="mut" style="text-align:center;padding:24px">Сообщений пока нет</div>';return}
  box.innerHTML=CHAT.map(m=>{
   const d=m.t?new Date(m.t):null,tm=d?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
   const isDeliv=m.adm&&(m.role==='delivery'||m.name==='Доставка');
   const who=m.adm?(isDeliv?'👩‍💼 Доставка':'👑 Админ'):esc(m.name||'Водитель');
   return '<div class="ach-m'+(m.adm?(isDeliv?' dlv':' adm'):'')+'"><div class="ach-mt"><span>'+who+'</span>'+(isSubAdm()?'':'<button type="button" class="ach-del" data-ck="'+esc(m.k)+'" aria-label="Удалить">✕</button>')+'</div><div class="ach-bd"><span class="ach-tx">'+esc(m.txt||'')+'</span><span class="ach-tm">'+tm+'</span></div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
 }
 function openAdmChat(){
  reqAdmNotify();
  CHAT_OPEN=true;markAdmChatSeen();
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">💬</div><div><b>Общий чат</b><small>Канал водителей (до 50 сообщ.)</small></div></div><div class="ach-acts"><button type="button" id="achClr" class="ach-clr">Очистить</button><button type="button" id="achX" class="ach-x">✕</button></div></div><div id="achList" class="ach-list"></div><div class="ach-bar"><input id="achInp" maxlength="300" placeholder="Написать водителям..."><button type="button" id="achSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  const close=()=>{CHAT_OPEN=false;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  const onK=e=>{if(e.key==='Escape')close()};
  g('achX').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
  if(isSubAdm())g('achClr').hidden=true;
  g('achClr').onclick=async()=>{if(!isSubAdm()&&await ask('Удалить всю переписку в общем чате?',{title:'Очистка чата',okText:'Очистить',danger:true}))db.ref('chat').remove().then(()=>toast('Чат очищен')).catch(()=>toast('Ошибка',true))};
  g('achList').onclick=e=>{if(isSubAdm())return;const b=e.target.closest('[data-ck]');if(b)db.ref('chat/'+b.dataset.ck).remove().catch(()=>{})};
  const inp=g('achInp'),snd=g('achSnd');
  const send=async()=>{
   const txt=inp.value.trim();if(!txt)return;
   inp.value='';snd.disabled=true;
   try{
    const cref=db.ref('chat');
    await cref.push({uid:admTag(),name:admRawName(),role:admTag(),adm:true,txt:txt,t:firebase.database.ServerValue.TIMESTAMP});
    const s=await cref.once('value'),av=s.val()||{},ks=Object.keys(av).sort((a,b)=>(+av[a].t||0)-(+av[b].t||0));
    if(ks.length>50)ks.slice(0,ks.length-50).forEach(k=>cref.child(k).remove().catch(()=>{}));
   }catch(e){inp.value=txt;toast('Не удалось отправить',true)}
   snd.disabled=false;inp.blur();
  };
  snd.onclick=send;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};
  document.addEventListener('keydown',onK);
  requestAnimationFrame(()=>{ov.classList.add('show');renderAdmChat()});
 }

 function renderAdmDm(){
  const box=g('admDmList');if(!box||!DM_UID)return;
  const list=DMS[DM_UID]||[];
  if(!list.length){box.innerHTML='<div class="mut" style="text-align:center;padding:24px">Сообщений пока нет. Напишите водителю первым!</div>';return}
  box.innerHTML=list.map(m=>{
   const d=m.t?new Date(m.t):null,tm=d?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
   return '<div class="ach-m'+(m.adm?' adm':'')+'"><div class="ach-mt"><span>'+(m.adm?'👑 Админ':esc(m.name||'Водитель'))+'</span><button type="button" class="ach-del" data-dk="'+esc(m.k)+'" aria-label="Удалить">✕</button></div><div class="ach-bd"><span class="ach-tx">'+esc(m.txt||'')+'</span><span class="ach-tm">'+tm+'</span></div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
 }
 function openAdmDm(uid){
  if(!uid)return;
  reqAdmNotify();
  const old=g('admDmOv');if(old)old.remove();
  DM_UID=uid;markAdmDmSeen(uid);if(TAB==='online')drawOnline();
  const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):'Водитель';
  const ov=document.createElement('div');ov.id='admDmOv';ov.className='ov';
  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">✉️</div><div><b>'+esc(who)+'</b><small>Личная переписка (до 50 сообщ.)</small></div></div><div class="ach-acts"><button type="button" id="admDmClr" class="ach-clr">Очистить</button><button type="button" id="admDmX" class="ach-x">✕</button></div></div><div id="admDmList" class="ach-list"></div><div class="ach-bar"><input id="admDmInp" maxlength="300" placeholder="Личное сообщение водителю..."><button type="button" id="admDmSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  const close=()=>{DM_UID=null;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  const onK=e=>{if(e.key==='Escape')close()};
  g('admDmX').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
  g('admDmClr').onclick=async()=>{if(await ask('Удалить всю личную переписку с водителем «'+who+'»?',{title:'Очистка чата',okText:'Очистить',danger:true}))db.ref('dm/'+uid).remove().then(()=>toast('Переписка очищена')).catch(()=>toast('Ошибка',true))};
  g('admDmList').onclick=e=>{const b=e.target.closest('[data-dk]');if(b)db.ref('dm/'+uid+'/'+b.dataset.dk).remove().catch(()=>{})};
  const inp=g('admDmInp'),snd=g('admDmSnd');
  const send=async()=>{
   const txt=inp.value.trim();if(!txt)return;
   inp.value='';snd.disabled=true;
   try{
    const dref=db.ref('dm/'+uid);
    await dref.push({uid:'admin',name:'Админ',adm:true,txt:txt,t:firebase.database.ServerValue.TIMESTAMP});
    const s=await dref.once('value'),av=s.val()||{},ks=Object.keys(av).sort((a,b)=>(+av[a].t||0)-(+av[b].t||0));
    if(ks.length>50)ks.slice(0,ks.length-50).forEach(k=>dref.child(k).remove().catch(()=>{}));
   }catch(e){inp.value=txt;toast('Не удалось отправить',true)}
   snd.disabled=false;inp.blur();
  };
  snd.onclick=send;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};
  document.addEventListener('keydown',onK);
  requestAnimationFrame(()=>{ov.classList.add('show');renderAdmDm()});
 }
 if(navigator.serviceWorker){navigator.serviceWorker.addEventListener('message',e=>{if(!e.data||g('panel').hidden)return;if(e.data.type==='OPEN_DM'&&e.data.uid)openAdmDm(e.data.uid);else if(e.data.type==='OPEN_CHAT')openAdmChat()})}
 g('admChatBtn').onclick=openAdmChat;
 g('out').onclick=async ()=>auth.signOut();
 auth.onAuthStateChanged(u=>{
  if(u){
   g('login').hidden=true;g('panel').hidden=false;g('who').textContent=(isSubAdm()?'Доставка · ':'')+(u.email||'');
   start();draw();
  }else{
   stop();USERS={};LABELS={};ACCOUNTS={};
   g('panel').hidden=true;g('login').hidden=false;
  }
 });
})();


;(function(){
  const ERR_LOG = [];
  const pushErr = (t, m) => {
    ERR_LOG.unshift({ t: new Date().toLocaleTimeString('ru-RU'), type: t, msg: String(m || '').slice(0, 220) });
    if (ERR_LOG.length > 20) ERR_LOG.pop();
  };
  window.addEventListener('error', e => pushErr('JS', e.message + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '')));
  window.addEventListener('unhandledrejection', e => pushErr('Promise', e.reason && (e.reason.message || e.reason)));

  const pulseLive = () => {
    const el = document.getElementById('liveTxt');
    if (el) el.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  setInterval(pulseLive, 15000);
  setTimeout(pulseLive, 1500);

  const maskKey = k => (!k || typeof k !== 'string') ? 'не найден' : (k.slice(0, 6) + '...' + k.slice(-4));

  async function probe(name, keyInfo, fn) {
    const t0 = performance.now();
    try {
      const res = await fn();
      const ms = Math.round(performance.now() - t0);
      return { name, keyInfo, ok: res.ok, detail: res.detail + ' (' + ms + ' мс)' };
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      return { name, keyInfo, ok: false, detail: 'Ошибка: ' + (e.message || e) + ' (' + ms + ' мс)' };
    }
  }

  async function openDiag() {
    const ov = document.createElement('div');
    ov.className = 'ov show';
    ov.style.cssText = 'position:fixed;inset:0;overflow:hidden;touch-action:none;display:flex;align-items:center;justify-content:center;padding:12px;z-index:9999';
    ov.innerHTML = '<div class="dlg" style="position:relative;overflow:hidden;max-width:440px;width:100%;padding:14px;border-radius:24px;background:linear-gradient(180deg,rgba(19,28,43,.98) 0%,rgba(10,15,25,.99) 100%);border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 60px rgba(0,0,0,.85)"><div style="position:absolute;top:0;left:24px;right:24px;height:1px;background:linear-gradient(90deg,transparent,rgba(52,211,153,.7),rgba(250,204,21,.5),transparent)"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="display:flex;align-items:center;gap:9px"><span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(16,185,129,.22),rgba(14,165,233,.18));border:1px solid rgba(52,211,153,.38);color:#6ee7b7;display:flex;align-items:center;justify-content:center">🩺</span><div><div style="font-size:15px;font-weight:800;color:#f8fafc;line-height:1.15">Диагностика и API</div><div style="font-size:10.5px;color:#94a3b8">Статус сервисов и кэша</div></div></div><button id="dgClose" style="width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:14px;cursor:pointer">✕</button></div><div id="dgBody" style="display:flex;flex-direction:column;gap:8px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button id="dgRe" style="height:40px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;background:rgba(16,185,129,.16);border:1px solid rgba(52,211,153,.38);color:#6ee7b7">↻ Проверить</button><button id="dgClrCache" style="height:40px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.36);color:#fca5a5">✕ Сбросить кэш</button></div></div>';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(ov);
    const close = () => { document.body.style.overflow = ''; ov.remove(); };
    ov.querySelector('#dgClose').onclick = close;
    ov.onclick = ev => { if (ev.target === ov) close(); };
    ov.querySelector('#dgClrCache').onclick = async () => {
      if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
      if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); }
      location.reload(true);
    };
    const run = async () => {
      const box = ov.querySelector('#dgBody');
      box.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px">Проверка сервисов...</div>';
      const yKey = typeof YKEY !== 'undefined' ? YKEY : '';
      const sKey = typeof SUG_KEY !== 'undefined' ? SUG_KEY : '';
      const fbOpts = (window.firebase && firebase.apps && firebase.apps.length) ? firebase.app().options : {};
      const fbKey = fbOpts.apiKey || '', fbDb = fbOpts.databaseURL || '';
      const p2 = ['https:', '', 'geocode-maps.yandex.ru', '1.x', '?format=json&apikey=' + yKey + '&geocode=44.4425,40.0686'].join('/');
      const p3 = ['https:', '', 'suggest-maps.yandex.ru', 'v1', 'suggest?apikey=' + sKey + '&text=Masis'].join('/');
      const p4 = ['https:', '', 'router.project-osrm.org', 'route', 'v1', 'driving', '44.4425,40.0686;44.4500,40.0750?overview=false'].join('/');
      const p5 = ['https:', '', 'routing.openstreetmap.de', 'routed-car', 'route', 'v1', 'driving', '44.4425,40.0686;44.4500,40.0750?overview=false'].join('/');
      const checks = await Promise.all([
        probe('Firebase Auth', maskKey(fbKey), async () => { const ok = Boolean(fbKey && fbKey.startsWith('AIza') && window.firebase && firebase.auth().currentUser); return { ok, detail: ok ? 'Сессия ОК' : 'Нет сессии' }; }),
        probe('Realtime DB', 'europe-west1', async () => { const u = window.firebase && firebase.auth().currentUser, tk = u ? await u.getIdToken() : ''; const r = await fetch(fbDb + '/config.json' + (tk ? '?auth=' + tk : '')); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
        probe('Яндекс Геокодер', maskKey(yKey), async () => { const r = await fetch(p2); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
        probe('Яндекс Подсказки', maskKey(sKey), async () => { const r = await fetch(p3); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
        probe('OSRM Основной', 'project-osrm', async () => { const r = await fetch(p4); const d = await r.json().catch(() => ({})); return { ok: r.ok && d.code === 'Ok', detail: (r.ok && d.code === 'Ok') ? 'Маршрут ОК' : 'HTTP ' + r.status }; }),
        probe('OSRM Резервный', 'osm.de', async () => { const r = await fetch(p5); const d = await r.json().catch(() => ({})); return { ok: r.ok && d.code === 'Ok', detail: (r.ok && d.code === 'Ok') ? 'Маршрут ОК' : 'HTTP ' + r.status }; }),
                        probe('Gemini OCR', maskKey(['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('')), async () => { const gk = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join(''); const gh = ['generativelanguage', 'googleapis', 'com'].join('.'); const u = 'https' + '://' + gh + '/v1beta/models/gemini-3.1-flash-lite?key=' + encodeURIComponent(gk); const r = await fetch(u); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; })
      ]);
      let swInfo = 'Нет', cacheList = 'пусто';
      if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); swInfo = reg && reg.active ? reg.active.state : 'не активен'; }
      if ('caches' in window) { const ks = await caches.keys(); if (ks.length) cacheList = ks.join(', '); }
      const verRes = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).catch(() => null);
      const srvVer = verRes && verRes.v ? verRes.v : '—';
      const grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + checks.map(c => {
        const bg = c.ok ? 'rgba(16,185,129,.10)' : 'rgba(239,68,68,.14)', bd = c.ok ? 'rgba(52,211,153,.28)' : 'rgba(248,113,113,.36)', dot = c.ok ? '#10b981' : '#ef4444', stCol = c.ok ? '#6ee7b7' : '#fca5a5';
        return '<div style="padding:8px 9px;border-radius:12px;background:' + bg + ';border:1px solid ' + bd + ';display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:center;gap:5px"><i style="width:7px;height:7px;border-radius:50%;background:' + dot + ';box-shadow:0 0 7px ' + dot + ';flex-shrink:0"></i><span style="font-size:11.5px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + c.name + '</span></div><div style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + c.keyInfo + '</div><div style="font-size:10.5px;font-weight:600;color:' + stCol + '">' + c.detail + '</div></div>';
      }).join('') + '</div>';
      const errBar = ERR_LOG.length ? '<div style="padding:7px 10px;border-radius:12px;background:rgba(239,68,68,.12);border:1px solid rgba(248,113,113,.3);font-size:10.5px;color:#fca5a5"><b>Ошибки (' + ERR_LOG.length + '):</b> ' + ERR_LOG.msg + '</div>' : '<div style="padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;font-size:11px;color:#94a3b8"><span>Журнал ошибок JS</span><span style="color:#6ee7b7;font-weight:600">0 ошибок</span></div>';
      box.innerHTML = grid + '<div style="padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;gap:3px;font-size:11px"><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Версия на сервере</span><code style="color:#fde047;font-weight:700">' + srvVer + '</code></div><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Service Worker</span><span style="color:#e2e8f0;font-weight:600">' + swInfo + '</span></div><div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#94a3b8;flex-shrink:0">Cache</span><code style="color:#7dd3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + cacheList + '</code></div></div>' + errBar;
    };
    ov.querySelector('#dgRe').onclick = run;
    run();
  }

  document.addEventListener('click', e => {
    if (e.target && e.target.closest('#diagBtn')) openDiag();
  });
})();
