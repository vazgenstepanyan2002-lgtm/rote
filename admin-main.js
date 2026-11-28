// EuroBaza Admin · Main: вкладки Онлайн/Версия, диспетчер draw(), подписки Firebase, клики #view и вход
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
 let offs=[],tick=null;
 function listen(path,cb){
  const r=db.ref(path);
  const fn=r.on('value',s=>cb(s.val()),e=>denied(e,path));
  offs.push(()=>r.off('value',fn));
 }
 let _drawT=null,_lastSlPrune=0,_lastChatPrune=0,_lastUsersCrewSig='';
 function scheduleDraw(delay){
  if(_drawT)return;
  _drawT=setTimeout(()=>{_drawT=null;draw()},delay||120);
 }
 function calcUsersCrewSig(uObj){
  return Object.keys(uObj||{}).sort().map(id=>{const u=uObj[id]||{};return id+':'+(u.car||'')+':'+(u.uname||'')+':'+(u.blocked?1:0)}).join('|');
 }
 function stop(){offs.forEach(f=>{try{f()}catch(e){}});offs=[];clearInterval(tick);tick=null;clearTimeout(_drawT);_drawT=null}
 function start(){
  stop();
  _lastUsersCrewSig='';
  listen('users',v=>{
   S.USERS=v||{};showErr('');
   const cSig=calcUsersCrewSig(S.USERS);
   const crewChanged=cSig!==_lastUsersCrewSig;
   _lastUsersCrewSig=cSig;
   Adm.updOcrTabBdg();
   if(S.TAB==='online')scheduleDraw(250);
   else if(S.TAB==='map'){if(!isSubAdm())scheduleDraw(350)}
   else if(S.TAB==='ocr'){scheduleDraw(200)}
   else if(S.TAB==='att'){if(crewChanged)scheduleDraw(200)}
   else if(S.TAB==='totals'){if(crewChanged)scheduleDraw(200)}
   else if(S.TAB==='ver'){scheduleDraw(400)}
   if(crewChanged)refreshCrewsMgr();
  });
  listen('cars',v=>{S.CARS=v||{};scheduleDraw(120);refreshCrewsMgr()});
  listen('labels',v=>{S.LABELS=v||{};syncCrewsFromLabels();scheduleDraw(120);refreshCrewsMgr()});
  if(!isSubAdm()){
   listen('accounts',v=>{S.ACCOUNTS=v||{};scheduleDraw(120)});
  }else{
   S.ACCOUNTS={};
  }
  listen('dm',Adm.onDmSnap);
  listen('config/forceUpdate',v=>{S.FU=+v||0;if(S.TAB==='ver')scheduleDraw(120)});
  listen('config/ocrMap',v=>{S.OCR_MAP=v||{};Adm.updOcrTabBdg();if(S.TAB==='ocr')scheduleDraw(120)});
  listen('config/tariffs',v=>{
   S.TARIFFS=(v&&typeof v==='object')?v:{};
   if(window.EB_CATALOG&&typeof window.EB_CATALOG.applyTariffs==='function')window.EB_CATALOG.applyTariffs(S.TARIFFS);
   updTarTabBdg();
   if(S.TAB==='online'||S.TAB==='totals')scheduleDraw(120);
   const sumOv=g('admSumOv');
   if(sumOv&&sumOv.classList.contains('show')&&typeof sumOv._refresh==='function')sumOv._refresh();
  });
  if(auth.currentUser&&auth.currentUser.uid){
   const roleRef=db.ref('roles/'+auth.currentUser.uid);
   const roleFn=roleRef.on('value',s=>{
    const rv=s.val();
    const nextRole=(rv==='admin'||rv==='subadmin')?rv:null;
    if(nextRole!==S.MY_ROLE){
     const wasSub=isSubAdm();
     S.MY_ROLE=nextRole;
     const nowSub=isSubAdm();
     if(wasSub!==nowSub){
      showErr('');
      if(g('who')&&auth.currentUser)g('who').innerHTML=(nowSub?'<span>Доставка</span> · ':'')+'<span data-no-i18n="1">'+esc(auth.currentUser.email||'')+'</span>';
      start();draw();
      if(nowSub&&!S._subLoginLogged){
       S._subLoginLogged=true;
       logSubAct('sys','login','Вход в админ-панель',devInfo(navigator.userAgent));
      }
     }
    }
   },()=>{});
   offs.push(()=>roleRef.off('value',roleFn));
  }
  {
   const attRef=db.ref('attendance');
   const attFn=attRef.on('value',s=>{S.ATT=s.val()||{};S.ATT_ERR=false;if(S.TAB==='att')scheduleDraw(120);refreshCrewsMgr()},e=>{S.ATT_ERR=true;if(window._admPushErr)window._admPushErr('FB_DENIED','attendance: '+((e&&e.message)||e));if(S.TAB==='att')scheduleDraw(120)});
   offs.push(()=>attRef.off('value',attFn));
  }
  if(!isSubAdm()){
   const slRef=db.ref('subadminLog');
   const slFn=slRef.on('value',s=>{
    S.SUB_LOG_ERR=false;
    const obj=s.val()||{};
    const all=Object.keys(obj).map(k=>Object.assign({k:k},obj[k])).sort((a,b)=>(+b.t||0)-(+a.t||0));
    if(all.length>300){
     S.SUB_LOG=all.slice(0,300);
     if(Date.now()-_lastSlPrune>10000){
      _lastSlPrune=Date.now();
      const del={};all.slice(300).forEach(x=>{del[x.k]=null});
      db.ref('subadminLog').update(del).catch(()=>{});
     }
    }else{
     S.SUB_LOG=all;
    }
    if(S.SUB_LOG_OPEN&&!document.hidden){
     Adm.renderSubLog();
     markSubLogSeen();
    }else{
     updSubLogBdg();
    }
   },e=>{
    S.SUB_LOG_ERR=true;
    S.SUB_LOG=[];
    if(window._admPushErr)window._admPushErr('FB_DENIED','subadminLog: '+((e&&e.message)||e));
    updSubLogBdg();
    if(S.SUB_LOG_OPEN)Adm.renderSubLog();
   });
   offs.push(()=>slRef.off('value',slFn));
  }else{
   S.SUB_LOG=[];S.SUB_LOG_ERR=false;updSubLogBdg();
  }
  listen('chat',v=>{
   const obj=v||{};
   const all=Object.keys(obj).map(k=>Object.assign({k:k},obj[k])).sort((a,b)=>(+a.t||0)-(+b.t||0));
   let list=all;
   if(all.length>50){
    list=all.slice(-50);
    if(!isSubAdm()&&Date.now()-_lastChatPrune>10000){
     _lastChatPrune=Date.now();
     const del={};all.slice(0,all.length-50).forEach(x=>{del[x.k]=null});
     db.ref('chat').update(del).catch(()=>{});
    }
   }
   if(S._admChatInit){
    const fresh=list.filter(m=>(+m.t||0)>S._admLastNotifT&&!m.adm);
    if(fresh.length){
     const lm=fresh[fresh.length-1];
     S._admLastNotifT=+lm.t||Date.now();
     localStorage.setItem('ADM_CHAT_NOTIF_T',String(S._admLastNotifT));
     if(!S.CHAT_OPEN||document.hidden)Adm.admNotify((lm.name||'Водитель'),String(lm.txt||'').slice(0,140));
    }
   }else if(list.length){
    const mx=Math.max.apply(null,list.map(m=>+m.t||0));
    if(mx>S._admLastNotifT){S._admLastNotifT=mx;localStorage.setItem('ADM_CHAT_NOTIF_T',String(S._admLastNotifT))}
   }
   S._admChatInit=true;S.CHAT=list;
   if(S.CHAT_OPEN&&!document.hidden){Adm.markAdmChatSeen();Adm.renderAdmChat()}else Adm.updAdmChatBdg();
  });
  loadPub();
  tick=setInterval(()=>{if(document.hidden)return;if(S.TAB==='online'||S.TAB==='ver'||(S.TAB==='map'&&!isSubAdm()))draw()},15000);
 }
 async function loadPub(){
  try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});S.PUB=(await r.json()).v||''}catch(e){S.PUB=null}
  draw();
 }

 // ===== Вкладки =====
 function drawOnline(){
  const L=devs(),now=Date.now();
  const on=L.filter(d=>now-(d.u.t||0)<TTL).length,day=L.filter(d=>now-(d.u.t||0)<864e5).length;
  let h='<div class="tiles"><div class="tile"><b>'+on+'</b><span>онлайн</span></div><div class="tile"><b>'+day+'</b><span>за 24 часа</span></div><div class="tile"><b>'+L.length+'</b><span>всего</span></div></div>';

  const crewCount = c => L.filter(d => String(d.u.car||'').toUpperCase() === c).length;
  const crewOnCount = c => L.filter(d => String(d.u.car||'').toUpperCase() === c && now - (d.u.t||0) < TTL).length;
  const noCrewCount = L.filter(d => !String(d.u.car||'').trim()).length;
  const noCrewOnCount = L.filter(d => !String(d.u.car||'').trim() && now - (d.u.t||0) < TTL).length;

  let btnLabel = '🚚 Все экипажи';
  let btnBadge = '<span class="onl-badge">' + S.CARS_LIST.length + '</span>';
  if(S.ONL_CAR === 'none'){
    btnLabel = '🚫 Без экипажа';
    btnBadge = '<span class="onl-badge' + (noCrewOnCount ? ' on' : '') + '">' + (noCrewOnCount ? '🟢 ' : '') + noCrewCount + '</span>';
  } else if(S.ONL_CAR !== 'all'){
    const cc = crewCount(S.ONL_CAR), co = crewOnCount(S.ONL_CAR);
    btnLabel = '🚚 <span data-no-i18n="1">' + esc(S.ONL_CAR) + '</span>';
    btnBadge = '<span class="onl-badge' + (co ? ' on' : '') + '">' + (co ? '🟢 ' : '') + cc + '</span>';
  }

  h += '<div class="onl-bar">'
     + '<button type="button" id="btnCrewFlt" class="onl-btn' + (S.ONL_CAR !== 'all' ? ' active' : '') + '" data-act="open-onl-flt">'
     + '<span>' + btnLabel + '</span>' + btnBadge + '<span style="opacity:.6;font-size:10px;margin-left:2px">▾</span></button>'
     + '<input id="onlSrch" class="sum-srch" type="search" value="' + esc(S.ONL_Q) + '" placeholder="Поиск по имени или экипажу...">'
     + '</div><div id="onlRows">';
  const FL=S.ONL_CAR==='all'?L:S.ONL_CAR==='none'?L.filter(d=>!String(d.u.car||'').trim()):L.filter(d=>String(d.u.car||'').toUpperCase()===S.ONL_CAR);
  const qn=S.ONL_Q.trim().toLowerCase(),FL2=qn?FL.filter(d=>(dispName(d)+' '+(d.u.car||'')+' '+devName(d.u.ua)).toLowerCase().includes(qn)):FL;
  const rowsHtml=(!FL2.length?'<div class="mut box">'+(L.length?'Ничего не найдено.':'Данных пока нет.')+'</div>':'')+FL2.map(d=>{
   const live=now-(d.u.t||0)<TTL,acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   const pill=(txt,st)=>'<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:7px;font-size:11px;font-weight:600;line-height:1.2;white-space:nowrap;'+st+'">'+txt+'</span>';
   const pBase='background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cbd5e1;';
   const pPin ='background:rgba(250,204,21,.12);border:1px solid rgba(250,204,21,.3);color:#fde047;font-weight:700;';
   const pOn  ='background:rgba(16,185,129,.14);border:1px solid rgba(52,211,153,.32);color:#6ee7b7;';
   const pAdr ='background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.28);color:#7dd3fc;';

   const sub=isSubAdm();
   const row1=new Array(
    pill('📱 '+esc(devInfo(d.u.ua)),pBase),
    pill('🌐 '+esc((d.u.lang||'ru').toUpperCase()),pBase)
   );
   if(!sub&&acc&&acc.pin)row1.push(pill('🔑 '+esc(acc.pin),pPin));

   const car=String(d.u.car||'').toUpperCase();
   const pCar=car?'background:rgba(16,185,129,.18);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-weight:800;':'background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.35);color:#fbbf24;font-weight:700;';
   const row2=new Array(
    pill(live?'🟢 В сети':'🕒 '+esc(ago(d.u.t)),live?pOn:pBase),
    pill('📦 '+esc(verFmt(d.u.v)),pBase)
   );
   if(d.u.addr!=null)row2.push(pill('📍 '+esc(d.u.addr),pAdr));


   const blkBadge=blk?' <span style="display:inline-block;background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.45);color:#fca5a5;font-size:10px;font-weight:800;padding:1px 6px;border-radius:99px;vertical-align:middle;margin-left:4px">🚫 БЛОК</span>':'';
   const rowStyle=blk?' style="cursor:default;border-color:rgba(239,68,68,.45);background:linear-gradient(180deg,rgba(45,18,24,.88) 0%,rgba(22,12,16,.95) 100%)"':' style="cursor:default"';
   const un=Adm.dmUnread(d.id);
   const dmBtn='<button class="dm-btn" data-act="dm" data-id="'+esc(d.id)+'" aria-label="Личный чат">✉️'+(un?'<span class="dm-bdg">'+(un>99?'99+':un)+'</span>':'')+'</button>';
   const editNameBtn=sub?'':'<button class="xb" style="background:rgba(168,85,247,.16);border-color:rgba(192,132,252,.38);color:#d8b4fe" data-act="editname" data-id="'+esc(d.id)+'" aria-label="Изменить имя">✏️</button>';
   const pinBtn=(!sub&&acc)?'<button class="xb" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.35);color:#fde047" data-act="pin" data-key="'+esc(acc.key)+'" aria-label="ПИН">🔑</button>':'';
   const blkBtn=sub?'':(blk
    ?'<button class="xb" style="background:rgba(16,185,129,.18);border-color:rgba(52,211,153,.4);color:#34d399" data-act="block" data-id="'+esc(d.id)+'" data-key="'+esc(acc?acc.key:'')+'" data-blk="1" aria-label="Разблокировать">✅</button>'
    :'<button class="xb" style="background:rgba(249,115,22,.16);border-color:rgba(249,115,22,.38);color:#fb923c" data-act="block" data-id="'+esc(d.id)+'" data-key="'+esc(acc?acc.key:'')+'" data-blk="0" aria-label="Заблокировать">🚫</button>');
   const delBtn=sub?'':'<button class="xb" data-act="del" data-id="'+esc(d.id)+'" aria-label="Удалить">✕</button>';

   return '<div class="row"'+rowStyle+'><span class="dot'+(live&&!blk?' on':'')+'"></span>'
    +'<div class="rm"><div class="rt" style="margin-bottom:6px;display:flex;align-items:center;gap:8px"><div'+(sub?' style="min-width:0;flex:1"':' data-act="rename" data-id="'+esc(d.id)+'" style="min-width:0;flex:1;cursor:pointer"')+'>'+dispHtml(d)+blkBadge+'</div>'+(car==="ADMIN"?(sub?'<span style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.2),rgba(124,58,237,.1));border:1px solid rgba(167,139,250,.45);color:#c4b5fd;font-size:12.5px;font-weight:800;letter-spacing:.3px;line-height:1"><span style="font-size:13px">🛡️</span><span data-no-i18n="1">Admin</span></span>':'<button type="button" data-act="setcar" data-id="'+esc(d.id)+'" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.24),rgba(124,58,237,.12));border:1px solid rgba(167,139,250,.5);box-shadow:0 2px 10px rgba(139,92,246,.16);color:#c4b5fd;font-size:12.5px;font-weight:800;letter-spacing:.3px;cursor:pointer;line-height:1"><span style="font-size:13px">🛡️</span><span data-no-i18n="1">Admin</span><span style="opacity:.65;font-size:10px">▾</span></button>'):car?'<button type="button" data-act="setcar" data-id="'+esc(d.id)+'" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(16,185,129,.24),rgba(5,150,105,.12));border:1px solid rgba(52,211,153,.5);box-shadow:0 2px 10px rgba(16,185,129,.16);color:#6ee7b7;font-size:12.5px;font-weight:800;letter-spacing:.4px;cursor:pointer;line-height:1"><span style="font-size:14px">🚚</span><span data-no-i18n="1">'+esc(car)+'</span><span style="opacity:.65;font-size:10px">▾</span></button>':'<button type="button" data-act="setcar" data-id="'+esc(d.id)+'" style="flex-shrink:0;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:11px;background:rgba(245,158,11,.13);border:1px dashed rgba(251,191,36,.45);color:#fbbf24;font-size:11.5px;font-weight:700;cursor:pointer;line-height:1"><span>🚚</span><span>Экипаж</span><span style="opacity:.7;font-size:10px">▾</span></button>')+'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">'+row1.join('')+'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:4px">'+row2.join('')+'</div></div>'
    +'<div class="rv">'+money(car && car !== "ADMIN" ? Adm.parseCar(car).sum : (car === "ADMIN" ? 0 : d.cur.sum))+'</div>'
    +dmBtn+editNameBtn+pinBtn+blkBtn+delBtn+'</div>';
  }).join('');
  const tail='</div>'+(L.length&&!isSubAdm()?'<div class="mut hint">Нажмите на имя водителя, чтобы задать префикс. Кнопка ✏️ меняет имя профиля.</div>':'');
  if(g('onlSrch')&&document.activeElement===g('onlSrch')&&g('onlRows')){g('onlRows').innerHTML=rowsHtml;return}
  g('view').innerHTML=h+rowsHtml+tail;
  const si=g('onlSrch');if(si)si.oninput=e=>{S.ONL_Q=e.target.value;drawOnline()};
 }
 

 function drawVer(){
  const L=devs(),by={};
  L.forEach(d=>{const v=d.u.v||'';by[v]=(by[v]||0)+1});
  let h='<div class="hero"><span>Опубликованная версия</span><b>'+(S.PUB===undefined?'…':S.PUB===null?'нет связи':esc(verFmt(S.PUB)))+'</b><span><a href="#" data-act="pub">проверить снова</a></span></div>';
  h+='<div class="sec">Версии на устройствах</div>';
  if(!L.length)h+='<div class="mut box">Данных пока нет.</div>';
  h+=Object.keys(by).sort().reverse().map(v=>{
   const old=S.PUB&&v!==S.PUB;
   return '<div class="mr"><div class="rm"><div class="rt">'+esc(verFmt(v))+'</div><div class="rs">'+(old?'не последняя версия':'актуальная')+'</div></div><div class="rv'+(old?' warn':'')+'">'+by[v]+' устр.</div></div>';
  }).join('');
  h+='<div class="sec">Принудительное обновление</div>'
   +'<div class="box"><span>Отправляет всем устройствам команду перезагрузить приложение с сервера. Устройство обновится, когда приложение открыто и в нём не заполняется форма.</span><br><br>'
   +'<span>Последняя команда:</span> '+(S.FU?'<b data-no-i18n="1">'+esc(new Date(S.FU).toLocaleString(admLoc()))+'</b> (<b>'+esc(ago(S.FU))+'</b>)':'<b>ещё не отправлялась</b>')+'</div>'
   +'<button class="btn" data-act="force">🔄 Обновить у всех</button>';
  g('view').innerHTML=h;
 }
 function updTarTabBdg(){
  const b=g('tarTabBdg');if(!b)return;
  if(isSubAdm()){b.hidden=true;return}
  const n=window.EB_CATALOG&&typeof window.EB_CATALOG.getCustomTariffsCount==='function'?window.EB_CATALOG.getCustomTariffsCount():0;
  b.hidden=!n;b.textContent=n>99?'99+':String(n);
 }
 function draw(){
  if(g('panel').hidden)return;
  Adm.updOcrTabBdg();
  updSubLogBdg();
  updTarTabBdg();
  const sub=isSubAdm();
  const tabsEl=document.querySelector('.tabs');
  if(tabsEl){
   tabsEl.classList.toggle('sub-tabs',sub);
   tabsEl.style.gridTemplateColumns='';
  }
  const mapTab=document.querySelector('.tabs button[data-tab="map"]');
  const attTab=document.querySelector('.tabs button[data-tab="att"]');
  const ocrTab=document.querySelector('.tabs button[data-tab="ocr"]');
  const verTab=document.querySelector('.tabs button[data-tab="ver"]');
  const crewsOp=document.querySelector('.tabs button[data-op="crews"]');
  const tariffsOp=document.querySelector('.tabs button[data-op="tariffs"]');
  const sublogOp=document.querySelector('.tabs button[data-op="sublog"]');
  const diagOp=document.querySelector('.tabs button[data-op="diag"]');
  const admAttBtn=g('admAttBtn');
  if(mapTab)mapTab.hidden=false;
  if(attTab)attTab.hidden=false;
  if(verTab)verTab.hidden=false;
  if(ocrTab)ocrTab.hidden=false;
  if(crewsOp)crewsOp.hidden=sub;
  if(tariffsOp)tariffsOp.hidden=sub;
  if(sublogOp)sublogOp.hidden=sub;
  if(diagOp)diagOp.hidden=false;
  if(admAttBtn){admAttBtn.hidden=true;}
  if(sub&&S.SEL==='ADMIN')S.SEL='all';
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',!!b.dataset.tab&&b.dataset.tab===S.TAB));
  const st=window.scrollY;
  const keepAttScroll=S.TAB==='att'&&!!g('attWrap');
  if(S.TAB!=='map'&&S._map)Adm.destroyMap();
  if(S.TAB==='online')drawOnline();
  else if(S.TAB==='map')Adm.drawMap();
  else if(S.TAB==='att')Adm.drawAtt();
  else if(S.TAB==='totals')Adm.drawTotals();
  else if(S.TAB==='ocr')Adm.drawOcr();
  else drawVer();
  if(!keepAttScroll)window.scrollTo(0,st);
 }

 
