// EuroBaza Admin · Comms: общий чат, ЛС (изолированные метки админ/субадмин), журнал, меню и диагностика
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
 function getDmSeenDlvStorageKey(){
  return isSubAdm() ? 'SUBADM_DM_SEEN_DLV' : 'ADM_DM_SEEN_DLV';
 }
 function getDmSeenDlv(){
  try{ return JSON.parse(localStorage.getItem(getDmSeenDlvStorageKey())||'{}'); }catch(e){ return {}; }
 }
 function setDmSeenDlv(obj){
  try{ localStorage.setItem(getDmSeenDlvStorageKey(), JSON.stringify(obj)); }catch(e){}
 }
 function getDmList(uid, channel){
  const obj=S.DMS[uid]||{};
  const ch=channel||(isSubAdm()?'dlv':S.DM_TAB);
  if(Array.isArray(obj)) return ch==='dlv'?[]:obj;
  const list=(ch==='dlv'?obj.dlv:obj.adm)||[];
  return Array.isArray(list)?list:[];
 }
 function dmUnreadAdm(uid){
  const seen=+(S._admDmSeenAdm[uid]||0);
  const lAdm=getDmList(uid,'adm');
  return lAdm.filter(m=>(+m.t||0)>seen&&!m.adm).length;
 }
 function dmUnreadDlv(uid){
  const seen=+(getDmSeenDlv()[uid]||0);
  const lDlv=getDmList(uid,'dlv');
  return lDlv.filter(m=>(+m.t||0)>seen&&!m.adm).length;
 }
 function dmUnread(uid){
  if(isSubAdm()){
   return dmUnreadDlv(uid);
  }
  return dmUnreadAdm(uid) + dmUnreadDlv(uid);
 }
 function markAdmDmSeen(uid, ch){
  const targetCh = ch || (isSubAdm()?'dlv':S.DM_TAB);
  const list=getDmList(uid, targetCh);
  if(!list.length)return;
  const mx=Math.max.apply(null,list.map(m=>+m.t||0));
  if(mx>0){
   if(targetCh === 'dlv' || isSubAdm()){
    const curDlv = getDmSeenDlv();
    curDlv[uid]=mx;
    setDmSeenDlv(curDlv);
   } else {
    S._admDmSeenAdm[uid]=mx;
    try{localStorage.setItem('ADM_DM_SEEN_ADM',JSON.stringify(S._admDmSeenAdm))}catch(e){}
   }
  }
  updAdmDmTabBadges();
 }
 function updAdmDmTabBadges(){
  if(!S.DM_UID || isSubAdm()) return;
  const uAdm = dmUnreadAdm(S.DM_UID), uDlv = dmUnreadDlv(S.DM_UID);
  const setB = (id, v) => { const el = g(id); if (el){ el.textContent = v > 99 ? '99+' : String(v); el.hidden = v === 0; } };
  setB('admDmTabAdmBdg', uAdm);
  setB('admDmTabDlvBdg', uDlv);
 }
 function onDmSnap(v){
  const raw=v||{},next={};
  Object.keys(raw).forEach(uid=>{
   const obj=raw[uid]||{};
   const parseCh=data=>{
    if(!data||typeof data!=='object')return[];
    const all=Object.keys(data)
     .filter(k=>k!=='adm'&&k!=='dlv'&&data[k]&&typeof data[k]==='object'&&('txt' in data[k]||'t' in data[k]))
     .map(k=>Object.assign({k:k},data[k]))
     .sort((a,b)=>(+a.t||0)-(+b.t||0));
    return all.slice(-50);
   };
   let admMsgs=[],dlvMsgs=[];
   if(obj.dlv&&typeof obj.dlv==='object'){
    dlvMsgs=parseCh(obj.dlv);
    admMsgs=obj.adm&&typeof obj.adm==='object'?parseCh(obj.adm):parseCh(obj);
   }else if(obj.adm&&typeof obj.adm==='object'){
    admMsgs=parseCh(obj.adm);
   }else{
    admMsgs=parseCh(obj);
   }
   next[uid]={adm:admMsgs,dlv:dlvMsgs};
   const relevant=isSubAdm()?dlvMsgs:[...admMsgs,...dlvMsgs];
   if(S._admDmInit){
    const prevN=+(S._admDmNotif[uid]||0);
    const fresh=relevant.filter(m=>(+m.t||0)>prevN&&!m.adm);
    if(fresh.length){
     const lm=fresh[fresh.length-1];
     S._admDmNotif[uid]=+lm.t||Date.now();
     try{localStorage.setItem('ADM_DM_NOTIF',JSON.stringify(S._admDmNotif))}catch(e){}
     if(S.DM_UID!==uid||document.hidden){
      const who=S.USERS[uid]?dispName(parseDev(uid,S.USERS[uid])):(lm.name||trAdm('Водитель'));
      admNotify(who+' ('+trAdm('лично')+')',String(lm.txt||'').slice(0,140),{tag:'eurobaza-dm-'+uid,action:'OPEN_DM',uid:uid});
     }
    }
   }else if(relevant.length){
    const mx=Math.max.apply(null,relevant.map(m=>+m.t||0));
    if(mx>(+(S._admDmNotif[uid]||0))){S._admDmNotif[uid]=mx;try{localStorage.setItem('ADM_DM_NOTIF',JSON.stringify(S._admDmNotif))}catch(e){}}
   }
  });
  S._admDmInit=true;
  S.DMS=next;
  if(S.DM_UID){
   if(!document.hidden)markAdmDmSeen(S.DM_UID, S.DM_TAB);
   updAdmDmTabBadges();
   renderAdmDm();
  }
  if(S.TAB==='online')Adm.drawOnline();
 }
 function getAdmChatSeenKey(){return isSubAdm()?'SUBADM_CHAT_SEEN':'ADM_CHAT_SEEN'}
 function updAdmChatBdg(){
  const b=g('admChatBdg');if(!b)return;
  const seen=+(localStorage.getItem(getAdmChatSeenKey())||0);
  const n=S.CHAT.filter(m=>(+m.t||0)>seen&&!m.adm).length;
  b.textContent=n>99?'99+':String(n);b.hidden=n===0;
 }
 function markAdmChatSeen(){
  if(!S.CHAT.length)return;
  const mx=Math.max.apply(null,S.CHAT.map(m=>+m.t||0));
  if(mx>0)try{localStorage.setItem(getAdmChatSeenKey(),String(mx))}catch(e){}
  updAdmChatBdg();
 }
 function crewBadgeHtml(car){
  const c=String(car||'').trim().toUpperCase();
  if(!c)return '';
  if(c==='ADMIN')return '<span class="ch-crew adm-c">🛡️ <span data-no-i18n="1">Admin</span></span>';
  return '<span class="ch-crew">🚚 <span data-no-i18n="1">'+esc(c)+'</span></span>';
 }
 function renderAdmChat(){
  const box=g('achList');if(!box)return;
  if(!S.CHAT.length){box.innerHTML='<div class="mut" style="text-align:center;padding:24px">Сообщений пока нет</div>';return}
  box.innerHTML=S.CHAT.map(m=>{
   const d=m.t?new Date(m.t):null,tm=d?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
   const isDeliv=m.adm&&(m.role==='delivery'||m.name==='Доставка');
   const car=!m.adm?String((m.uid&&S.USERS[m.uid]&&S.USERS[m.uid].car)||m.car||'').toUpperCase():'';
   const drvName=(m.uid&&S.USERS[m.uid])?dispName(parseDev(m.uid,S.USERS[m.uid])):(m.name||'Водитель');
   const isAdmCrew=!m.adm&&car==='ADMIN';
   const admCrewWho=/^(admin|админ|администратор)$/i.test(drvName.trim())?'👑 Администратор':('👑 <span>Админ</span> · <span data-no-i18n="1">'+esc(drvName)+'</span>');
   const who=m.adm?(isDeliv?'👩‍💼 Доставка':'👑 Администратор'):(isAdmCrew?admCrewWho:(crewBadgeHtml(car)+'<span data-no-i18n="1">'+esc(drvName)+'</span>'));
   return '<div class="ach-m'+(m.adm?(isDeliv?' dlv':' adm'):(isAdmCrew?' adm':''))+'"><div class="ach-mt"><span>'+who+'</span>'+(isSubAdm()?'':'<button type="button" class="ach-del" data-ck="'+esc(m.k)+'" aria-label="Удалить">✕</button>')+'</div><div class="ach-bd"><span class="ach-tx" data-no-i18n="1">'+esc(m.txt||'')+'</span><span class="ach-tm">'+tm+'</span></div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
 }
 function openAdmChat(){
  reqAdmNotify();
  const oldChat=g('admChatOv');if(oldChat){if(typeof oldChat._close==='function')oldChat._close();else oldChat.remove()}
  S.CHAT_OPEN=true;markAdmChatSeen();
  const ov=document.createElement('div');ov.id='admChatOv';ov.className='ov';
  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">💬</div><div><b>Общий чат</b><small>Канал водителей (до 50 сообщ.)</small></div></div><div class="ach-acts"><button type="button" id="achClr" class="ach-clr">Очистить</button><button type="button" id="achX" class="ach-x">✕</button></div></div><div id="achList" class="ach-list"></div><div class="ach-bar"><input id="achInp" maxlength="300" placeholder="Написать водителям..."><button type="button" id="achSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;S.CHAT_OPEN=false;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();close()}};
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
    logSubAct('chat','chat_msg','Сообщение в общий чат',txt.slice(0,140));
    if(!isSubAdm()){
     const s=await cref.once('value'),av=s.val()||{},ks=Object.keys(av).sort((a,b)=>(+av[a].t||0)-(+av[b].t||0));
     if(ks.length>50)ks.slice(0,ks.length-50).forEach(k=>cref.child(k).remove().catch(()=>{}));
    }
   }catch(e){inp.value=txt;toast('Не удалось отправить',true)}
   snd.disabled=false;inp.blur();
  };
  snd.onclick=send;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};
  document.addEventListener('keydown',onK);
  requestAnimationFrame(()=>{ov.classList.add('show');renderAdmChat()});
 }

 function renderAdmDm(){
  const box=g('admDmList');if(!box||!S.DM_UID)return;
  const curCh=isSubAdm()?'dlv':S.DM_TAB;
  const list=getDmList(S.DM_UID,curCh);
  if(!list.length){
   const emptyHint=curCh==='dlv'?'Сообщений от доставки пока нет. Напишите водителю!':'Личных сообщений от админа пока нет.';
   box.innerHTML='<div class="mut" style="text-align:center;padding:24px">'+emptyHint+'</div>';
   return;
  }
  box.innerHTML=list.map(m=>{
   const d=m.t?new Date(m.t):null,tm=d?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
   const isDeliv=m.adm&&(m.role==='delivery'||m.name==='Доставка');
   const car=!m.adm?String((S.USERS[S.DM_UID]&&S.USERS[S.DM_UID].car)||m.car||'').toUpperCase():'';
   const drvName=S.USERS[S.DM_UID]?dispName(parseDev(S.DM_UID,S.USERS[S.DM_UID])):(m.name||'Водитель');
   const who=m.adm?(isDeliv?'👩‍💼 Доставка':'👑 Администратор'):(crewBadgeHtml(car)+'<span data-no-i18n="1">'+esc(drvName)+'</span>');
   const dBtn=!isSubAdm()?'<button type="button" class="ach-del" data-dk="'+esc(m.k)+'" aria-label="Удалить">✕</button>':'';
   return '<div class="ach-m'+(m.adm?(isDeliv?' dlv':' adm'):'')+'"><div class="ach-mt"><span>'+who+'</span>'+dBtn+'</div><div class="ach-bd"><span class="ach-tx" data-no-i18n="1">'+esc(m.txt||'')+'</span><span class="ach-tm">'+tm+'</span></div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
 }
 function openAdmDm(uid){
  if(!uid)return;
  reqAdmNotify();
  const old=g('admDmOv');if(old){if(typeof old._close==='function')old._close();else old.remove()}
  S.DM_UID=uid;
  if(isSubAdm()){
   S.DM_TAB='dlv';
  } else {
   const uAdm = dmUnreadAdm(uid), uDlv = dmUnreadDlv(uid);
   if(uAdm > 0) S.DM_TAB = 'adm';
   else if(uDlv > 0) S.DM_TAB = 'dlv';
   else S.DM_TAB = 'adm';
  }
  markAdmDmSeen(uid, S.DM_TAB);if(S.TAB==='online')Adm.drawOnline();
  const who=S.USERS[uid]?dispName(parseDev(uid,S.USERS[uid])):'Водитель';
  const hdCar=S.USERS[uid]?String(S.USERS[uid].car||'').toUpperCase():'';
  const ov=document.createElement('div');ov.id='admDmOv';ov.className='ov';
  
  const tabsHtml=!isSubAdm()
   ? '<div style="display:flex;gap:6px;padding:8px 14px 4px;background:#131c2c;border-bottom:1px solid rgba(255,255,255,.08)">'
     + '<button type="button" id="admDmTabAdm" style="display:inline-flex;align-items:center;justify-content:center;flex:1;padding:6px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid '+(S.DM_TAB==='adm'?'rgba(250,204,21,.5)':'transparent')+';background:'+(S.DM_TAB==='adm'?'rgba(250,204,21,.18)':'transparent')+';color:'+(S.DM_TAB==='adm'?'#fde047':'#94a3b8')+';cursor:pointer"><span>👑 Чат с Админом</span><span id="admDmTabAdmBdg" class="dm-tab-bdg" hidden>0</span></button>'
     + '<button type="button" id="admDmTabDlv" style="display:inline-flex;align-items:center;justify-content:center;flex:1;padding:6px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid '+(S.DM_TAB==='dlv'?'rgba(56,189,248,.5)':'transparent')+';background:'+(S.DM_TAB==='dlv'?'rgba(56,189,248,.18)':'transparent')+';color:'+(S.DM_TAB==='dlv'?'#7dd3fc':'#94a3b8')+';cursor:pointer"><span>🚚 Чат с Доставкой</span><span id="admDmTabDlvBdg" class="dm-tab-bdg" hidden>0</span></button>'
     + '</div>'
   : '';

  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">✉️</div><div><b style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">'+crewBadgeHtml(hdCar)+'<span data-no-i18n="1">'+esc(who)+'</span></b><small>'+(isSubAdm()?'Личный чат с Отделом доставки':'Личные чаты (Админ / Доставка)')+'</small></div></div><div class="ach-acts">'+(isSubAdm()?'':'<button type="button" id="admDmClr" class="ach-clr">Очистить</button>')+'<button type="button" id="admDmX" class="ach-x">✕</button></div></div>'+tabsHtml+'<div id="admDmList" class="ach-list"></div><div class="ach-bar"><input id="admDmInp" maxlength="300" placeholder="'+(isSubAdm()?'Сообщение водителю от отдела доставки...':'Личное сообщение водителю...')+'"><button type="button" id="admDmSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  updAdmDmTabBadges();
  let closed=false;
  const close=()=>{if(closed)return;closed=true;if(S.DM_UID===uid)S.DM_UID=null;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();close()}};
  g('admDmX').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};

  if(!isSubAdm()){
   const tAdm=g('admDmTabAdm'), tDlv=g('admDmTabDlv');
   if(tAdm&&tDlv){
    tAdm.onclick=()=>{
     S.DM_TAB='adm';
     tAdm.style.borderColor='rgba(250,204,21,.5)'; tAdm.style.background='rgba(250,204,21,.18)'; tAdm.style.color='#fde047';
     tDlv.style.borderColor='transparent'; tDlv.style.background='transparent'; tDlv.style.color='#94a3b8';
     markAdmDmSeen(uid, 'adm');
     if(S.TAB==='online')Adm.drawOnline();
     renderAdmDm();
    };
    tDlv.onclick=()=>{
     S.DM_TAB='dlv';
     tDlv.style.borderColor='rgba(56,189,248,.5)'; tDlv.style.background='rgba(56,189,248,.18)'; tDlv.style.color='#7dd3fc';
     tAdm.style.borderColor='transparent'; tAdm.style.background='transparent'; tAdm.style.color='#94a3b8';
     markAdmDmSeen(uid, 'dlv');
     if(S.TAB==='online')Adm.drawOnline();
     renderAdmDm();
    };
   }
  }

  const clrBtn=g('admDmClr');
  if(clrBtn){
   clrBtn.onclick=async()=>{
    const curCh=isSubAdm()?'dlv':S.DM_TAB;
    if(await ask('Удалить переписку ('+(curCh==='dlv'?'Доставка':'Админ')+') с водителем «'+who+'»?',{title:'Очистка чата',okText:'Очистить',danger:true})){
     try{
      if(curCh==='dlv'){
       await db.ref('dm/'+uid+'/dlv').remove();
      }else{
       const snap=await db.ref('dm/'+uid).once('value'),val=snap.val()||{};
       const patch={adm:null};
       Object.keys(val).forEach(k=>{if(k!=='dlv'&&k!=='adm')patch[k]=null});
       await db.ref('dm/'+uid).update(patch);
      }
      toast('Переписка очищена');
     }catch(err){toast('Ошибка',true)}
    }
   };
  }
  g('admDmList').onclick=e=>{
   if(isSubAdm())return;
   const b=e.target.closest('[data-dk]');
   if(b){
    const curCh=isSubAdm()?'dlv':S.DM_TAB,dk=b.dataset.dk;
    if(curCh==='dlv'){
     db.ref('dm/'+uid+'/dlv/'+dk).remove().catch(()=>{});
    }else{
     db.ref('dm/'+uid+'/adm/'+dk).remove().catch(()=>{});
     if(dk!=='dlv'&&dk!=='adm')db.ref('dm/'+uid+'/'+dk).remove().catch(()=>{});
    }
   }
  };
  const inp=g('admDmInp'),snd=g('admDmSnd');
  const send=async()=>{
   const txt=inp.value.trim();if(!txt)return;
   inp.value='';snd.disabled=true;
   const curCh=isSubAdm()?'dlv':S.DM_TAB;
   try{
    const chPath='dm/'+uid+(curCh==='dlv'?'/dlv':'/adm');
    const dref=db.ref(chPath);
    await dref.push({
     uid:admTag(),
     name:admRawName(),
     role:admTag(),
     adm:true,
     txt:txt,
     t:firebase.database.ServerValue.TIMESTAMP
    });
    logSubAct('chat','dm_msg','Личное сообщение водителю',who+': '+txt.slice(0,140),{car:hdCar,target:who});
    if(!isSubAdm()){
     const s=await dref.once('value'),av=s.val()||{},ks=Object.keys(av).sort((a,b)=>(+av[a].t||0)-(+av[b].t||0));
     if(ks.length>50)ks.slice(0,ks.length-50).forEach(k=>dref.child(k).remove().catch(()=>{}));
    }
   }catch(e){inp.value=txt;toast('Не удалось отправить',true)}
   snd.disabled=false;inp.blur();
  };
  snd.onclick=send;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();send()}};
  document.addEventListener('keydown',onK);
  requestAnimationFrame(()=>{ov.classList.add('show');renderAdmDm()});
 }
 if(navigator.serviceWorker){navigator.serviceWorker.addEventListener('message',e=>{if(!e.data||g('panel').hidden)return;if(e.data.type==='OPEN_DM'&&e.data.uid)openAdmDm(e.data.uid);else if(e.data.type==='OPEN_CHAT')openAdmChat()})}
 function openChangePw(){
  const u=auth.currentUser;
  if(!u||!u.email){toast('Нет активной сессии',true);return}
  const old=g('pwOv');if(old){if(typeof old._close==='function')old._close();else old.remove()}
  const ov=document.createElement('div');ov.id='pwOv';ov.className='ov';
  ov.innerHTML='<div class="dlg" style="max-width:380px;text-align:left"><div class="dlg-ic" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.38);color:#fde047">🔑</div><div class="dlg-t" style="text-align:center">Смена пароля</div><div class="dlg-m" style="text-align:center;margin-bottom:14px">'+esc(u.email)+'</div><input id="pwOld" class="dlg-inp" type="password" autocomplete="current-password" placeholder="Текущий пароль" style="margin-bottom:10px"><input id="pwNew1" class="dlg-inp" type="password" autocomplete="new-password" placeholder="Новый пароль (минимум 6 символов)" style="margin-bottom:10px"><input id="pwNew2" class="dlg-inp" type="password" autocomplete="new-password" placeholder="Повторите новый пароль" style="margin-bottom:10px"><div id="pwErr" style="color:#f87171;font-size:12.5px;min-height:18px;margin-bottom:10px;text-align:center"></div><div class="dlg-act"><button type="button" id="pwNo" class="dlg-no">Отмена</button><button type="button" id="pwOk" class="dlg-ok">Сохранить</button></div></div>';
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();close()}};
  g('pwNo').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
  const ok=g('pwOk'),err=g('pwErr'),p0=g('pwOld'),p1=g('pwNew1'),p2=g('pwNew2');
  ok.onclick=async()=>{
   err.textContent='';
   const v0=p0.value,v1=p1.value,v2=p2.value;
   if(!v0){err.textContent='Введите текущий пароль';p0.focus();return}
   if(v1.length<6){err.textContent='Новый пароль должен быть не короче 6 символов';p1.focus();return}
   if(v1!==v2){err.textContent='Новые пароли не совпадают';p2.focus();return}
   if(v0===v1){err.textContent='Новый пароль совпадает со старым';p1.focus();return}
   ok.disabled=true;ok.textContent='Сохраняю...';
   try{
    const cred=firebase.auth.EmailAuthProvider.credential(u.email,v0);
    await u.reauthenticateWithCredential(cred);
    await u.updatePassword(v1);
    logSubAct('sys','pw_change','Смена пароля','Обновлён пароль аккаунта доставки');
    close();
    toast('Пароль успешно изменён');
   }catch(e){
    const c=e&&e.code;
    err.textContent=(c==='auth/wrong-password'||c==='auth/invalid-credential')?'Неверный текущий пароль':(c==='auth/weak-password'?'Слишком простой пароль (минимум 6 символов)':(c==='auth/too-many-requests'?'Слишком много попыток, попробуйте позже':('Ошибка: '+((e&&e.message)||e))));
    ok.disabled=false;ok.textContent='Сохранить';
   }
  };
  p2.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();ok.click()}};
  document.addEventListener('keydown',onK);
  requestAnimationFrame(()=>{ov.classList.add('show');});
 }
 function openAdmLangModal(){
  const cur=window.getLang?window.getLang():'ru';
  const langs=[{k:'ru',ic:'🇷🇺',n:'Русский'},{k:'hy',ic:'🇦🇲',n:'Հայերեն'},{k:'en',ic:'🇬🇧',n:'English'}];
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>🌐 Язык интерфейса</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'
   +langs.map(x=>'<div class="sel-it'+(cur===x.k?' on':'')+'" data-l="'+x.k+'"><div class="sel-it-l"><span class="sel-ic">'+x.ic+'</span><div><div class="sel-it-nm">'+x.n+'</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>').join('')
   +'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const l=it.dataset.l;close();
   if(l&&window.setAppLang)window.setAppLang(l);
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function exportSubLogCsv(list){
  const src=list||S.SUB_LOG;
  if(!src.length){toast('Нет данных для выгрузки',true);return}
  const headers=['Дата','Время','Категория','Действие','Подробности','Экипаж'];
  const catNames={att:'Табель',crew:'Экипажи',chat:'Чаты',ocr:'Словарь',sys:'Система'};
  const rows=src.map(x=>{
   const d=x.t?new Date(+x.t):null;
   const dt=d?(String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+d.getFullYear()):'';
   const tm=d?(String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')):'';
   return [dt,tm,catNames[x.cat]||x.cat||'',x.title||'',x.detail||'',x.car||''];
  });
  const now=new Date(),fn='EuroBaza_Лог_субадмина_'+now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+'.csv';
  if(window.TableViewer){
   TableViewer.open({title:'Лог субадмина',filename:fn,headers:headers,rows:rows});
   return;
  }
  downloadCsv(fn,[headers,...rows]);
 }
 function renderSubLog(){
  const box=g('slogList'),statsEl=g('slogStats'),chipsEl=g('slogChips'),subEl=g('slogSub');
  if(!box)return;
  const now=new Date(),tdStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(),wkStart=tdStart-6*864e5;
  const tdCnt=S.SUB_LOG.filter(x=>(+x.t||0)>=tdStart).length;
  const wkCnt=S.SUB_LOG.filter(x=>(+x.t||0)>=wkStart).length;
  if(statsEl){
   statsEl.innerHTML='<div class="tile"><b data-no-i18n="1">'+tdCnt+'</b><span>сегодня</span></div>'
    +'<div class="tile"><b data-no-i18n="1">'+wkCnt+'</b><span>за 7 дней</span></div>'
    +'<div class="tile"><b data-no-i18n="1">'+S.SUB_LOG.length+'</b><span>всего</span></div>';
  }
  const cats=[
   {k:'all',n:'Все'},
   {k:'att',n:'Табель'},
   {k:'crew',n:'Экипажи'},
   {k:'chat',n:'Чаты'},
   {k:'ocr',n:'Словарь'},
   {k:'sys',n:'Система'}
  ];
  if(chipsEl){
   chipsEl.innerHTML=cats.map(c=>{
    const cnt=c.k==='all'?S.SUB_LOG.length:S.SUB_LOG.filter(x=>x.cat===c.k).length;
    return '<button type="button" class="slog-chip'+(S.SUB_LOG_CAT===c.k?' on':'')+'" data-cat="'+c.k+'"><span>'+c.n+'</span><span class="cnt" data-no-i18n="1">'+cnt+'</span></button>';
   }).join('');
  }
  if(S.SUB_LOG_ERR){
   const ruleSnippet='"subadminLog": {\n  ".read": "auth != null && root.child(\'roles\').child(auth.uid).val() == \'admin\'",\n  ".write": "auth != null && root.child(\'roles\').child(auth.uid).val() == \'admin\'",\n  "$id": {\n    ".write": "auth != null && root.child(\'roles\').child(auth.uid).val() == \'subadmin\' && !data.exists() && newData.exists()",\n    ".validate": "newData.hasChildren([\'cat\', \'act\', \'t\']) && newData.child(\'t\').isNumber()"\n  }\n}';
   box.innerHTML='<div class="slog-rule"><b>⚠️ Требуется правило в Firebase Realtime Database</b><div style="margin-top:4px"><span>Добавьте узел</span> <code data-no-i18n="1">subadminLog</code> <span>в консоли Firebase (Rules), чтобы сохранять и читать журнал действий субадмина:</span></div><pre data-no-i18n="1">'+esc(ruleSnippet)+'</pre><button type="button" id="slogCopyRule">📋 Скопировать правило</button></div>';
   const cp=g('slogCopyRule');
   if(cp)cp.onclick=()=>{
    const done=()=>toast('Правило скопировано в буфер');
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(ruleSnippet).then(done).catch(()=>toast('Не удалось скопировать',true));
    else toast('Скопируйте вручную из окна',true);
   };
   return;
  }
  const q=(S.SUB_LOG_Q||'').trim().toLowerCase();
  const filt=S.SUB_LOG.filter(x=>{
   if(S.SUB_LOG_CAT!=='all'&&x.cat!==S.SUB_LOG_CAT)return false;
   if(!q)return true;
   const hay=((x.title||'')+' '+(x.detail||'')+' '+(x.car||'')+' '+(x.target||'')).toLowerCase();
   return hay.includes(q);
  });
  if(!filt.length){
   box.innerHTML='<div class="slog-empty"><div class="eic">'+(S.SUB_LOG.length?'🔍':'📋')+'</div><div>'+(S.SUB_LOG.length?'По выбранному фильтру записей нет':'Действий субадмина пока не зафиксировано')+'</div></div>';
   return;
  }
  const catIc={att:'📅',crew:'🚚',chat:'💬',ocr:'📖',sys:'⚙️'};
  const catLbl={att:'Табель',crew:'Экипажи',chat:'Чаты',ocr:'Словарь',sys:'Система'};
  const yestStart=tdStart-864e5;
  const monRu=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const dayKey=ts=>{
   if(!ts)return 'Без даты';
   if(ts>=tdStart)return 'Сегодня';
   if(ts>=yestStart)return 'Вчера';
   const d=new Date(ts);
   return d.getDate()+' '+monRu[d.getMonth()]+' '+d.getFullYear();
  };
  const groups=[],gMap={};
  filt.forEach(x=>{
   const dk=dayKey(+x.t||0);
   if(!gMap[dk]){gMap[dk]={label:dk,items:[]};groups.push(gMap[dk])}
   gMap[dk].items.push(x);
  });
  const fmtSubLogDet=x=>{
   const raw=String(x&&x.detail||'');
   if(!raw)return '';
   if(x.cat==='chat'||x.act==='ocr_del'||x.act==='login'||x.act==='logout')return '<div class="slog-det" data-no-i18n="1">'+esc(raw)+'</div>';
   if(x.act==='force_upd'||x.act==='pw_change'||x.act==='att_off')return '<div class="slog-det">'+esc(raw)+'</div>';
   if(x.act==='att_add'||x.act==='att_del'||x.act==='att_mark'||x.act==='att_unmark'){
    const ps=raw.split(' · ');
    return '<div class="slog-det"><span data-no-i18n="1">'+esc(ps[0])+'</span>'+(ps.length>1?' · '+ps.slice(1).map(p=>'<span>'+esc(p)+'</span>').join(' · '):'')+'</div>';
   }
   if(x.act==='att_link'||x.act==='att_ren'){
    const ps=raw.split(' · ');
    return '<div class="slog-det"><span data-no-i18n="1">'+esc(ps[0])+'</span>'+(ps.length>1?' · '+ps.slice(1).map(p=>'<span>'+esc(p)+'</span>').join(' · '):'')+'</div>';
   }
   if(x.act==='att_car'||x.act==='set_car'){
    const ci=raw.indexOf(': ');
    if(ci>0){
     const who=raw.slice(0,ci),rest=raw.slice(ci+2).split(' · ');
     const arr=rest[0].split(' → ');
     const aHtml=arr.length===2?('<span>'+esc(arr[0])+'</span> → <span>'+esc(arr[1])+'</span>'):'<span>'+esc(rest[0])+'</span>';
     return '<div class="slog-det"><span data-no-i18n="1">'+esc(who)+'</span>: '+aHtml+(rest.length>1?' · '+rest.slice(1).map(p=>'<span>'+esc(p)+'</span>').join(' · '):'')+'</div>';
    }
   }
   if(x.act==='ocr_add'||x.act==='ocr_edit'||x.act==='ocr_ok'||x.act==='ocr_no'){
    const mFrom=raw.match(/^(.*)\s+\(от\s+(.+)\)$/);
    const body=mFrom?mFrom[1]:raw,byWho=mFrom?mFrom[2]:'';
    const ai=body.indexOf(' → ');
    const mainHtml=ai>0?('<span data-no-i18n="1">'+esc(body.slice(0,ai))+'</span> → <span>'+esc(body.slice(ai+3))+'</span>'):'<span data-no-i18n="1">'+esc(body)+'</span>';
    return '<div class="slog-det">'+mainHtml+(byWho?' (<span>от</span> <span data-no-i18n="1">'+esc(byWho)+'</span>)':'')+'</div>';
   }
   return '<div class="slog-det" data-no-i18n="1">'+esc(raw)+'</div>';
  };
  let html='';
  groups.forEach(gr=>{
   html+='<div class="slog-day"><span>'+esc(gr.label)+'</span><b data-no-i18n="1">'+gr.items.length+'</b></div>';
   gr.items.forEach(x=>{
    const d=x.t?new Date(+x.t):null;
    const tm=d?(String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')):'—';
    const isNew=(+x.t||0)>S.SUB_LOG_PREV_SEEN;
    const safeCat=Object.prototype.hasOwnProperty.call(catIc,x.cat)?x.cat:'sys';
    const cls='slog-it c-'+(x.danger?'del':safeCat)+(isNew?' is-new':'');
    const ic=x.danger?'🗑️':catIc[safeCat];
    const tags='<span class="slog-tag">'+catLbl[safeCat]+'</span>'
     +(x.car?'<span class="slog-tag car"><span>🚚</span> <span data-no-i18n="1">'+esc(x.car)+'</span></span>':'');
    html+='<div class="'+cls+'">'
     +'<div class="slog-ic">'+ic+'</div>'
     +'<div class="slog-body">'
     +'<div class="slog-top"><div class="slog-ttl">'+esc(x.title||'Действие')+'</div><div class="slog-meta">'+(isNew?'<span class="slog-new">НОВОЕ</span>':'')+'<span class="slog-tm" data-no-i18n="1">'+tm+'</span></div></div>'
     +fmtSubLogDet(x)
     +'<div class="slog-tags">'+tags+'</div>'
     +'</div></div>';
   });
  });
  box.innerHTML=html;
 }
 function drawSubLog(){
  if(isSubAdm()){S.TAB='online';if(Adm.drawOnline)Adm.drawOnline();return}
  if(!S.SUB_LOG_OPEN){
   S.SUB_LOG_PREV_SEEN=subLogSeen();
   S.SUB_LOG_CAT='all';S.SUB_LOG_Q='';
   S.SUB_LOG_OPEN=true;
  }
  const icSrch='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const icDl='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  const icDel='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  g('view').innerHTML='<div id="slogStats" class="tiles"></div>'
   +'<div class="slog-ctrl">'
   +'<div class="slog-top-bar">'
   +'<div class="slog-srch"><span class="slog-srch-ic">'+icSrch+'</span><input id="slogInp" type="search" placeholder="Поиск..." value="'+esc(S.SUB_LOG_Q)+'"><button type="button" id="slogClrQ" class="slog-srch-clr"'+(S.SUB_LOG_Q?'':' hidden')+'>✕</button></div>'
   +'<button type="button" id="slogCsv" class="slog-btn csv" title="Выгрузить в Excel" aria-label="Выгрузить в Excel">'+icDl+'</button>'
   +'<button type="button" id="slogClr" class="slog-btn clr" title="Очистить журнал" aria-label="Очистить журнал">'+icDel+'</button>'
   +'</div>'
   +'<div id="slogChips" class="slog-chips"></div>'
   +'</div>'
   +'<div id="slogList" class="slog-list in-view"></div>';
  const inp=g('slogInp'),clrQ=g('slogClrQ');
  if(inp)inp.oninput=e=>{S.SUB_LOG_Q=e.target.value||'';if(clrQ)clrQ.hidden=!S.SUB_LOG_Q;renderSubLog()};
  if(clrQ)clrQ.onclick=()=>{if(inp)inp.value='';S.SUB_LOG_Q='';clrQ.hidden=true;renderSubLog();if(inp)inp.focus()};
  const chips=g('slogChips');
  if(chips)chips.onclick=e=>{
   const b=e.target.closest('.slog-chip');if(!b)return;
   S.SUB_LOG_CAT=b.dataset.cat||'all';
   renderSubLog();
  };
  const csvB=g('slogCsv');
  if(csvB)csvB.onclick=()=>{
   const q=(S.SUB_LOG_Q||'').trim().toLowerCase();
   const filt=S.SUB_LOG.filter(x=>(S.SUB_LOG_CAT==='all'||x.cat===S.SUB_LOG_CAT)&&(!q||((x.title||'')+' '+(x.detail||'')+' '+(x.car||'')+' '+(x.target||'')).toLowerCase().includes(q)));
   exportSubLogCsv(filt);
  };
  const clrB=g('slogClr');
  if(clrB)clrB.onclick=async()=>{
   if(!S.SUB_LOG.length){toast('Журнал уже пуст');return}
   if(!(await ask('Очистить весь журнал действий субадмина ('+S.SUB_LOG.length+' зап.)? Это действие необратимо.',{title:'Очистка журнала',okText:'Очистить',danger:true})))return;
   try{await db.ref('subadminLog').remove();toast('Журнал очищен')}catch(err){toast('Ошибка очистки',true)}
  };
  renderSubLog();
  markSubLogSeen();
 }
 function openSubLogModal(){
  if(isSubAdm())return;
  S.TAB='sublog';
  if(Adm.draw)Adm.draw();
 }
 function openAdmMenu(){
  const u=auth.currentUser;
  const curL=window.getLang?window.getLang():'ru';
  const lName=curL==='hy'?'Հայերեն':(curL==='en'?'English':'Русский');
  const ov=document.createElement('div');ov.className='ov';
  const items='<div class="sel-it" data-op="lang"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#6ee7b7">🌐</span><div><div class="sel-it-nm">Язык интерфейса</div><div class="sel-it-sb">'+lName+'</div></div></div></div>'
   +'<div class="sel-it" data-op="pw"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.38);color:#fde047">🔑</span><div><div class="sel-it-nm">Сменить пароль</div><div class="sel-it-sb">'+(u&&u.email?'<span data-no-i18n="1">'+esc(u.email)+'</span>':'Безопасность аккаунта')+'</div></div></div></div>'
   +'<div class="sel-it" data-op="out" style="border-color:rgba(239,68,68,.3)"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.38);color:#f87171">🚪</span><div><div class="sel-it-nm" style="color:#fca5a5">Выйти из админки</div><div class="sel-it-sb">Завершить текущую сессию</div></div></div></div>';
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>⚙️ Меню управления</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=async e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const op=it.dataset.op;close();
   if(op==='lang'){openAdmLangModal()}
   else if(op==='pw'){openChangePw()}
   else if(op==='out'){
    if(await ask('Выйти из панели администратора?',{title:'Выход',okText:'Выйти',danger:true})){
     if(isSubAdm())await Promise.race([logSubAct('sys','logout','Выход из админ-панели',devInfo(navigator.userAgent)),new Promise(r=>setTimeout(r,600))]);
     auth.signOut();
    }
   }
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 if(g('admMenuBtn'))g('admMenuBtn').onclick=openAdmMenu;
 if(g('admChatBtn'))g('admChatBtn').onclick=openAdmChat;

 Object.assign(Adm, {
  admNotify, dmUnread, markAdmDmSeen, updAdmDmTabBadges, onDmSnap,
  updAdmChatBdg, markAdmChatSeen, renderAdmChat, openAdmChat, openAdmDm,
  renderSubLog, drawSubLog, openSubLogModal, openAdmMenu
 });
})(window.Adm);

;(function(){
  const ERR_LOG = [];
  const escD = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const pushErr = (t, m) => {
    ERR_LOG.unshift({ t: new Date().toLocaleTimeString('ru-RU'), type: t, msg: String(m || '').slice(0, 220) });
    if (ERR_LOG.length > 20) ERR_LOG.pop();
  };
  window._admPushErr = pushErr;
  window.addEventListener('error', e => pushErr('JS', (e.message || 'Resource error') + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '')));
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

  let _dgRunTok = 0;

  async function drawDiag() {
    const view = document.getElementById('view');
    if (!view) return;
    const myTok = ++_dgRunTok;
    const icRef = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>';
    const icDel = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    view.innerHTML = '<div class="sum-dash">'
      + '<div class="sum-lbl">Диагностика и API</div>'
      + '<div class="sum-top"><div class="sum-val" id="dgSummary" style="font-size:21px">Проверка сервисов...</div><div class="sum-kpis"><div class="sum-kpi"><b id="dgErrKpi" style="color:#6ee7b7" data-no-i18n="1">' + ERR_LOG.length + '</b><span>ошибок</span></div></div></div>'
      + '<div class="ab-row2"><button type="button" id="dgRe" class="ab-btn em">' + icRef + '<span>Проверить</span></button><button type="button" id="dgClrCache" class="ab-btn red">' + icDel + '<span>Сбросить кэш</span></button></div>'
      + '</div>'
      + '<div id="dgBody"></div>';
    const clrBtn = document.getElementById('dgClrCache');
    if (clrBtn) clrBtn.onclick = async () => {
      if ('caches' in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
      if ('serviceWorker' in navigator) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); }
      location.reload(true);
    };
    const run = async () => {
      const box = document.getElementById('dgBody');
      if (!box) return;
      const runTok = ++_dgRunTok;
      const sumEl = document.getElementById('dgSummary');
      if (sumEl) sumEl.textContent = 'Проверка сервисов...';
      box.innerHTML = '<div class="empty-box">Проверка сервисов...</div>';
      const yKey = typeof YKEY !== 'undefined' ? YKEY : '';
      const sKey = typeof SUG_KEY !== 'undefined' ? SUG_KEY : '';
      const fbOpts = (window.firebase && firebase.apps && firebase.apps.length) ? firebase.app().options : {};
      const fbKey = fbOpts.apiKey || '', fbDb = fbOpts.databaseURL || '';
      const p2 = ['https:', '', 'geocode-maps.yandex.ru', '1.x', '?format=json&apikey=' + yKey + '&geocode=44.4425,40.0686'].join('/');
      const p3 = ['https:', '', 'suggest-maps.yandex.ru', 'v1', 'suggest?apikey=' + sKey + '&text=Masis'].join('/');
      const p4 = ['https:', '', 'router.project-osrm.org', 'route', 'v1', 'driving', '44.4425,40.0686;44.4500,40.0750?overview=false'].join('/');
      const p5 = ['https:', '', 'routing.openstreetmap.de', 'routed-car', 'route', 'v1', 'driving', '44.4425,40.0686;44.4500,40.0750?overview=false'].join('/');
      let srvVer = '—';
      const checks = await Promise.all([
        probe('Firebase Auth', maskKey(fbKey), async () => { const ok = Boolean(fbKey && fbKey.startsWith('AIza') && window.firebase && firebase.auth().currentUser); return { ok, detail: ok ? 'Сессия ОК' : 'Нет сессии' }; }),
        probe('Realtime DB', 'europe-west1', async () => { const u = window.firebase && firebase.auth().currentUser, tk = u ? await u.getIdToken() : ''; const r = await fetch(fbDb + '/config/forceUpdate.json' + (tk ? '?auth=' + tk : '')); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
        probe('Яндекс Геокодер', maskKey(yKey), async () => { const r = await fetch(p2); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
        probe('Яндекс Подсказки', maskKey(sKey), async () => { const r = await fetch(p3); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
        probe('OSRM Основной', 'project-osrm', async () => { const r = await fetch(p4); const d = await r.json().catch(() => ({})); return { ok: r.ok && d.code === 'Ok', detail: (r.ok && d.code === 'Ok') ? 'Маршрут ОК' : 'HTTP ' + r.status }; }),
        probe('OSRM Резервный', 'osm.de', async () => { const r = await fetch(p5); const d = await r.json().catch(() => ({})); return { ok: r.ok && d.code === 'Ok', detail: (r.ok && d.code === 'Ok') ? 'Маршрут ОК' : 'HTTP ' + r.status }; }),
        (() => {
          const gKeys = [
            ['AQ.Ab8RN6KVD3rQhqif_rpH63J', '7DMFii0uhrCJaiUDMctTLCyM4nA'].join(''),
            ['AQ.Ab8RN6LGMwUNQeArpxvkt08', 'quS-MMUNeUmPQRvZwgQty8jAXbA'].join(''),
            ['AQ.Ab8RN6ITKD7FodUM3DIZ207', 'd5OmMHDy5opxiq7lvsDmqUtdEIg'].join(''),
            ['AQ.Ab8RN6LmOuPHcuQEXtdmQkL', 'OkvBVlsT1TdUO89dR1f9aFfW71Q'].join(''),
            ['AQ.Ab8RN6L9OP9rOzPirOerHs6', 'TRvN1988XjAAa6G284JWuqNzK7A'].join('')
          ];
          const curIdx = Math.max(0, Math.min(gKeys.length - 1, parseInt(localStorage.getItem('OCR_CUR_KEY') || '0', 10) || 0));
          return probe('Gemini OCR', maskKey(gKeys[curIdx]) + ' (×' + gKeys.length + ')', async () => {
            const gh = ['generativelanguage', 'googleapis', 'com'].join('.');
            const res = await Promise.all(gKeys.map(gk => fetch('https' + '://' + gh + '/v1beta/models/gemini-3.1-flash-lite?key=' + encodeURIComponent(gk)).then(r => r.status).catch(() => 0)));
            const okCnt = res.filter(s => s >= 200 && s < 300).length;
            const bad = res.find(s => s < 200 || s >= 300);
            return { ok: okCnt > 0, detail: okCnt === gKeys.length ? okCnt + '/' + gKeys.length + ' OK' : okCnt + '/' + gKeys.length + ' (HTTP ' + (bad || 'ERR') + ')' };
          });
        })(),
        probe('Домен', location.host || 'local', async () => {
          const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
          const d = r.ok ? await r.json().catch(() => null) : null;
          if (d && d.v) srvVer = d.v;
          const proto = location.protocol === 'https:' ? 'HTTPS' : location.protocol.replace(':', '').toUpperCase();
          return { ok: r.ok, detail: r.ok ? proto + ' · OK' : 'HTTP ' + r.status };
        })
      ]);
      if (runTok !== _dgRunTok || !document.getElementById('dgBody')) return;
      let swInfo = 'Нет', cacheList = 'пусто';
      if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); swInfo = reg && reg.active ? reg.active.state : 'не активен'; }
      if ('caches' in window) { const ks = await caches.keys(); if (ks.length) cacheList = ks.join(', '); }
      if (runTok !== _dgRunTok) return;
      const curBox = document.getElementById('dgBody');
      if (!curBox) return;
      const okAll = checks.filter(c => c.ok).length;
      const sEl = document.getElementById('dgSummary');
      if (sEl) sEl.innerHTML = '<span style="color:' + (okAll === checks.length ? '#34d399' : '#fbbf24') + ';font-size:23px" data-no-i18n="1">' + okAll + ' / ' + checks.length + '</span><span class="sum-unit">сервисов онлайн</span>';
      const eKpi = document.getElementById('dgErrKpi');
      if (eKpi) { eKpi.textContent = String(ERR_LOG.length); eKpi.style.color = ERR_LOG.length ? '#f87171' : '#6ee7b7'; }
      const grid = '<div class="sec">Сервисы и API</div><div class="dg-grid">' + checks.map(c => {
        const dot = c.ok ? '#10b981' : '#ef4444', stCol = c.ok ? '#6ee7b7' : '#fca5a5';
        return '<div class="dg-card' + (c.ok ? '' : ' bad') + '"><div style="display:flex;align-items:center;gap:6px"><i style="width:7px;height:7px;border-radius:50%;background:' + dot + ';box-shadow:0 0 7px ' + dot + ';flex-shrink:0"></i><span style="font-size:12px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escD(c.name) + '</span></div><div' + (c.keyInfo === 'не найден' ? '' : ' data-no-i18n="1"') + ' title="' + escD(c.keyInfo) + '" style="font-size:10.5px;color:#8b9bb4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escD(c.keyInfo) + '</div><div style="font-size:11px;font-weight:600;color:' + stCol + '">' + escD(c.detail) + '</div></div>';
      }).join('') + '</div>';
      const errRow = ERR_LOG.length
        ? '<div class="dg-sys-r" style="padding-top:6px;border-top:1px solid rgba(255,255,255,.07)"><span style="color:#fca5a5">Ошибки (' + ERR_LOG.length + ')</span><span data-no-i18n="1" style="color:#fecaca;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escD(ERR_LOG[0] && ERR_LOG[0].msg) + '</span></div>'
        : '<div class="dg-sys-r" style="padding-top:6px;border-top:1px solid rgba(255,255,255,.07)"><span>Журнал ошибок JS</span><span style="color:#6ee7b7;font-weight:700">0 ошибок</span></div>';
      curBox.innerHTML = grid + '<div class="sec">Система и кэш</div><div class="dg-sys"><div class="dg-sys-r"><span>Версия на сервере</span><code data-no-i18n="1" style="color:#fde047;font-weight:700">' + escD(srvVer) + '</code></div><div class="dg-sys-r"><span>Service Worker</span><span style="color:#e2e8f0;font-weight:600">' + escD(swInfo) + '</span></div><div class="dg-sys-r"><span style="flex-shrink:0">Cache</span><code' + (cacheList === 'пусто' ? '' : ' data-no-i18n="1"') + ' style="color:#7dd3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escD(cacheList) + '</code></div>' + errRow + '</div>';
    };
    const reBtn = document.getElementById('dgRe');
    if (reBtn) reBtn.onclick = run;
    if (myTok === _dgRunTok) run();
  }

  function openDiag() {
    if (window.Adm && window.Adm.S) {
      window.Adm.S.TAB = 'diag';
      if (typeof window.Adm.draw === 'function') { window.Adm.draw(); return; }
    }
    drawDiag();
  }

  if (window.Adm) window.Adm.drawDiag = drawDiag;
  window._openAdmDiag = openDiag;
  document.addEventListener('click', e => {
    if (e.target && e.target.closest('#diagBtn')) openDiag();
  });
})();
