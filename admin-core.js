// EuroBaza Admin · Core: инициализация Firebase, общее состояние Adm.S, утилиты, экипажи, диалоги и экспорт
(function(){
 'use strict';
 const Adm = window.Adm = window.Adm || {};
 const g=id=>document.getElementById(id);
 const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const CUR='֏',TTL=75000;
 const admLoc=()=>{const l=window.getLang?window.getLang():'ru';return l==='hy'?'hy-AM':l==='en'?'en-GB':'ru-RU'};
 const trAdm=s=>(window.i18nTranslateText?window.i18nTranslateText(s):s);
 const fm=n=>(Math.round((+n||0)*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const money=n=>fm(n)+' '+CUR;
 const MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
 const EB_CAT=window.EB_CATALOG||{};
 const RU=EB_CAT.RU||{};
 const nm=EB_CAT.nm||(v=>RU[v]||v);
 const CAT_ICO_MAP=EB_CAT.CAT_ICO||{};
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

 const DEFAULT_CREWS=[
  {code:'BB',off:1,note:''},{code:'CC',off:2,note:''},{code:'VV',off:3,note:''},{code:'RR',off:4,note:''},
  {code:'EE',off:5,note:''},{code:'GG',off:6,note:''},{code:'XX',off:0,note:''},{code:'ZZ',off:0,note:''}
 ];

 // ===== Единое состояние админ-панели (window.Adm.S) =====
 const S = {
  CARS_LIST: DEFAULT_CREWS.map(x => x.code),
  CREWS_META: DEFAULT_CREWS.reduce((m, x) => { m[x.code] = { off: x.off, note: x.note }; return m; }, {}),
  USERS: {}, LABELS: {}, ACCOUNTS: {}, CARS: {}, OCR_MAP: {}, OCR_Q: '',
  CHAT: [], CHAT_OPEN: false, DMS: {}, DM_UID: null, DM_TAB: 'adm',
  FU: 0, PUB: undefined, TAB: 'online', SEL: 'all', ONL_CAR: 'all', ONL_Q: '',
  ATT: {}, ATT_ERR: false, ATT_SCROLLED_YM: '',
  ATT_YM: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })(),
  SUB_LOG: [], SUB_LOG_ERR: false, SUB_LOG_OPEN: false, SUB_LOG_CAT: 'all', SUB_LOG_Q: '', SUB_LOG_PREV_SEEN: 0, _subLoginLogged: false,
  OPEN: {},
  _lfProm: null, _map: null, _markers: {}, _baseMk: null, _didFit: false, MAP_ONLY_ONLINE: true, _applyAdmSat: null,
  _subMk: null, _subFit: null, _subRouteTok: 0, _subCurPt: null, _subHist: [], _mapRO: null, _mapTok: 0,
  ADM_SAT: (() => { try { return localStorage.getItem('ADM_MAP_SAT') !== '0'; } catch (e) { return true; } })(),
  _admChatInit: false,
  _admLastNotifT: +(localStorage.getItem('ADM_CHAT_NOTIF_T') || 0),
  _admDmInit: false,
  _admDmSeenAdm: (() => { try { return JSON.parse(localStorage.getItem('ADM_DM_SEEN_ADM') || '{}'); } catch (e) { return {}; } })(),
  _admDmNotif: (() => { try { return JSON.parse(localStorage.getItem('ADM_DM_NOTIF') || '{}'); } catch (e) { return {}; } })()
 };

 const CREW_OFF={BB:1,CC:2,VV:3,RR:4,EE:5,GG:6,XX:0,ZZ:0};
 const CREW_OFF_LBL={BB:'Пн',CC:'Вт',VV:'Ср',RR:'Чт',EE:'Пт',GG:'Сб',XX:'Вс',ZZ:'Вс'};
 const WD_SHORT=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
 window._crewsSet=new Set([...S.CARS_LIST,'ADMIN']);
 function isValidCrewCode(code){
  return /^(?=.*[A-Z])[A-Z0-9]{2,6}$/.test(code)&&code!=='ADMIN'&&code!=='ALL'&&code!=='__CREWS';
 }
 function syncCrewsFromLabels(){
  const cfg=S.LABELS&&S.LABELS.__crews;
  let items=null;
  if(cfg&&typeof cfg==='object'&&(Array.isArray(cfg.list)||cfg.empty)){
   items=[];
   const seen=new Set();
   (Array.isArray(cfg.list)?cfg.list:[]).forEach(x=>{
    const cd=String((x&&x.code)||'').trim().toUpperCase();
    if(!isValidCrewCode(cd)||seen.has(cd))return;
    seen.add(cd);
    const off=(typeof x.off==='number'&&x.off>=-1&&x.off<=6)?x.off:-1;
    const note=String((x&&x.note)||'').trim().slice(0,40);
    items.push({code:cd,off:off,note:note});
   });
  }else{
   items=DEFAULT_CREWS.map(x=>({code:x.code,off:x.off,note:x.note}));
  }
  S.CARS_LIST=items.map(x=>x.code);
  const meta={};
  items.forEach(x=>{meta[x.code]={off:x.off,note:x.note}});
  S.CREWS_META=meta;
  window._crewsSet=new Set([...S.CARS_LIST,'ADMIN']);
  if(S.SEL!=='all'&&!getCarsList().includes(S.SEL))S.SEL='all';
  if(S.ONL_CAR!=='all'&&S.ONL_CAR!=='none'&&S.ONL_CAR!=='ADMIN'&&!S.CARS_LIST.includes(S.ONL_CAR))S.ONL_CAR='all';
 }
 function getCrewsConfigList(){
  return S.CARS_LIST.map(cd=>({
   code:cd,
   off:getCrewDefOff(cd),
   note:(S.CREWS_META[cd]&&S.CREWS_META[cd].note)||''
  }));
 }
 async function saveCrewsConfig(list){
  const clean=[];
  const seen=new Set();
  (list||[]).forEach(x=>{
   const cd=String((x&&x.code)||'').trim().toUpperCase();
   if(!isValidCrewCode(cd)||seen.has(cd))return;
   seen.add(cd);
   const off=(typeof x.off==='number'&&x.off>=-1&&x.off<=6)?x.off:-1;
   const note=String((x&&x.note)||'').trim().slice(0,40);
   clean.push({code:cd,off:off,note:note});
  });
  const payload=clean.length?{v:1,list:clean,updatedAt:Date.now()}:{v:1,empty:true,updatedAt:Date.now()};
  await db.ref('labels/__crews').set(payload);
 }
 function getCrewDefOff(code){
  if(!code)return -1;
  if(S.CREWS_META[code]&&typeof S.CREWS_META[code].off==='number')return S.CREWS_META[code].off;
  return CREW_OFF[code]!==undefined?CREW_OFF[code]:-1;
 }
 function getCrewOff(code){
  if(!code)return -1;
  const custom=S.ATT&&S.ATT.crewOff&&S.ATT.crewOff[code];
  if(typeof custom==='number'&&custom>=-1&&custom<=6)return custom;
  return getCrewDefOff(code);
 }
 function getCrewOffLbl(code){
  const wd=getCrewOff(code);
  return wd>=0&&wd<=6?WD_SHORT[wd]:'';
 }
const getCarsList=()=>isSubAdm()?S.CARS_LIST:[...S.CARS_LIST,'ADMIN'];
 const SUB_LOG_SEEN_KEY='ADM_SUBLOG_SEEN';
 const subLogSeen=()=>{try{return +(localStorage.getItem(SUB_LOG_SEEN_KEY)||0)||0}catch(e){return 0}};
 const subLogUnread=()=>{if(isSubAdm()||!S.SUB_LOG.length)return 0;const s=subLogSeen();return S.SUB_LOG.filter(x=>(+x.t||0)>s).length};
 function updSubLogBdg(){
  const b=g('admMenuBdg');if(!b)return;
  if(isSubAdm()){b.hidden=true;return}
  const n=subLogUnread();
  b.hidden=!n;b.textContent=n>99?'99+':String(n);
 }
 function markSubLogSeen(){
  if(isSubAdm())return;
  const mx=S.SUB_LOG.length?Math.max.apply(null,S.SUB_LOG.map(x=>+x.t||0)):Date.now();
  try{localStorage.setItem(SUB_LOG_SEEN_KEY,String(Math.max(mx,Date.now())))}catch(e){}
  updSubLogBdg();
 }
 function logSubAct(cat,act,title,detail,extra){
  try{
   if(!isSubAdm())return Promise.resolve();
   const u=auth.currentUser;
   const rec={
    cat:String(cat||'sys').slice(0,16),
    act:String(act||'other').slice(0,32),
    title:String(title||'').slice(0,120),
    detail:String(detail||'').slice(0,260),
    by:(u&&u.email)||SUB_EMAIL,
    t:firebase.database.ServerValue.TIMESTAMP
   };
   if(extra&&extra.car)rec.car=String(extra.car).toUpperCase().slice(0,16);
   if(extra&&extra.target)rec.target=String(extra.target).slice(0,80);
   if(extra&&extra.danger)rec.danger=true;
   return db.ref('subadminLog').push(rec).catch(()=>{});
  }catch(e){return Promise.resolve()}
 }
 const OCR_CAT_NAMES=EB_CAT.OCR_CAT_NAMES||{};
 const SUB_EMAIL='diannakirakosyan@gmail.com';
 const isSubAdm=()=>((auth.currentUser&&auth.currentUser.email)||'').toLowerCase()===SUB_EMAIL;
 const admRawName=()=>isSubAdm()?'Доставка':'Админ';
 const admTag=()=>isSubAdm()?'delivery':'admin';
 let _tt=null;

 let _admIosSw=null;
 function admIosHaptic(){
  try{
   if(!_admIosSw){
    const lb=document.createElement('label');
    lb.style.cssText='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    const cb=document.createElement('input');
    cb.type='checkbox';cb.setAttribute('switch','');
    lb.appendChild(cb);document.body.appendChild(lb);
    _admIosSw=lb;
   }
   _admIosSw.click();
  }catch(e){}
 }
 function admVib(p){
  try{
   if(localStorage.getItem('NO_VIB')==='1')return;
   if(navigator.vibrate){navigator.vibrate(p);return;}
   if(/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){
    admIosHaptic();
    if(Array.isArray(p)&&p.length>1)setTimeout(admIosHaptic,90);
   }
  }catch(e){}
 }
 document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest&&e.target.closest('button,a,.row,.mr,.st-row,.sel-it,.sum-cat-h');
  if(t)admVib(40);
 },true);
 function toast(m,err){if(err)admVib([60,40,60]);const t=g('toast');t.textContent=m;t.className='show'+(err?' err':'');clearTimeout(_tt);_tt=setTimeout(()=>{t.className=''},2600)}
 window.toast=toast;
 function showErr(m){const e=g('err');e.textContent=m||'';e.hidden=!m}
 function denied(e,path){
  const d=(e&&e.code==='PERMISSION_DENIED')||/permission_denied/i.test((e&&e.message)||'');
  const pfx=path?(' ['+path+']'):'';
  if(window._admPushErr)window._admPushErr(d?'FB_DENIED':'FB_ERR',(path?path+': ':'')+((e&&e.message)||e));
  showErr(d?('Нет доступа к данным'+pfx+'. Проверьте, что правила базы опубликованы и в них указан ваш email.'):('Ошибка базы'+pfx+': '+((e&&e.message)||e)));
 }
 // ===== Данные =====
 function parseDev(id,u){
  u=u||{};
  let cur={sum:0,qty:0,cats:[]},hist={};
  try{const c=JSON.parse(u.cur||'');if(c&&typeof c==='object')cur=c}catch(e){}
  try{const h=JSON.parse(u.hist||'{}');if(h&&typeof h==='object')hist=h}catch(e){}
  return{id:id,u:u,cur:cur,hist:hist};
 }
 const accByUid=uid=>Object.keys(S.ACCOUNTS).map(k=>Object.assign({key:k},S.ACCOUNTS[k])).find(a=>a&&a.uid===uid)||null;
 const profName=d=>d.u.uname||(accByUid(d.id)&&accByUid(d.id).name)||"";
 const dispName=d=>{const lb=S.LABELS[d.id],pr=profName(d);return lb&&pr&&lb!==pr?lb+" ("+pr+")":(lb||pr||devName(d.u.ua))};
 const dispHtml=d=>{const lb=S.LABELS[d.id],pr=profName(d);return lb&&pr&&lb!==pr?'<span data-no-i18n="1">'+esc(lb)+'</span> <span style="font-size:12px;font-weight:500;color:#94a3b8">(<span>в профиле:</span> <span data-no-i18n="1">'+esc(pr)+'</span>)</span>':'<span data-no-i18n="1">'+esc(lb||pr||devName(d.u.ua))+'</span>'};
 const devs=()=>{const now=Date.now();return Object.keys(S.USERS).map(k=>parseDev(k,S.USERS[k])).sort((a,b)=>{const al=now-(a.u.t||0)<TTL?1:0,bl=now-(b.u.t||0)<TTL?1:0;return bl-al||(b.u.t||0)-(a.u.t||0)})};
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
 function downloadCsv(filename,rows){
  if(!rows||!rows.length){toast('Нет данных для выгрузки',true);return}
  const lng=window.getLang?window.getLang():'ru';
  const csvContent='\uFEFF'+rows.map(r=>r.map(v=>{
   let raw=v===null||v===undefined?'':String(v);
   if(lng!=='ru'&&raw&&typeof v==='string'&&window.i18nTranslateText)raw=window.i18nTranslateText(raw,lng);
   const s=raw.replace(/"/g,'""');
   return /[",\n\r;]/.test(s)?('"'+s+'"'):s;
  }).join(';')).join('\r\n');
  const blob=new Blob([csvContent],{type:'text/csv;charset=utf-8;'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(()=>{link.remove();URL.revokeObjectURL(link.href)},500);
  toast('Таблица Excel скачана');
 }
 function exportCrewMonthCsv(title,items,totQty,totSum){
  const data=[];
  let calcQty=0,calcSum=0;
  (items||[]).forEach(it=>{
   const cd=String((it&&it.code)||'').trim().toUpperCase();
   if(!cd)return;
   if(isSubAdm()&&cd==='ADMIN')return;
   const hasPeople=devs().some(d=>{
    if(String(d.u.car||'').toUpperCase()!==cd)return false;
    const acc=accByUid(d.id);
    return !((acc&&acc.blocked)||d.u.blocked);
   });
   if(!hasPeople)return;
   const q=+it.qty||0,s=+it.sum||0;
   calcQty+=q;calcSum+=s;
   data.push([cd,q,s]);
  });
  if(!data.length){toast('Нет данных для выгрузки',true);return}
  const header=['Экипаж','Количество (шт)','Сумма (֏)'];
  const totalRow=['ИТОГО',calcQty,calcSum];
  const fn=('EuroBaza_'+title.replace(/[\s\/:*?"<>|]+/g,'_')+'.csv');
  if(window.TableViewer){
   TableViewer.open({
    title:'Ведомость по экипажам · '+title.replace(/_/g,' '),
    filename:fn,
    headers:header,
    rows:data,
    totalRow:totalRow,
    mergeFirstCol:true
   });
   return;
  }
  downloadCsv(fn,[header,...data,totalRow]);
 }
 function exportCarDetailCsv(code,title,rows,totQty,totSum){
  const qMap={};
  (rows||[]).forEach(c=>{
   (c.items||[]).forEach(it=>{
    (it.parts||[]).forEach(z=>{
     const zn=z.l==='Район'?'2':'1';
     const k=c.name+'|'+it.name+'|'+zn;
     if(!qMap[k])qMap[k]={n:0,v:0};
     qMap[k].n+=(+z.n||0);
     qMap[k].v+=(+z.v||0);
    });
   });
  });

  const cleanTitle=String(title||'').replace(/_/g,' ').trim();
  const header=['Тариф (֏)','Товар / Категория','Кол-во','Сумма (֏)'];
  const data=[],rowTypes=[];
  let calcQty=0,calcSum=0;

  Adm.CAR_CATALOG.forEach(c=>{
   let catQ=0,catS=0;
   const subRows=[],subTypes=[];
   c.subs.forEach(x=>{
    const r1=qMap[c.name+'|'+x.name+'|1'];
    const n1=r1?r1.n:0,v1=r1?r1.v:0;
    catQ+=n1;catS+=v1;
    subRows.push([x.p1,nm(x.name),n1>0?n1:'',v1>0?v1:'—']);
    subTypes.push(n1>0?'hi':'');
    if(!x.one){
     const r2=qMap[c.name+'|'+x.name+'|2'];
     const n2=r2?r2.n:0,v2=r2?r2.v:0;
     catQ+=n2;catS+=v2;
     subRows.push([x.p2,nm(x.name)+' (Район)',n2>0?n2:'',v2>0?v2:'—']);
     subTypes.push(n2>0?'hi':'');
    }
   });
   calcQty+=catQ;calcSum+=catS;
   data.push(['',nm(c.name),catQ>0?catQ:'',catS>0?catS:'—']);
   rowTypes.push('cat');
   for(let i=0;i<subRows.length;i++){
    data.push(subRows[i]);
    rowTypes.push(subTypes[i]);
   }
  });

  const finalQty=totQty||calcQty,finalSum=totSum||calcSum;
  const totalRow=['','ИТОГО · Экипаж '+code,finalQty,finalSum];
  const fn=('EuroBaza_Экипаж_'+code+'_'+cleanTitle.replace(/[\s\/:*?"<>|]+/g,'_')+'.csv');
  if(window.TableViewer){
   TableViewer.open({
    title:'Экипаж '+code+' · '+cleanTitle,
    filename:fn,
    headers:header,
    rows:data,
    totalRow:totalRow,
    rowTypes:rowTypes
   });
   return;
  }
  downloadCsv(fn,[header,...data,totalRow]);
 }
 function copyReport(title,items,totQty,totSum){
  if(!items||!items.length){toast('Нет данных для копирования',true);return}
  const unitS=trAdm('шт');
  const lines=[trAdm('📋 Ведомость EuroBaza')+' — '+trAdm(title),''];
  items.forEach(it=>lines.push('• '+it.name+': '+fm(it.qty)+' '+unitS+' — '+money(it.sum)));
  lines.push('',trAdm('Итого')+': '+fm(totQty)+' '+unitS+' — '+money(totSum));
  const txt=lines.join('\n');
  if(navigator.clipboard&&navigator.clipboard.writeText){
   navigator.clipboard.writeText(txt).then(()=>toast('Ведомость скопирована')).catch(()=>toast('Не удалось скопировать',true));
  }else{toast('Буфер обмена недоступен',true)}
 }
 function detail(rows){
  if(!rows||!rows.length)return '<div class="mut">Пусто</div>';
  let totS=0,totQ=0,cityS=0,regS=0,oneS=0;
  rows.forEach(c=>(c.items||[]).forEach(it=>(it.parts||[]).forEach(z=>{
   const v=+z.v||0,n=+z.n||0;totS+=v;totQ+=n;
   if(z.l==='Район')regS+=v;else if(z.l==='Город')cityS+=v;else oneS+=v;
  })));
  const pCity=cityS>0?Math.max(1,Math.round(cityS*100/totS)):0,pReg=regS>0?Math.max(1,Math.round(regS*100/totS)):0,pOne=oneS>0?Math.max(1,100-pCity-pReg):0;
  let h='<div class="adm-sum">';
  if(totS>0&&((cityS>0&&regS>0)||oneS>0)){
   h+='<div class="sum-bar-w" style="margin-top:0;padding-top:0;border:none;margin-bottom:10px"><div class="sum-bar">'
    +(pCity?'<i style="width:'+pCity+'%;background:#38bdf8"></i>':'')
    +(pReg?'<i style="width:'+pReg+'%;background:#a78bfa"></i>':'')
    +(pOne?'<i style="width:'+pOne+'%;background:#34d399"></i>':'')
    +'</div><div class="sum-leg">'
    +(cityS?'<span><i style="background:#38bdf8"></i>Город '+pCity+'% ('+fm(cityS)+')</span>':'')
    +(regS?'<span><i style="background:#a78bfa"></i>Район '+pReg+'% ('+fm(regS)+')</span>':'')
    +(oneS?'<span><i style="background:#34d399"></i>Фикс '+pOne+'% ('+fm(oneS)+')</span>':'')
    +'</div></div>';
  }
  h+='<div class="sum-tools"><div class="sum-seg" data-aseg="1"><button type="button" class="on" data-f="all">Все</button><button type="button" data-f="Город">Город</button><button type="button" data-f="Район">Район</button><button type="button" data-f="Шт">Фикс</button></div>'
   +'<input class="sum-srch" data-asrch="1" type="search" placeholder="Поиск позиции..."></div>';
  h+=rows.map(c=>{
   const cq=(c.items||[]).reduce((a,it)=>a+(it.parts||[]).reduce((b,z)=>b+(+z.n||0),0),0);
   const pct=totS?Math.round((+c.sum||0)*100/totS):0;
   const body=(c.items||[]).map(it=>'<div class="sum-it" data-name="'+esc(nm(it.name).toLowerCase())+'"><div class="sum-it-t">'+esc(nm(it.name))+'</div>'
    +(it.parts||[]).map(z=>{
     const cls=z.l==='Район'?'reg':(z.l?'city':'one');
     return '<div class="sum-r" data-zone="'+esc(z.l||'Шт')+'" data-q="'+(+z.n||0)+'" data-v="'+(+z.v||0)+'"><span class="tg '+cls+'">'+esc(z.l||'Шт')+'</span><span class="sum-f"><b>'+fm(z.n)+'</b> × '+fm(z.p)+' '+CUR+'</span><b class="sum-v">'+money(z.v)+'</b></div>';
    }).join('')+'</div>').join('');
   return '<div class="sum-cat"><div class="sum-cat-h" data-atog="1"><div class="sum-cat-l"><span class="sum-chv">▸</span><div><div class="sum-cat-n">'+esc(nm(c.name))+'</div><div class="sum-cat-s">'+fm(cq)+' шт · '+pct+'% от суммы</div></div></div><div class="sum-cat-r">'+money(c.sum)+'</div></div><div class="sum-cat-b">'+body+'</div></div>';
  }).join('')+'</div>';
  return h;
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
   const onKey = e => { if(e.key === "Escape"){ e.preventDefault(); e.stopImmediatePropagation(); close(isInput ? null : false); } };

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

 
 

 Object.assign(Adm, {
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
 });
})();