function openOnlCrewModal(){
  const L=devs(),now=Date.now();
  const crewCount = c => L.filter(d => String(d.u.car||'').toUpperCase() === c).length;
  const crewOnCount = c => L.filter(d => String(d.u.car||'').toUpperCase() === c && now - (d.u.t||0) < TTL).length;
  const noCrewCount = L.filter(d => !String(d.u.car||'').trim()).length;
  const noCrewOnCount = L.filter(d => !String(d.u.car||'').trim() && now - (d.u.t||0) < TTL).length;
  const onTotal = L.filter(d => now - (d.u.t||0) < TTL).length;

  const ov=document.createElement('div');ov.className='ov';
  let items = '<div class="sel-it' + (S.ONL_CAR === 'all' ? ' on' : '') + '" data-c="all">'
            + '<div class="sel-it-l"><span class="sel-ic">🌐</span><div><div class="sel-it-nm">Все экипажи</div><div class="sel-it-sb">Все водители и устройства</div></div></div>'
            + '<div class="sel-it-r"><span class="onl-badge' + (onTotal ? ' on' : '') + '">' + S.CARS_LIST.length + '</span></div></div>';

  S.CARS_LIST.forEach(c => {
    const total = crewCount(c), on = crewOnCount(c);
    const badge = '<span class="onl-badge' + (on ? ' on' : '') + '">' + (on ? '🟢 ' + on + ' / ' : '') + total + '</span>';
    const crewNames = devs().filter(x => String(x.u.car||'').toUpperCase() === c).map(x => dispName(x)).join(', ');
    items += '<div class="sel-it' + (S.ONL_CAR === c ? ' on' : '') + '" data-c="' + c + '">'
           + '<div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm"><span>Экипаж</span> <span data-no-i18n="1">' + c + '</span></div><div class="sel-it-sb">' + (crewNames ? '<span data-no-i18n="1">' + esc(crewNames) + '</span>' : 'Нет назначенных водителей') + '</div></div></div>'
           + '<div class="sel-it-r">' + badge + '</div></div>';
  });

  items += '<div class="sel-it' + (S.ONL_CAR === 'none' ? ' on' : '') + '" data-c="none">'
         + '<div class="sel-it-l"><span class="sel-ic" style="background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#fbbf24">🚫</span><div><div class="sel-it-nm">Без экипажа</div><div class="sel-it-sb">Водители без назначенного экипажа</div></div></div>'
         + '<div class="sel-it-r"><span class="onl-badge' + (noCrewOnCount ? ' on' : '') + '">' + (noCrewOnCount ? '🟢 ' + noCrewOnCount + ' / ' : '') + noCrewCount + '</span></div></div>';

  ov.innerHTML = '<div class="dlg sel-dlg"><div class="sel-hd"><b>🚚 Фильтр по экипажам</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">' + items + '</div></div>';
  document.body.appendChild(ov);
  const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 180); };
  ov.querySelector('.sel-x').onclick = close;
  ov.onclick = e => {
    if(e.target === ov){ close(); return; }
    const it = e.target.closest('.sel-it'); if(!it) return;
    S.ONL_CAR = it.dataset.c || 'all';
    close();
    drawOnline();
  };
  requestAnimationFrame(() => ov.classList.add('show'));
}

