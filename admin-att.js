// EuroBaza Admin · Attendance: табель пропусков по экипажам, выходные и экспорт
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
 const ATT_WD=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
 function attCurYm(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
 function attShiftYm(ym,delta){
  const p=String(ym||attCurYm()).split('-');
  const d=new Date((+p[0]||new Date().getFullYear()),(+p[1]||1)-1+delta,1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 }
 function attBuildGroups(){
  const manualObj=(S.ATT&&S.ATT.workers)||{};
  const manualList=Object.keys(manualObj).map(k=>({
   pid:k,
   wid:k,
   isApp:false,
   name:String((manualObj[k]&&manualObj[k].name)||'').trim(),
   car:String((manualObj[k]&&manualObj[k].car)||'').toUpperCase(),
   createdAt:+(manualObj[k]&&manualObj[k].createdAt)||0
  })).filter(x=>x.name).sort((a,b)=>(a.createdAt-b.createdAt)||a.name.localeCompare(b.name,'ru'));

  const appList=devs().filter(d=>{
   const car=String(d.u.car||'').toUpperCase();
   const acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   return !blk && car!=='ADMIN';
  }).map(d=>({
   pid:'u_'+d.id,
   uid:d.id,
   isApp:true,
   name:S.LABELS[d.id]||profName(d)||devName(d.u.ua),
   car:String(d.u.car||'').toUpperCase()
  })).sort((a,b)=>a.name.localeCompare(b.name,'ru'));

  const offRank=wd=>(wd>=1&&wd<=6)?wd:(wd===0?7:8);
  const groups=S.CARS_LIST.map((code,idx)=>{
   const appM=appList.filter(x=>x.car===code);
   const manM=manualList.filter(x=>x.car===code);
   return {code:code,title:'Экипаж '+code,members:[...appM,...manM],_ord:idx};
  }).sort((a,b)=>(offRank(getCrewOff(a.code))-offRank(getCrewOff(b.code)))||(a._ord-b._ord));

  const known=new Set(S.CARS_LIST);
  const noCarApp=appList.filter(x=>!x.car||!known.has(x.car));
  const noCarMan=manualList.filter(x=>!x.car||!known.has(x.car));
  if(noCarApp.length||noCarMan.length){
   groups.push({code:'',title:'Без экипажа',members:[...noCarApp,...noCarMan]});
  }
  return groups;
 }
 function drawAtt(){
  const now=new Date(),curYm=attCurYm(),isCurMonth=S.ATT_YM===curYm,todayDay=isCurMonth?now.getDate():-1;
  const parts=S.ATT_YM.split('-'),yr=+parts[0]||now.getFullYear(),mo=(+parts[1]||1)-1;
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const groups=attBuildGroups();
  const allMembers=groups.reduce((a,gr)=>a.concat(gr.members),[]);
  const mData=(S.ATT&&S.ATT.months&&S.ATT.months[S.ATT_YM])||{};

  let totalAbs=0,totalWork=0,todayAbs=0;
  const dayTotals=new Array(daysInMonth+1).fill(0);
  const mAbs={},mWork={},gAbs={},gWork={};
  const fmtTot=(a,w)=>{
   if(!a&&!w)return '<span style="color:#64748b">0</span>';
   let s='';
   if(a)s+='<span style="color:#fca5a5">-'+a+'</span>';
   if(w)s+=(a?' ':'')+'<span style="color:#6ee7b7">+'+w+'</span>';
   return s;
  };
  groups.forEach(gr=>{
   const offWd=getCrewOff(gr.code);
   let ga=0,gw=0;
   gr.members.forEach(m=>{
    const wm=mData[m.pid]||{};
    let a=0,w=0;
    for(let d=1;d<=daysInMonth;d++){
     if(wm[d]){
      const isOff=new Date(yr,mo,d).getDay()===offWd;
      if(isOff){w++;gw++;totalWork++;}
      else{a++;ga++;dayTotals[d]++;totalAbs++;if(d===todayDay)todayAbs++;}
     }
    }
    mAbs[m.pid]=a;mWork[m.pid]=w;
   });
   gAbs[gr.code]=ga;gWork[gr.code]=gw;
  });

  const structKey=S.ATT_YM+'|'+groups.map(gr=>gr.code+':'+getCrewOff(gr.code)+':'+gr.members.map(m=>m.pid+'='+m.name).join(',')).join(';');
  const exWrap=g('attWrap');

  // Точечное обновление без пересоздания DOM (ноль дёрганий и сбросов скролла)
  if(!S.ATT_ERR&&exWrap&&exWrap.dataset.sk===structKey){
   const s1=g('attStatCnt'),s2=g('attStatTot'),s3=g('attStatTd');
   if(s1&&s1.textContent!==String(allMembers.length))s1.textContent=String(allMembers.length);
   if(s2&&s2.textContent!==String(totalAbs))s2.textContent=String(totalAbs);
   const tdTxt=isCurMonth?String(todayAbs):'—';
   if(s3&&s3.textContent!==tdTxt)s3.textContent=tdTxt;

   exWrap.querySelectorAll('.att-chk').forEach(btn=>{
    const pid=btn.dataset.w,d=+btn.dataset.d,isOff=btn.dataset.off==='1';
    const on=!!(mData[pid]&&mData[pid][d]);
    const wantCls='att-chk'+(on?(isOff?' work':' on'):(isOff?' off':''));
    const wantTxt=on?(isOff?'✓':'✕'):(isOff?'В':'');
    if(btn.className!==wantCls)btn.className=wantCls;
    if(btn.textContent!==wantTxt)btn.textContent=wantTxt;
   });
   exWrap.querySelectorAll('[data-att-m]').forEach(td=>{
    const pid=td.dataset.attM,html=fmtTot(mAbs[pid]||0,mWork[pid]||0);
    if(td.innerHTML!==html)td.innerHTML=html;
   });
   exWrap.querySelectorAll('[data-att-g]').forEach(td=>{
    const code=td.dataset.attG,ga=gAbs[code]||0,gw=gWork[code]||0;
    const html=(ga||gw)?fmtTot(ga,gw):'';
    if(td.innerHTML!==html)td.innerHTML=html;
   });
   exWrap.querySelectorAll('[data-att-d]').forEach(td=>{
    const v=dayTotals[+td.dataset.attD]||0,txt=v?String(v):'',cls=v?'has':'';
    if(td.textContent!==txt)td.textContent=txt;
    if(td.className!==cls)td.className=cls;
   });
   const totEl=g('attTotAll');
   if(totEl){
    const html=fmtTot(totalAbs,totalWork);
    if(totEl.innerHTML!==html)totEl.innerHTML=html;
   }
   return;
  }

  let tbody='';
  groups.forEach(gr=>{
   const isNone=!gr.code;
   const offWd=isNone?-1:getCrewOff(gr.code);
   const offLbl=isNone?'':getCrewOffLbl(gr.code);
   const ga=gAbs[gr.code]||0,gw=gWork[gr.code]||0;
   tbody+='<tr class="att-grp"><td class="att-nm-col"><div class="att-grp-hd">'
    +'<span class="att-grp-t'+(isNone?' none':'')+'">'+(isNone?'🚫 Без экипажа':'🚚 <span data-no-i18n="1">'+esc(gr.code)+'</span> <button type="button" class="att-off-b" data-act="att-off" data-car="'+esc(gr.code)+'" title="Изменить выходной экипажа">'+(offLbl?offLbl+' ▾':'Без вых. ▾')+'</button>')+'</span>'
    +'<button type="button" class="att-grp-add" data-act="att-add" data-car="'+esc(gr.code)+'" title="Добавить рабочего в '+(isNone?'Без экипажа':'экипаж '+esc(gr.code))+'">+</button>'
    +'</div></td>';
   for(let d=1;d<=daysInMonth;d++){
    const wd=new Date(yr,mo,d).getDay();
    tbody+='<td class="'+(wd===offWd?'att-grp-off':'')+'"></td>';
   }
   tbody+='<td class="att-tot-col" data-att-g="'+esc(gr.code)+'">'+((ga||gw)?fmtTot(ga,gw):'')+'</td></tr>';

   gr.members.forEach(m=>{
    const wm=mData[m.pid]||{};
    const nmCell=m.isApp
     ?'<div class="att-nm-app"><span data-no-i18n="1">'+esc(m.name)+'</span><i>📱</i></div>'
     :'<button type="button" class="att-nm-btn" data-act="att-worker" data-w="'+esc(m.wid)+'"><span data-no-i18n="1">'+esc(m.name)+'</span><i>✎</i></button>';
    let row='<tr><td class="att-nm-col">'+nmCell+'</td>';
    for(let d=1;d<=daysInMonth;d++){
     const wd=new Date(yr,mo,d).getDay(),isOff=wd===offWd,isTd=d===todayDay,on=!!wm[d];
     const tdCls=isTd?'att-td-td':(isOff?'att-td-off':'');
     const btnCls='att-chk'+(on?(isOff?' work':' on'):(isOff?' off':''));
     const btnTxt=on?(isOff?'✓':'✕'):(isOff?'В':'');
     row+='<td class="'+tdCls+'"><button type="button" class="'+btnCls+'" data-act="att-tog" data-w="'+esc(m.pid)+'" data-d="'+d+'"'+(isOff?' data-off="1"':'')+' aria-label="'+esc(m.name)+' '+d+'">'+btnTxt+'</button></td>';
    }
    row+='<td class="att-tot-col" data-att-m="'+esc(m.pid)+'">'+fmtTot(mAbs[m.pid]||0,mWork[m.pid]||0)+'</td></tr>';
    tbody+=row;
   });
  });

  let tfoot='<tr class="att-foot"><td class="att-nm-col">Итого</td>';
  for(let d=1;d<=daysInMonth;d++){
   const v=dayTotals[d];
   tfoot+='<td data-att-d="'+d+'" class="'+(v?'has':'')+'">'+(v||'')+'</td>';
  }
  tfoot+='<td id="attTotAll" class="att-tot-col">'+fmtTot(totalAbs,totalWork)+'</td></tr>';

  // Если изменился только состав рабочих в том же месяце — обновляем только tbody/tfoot без сброса скролла
  if(!S.ATT_ERR&&exWrap&&exWrap.dataset.ym===S.ATT_YM&&g('attBody')&&g('attFoot')){
   const s1=g('attStatCnt'),s2=g('attStatTot'),s3=g('attStatTd');
   if(s1)s1.textContent=String(allMembers.length);
   if(s2)s2.textContent=String(totalAbs);
   if(s3)s3.textContent=isCurMonth?String(todayAbs):'—';
   g('attBody').innerHTML=tbody;
   g('attFoot').innerHTML=tfoot;
   exWrap.dataset.sk=structKey;
   return;
  }

  let h='<div class="tiles">'
   +'<div class="tile"><b id="attStatCnt">'+allMembers.length+'</b><span>сотрудников</span></div>'
   +'<div class="tile"><b id="attStatTot" style="color:#f87171">'+totalAbs+'</b><span>пропусков</span></div>'
   +'<div class="tile"><b id="attStatTd">'+(isCurMonth?todayAbs:'—')+'</b><span>'+(isCurMonth?'сегодня':'не тек. месяц')+'</span></div>'
   +'</div>';

  h+='<div class="att-bar">'
   +'<button type="button" class="att-nav" data-act="att-prev" aria-label="Предыдущий месяц">◀</button>'
   +'<div class="att-m-title"><span>'+esc(monthName(S.ATT_YM))+'</span>'+(isCurMonth?'':'<button type="button" class="att-today-btn" data-act="att-today">Сегодня</button>')+'</div>'
   +'<button type="button" class="att-nav" data-act="att-next" aria-label="Следующий месяц">▶</button>'
   +'</div>';

  const icPlus='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  const icRep='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
  const icTbl='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  h+='<div class="att-acts">'
   +'<button type="button" class="att-act-btn add" data-act="att-add">'+icPlus+'<span>Рабочий</span></button>'
   +'<button type="button" class="att-act-btn sec-b" data-act="att-copy">'+icRep+'<span>Отчёт</span></button>'
   +'<button type="button" class="att-act-btn sec-b" data-act="att-csv">'+icTbl+'<span data-no-i18n="1">Excel</span></button>'
   +'</div>';

  if(S.ATT_ERR){
   h+='<div class="box" style="border-color:rgba(239,68,68,.45);color:#fca5a5"><span>Нет доступа к разделу Firebase.</span> <code data-no-i18n="1">attendance</code> — <span>Добавьте правило в консоли Firebase</span> (<code data-no-i18n="1">Правила FireBase.md</code>).</div>';
   g('view').innerHTML=h;
   return;
  }

  let thead='<tr><th class="att-nm-col">Экипаж / Сотрудник</th>';
  for(let d=1;d<=daysInMonth;d++){
   const wd=new Date(yr,mo,d).getDay(),isTd=d===todayDay;
   thead+='<th class="att-dth'+(isTd?' td':'')+'"'+(isTd?' id="attTdCol"':'')+'>'+d+'<small>'+ATT_WD[wd]+'</small></th>';
  }
  thead+='<th class="att-tot-col">Итог</th></tr>';

  h+='<div id="attWrap" class="att-wrap" data-ym="'+esc(S.ATT_YM)+'" data-sk="'+esc(structKey)+'"><table class="att-tbl"><thead>'+thead+'</thead><tbody id="attBody">'+tbody+'</tbody><tfoot id="attFoot">'+tfoot+'</tfoot></table></div>';
  h+='<div class="mut hint"><span>📱 — приложение</span> · <b style="color:#fbbf24">В</b> <span>— выходной</span> · <b style="color:#fca5a5">✕</b> <span>— не вышел на смену</span> · <b style="color:#6ee7b7">✓</b> <span>— вышел в выходной</span> · <span>Нажмите на день у экипажа, чтобы сменить выходной.</span></div>';
  g('view').innerHTML=h;

  const wrap=g('attWrap');
  if(wrap&&S.ATT_SCROLLED_YM!==S.ATT_YM){
   S.ATT_SCROLLED_YM=S.ATT_YM;
   const tdEl=g('attTdCol');
   if(tdEl){
    wrap.scrollLeft=Math.max(0,tdEl.offsetLeft-160);
   }
  }
 }
 function openAttPickCarModal(title,curCar,onPick){
  const ov=document.createElement('div');ov.className='ov';
  let items=S.CARS_LIST.map(c=>'<div class="sel-it'+(curCar===c?' on':'')+'" data-c="'+c+'"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Экипаж '+c+'</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>').join('');
  items+='<div class="sel-it'+(curCar===''?' on':'')+'" data-c=""><div class="sel-it-l"><span class="sel-ic" style="background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#fbbf24">🚫</span><div><div class="sel-it-nm">Без экипажа</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>'+esc(title)+'</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const c=it.dataset.c||'';close();
   onPick(c);
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 async function attAddWorker(car){
  if(car===undefined){
   openAttPickCarModal('В какой экипаж добавить?',null,c=>attAddWorker(c));
   return;
  }
  const carCode=String(car||'').toUpperCase();
  const title=carCode?('Новый рабочий · Экипаж '+carCode):'Новый рабочий (без экипажа)';
  const v=await askInput(title,'Введите имя сотрудника (без приложения)','','Например: Армен');
  if(v===null)return;
  const clean=v.trim().slice(0,32);
  if(!clean){toast('Введите имя рабочего',true);return}
  try{
   await db.ref('attendance/workers').push({name:clean,car:carCode,createdAt:Date.now()});
   logSubAct('att','att_add','Добавлен рабочий в табель',clean+(carCode?' · Экипаж '+carCode:' · Без экипажа'),{car:carCode,target:clean});
   toast('Добавлен: '+clean+(carCode?' (Экипаж '+carCode+')':''));
  }catch(e){toast('Ошибка сохранения: '+((e&&e.message)||e),true)}
 }
 async function attToggle(pid,day){
  if(!pid||!day)return;
  if(!S.ATT.months)S.ATT.months={};
  if(!S.ATT.months[S.ATT_YM])S.ATT.months[S.ATT_YM]={};
  if(!S.ATT.months[S.ATT_YM][pid])S.ATT.months[S.ATT_YM][pid]={};
  const isSet=!!S.ATT.months[S.ATT_YM][pid][day];
  // Оптимистическое точечное обновление без задержки и без дёрганий
  if(isSet)delete S.ATT.months[S.ATT_YM][pid][day];
  else S.ATT.months[S.ATT_YM][pid][day]=true;
  drawAtt();
  try{
   const ref=db.ref('attendance/months/'+S.ATT_YM+'/'+pid+'/'+day);
   if(isSet)await ref.remove();
   else await ref.set(true);
   if(isSubAdm()){
    let nm=pid,car='';
    if(String(pid).startsWith('u_')){
     const uid=String(pid).slice(2),du=S.USERS[uid];
     if(du){const dp=parseDev(uid,du);nm=dispName(dp);car=String(dp.u.car||'').toUpperCase()}
    }else{
     const w=S.ATT&&S.ATT.workers&&S.ATT.workers[pid];
     if(w){nm=w.name||pid;car=String(w.car||'').toUpperCase()}
    }
    const pts=S.ATT_YM.split('-'),yr=+pts[0]||new Date().getFullYear(),mo=(+pts[1]||1)-1;
    const wd=new Date(yr,mo,day).getDay();
    const isOff=car&&typeof getCrewOff==='function'&&getCrewOff(car)===wd;
    const dtStr=String(day).padStart(2,'0')+'.'+String(mo+1).padStart(2,'0')+'.'+yr;
    const ttl=isOff?(isSet?'Снята отметка выхода в выходной':'Выход в выходной'):(isSet?'Снят пропуск в табеле':'Отмечен пропуск в табеле');
    logSubAct('att',isSet?'att_unmark':'att_mark',ttl,nm+' · '+dtStr,{car:car,target:nm});
   }
  }catch(e){
   if(isSet)S.ATT.months[S.ATT_YM][pid][day]=true;
   else delete S.ATT.months[S.ATT_YM][pid][day];
   drawAtt();
   toast('Ошибка сохранения',true);
  }
 }
 async function attMergeManualToApp(wid,uid){
  if(!wid||!uid)return 0;
  const snap=await db.ref('attendance/months').once('value');
  const months=snap.val()||{};
  const targetPid='u_'+uid;
  const updates={};
  let movedDays=0;
  Object.keys(months).forEach(ym=>{
   const m=months[ym];
   if(!m||!m[wid])return;
   const wDays=m[wid];
   Object.keys(wDays).forEach(d=>{
    if(wDays[d]){
     updates['months/'+ym+'/'+targetPid+'/'+d]=true;
     movedDays++;
    }
   });
   updates['months/'+ym+'/'+wid]=null;
  });
  updates['workers/'+wid]=null;
  await db.ref('attendance').update(updates);
  return movedDays;
 }
 function openAttLinkModal(wid){
  const w=(S.ATT&&S.ATT.workers&&S.ATT.workers[wid]);
  if(!w)return;
  const wCar=String(w.car||'').toUpperCase();
  const appUsers=devs().filter(d=>{
   const car=String(d.u.car||'').toUpperCase();
   const acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   return !blk && car!=='ADMIN';
  }).map(d=>({
   uid:d.id,
   name:S.LABELS[d.id]||profName(d)||devName(d.u.ua),
   full:dispName(d),
   car:String(d.u.car||'').toUpperCase()
  })).sort((a,b)=>{
   const as=wCar&&a.car===wCar?0:1,bs=wCar&&b.car===wCar?0:1;
   return as-bs||a.name.localeCompare(b.name,'ru');
  });
  if(!appUsers.length){toast('Нет пользователей приложения',true);return}
  const ov=document.createElement('div');ov.className='ov';
  const items=appUsers.map(u=>{
   const same=wCar&&u.car===wCar;
   const sub=u.car?('Экипаж '+u.car+(same?' · этот же экипаж':'')):'Без экипажа';
   return '<div class="sel-it'+(same?' on':'')+'" data-uid="'+esc(u.uid)+'"><div class="sel-it-l"><span class="sel-ic">📱</span><div><div class="sel-it-nm" data-no-i18n="1">'+esc(u.name)+'</div><div class="sel-it-sb">'+esc(sub)+'</div></div></div></div>';
  }).join('');
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>🔗 <span>Привязать</span> «<span data-no-i18n="1">'+esc(w.name)+'</span>»</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=async e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const uid=it.dataset.uid;
   const u=appUsers.find(x=>x.uid===uid);
   close();
   if(!u)return;
   if(!(await ask('Перенести всю статистику табеля от «'+w.name+'» на аккаунт «'+u.name+'» (за все месяцы) и удалить ручной дубликат?',{title:'Привязка к аккаунту',okText:'Перенести'})))return;
   try{
    const cnt=await attMergeManualToApp(wid,uid);
    logSubAct('att','att_link','Привязка рабочего к аккаунту','«'+w.name+'» → «'+u.name+'»'+(cnt?' · отметок: '+cnt:''),{car:u.car||wCar,target:u.name});
    toast('Привязано к «'+u.name+'»'+(cnt?' · перенесено отметок: '+cnt:''));
   }catch(err){toast('Ошибка переноса: '+((err&&err.message)||err),true)}
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function openAttWorkerModal(wid){
  const w=(S.ATT&&S.ATT.workers&&S.ATT.workers[wid]);
  if(!w)return;
  const curCar=String(w.car||'').toUpperCase();
  const ov=document.createElement('div');ov.className='ov';
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>👷 <span data-no-i18n="1">'+esc(w.name)+'</span></b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'
   +'<div class="sel-it" data-op="link" style="border-color:rgba(56,189,248,.35)"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc">🔗</span><div><div class="sel-it-nm" style="color:#7dd3fc">Привязать к аккаунту</div><div class="sel-it-sb">Перенести статистику на пользователя приложения</div></div></div></div>'
   +'<div class="sel-it" data-op="ren"><div class="sel-it-l"><span class="sel-ic">✏️</span><div><div class="sel-it-nm">Переименовать</div><div class="sel-it-sb">Изменить имя сотрудника</div></div></div></div>'
   +'<div class="sel-it" data-op="car"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Сменить экипаж</div><div class="sel-it-sb"><span>Сейчас:</span> '+(curCar?'<span>Экипаж</span> <span data-no-i18n="1">'+esc(curCar)+'</span>':'<span>Без экипажа</span>')+'</div></div></div></div>'
   +'<div class="sel-it" data-op="del" style="border-color:rgba(239,68,68,.3)"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.38);color:#f87171">🗑️</span><div><div class="sel-it-nm" style="color:#fca5a5">Удалить рабочего</div><div class="sel-it-sb">Убрать сотрудника из таблицы</div></div></div></div>'
   +'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=async e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const op=it.dataset.op;close();
   if(op==='link'){
    openAttLinkModal(wid);
   }else if(op==='ren'){
    const nv=await askInput('Переименовать рабочего','Введите новое имя сотрудника',w.name,'Имя...');
    if(nv===null)return;
    const clean=nv.trim().slice(0,32);
    if(!clean){toast('Имя не может быть пустым',true);return}
    try{await db.ref('attendance/workers/'+wid+'/name').set(clean);logSubAct('att','att_ren','Переименован рабочий в табеле','«'+w.name+'» → «'+clean+'»',{car:curCar,target:clean});toast('Имя обновлено')}
    catch(err){toast('Ошибка сохранения',true)}
   }else if(op==='car'){
    openAttPickCarModal('Экипаж для '+w.name,curCar,async nc=>{
     try{await db.ref('attendance/workers/'+wid+'/car').set(nc||'');logSubAct('att','att_car','Смена экипажа рабочего',w.name+': '+(curCar||'Без экипажа')+' → '+(nc||'Без экипажа'),{car:nc||curCar,target:w.name});toast(nc?'Перенесён в экипаж '+nc:'Перенесён в «Без экипажа»')}
     catch(err){toast('Ошибка сохранения',true)}
    });
   }else if(op==='del'){
    if(!(await ask('Удалить «'+w.name+'» из списка рабочих?',{title:'Удаление рабочего',okText:'Удалить',danger:true})))return;
    try{await db.ref('attendance/workers/'+wid).remove();logSubAct('att','att_del','Удалён рабочий из табеля',w.name+(curCar?' · Экипаж '+curCar:''),{car:curCar,target:w.name,danger:true});toast('Сотрудник удалён')}
    catch(err){toast('Ошибка удаления',true)}
   }
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function openCrewOffModal(carCode){
  const code=String(carCode||'').trim().toUpperCase();
  if(!code||!S.CARS_LIST.includes(code))return;
  const old=g('attOffOv');if(old){if(typeof old._close==='function')old._close();else old.remove()}
  const curWd=getCrewOff(code),defWd=getCrewDefOff(code);
  const days=[
   [1,'Понедельник','Пн'],
   [2,'Вторник','Вт'],
   [3,'Среда','Ср'],
   [4,'Четверг','Чт'],
   [5,'Пятница','Пт'],
   [6,'Суббота','Сб'],
   [0,'Воскресенье','Вс'],
   [-1,'Без выходного','—']
  ];
  const items=days.map(([wd,name,sh])=>{
   const on=wd===curWd,isDef=wd===defWd;
   const icStyle=wd===-1?'background:rgba(148,163,184,.14);border-color:rgba(148,163,184,.32);color:#cbd5e1':'background:rgba(245,158,11,.15);border-color:rgba(251,191,36,.4);color:#fcd34d;font-size:12px;font-weight:800';
   return '<div class="sel-it'+(on?' on':'')+'" data-wd="'+wd+'"><div class="sel-it-l"><span class="sel-ic" style="'+icStyle+'">'+sh+'</span><div><div class="sel-it-nm">'+name+'</div>'+(isDef?'<div class="sel-it-sb">По умолчанию</div>':'')+'</div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  }).join('');
  const ov=document.createElement('div');ov.id='attOffOv';ov.className='ov';
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b><span>📅 Выходной экипажа</span> <span data-no-i18n="1">'+esc(code)+'</span></b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();close()}};
  document.addEventListener('keydown',onK);
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=async e=>{
   if(e.target===ov){close();return}
   const it=e.target.closest('.sel-it');if(!it)return;
   const wd=+it.dataset.wd;
   close();
   try{
    if(wd===defWd)await db.ref('attendance/crewOff/'+code).remove();
    else await db.ref('attendance/crewOff/'+code).set(wd);
    const picked=days.find(x=>x[0]===wd);
    logSubAct('att','att_off','Изменён выходной экипажа','Экипаж '+code+' → '+(picked?picked[1]:wd)+(wd===defWd?' (по умолчанию)':''),{car:code});
    toast('Выходной обновлён');
   }catch(err){toast('Ошибка сохранения',true)}
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function attExportCsv(){
  const groups=attBuildGroups().filter(gr=>!!gr.code&&gr.members.length>0);
  const hasAny=groups.length>0;
  if(!hasAny){toast('Нет сотрудников в табеле',true);return}
  const p=S.ATT_YM.split('-'),yr=+p[0],mo=(+p[1]||1)-1;
  const dim=new Date(yr,mo+1,0).getDate();
  const mData=(S.ATT&&S.ATT.months&&S.ATT.months[S.ATT_YM])||{};
  const header=['Экипаж','Сотрудник'];
  for(let d=1;d<=dim;d++)header.push(String(d));
  header.push('Пропусков','В вых.');
  const dayT=new Array(dim+1).fill(0);
  let totA=0,totW=0;
  const rows=[];
  groups.forEach(gr=>{
   const offWd=getCrewOff(gr.code);
   gr.members.forEach(m=>{
    const wm=mData[m.pid]||{},r=[gr.code?gr.code:'—',m.name];
    let ca=0,cw=0;
    for(let d=1;d<=dim;d++){
     const isOff=new Date(yr,mo,d).getDay()===offWd;
     if(wm[d]){
      if(isOff){r.push('✓');cw++;totW++;}
      else{r.push('✕');ca++;dayT[d]++;totA++;}
     }else r.push(isOff?'В':'');
    }
    r.push(ca,cw);
    rows.push(r);
   });
  });
  const totalRow=['ИТОГО',''];
  for(let d=1;d<=dim;d++)totalRow.push(dayT[d]||'');
  totalRow.push(totA,totW);
  const title=monthName(S.ATT_YM);
  const fn='EuroBaza_Табель_'+title.replace(/[\s\/:*?"<>|]+/g,'_')+'.csv';
  if(window.TableViewer){
   TableViewer.open({title:'Табель · '+title,filename:fn,headers:header,rows:rows,totalRow:totalRow,mergeFirstCol:true,nameCol:1});
   return;
  }
  downloadCsv(fn,[header,...rows,totalRow]);
 }
 function attCopyReport(){
  const groups=attBuildGroups();
  if(!groups.some(gr=>gr.members.length)){toast('Нет сотрудников в табеле',true);return}
  const p=S.ATT_YM.split('-'),yr=+p[0],mo=(+p[1]||1)-1;
  const dim=new Date(yr,mo+1,0).getDate();
  const mData=(S.ATT&&S.ATT.months&&S.ATT.months[S.ATT_YM])||{};
  let totA=0,totW=0;
  const lines=['📅 '+trAdm('Табель')+' — '+trAdm(monthName(S.ATT_YM))];
  const offTag=trAdm('в вых.');
  groups.forEach(gr=>{
   if(!gr.members.length)return;
   const offWd=getCrewOff(gr.code);
   lines.push('',(gr.code?'🚚 '+trAdm('Экипаж')+' '+gr.code:'🚫 '+trAdm('Без экипажа'))+':');
   gr.members.forEach(m=>{
    const wm=mData[m.pid]||{},absDays=[],workDays=[];
    for(let d=1;d<=dim;d++){
     if(!wm[d])continue;
     if(new Date(yr,mo,d).getDay()===offWd)workDays.push(d);
     else absDays.push(d);
    }
    totA+=absDays.length;totW+=workDays.length;
    let line='• '+m.name+': ✕ '+absDays.length+(absDays.length?' ('+absDays.join(', ')+')':'');
    if(workDays.length)line+=' · ✓ '+offTag+' '+workDays.length+' ('+workDays.join(', ')+')';
    lines.push(line);
   });
  });
  lines.push('',trAdm('Всего пропусков (✕):')+' '+totA+(totW?' · '+trAdm('Выходов в выходной (✓):')+' '+totW:''));
  const txt=lines.join('\n');
  if(navigator.clipboard&&navigator.clipboard.writeText){
   navigator.clipboard.writeText(txt).then(()=>toast('Отчёт скопирован')).catch(()=>toast('Не удалось скопировать',true));
  }else{toast('Буфер обмена недоступен',true)}
 }

 Object.assign(Adm, {
  attCurYm, attShiftYm, drawAtt, attAddWorker, attToggle, attMergeManualToApp,
  openAttWorkerModal, openCrewOffModal, attExportCsv, attCopyReport
 });
})(window.Adm);