function openCarModal(uid){
  if(!uid||!S.USERS[uid])return;
  const d=parseDev(uid,S.USERS[uid]),curCar=String(d.u.car||'').toUpperCase();
  if(isSubAdm()&&curCar==='ADMIN'){toast('Нельзя менять экипаж администратора',true);return}
  const ov=document.createElement('div');ov.className='ov';
  const crewOf=c=>devs().filter(x=>String(x.u.car||'').toUpperCase()===c).map(x=>dispName(x)).join(', ');
  let items='<div class="sel-it'+(!curCar?' on':'')+'" data-c=""><div class="sel-it-l"><span class="sel-ic" style="background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#fbbf24">🚫</span><div><div class="sel-it-nm">Без экипажа</div><div class="sel-it-sb">Начисление бонусов заблокировано</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  items+=S.CARS_LIST.map(c=>{
   const on=curCar===c,crew=crewOf(c),nt=(S.CREWS_META[c]&&S.CREWS_META[c].note)||'';
   const sb=nt&&crew?('<span data-no-i18n="1">'+esc(nt)+'</span> · <span data-no-i18n="1">'+esc(crew)+'</span>'):(crew?'<span data-no-i18n="1">'+esc(crew)+'</span>':(nt?'<span data-no-i18n="1">'+esc(nt)+'</span>':'Экипаж свободен'));
   return '<div class="sel-it'+(on?' on':'')+'" data-c="'+c+'"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm"><span>Экипаж</span> <span data-no-i18n="1">'+c+'</span></div><div class="sel-it-sb">'+sb+'</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  }).join('');
  if(!isSubAdm()){
   items+='<div class="sel-it'+(curCar==="ADMIN"?' on':'')+'" data-c="ADMIN"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.4);color:#c4b5fd">🛡️</span><div><div class="sel-it-nm" data-no-i18n="1">Admin</div><div class="sel-it-sb">Открыть бонусы (скрыто из списков)</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  }
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>🚚 <span>Экипаж</span>: <span data-no-i18n="1">'+esc(dispName(d))+'</span></b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=async e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const nc=it.dataset.c;close();
   try{
    await db.ref('users/'+uid+'/car').set(nc||null);
    let moved = false, attMoved = false;
    if (nc && nc !== "ADMIN") {
     const hasOld = !isSubAdm() && ((+d.cur.sum > 0) || (d.hist && Object.keys(d.hist).length > 0));
     if (hasOld && await ask("У водителя есть личные бонусы (" + money(d.cur.sum) + "). Перенести их в общий котёл экипажа " + nc + "?", { title: "Перенос бонусов", okText: "Перенести" })) {
      moved = await Adm.migrateDevToCar(uid, nc);
     }
     const wObj = (S.ATT && S.ATT.workers) || {};
     const uNames = [S.LABELS[uid], profName(d)].filter(Boolean).map(s => String(s).trim().toLowerCase());
     const matchWid = Object.keys(wObj).find(k => {
      const w = wObj[k];
      if (!w || !w.name) return false;
      return String(w.car || '').toUpperCase() === nc && uNames.includes(String(w.name).trim().toLowerCase());
     });
     if (matchWid && await ask('В табеле экипажа ' + nc + ' уже есть добавленный вручную «' + wObj[matchWid].name + '». Перенести всю его статистику на этот аккаунт и убрать дубликат?', { title: 'Перенос табеля', okText: 'Перенести' })) {
      await Adm.attMergeManualToApp(matchWid, uid);
      attMoved = true;
     }
    }
    if (nc !== curCar || moved || attMoved) {
     const drvNm = dispName(d);
     const det = drvNm + ': ' + (curCar || 'Без экипажа') + ' → ' + (nc || 'Без экипажа') + (moved ? ' · бонусы перенесены' : '') + (attMoved ? ' · табель перенесён' : '');
     logSubAct('crew', 'set_car', nc ? 'Назначен экипаж водителю' : 'Снят экипаж у водителя', det, { car: nc || curCar, target: drvNm });
    }
    toast(nc === "ADMIN" ? "Включён режим Админ" : (nc ? ('Назначен экипаж ' + nc + (moved ? ' · бонусы перенесены' : '') + (attMoved ? ' · табель перенесён' : '')) : 'Экипаж снят'));
   }catch(err){toast('Ошибка сохранения',true)}
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }

function openSelectModal(){
  const CL=Adm.allCars(),ov=document.createElement('div');ov.className='ov';
  const totSum=CL.reduce((a,c)=>a+c.sum,0);
  let items='<div class="sel-it'+(S.SEL==='all'?' on':'')+'" data-val="all"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Все экипажи</div><div class="sel-it-sb">Экипажей: '+S.CARS_LIST.length+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(totSum)+'</span><span class="sel-chk">✓</span></div></div>';
  items+=CL.map(c=>{
   const on=S.SEL===c.code,isAdm=c.code==='ADMIN';
   const ic=isAdm?'<span class="sel-ic" style="background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.4);color:#c4b5fd">🛡️</span>':'<span class="sel-ic" data-no-i18n="1" style="font-weight:800;font-size:13px">'+c.code+'</span>';
   const nm=isAdm?'<span data-no-i18n="1">Admin</span>':('<span>Экипаж</span> <span data-no-i18n="1">'+c.code+'</span>');
   const nt=!isAdm&&S.CREWS_META[c.code]&&S.CREWS_META[c.code].note||'';
   const subTxt=c.crew.length?((nt?'<span data-no-i18n="1">'+esc(nt)+'</span> · ':'')+'<span data-no-i18n="1">'+esc(c.crew.join(', '))+'</span>'):(isAdm?'Администратор':(nt?'<span data-no-i18n="1">'+esc(nt)+'</span>':'Экипаж не назначен'));
   return '<div class="sel-it'+(on?' on':'')+'" data-val="'+c.code+'"><div class="sel-it-l">'+ic+'<div><div class="sel-it-nm">'+nm+'</div><div class="sel-it-sb">'+subTxt+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(c.sum)+'</span><span class="sel-chk">✓</span></div></div>';
  }).join('');
  const mgrBtn=!isSubAdm()?'<button type="button" class="cmg-sel-mgr" id="selCrewsMgr">⚙️ Управление экипажами</button>':'';
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>Выберите экипаж</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div>'+mgrBtn+'</div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  const mb=ov.querySelector('#selCrewsMgr');
  if(mb)mb.onclick=()=>{close();setTimeout(()=>openCrewsManagerModal(),190)};
  ov.onclick=e=>{if(e.target===ov){close();return}const it=e.target.closest('.sel-it');if(it){S.SEL=it.dataset.val;close();draw()}};
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function refreshCrewsMgr(){
  const ov=g('crewsMgrOv');
  if(ov&&typeof ov._render==='function')ov._render();
 }
 function openCrewsManagerModal(){
  if(isSubAdm())return;
  const old=g('crewsMgrOv');if(old){if(typeof old._close==='function')old._close();else old.remove()}
  const ov=document.createElement('div');ov.id='crewsMgrOv';ov.className='ov';
  ov.innerHTML='<div class="dlg cmg-dlg"><div class="sel-hd"><b id="cmgTitle">🚚 Управление экипажами</b><button type="button" class="sel-x">✕</button></div><button type="button" class="cmg-add-btn" id="cmgAddBtn">➕ Добавить новый экипаж</button><div class="cmg-list" id="cmgList"></div></div>';
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&!g('crewEditOv')&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();e.stopImmediatePropagation();close()}};
  document.addEventListener('keydown',onK);
  const offRank=wd=>(wd>=1&&wd<=6)?wd:(wd===0?7:8);
  const render=()=>{
   const listEl=ov.querySelector('#cmgList'),tEl=ov.querySelector('#cmgTitle');
   if(!listEl)return;
   if(tEl)tEl.innerHTML='<span>🚚 Управление экипажами</span> <span style="font-size:12.5px;color:#94a3b8;font-weight:700">('+S.CARS_LIST.length+')</span>';
   if(!S.CARS_LIST.length){
    listEl.innerHTML='<div class="mut box" style="text-align:center;margin:8px 0">Экипажей пока нет. Нажмите «Добавить новый экипаж».</div>';
    return;
   }
   const ordered=S.CARS_LIST.map((cd,idx)=>({cd,idx})).sort((a,b)=>(offRank(getCrewOff(a.cd))-offRank(getCrewOff(b.cd)))||(a.idx-b.idx));
   const wObj=(S.ATT&&S.ATT.workers)||{};
   listEl.innerHTML=ordered.map(({cd})=>{
    const offLbl=getCrewOffLbl(cd);
    const note=(S.CREWS_META[cd]&&S.CREWS_META[cd].note)||'';
    const appDrvs=devs().filter(d=>{
     if(String(d.u.car||'').toUpperCase()!==cd)return false;
     const acc=accByUid(d.id);
     return !((acc&&acc.blocked)||d.u.blocked);
    }).map(d=>S.LABELS[d.id]||profName(d)||devName(d.u.ua));
    const manDrvs=Object.keys(wObj).map(k=>wObj[k]).filter(w=>w&&w.name&&String(w.car||'').toUpperCase()===cd).map(w=>String(w.name).trim());
    const allMems=[...appDrvs,...manDrvs];
    const carInfo=Adm.parseCar(cd);
    const histCnt=Object.keys(carInfo.hist||{}).filter(k=>carInfo.hist[k]).length;
    const metaParts=[];
    if(carInfo.sum>0||carInfo.qty>0)metaParts.push('<span>💰 '+money(carInfo.sum)+'</span> · <span>'+fm(carInfo.qty)+' шт</span>');
    if(histCnt>0)metaParts.push('<span>📦 Архив: '+histCnt+'</span>');
    return '<div class="cmg-card">'
     +'<div class="cmg-card-l"><span class="cmg-code" data-no-i18n="1">'+esc(cd)+'</span>'
     +'<div class="cmg-info"><div class="cmg-top"><span class="cmg-nm"><span>Экипаж</span> <span data-no-i18n="1">'+esc(cd)+'</span></span><span class="cmg-off">'+(offLbl?offLbl:'Без вых.')+'</span></div>'
     +(note?'<div class="cmg-note" data-no-i18n="1">🚐 '+esc(note)+'</div>':'')
     +'<div class="cmg-sub">'+(allMems.length?'<span data-no-i18n="1">'+esc(allMems.join(', '))+'</span>':'Свободен')+'</div>'
     +(metaParts.length?'<div class="cmg-meta">'+metaParts.join(' · ')+'</div>':'')
     +'</div></div>'
     +'<div class="cmg-acts">'
     +'<button type="button" class="cmg-act ed" data-cmg="edit" data-code="'+esc(cd)+'" aria-label="Настроить">✏️</button>'
     +'<button type="button" class="cmg-act dl" data-cmg="del" data-code="'+esc(cd)+'" aria-label="Удалить">🗑️</button>'
     +'</div></div>';
   }).join('');
  };
  ov._render=render;
  render();
  ov.querySelector('.sel-x').onclick=close;
  ov.querySelector('#cmgAddBtn').onclick=()=>openCrewEditModal(null);
  ov.onclick=e=>{
   if(e.target===ov){close();return}
   const btn=e.target.closest('[data-cmg]');if(!btn)return;
   const act=btn.dataset.cmg,code=btn.dataset.code;
   if(act==='edit')openCrewEditModal(code);
   else if(act==='del')deleteCrew(code);
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function openCrewEditModal(editCode){
  if(isSubAdm())return;
  const isEdit=!!editCode;
  const oldCode=isEdit?String(editCode).trim().toUpperCase():'';
  const old=g('crewEditOv');if(old){if(typeof old._close==='function')old._close();else old.remove()}
  let selOff=isEdit?getCrewOff(oldCode):0;
  const curNote=isEdit&&S.CREWS_META[oldCode]?S.CREWS_META[oldCode].note||'':'';
  const allDrvs=devs().filter(d=>{
   const acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   const c=String(d.u.car||'').toUpperCase();
   return !blk&&c!=='ADMIN';
  }).sort((a,b)=>(S.LABELS[a.id]||profName(a)||'').localeCompare(S.LABELS[b.id]||profName(b)||'','ru'));
  const selectedUids=new Set(isEdit?allDrvs.filter(d=>String(d.u.car||'').toUpperCase()===oldCode).map(d=>d.id):[]);
  const dayOpts=[[1,'Пн'],[2,'Вт'],[3,'Ср'],[4,'Чт'],[5,'Пт'],[6,'Сб'],[0,'Вс'],[-1,'Нет']];
  const ov=document.createElement('div');ov.id='crewEditOv';ov.className='ov';
  ov.innerHTML='<div class="dlg cmg-dlg">'
   +'<div class="sel-hd"><b>'+(isEdit?'<span>✏️ Настройка экипажа</span> <span data-no-i18n="1">'+esc(oldCode)+'</span>':'➕ Новый экипаж')+'</b><button type="button" class="sel-x">✕</button></div>'
   +'<div class="cmg-form">'
   +'<div class="cmg-lbl">Код экипажа (2–6 лат. букв/цифр)</div>'
   +'<input id="ceCode" class="dlg-inp cmg-code-inp" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="KK" value="'+esc(oldCode)+'">'
   +'<div class="cmg-lbl">Выходной день</div>'
   +'<div class="cmg-days" id="ceDays">'+dayOpts.map(([wd,lb])=>'<button type="button" class="cmg-day'+(wd===selOff?' on':'')+'" data-wd="'+wd+'">'+lb+'</button>').join('')+'</div>'
   +'<div class="cmg-lbl">Описание / авто (необязательно)</div>'
   +'<input id="ceNote" class="dlg-inp" maxlength="40" placeholder="Например: Газель, госномер..." value="'+esc(curNote)+'" style="margin-bottom:4px">'
   +'<div class="cmg-lbl">Водители в экипаже ('+allDrvs.length+')</div>'
   +'<div class="cmg-drv-box" id="ceDrvs">'+(allDrvs.length?allDrvs.map(d=>{
    const nm=S.LABELS[d.id]||profName(d)||devName(d.u.ua);
    const dCar=String(d.u.car||'').toUpperCase();
    const isOn=selectedUids.has(d.id);
    const carTag=dCar&&dCar!==oldCode?('<span class="cmg-drv-car"><span>сейчас:</span> <b data-no-i18n="1">'+esc(dCar)+'</b></span>'):(!dCar?'<span class="cmg-drv-car">Свободен</span>':'');
    return '<div class="cmg-drv'+(isOn?' on':'')+'" data-uid="'+esc(d.id)+'"><div style="min-width:0;flex:1"><div class="cmg-drv-nm" data-no-i18n="1">'+esc(nm)+'</div>'+carTag+'</div><span class="cmg-drv-chk">✓</span></div>';
   }).join(''):'<div class="mut" style="text-align:center;padding:10px;font-size:12px">Нет активных водителей</div>')+'</div>'
   +'<div id="ceErr" class="cmg-err"></div>'
   +'</div>'
   +'<div class="cmg-ft"><button type="button" class="dlg-no" id="ceNo">Отмена</button><button type="button" class="dlg-ok" id="ceSave">💾 Сохранить</button></div>'
   +'</div>';
  document.body.appendChild(ov);
  let closed=false,saving=false;
  const close=()=>{if(closed)return;closed=true;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();e.stopImmediatePropagation();close()}};
  document.addEventListener('keydown',onK);
  const codeInp=ov.querySelector('#ceCode'),noteInp=ov.querySelector('#ceNote'),errEl=ov.querySelector('#ceErr'),saveBtn=ov.querySelector('#ceSave');
  codeInp.oninput=()=>{
   const clean=codeInp.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
   if(codeInp.value!==clean)codeInp.value=clean;
   errEl.textContent='';
  };
  ov.querySelector('#ceDays').onclick=e=>{
   const b=e.target.closest('.cmg-day');if(!b)return;
   selOff=+b.dataset.wd;
   ov.querySelectorAll('#ceDays .cmg-day').forEach(x=>x.classList.toggle('on',x===b));
  };
  ov.querySelector('#ceDrvs').onclick=e=>{
   const row=e.target.closest('.cmg-drv');if(!row)return;
   const uid=row.dataset.uid;
   if(selectedUids.has(uid)){selectedUids.delete(uid);row.classList.remove('on')}
   else{selectedUids.add(uid);row.classList.add('on')}
  };
  ov.querySelector('.sel-x').onclick=close;
  ov.querySelector('#ceNo').onclick=close;
  ov.onclick=e=>{if(e.target===ov)close()};
  saveBtn.onclick=async()=>{
   if(saving)return;
   const newCode=codeInp.value.trim().toUpperCase();
   const newNote=noteInp.value.trim().slice(0,40);
   if(!isValidCrewCode(newCode)){
    errEl.textContent='Код: 2–6 латинских букв/цифр (минимум 1 буква, кроме ADMIN)';
    codeInp.focus();return;
   }
   const isRename=isEdit&&newCode!==oldCode;
   if((!isEdit||isRename)&&S.CARS_LIST.includes(newCode)){
    errEl.textContent='Экипаж «'+newCode+'» уже существует';
    codeInp.focus();return;
   }
   if(isRename){
    const okRen=await ask('Переименовать экипаж «'+oldCode+'» → «'+newCode+'»?\n\nВсе водители, бонусы, архив и сотрудники табеля будут перенесены на новый код.',{title:'Переименование экипажа',okText:'Переименовать'});
    if(!okRen)return;
   }
   saving=true;saveBtn.disabled=true;
   const wasSel=isRename&&S.SEL===oldCode,wasOnl=isRename&&S.ONL_CAR===oldCode;
   try{
    const list=getCrewsConfigList();
    if(isEdit){
     const idx=list.findIndex(x=>x.code===oldCode);
     if(idx>=0)list[idx]={code:newCode,off:selOff,note:newNote};
     else list.push({code:newCode,off:selOff,note:newNote});
    }else{
     list.push({code:newCode,off:selOff,note:newNote});
    }
    if(isRename){
     const oldSnap=(await db.ref('cars/'+oldCode).once('value')).val();
     if(oldSnap){
      await db.ref('cars/'+newCode).set(oldSnap);
      await db.ref('cars/'+oldCode).remove();
     }
     const wObj=(S.ATT&&S.ATT.workers)||{};
     const wOps=[];
     Object.keys(wObj).forEach(wid=>{
      if(wObj[wid]&&String(wObj[wid].car||'').toUpperCase()===oldCode){
       wOps.push(db.ref('attendance/workers/'+wid+'/car').set(newCode));
      }
     });
     if(wOps.length)await Promise.all(wOps);
     await db.ref('attendance/crewOff/'+oldCode).remove().catch(()=>{});
    }
    await db.ref('attendance/crewOff/'+newCode).remove().catch(()=>{});
    await saveCrewsConfig(list);
    // Применяем изменения состава водителей (включая перенос заблокированных при переименовании)
    const drvOps=[],handledUids=new Set();
    allDrvs.forEach(d=>{
     handledUids.add(d.id);
     const curC=String(d.u.car||'').toUpperCase();
     const wantIn=selectedUids.has(d.id);
     if(wantIn&&curC!==newCode){
      drvOps.push(db.ref('users/'+d.id+'/car').set(newCode));
     }else if(!wantIn&&isEdit&&curC===oldCode){
      drvOps.push(db.ref('users/'+d.id+'/car').set(null));
     }
    });
    if(isRename){
     devs().forEach(d=>{
      if(!handledUids.has(d.id)&&String(d.u.car||'').toUpperCase()===oldCode){
       drvOps.push(db.ref('users/'+d.id+'/car').set(newCode));
      }
     });
    }
    if(drvOps.length)await Promise.all(drvOps);
    if(wasSel)S.SEL=newCode;
    if(wasOnl)S.ONL_CAR=newCode;
    close();
    draw();
    toast(isEdit?('Экипаж '+newCode+' обновлён'):('Экипаж '+newCode+' добавлен'));
   }catch(err){
    errEl.textContent='Ошибка сохранения: '+((err&&err.message)||err);
    saving=false;saveBtn.disabled=false;
   }
  };
  requestAnimationFrame(()=>{ov.classList.add('show');if(!isEdit)codeInp.focus()});
 }
 async function deleteCrew(carCode){
  if(isSubAdm())return;
  const code=String(carCode||'').trim().toUpperCase();
  if(!code||!S.CARS_LIST.includes(code))return;
  const drvIds=devs().filter(d=>String(d.u.car||'').toUpperCase()===code).map(d=>d.id);
  const wObj=(S.ATT&&S.ATT.workers)||{};
  const manIds=Object.keys(wObj).filter(wid=>wObj[wid]&&String(wObj[wid].car||'').toUpperCase()===code);
  const carInfo=Adm.parseCar(code);
  const histCnt=Object.keys(carInfo.hist||{}).filter(k=>carInfo.hist[k]).length;
  const lines=['Удалить экипаж «'+code+'»?'];
  if(drvIds.length||manIds.length){
   const p=[];
   if(drvIds.length)p.push('водителей: '+drvIds.length);
   if(manIds.length)p.push('рабочих в табеле: '+manIds.length);
   lines.push('• Будут переведены в «Без экипажа» ('+p.join(', ')+').');
  }
  if(carInfo.sum>0||carInfo.qty>0||histCnt>0){
   const p=[];
   if(carInfo.sum>0||carInfo.qty>0)p.push('текущие бонусы '+money(carInfo.sum));
   if(histCnt>0)p.push('архив ('+histCnt+' мес.)');
   lines.push('• Также будут удалены: '+p.join(' и ')+'.');
  }
  const ok=await ask(lines.join('\n\n'),{title:'Удаление экипажа',okText:'Удалить',danger:true});
  if(!ok)return;
  try{
   const nextList=getCrewsConfigList().filter(x=>x.code!==code);
   await saveCrewsConfig(nextList);
   const ops=[];
   drvIds.forEach(uid=>ops.push(db.ref('users/'+uid+'/car').set(null)));
   manIds.forEach(wid=>ops.push(db.ref('attendance/workers/'+wid+'/car').set('')));
   ops.push(db.ref('attendance/crewOff/'+code).remove().catch(()=>{}));
   ops.push(db.ref('cars/'+code).remove().catch(()=>{}));
   await Promise.all(ops);
   if(S.SEL===code)S.SEL='all';
   if(S.ONL_CAR===code)S.ONL_CAR='all';
   toast('Экипаж '+code+' удалён');
  }catch(err){toast('Ошибка удаления',true)}
 }
 // ===== Действия =====
 async function force(){
  if(!(await ask('Отправить всем устройствам команду обновления?', { title: 'Обновление приложения', okText: 'Обновить' })))return;
  try{await db.ref('config/forceUpdate').set(firebase.database.ServerValue.TIMESTAMP);logSubAct('sys','force_upd','Принудительное обновление','Отправлена команда обновления всем устройствам');toast('Команда отправлена')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 async function rename(id){
  const cur=S.LABELS[id]||'';
  const v=await askInput('Префикс водителя', 'Оставьте поле пустым, чтобы сбросить префикс', cur, 'Введите префикс или заметку...');
  if(v===null)return;
  const t=v.trim().slice(0,40);
  try{if(t)await db.ref('labels/'+id).set(t);else await db.ref('labels/'+id).remove();toast('Сохранено')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 async function editUserName(id){
  if(!id)return;
  const du=S.USERS[id]||{},acc=accByUid(id);
  const cur=(acc&&acc.name)||du.uname||'';
  const v=await askInput('Имя пользователя', 'Новое имя профиля (для входа и отображения у водителя)', cur, 'Введите новое имя...');
  if(v===null)return;
  const newName=v.trim().slice(0,32);
  if(newName.length<2){toast('Введите имя (минимум 2 буквы)',true);return}
  const newKey=newName.toLowerCase().replace(/[.#$\[\]\/]+/g,'_').replace(/\s+/g,' ');
  if(!newKey||newKey.startsWith('__dev_')){toast('Недопустимое имя',true);return}
  if(newName===cur&&(!acc||acc.key===newKey))return;
  try{
   const exSnap=await db.ref('accounts/'+newKey).once('value');
   const ex=exSnap.val();
   if(ex&&ex.uid&&ex.uid!==id){toast('Имя «'+newName+'» уже занято',true);return}
   if(acc){
    if(newKey!==acc.key){
     const oldSnap=await db.ref('accounts/'+acc.key).once('value');
     const base=oldSnap.val()||Object.assign({},S.ACCOUNTS[acc.key]);
     const nextAcc=Object.assign({},base,{uid:id,name:newName});
     delete nextAcc.key;
     await db.ref('accounts/'+newKey).set(nextAcc);
     await db.ref('accounts/'+acc.key).remove();
    }else{
     await db.ref('accounts/'+newKey+'/name').set(newName);
    }
   }
   await db.ref('users/'+id).update({uname:newName,ukey:newKey});
   toast('Имя изменено: '+newName);
  }catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 async function del(id){
  if(!(await ask('Удалить запись об этом устройстве из панели? Данные в самом приложении останутся.', { title: 'Удалить устройство', okText: 'Удалить', danger: true })))return;
  try{const acc=accByUid(id);await db.ref('users/'+id).remove();await db.ref('labels/'+id).remove();if(acc)await db.ref('accounts/'+acc.key).remove();toast('Удалено')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 g('view').addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(a==='pub'){e.preventDefault();S.PUB=undefined;draw();loadPub()}
  else if(a==='force')force();
  else if(a==='del'){e.stopPropagation();if(!isSubAdm())del(b.dataset.id)}
  else if(a==='setcar'){e.stopPropagation();openCarModal(b.dataset.id)}
  else if(a==='rename'){if(!isSubAdm())rename(b.dataset.id)}
  else if(a==='editname'){e.stopPropagation();if(!isSubAdm())editUserName(b.dataset.id)}
  else if(a==='dm'){e.stopPropagation();Adm.openAdmDm(b.dataset.id)}
  else if(a==='block'){e.stopPropagation();if(isSubAdm())return;const id=b.dataset.id,k=b.dataset.key,isBlk=b.dataset.blk==='1',du=S.USERS[id]||{};const who=dispName(parseDev(id,du));const ok=await ask(isBlk?'Разблокировать водителя и телефон «'+who+'»?':'Заблокировать водителя и этот телефон («'+who+'»)? Он сразу выйдет и не сможет войти даже под новым именем.',{title:isBlk?'Разблокировка':'Блокировка',okText:isBlk?'Разблокировать':'Заблокировать',danger:!isBlk});if(!ok)return;try{const nv=isBlk?null:true;await db.ref('users/'+id+'/blocked').set(nv);if(k)await db.ref('accounts/'+k+'/blocked').set(nv);if(du.devId)await db.ref('accounts/__dev_'+du.devId).set(isBlk?null:{blocked:true});if(!isBlk)await db.ref('online/'+id).remove();toast(isBlk?'Разблокировано':'Заблокировано')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='pin'){e.stopPropagation();if(isSubAdm())return;const k=b.dataset.key,cur=S.ACCOUNTS[k]&&S.ACCOUNTS[k].pin||'';const np=await askInput('Смена ПИН-кода','Введите новый 4-значный код для водителя',cur,'Например: 1234');if(np===null)return;const clean=np.replace(/\D/g,'');if(clean.length!==4){toast('Нужно ровно 4 цифры',true);return}try{await db.ref('accounts/'+k+'/pin').set(clean);toast('ПИН-код обновлён')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='month'){S.OPEN[b.dataset.key]=!S.OPEN[b.dataset.key];draw()}
  else if(a==='subopen'){Adm.openAdmSumModal(S.SEL,b.dataset.sub)}
  else if(a==='subback'){delete S.OPEN['sub|'+S.SEL];draw()}
  else if(a==='open-car-sum'){e.stopPropagation();Adm.openAdmSumModal(b.dataset.id,b.dataset.sub||"cur")}
  else if(a==='open-car-month'){e.stopPropagation();const cv=Adm.parseCar(b.dataset.id);const hk=Object.keys(cv.hist).find(k=>cv.hist[k]&&cv.hist[k].m===b.dataset.m);if(hk)Adm.openAdmSumModal(b.dataset.id,hk);else{S.SEL=b.dataset.id;draw()}}
  else if(a==='opensel'){e.stopPropagation();openSelectModal()}
  else if(a==='open-tariffs'){e.stopPropagation();if(!isSubAdm())Adm.openTariffsModal()}
  else if(a==='cpcur'){e.stopPropagation();const curList=Adm.allCars().filter(c=>c.qty>0||c.sum>0).map(c=>({name:'Экипаж '+c.code+(c.crew.length?' ('+c.crew.join(', ')+')':''),sum:c.sum,qty:c.qty})).sort((a,b)=>b.sum-a.sum);copyReport('Текущий месяц (по экипажам)',curList,curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0))}
  else if(a==='csvcur'){
   e.stopPropagation();
   const curList=Adm.allCars().filter(c=>c.qty>0||c.sum>0||c.crew.length>0).sort((a,b)=>b.sum-a.sum);
   exportCrewMonthCsv('Текущий_месяц_по_экипажам',curList,curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0));
  }
  else if(a==='cpmonth'){e.stopPropagation();const mObj=Adm.aggCarMonths(Adm.allCars()).find(x=>x.m===b.dataset.m);if(mObj)copyReport(monthName(mObj.m),mObj.cars,mObj.qty,mObj.sum)}
  else if(a==='csvmonth'){
   e.stopPropagation();
   const mObj=Adm.aggCarMonths(Adm.allCars()).find(x=>x.m===b.dataset.m);
   if(mObj)exportCrewMonthCsv(monthName(mObj.m),mObj.cars,mObj.qty,mObj.sum);
   else toast('Нет данных за этот месяц',true);
  }
  else if(a==='ocr-ok'){e.stopPropagation();const uid=b.dataset.uid,k=b.dataset.k,cd=b.dataset.code;if(!uid||!k||!cd)return;try{const rawP=S.USERS[uid]&&S.USERS[uid].ocrPending&&S.USERS[uid].ocrPending[k];const fixedRaw=rawP&&rawP.raw&&typeof window.ocrFixName==='function'?window.ocrFixName(rawP.raw):(typeof window.ocrFixName==='function'?window.ocrFixName(k):k);const mapK=Adm.admFbKey(fixedRaw)||k;await db.ref('config/ocrMap/'+mapK).set(cd);const pendDels=[];Object.keys(S.USERS).forEach(u=>{const op=S.USERS[u]&&S.USERS[u].ocrPending;if(!op)return;if(op[k])pendDels.push(db.ref('users/'+u+'/ocrPending/'+k).remove());if(mapK!==k&&op[mapK])pendDels.push(db.ref('users/'+u+'/ocrPending/'+mapK).remove());});if(!pendDels.length)pendDels.push(db.ref('users/'+uid+'/ocrPending/'+k).remove());await Promise.all(pendDels);const who=S.USERS[uid]?dispName(parseDev(uid,S.USERS[uid])):uid;logSubAct('ocr','ocr_ok','Одобрена заявка OCR',mapK+' → '+(OCR_CAT_NAMES[cd]||cd)+' (от '+who+')',{target:mapK});toast('Правило добавлено для всех');if(!isSubAdm()){const plan=Adm.findAffectedDocsByRule(mapK,cd);if(plan.length)Adm.openRecalcModal(plan,'Найдены накладные с этим товаром')}}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='ocr-recalc'){e.stopPropagation();if(isSubAdm())return;const plan=Adm.findAffectedDocsByAllRules();if(!plan.length)toast('Все накладные уже актуальны');else Adm.openRecalcModal(plan,'Сверка накладных со словарём OCR и правилами кода')}
  else if(a==='ocr-add'){e.stopPropagation();Adm.openOcrRuleModal('','',true)}
  else if(a==='ocr-edit'){e.stopPropagation();const k=b.dataset.k;if(k)Adm.openOcrRuleModal(k,S.OCR_MAP[k]||'',false)}
  else if(a==='ocr-del'){e.stopPropagation();const k=b.dataset.k;if(!k)return;if(!(await ask('Удалить правило «'+k+'» из общего словаря?',{title:'Удаление правила',okText:'Удалить',danger:true})))return;try{await db.ref('config/ocrMap/'+k).remove();logSubAct('ocr','ocr_del','Удалено правило OCR',k,{target:k,danger:true});toast('Правило удалено')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='ocr-no'){e.stopPropagation();const uid=b.dataset.uid,k=b.dataset.k;if(!uid||!k)return;try{await db.ref('users/'+uid+'/ocrPending/'+k).remove();const who=S.USERS[uid]?dispName(parseDev(uid,S.USERS[uid])):uid;logSubAct('ocr','ocr_no','Отклонена заявка OCR',k+' (от '+who+')',{target:k,danger:true});toast('Запрос отклонён')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='onlcar'){S.ONL_CAR=b.dataset.c||'all';drawOnline()}
  else if(a==='open-onl-flt'){openOnlCrewModal()}
  else if(a==='del-car-hist'){e.stopPropagation();if(isSubAdm())return;const car=b.dataset.car,hk=b.dataset.hk,rec=S.CARS[car]&&S.CARS[car].hist&&S.CARS[car].hist[hk];if(!car||!hk)return;if(!await ask('Удалить сохранённый итог за «'+monthName(rec&&rec.m||hk)+'» у экипажа '+car+'?',{title:'Удаление итога',okText:'Удалить',danger:true}))return;try{await db.ref('cars/'+car+'/hist/'+hk).remove();toast('Итог удалён')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='csv-single-cur'){e.stopPropagation();const car=b.dataset.car||S.SEL,c=Adm.parseCar(car);exportCarDetailCsv(car,'Текущий_месяц',c.rows,c.qty,c.sum)}
  else if(a==='mapfilter'){S.MAP_ONLY_ONLINE=!S.MAP_ONLY_ONLINE;S._didFit=false;Adm.drawMap()}
  else if(a==='mapsat'){S.ADM_SAT=!S.ADM_SAT;try{localStorage.setItem('ADM_MAP_SAT',S.ADM_SAT?'1':'0')}catch(e){}if(S._applyAdmSat)S._applyAdmSat(S.ADM_SAT);const sb=g('admSatBtn');if(sb){sb.classList.toggle('on',S.ADM_SAT);sb.textContent=S.ADM_SAT?'🛰️ Спутник':'🗺️ Схема'}}
  else if(a==='submap-north'){if(S._map)S._map.easeTo({bearing:0,pitch:0,duration:300})}
  else if(a==='submap-fit'){if(S._subFit)S._subFit();else if(S._map)S._map.easeTo({center:[44.515,40.181],zoom:12.2,duration:350})}
  else if(a==='submap-clear'){e.stopPropagation();if(typeof window._subClearPt==='function')window._subClearPt()}
  else if(a==='submap-hdel'){e.stopPropagation();const idx=+b.dataset.idx;if(idx>=0&&idx<S._subHist.length){const rem=S._subHist.splice(idx,1)[0];if(S._subCurPt&&rem&&S._subCurPt.name===rem.name&&typeof window._subClearPt==='function')window._subClearPt();if(typeof window._subRenderHist==='function')window._subRenderHist()}}
  else if(a==='submap-hist'){const it=S._subHist[+b.dataset.idx];if(it&&typeof window._subShowPt==='function')window._subShowPt(it,false)}
  else if(a==='focus'){const mk=S._markers[b.dataset.id];if(mk&&S._map){S._map.easeTo({center:mk.getLngLat(),zoom:16,duration:400});const p=mk.getPopup();if(p&&!p.isOpen())mk.togglePopup()}}
  else if(a==='att-prev'){S.ATT_YM=Adm.attShiftYm(S.ATT_YM,-1);S.ATT_SCROLLED_YM='';Adm.drawAtt()}
  else if(a==='att-next'){S.ATT_YM=Adm.attShiftYm(S.ATT_YM,1);S.ATT_SCROLLED_YM='';Adm.drawAtt()}
  else if(a==='att-today'){S.ATT_YM=Adm.attCurYm();S.ATT_SCROLLED_YM='';Adm.drawAtt()}
  else if(a==='att-add'){Adm.attAddWorker(b.dataset.car)}
  else if(a==='att-off'){e.stopPropagation();Adm.openCrewOffModal(b.dataset.car)}
  else if(a==='att-tog'){Adm.attToggle(b.dataset.w,+b.dataset.d)}
  else if(a==='att-worker'){Adm.openAttWorkerModal(b.dataset.w)}
  else if(a==='att-csv'){Adm.attExportCsv()}
  else if(a==='att-copy'){Adm.attCopyReport()}
 });
 document.querySelectorAll('.tabs button').forEach(b=>b.onclick=async ()=>{
  const op=b.dataset.op;
  if(op){
   if(op==='crews'&&!isSubAdm())Adm.openCrewsManagerModal();
   else if(op==='tariffs'&&!isSubAdm())Adm.openTariffsModal();
   else if(op==='sublog'&&!isSubAdm())Adm.openSubLogModal();
   else if(op==='diag'&&typeof window._openAdmDiag==='function')window._openAdmDiag();
   return;
  }
  if(b.dataset.tab){S.TAB=b.dataset.tab;draw()}
 });

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
 
 auth.onAuthStateChanged(u=>{
  if(u&&!u.isAnonymous&&u.email){
   let profNick='';try{profNick=(localStorage.getItem('USER_NAME')||'').trim()}catch(e){}
   if(g('admNick'))g('admNick').textContent=profNick||'Admin';
   g('login').hidden=true;g('panel').hidden=false;g('who').innerHTML=(isSubAdm()?'<span>Доставка</span> · ':'')+'<span data-no-i18n="1">'+esc(u.email||'')+'</span>';
   start();draw();
   if(isSubAdm()&&!S._subLoginLogged){
    S._subLoginLogged=true;
    logSubAct('sys','login','Вход в админ-панель',devInfo(navigator.userAgent));
   }
  }else{
   stop();
   if(S._map)Adm.destroyMap();
   S.USERS={};S.LABELS={};syncCrewsFromLabels();S.ACCOUNTS={};S.ATT={};S.ATT_ERR=false;S.SUB_LOG=[];S.SUB_LOG_ERR=false;S.SUB_LOG_OPEN=false;S._subLoginLogged=false;updSubLogBdg();S.CARS={};S.OCR_MAP={};S.TARIFFS={};S.MY_ROLE=null;S.CHAT=[];S.DMS={};S.DM_UID=null;S.CHAT_OPEN=false;S._admChatInit=false;S._admDmInit=false;S.SEL='all';
   document.querySelectorAll('.ov').forEach(o=>{if(o.id==='cOv'||o.id==='dlgOv'){o.classList.remove('show');o.hidden=true}else if(typeof o._close==='function')o._close();else o.remove()});
   g('panel').hidden=true;g('login').hidden=false;
  }
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden||g('panel').hidden)return;
  if(S.CHAT_OPEN)Adm.markAdmChatSeen();
  if(S.DM_UID){Adm.markAdmDmSeen(S.DM_UID,S.DM_TAB);Adm.updAdmDmTabBadges();if(S.TAB==='online')drawOnline()}
  if(S.SUB_LOG_OPEN)markSubLogSeen();
 });

 Object.assign(Adm, {
  draw, scheduleDraw, drawOnline, drawVer, refreshCrewsMgr, openCrewsManagerModal, loadPub
 });
})(window.Adm);

/* ADM-MODAL-BACK */
;(function(){
  const getOpenOvs = () => Array.from(document.querySelectorAll(".ov")).filter(el => !el.hidden && el.classList.contains("show"));
  let depth = 0, fromPop = false, skipPop = 0, rafId = 0;
  const sync = () => {
    rafId = 0;
    const cur = getOpenOvs().length;
    if (cur > depth) {
      for (let i = depth; i < cur; i++) {
        try { history.pushState({ admOv: i + 1 }, "", location.href); } catch (e) {}
      }
    } else if (cur < depth && !fromPop) {
      const diff = depth - cur;
      for (let i = 0; i < diff; i++) {
        try { if (history.state && history.state.admOv) { skipPop++; history.back(); } } catch (e) {}
      }
    }
    depth = cur;
  };
  const scheduleSync = () => { if (!rafId) rafId = requestAnimationFrame(sync); };
  window.addEventListener("popstate", () => {
    if (Date.now() < (window._tvSkipPopUntil || 0)) return;
    if (skipPop > 0) { skipPop--; return; }
    const tv = document.getElementById("tvMdl");
    if (tv) {
      window._admSkipBack = true;
      window._tvSkipPopUntil = Date.now() + 150;
      if (typeof tv._tvClose === "function") tv._tvClose("pop");
      else tv.remove();
      return;
    }
    const list = getOpenOvs();
    if (!list.length) return;
    window._admSkipBack = true;
    fromPop = true;
    const cOvEl = document.getElementById("cOv");
    const top = (cOvEl && !cOvEl.hidden && cOvEl.classList.contains("show")) ? cOvEl : list[list.length - 1];
    const btn = top.querySelector("#cNo, #admSumX, #achX, #admDmX, #dgClose, #pwNo, .sel-x, .ach-x");
    if (btn) btn.click();
    else top.click();
    setTimeout(() => { fromPop = false; depth = getOpenOvs().length; }, 220);
  }, true);
  new MutationObserver(scheduleSync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
})();
