// EuroBaza: административная панель (вход через Firebase Auth, чтение users, labels, config)
(function(){
 'use strict';
 const g=id=>document.getElementById(id);
 const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const CUR='֏',TTL=75000;
 const admLoc=()=>{const l=window.getLang?window.getLang():'ru';return l==='hy'?'hy-AM':l==='en'?'en-GB':'ru-RU'};
 const trAdm=s=>(window.i18nTranslateText?window.i18nTranslateText(s):s);
 const fm=n=>(Math.round((+n||0)*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const money=n=>fm(n)+' '+CUR;
 const MN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
 const RU={'Այլ':'Другое','Աթոռ, դարակաշար':'Стулья, стеллажи','Աթոռ սեղաններ':'Стулья, столы','Լվացարան':'Раковина','Կոմոդներ':'Комоды','Մահճակալ':'Кровать','Մոդուլներ':'Модули','Ներքնակներ':'Матрасы','Պահոցներ':'Системы хранения','դուռ':'Дверь','Պուֆիկներ':'Пуфы','Տումբաներ':'Тумбы','Բազմոցներ':'Диваны','Բազկաթոռ':'Кресло','Բազմոց':'Диван','Հավաքածու':'Комплект','Ընդունարան':'Ресепшен','Խոհանոցներ':'Кухни','Հյուրասրահ':'Гостиная','Ննջասենյակներ':'Спальни','Պահարաններ':'Шкафы','Մինչև 1,6':'До 1,6','1,6 ից ավել':'Более 1,6','1,6 մ':'1,6 м','2-3 մ':'2–3 м','մինչև 1,7':'До 1,7','1,7 ից ավել':'Более 1,7','Էքսկլ.':'Эксклюзив','2 դուռ':'2 двери','3 դուռ':'3 двери','3 դուռ առանց կոմոդ':'3 двери без комода','3 դուռ կոմոդով':'3 двери с комодом','4 դուռ':'4 двери','5 դուռ':'5 дверей','6 դուռ':'6 дверей'};
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

 const DEFAULT_CREWS=[
  {code:'BB',off:1,note:''},{code:'CC',off:2,note:''},{code:'VV',off:3,note:''},{code:'RR',off:4,note:''},
  {code:'EE',off:5,note:''},{code:'GG',off:6,note:''},{code:'XX',off:0,note:''},{code:'ZZ',off:0,note:''}
 ];
 let CARS_LIST=DEFAULT_CREWS.map(x=>x.code);
 const CREW_OFF={BB:1,CC:2,VV:3,RR:4,EE:5,GG:6,XX:0,ZZ:0};
 let CREWS_META=DEFAULT_CREWS.reduce((m,x)=>{m[x.code]={off:x.off,note:x.note};return m},{});
 const CREW_OFF_LBL={BB:'Пн',CC:'Вт',VV:'Ср',RR:'Чт',EE:'Пт',GG:'Сб',XX:'Вс',ZZ:'Вс'};
 const WD_SHORT=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
 window._crewsSet=new Set([...CARS_LIST,'ADMIN']);
 function isValidCrewCode(code){
  return /^(?=.*[A-Z])[A-Z0-9]{2,6}$/.test(code)&&code!=='ADMIN'&&code!=='ALL'&&code!=='__CREWS';
 }
 function syncCrewsFromLabels(){
  const cfg=LABELS&&LABELS.__crews;
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
  CARS_LIST=items.map(x=>x.code);
  const meta={};
  items.forEach(x=>{meta[x.code]={off:x.off,note:x.note}});
  CREWS_META=meta;
  window._crewsSet=new Set([...CARS_LIST,'ADMIN']);
  if(SEL!=='all'&&!getCarsList().includes(SEL))SEL='all';
  if(ONL_CAR!=='all'&&ONL_CAR!=='none'&&ONL_CAR!=='ADMIN'&&!CARS_LIST.includes(ONL_CAR))ONL_CAR='all';
 }
 function getCrewsConfigList(){
  return CARS_LIST.map(cd=>({
   code:cd,
   off:getCrewDefOff(cd),
   note:(CREWS_META[cd]&&CREWS_META[cd].note)||''
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
  if(CREWS_META[code]&&typeof CREWS_META[code].off==='number')return CREWS_META[code].off;
  return CREW_OFF[code]!==undefined?CREW_OFF[code]:-1;
 }
 function getCrewOff(code){
  if(!code)return -1;
  const custom=ATT&&ATT.crewOff&&ATT.crewOff[code];
  if(typeof custom==='number'&&custom>=-1&&custom<=6)return custom;
  return getCrewDefOff(code);
 }
 function getCrewOffLbl(code){
  const wd=getCrewOff(code);
  return wd>=0&&wd<=6?WD_SHORT[wd]:'';
 }
const getCarsList=()=>isSubAdm()?CARS_LIST:[...CARS_LIST,'ADMIN'];
 let USERS={},LABELS={},ACCOUNTS={},CARS={},OCR_PEND={},OCR_MAP={},OCR_Q='',CHAT=[],CHAT_OPEN=false,DMS={},DM_UID=null,DM_TAB='adm',FU=0,PUB=undefined,TAB='online',SEL='all',ONL_CAR='all',ONL_Q='';
 let ATT={},ATT_ERR=false,ATT_SCROLLED_YM='',ATT_YM=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')})();
 let SUB_LOG=[],SUB_LOG_ERR=false,SUB_LOG_OPEN=false,SUB_LOG_CAT='all',SUB_LOG_Q='',SUB_LOG_PREV_SEEN=0,_subLoginLogged=false;
 const SUB_LOG_SEEN_KEY='ADM_SUBLOG_SEEN';
 const subLogSeen=()=>{try{return +(localStorage.getItem(SUB_LOG_SEEN_KEY)||0)||0}catch(e){return 0}};
 const subLogUnread=()=>{if(isSubAdm()||!SUB_LOG.length)return 0;const s=subLogSeen();return SUB_LOG.filter(x=>(+x.t||0)>s).length};
 function updSubLogBdg(){
  const b=g('admMenuBdg');if(!b)return;
  if(isSubAdm()){b.hidden=true;return}
  const n=subLogUnread();
  b.hidden=!n;b.textContent=n>99?'99+':String(n);
 }
 function markSubLogSeen(){
  if(isSubAdm())return;
  const mx=SUB_LOG.length?Math.max.apply(null,SUB_LOG.map(x=>+x.t||0)):Date.now();
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
 const OCR_CAT_NAMES={'other_a':'Другое · Стулья, стеллажи','other_b':'Другое · Стулья, столы','other_c':'Другое · Раковина','other_d':'Другое · Комоды','other_e':'Другое · Кровать','other_f':'Другое · Модули','other_g':'Другое · Матрасы','other_h':'Другое · Системы хранения','other_i':'Другое · Дверь','other_j':'Другое · Пуфы','other_k':'Другое · Тумбы','sofas_a':'Диваны · Кресло','sofas_b':'Диваны · Диван','sofas_c':'Диваны · Комплект','recep_a':'Ресепшен · До 1,6 м','recep_b':'Ресепшен · Более 1,6 м','kitchen_a':'Кухни · 1,6 м','kitchen_b':'Кухни · 2–3 м','living_a':'Гостиная · До 1,7 м','living_b':'Гостиная · Более 1,7 м','living_c':'Гостиная · Эксклюзив','bedroom_a':'Спальни · 2 двери','bedroom_b':'Спальни · 3 двери без комода','bedroom_c':'Спальни · 3 двери с комодом','bedroom_d':'Спальни · 4 двери','bedroom_e':'Спальни · 5 дверей','bedroom_f':'Спальни · 6 дверей','bedroom_g':'Спальни · 0,9*2','wardrobe_a':'Шкафы · 2 двери','wardrobe_b':'Шкафы · 3 двери','wardrobe_c':'Шкафы · 4 двери','wardrobe_d':'Шкафы · 5 дверей','wardrobe_e':'Шкафы · 6 дверей'};
 const SUB_EMAIL='diannakirakosyan@gmail.com';
 const isSubAdm=()=>((auth.currentUser&&auth.currentUser.email)||'').toLowerCase()===SUB_EMAIL;
 const admRawName=()=>isSubAdm()?'Доставка':'Админ';
 const admTag=()=>isSubAdm()?'delivery':'admin';
 const OPEN={};
 let offs=[],tick=null,_tt=null;

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
   USERS=v||{};showErr('');
   const cSig=calcUsersCrewSig(USERS);
   const crewChanged=cSig!==_lastUsersCrewSig;
   _lastUsersCrewSig=cSig;
   updOcrTabBdg();
   if(TAB==='online')scheduleDraw(250);
   else if(TAB==='map'){if(!isSubAdm())scheduleDraw(350)}
   else if(TAB==='ocr'){scheduleDraw(200)}
   else if(TAB==='att'){if(crewChanged)scheduleDraw(200)}
   else if(TAB==='totals'){if(crewChanged)scheduleDraw(200)}
   else if(TAB==='ver'){scheduleDraw(400)}
   if(crewChanged)refreshCrewsMgr();
  });
  listen('cars',v=>{CARS=v||{};scheduleDraw(120);refreshCrewsMgr()});
  listen('labels',v=>{LABELS=v||{};syncCrewsFromLabels();scheduleDraw(120);refreshCrewsMgr()});
  if(!isSubAdm()){
   listen('accounts',v=>{ACCOUNTS=v||{};scheduleDraw(120)});
  }else{
   ACCOUNTS={};
  }
  listen('dm',onDmSnap);
  listen('config/forceUpdate',v=>{FU=+v||0;if(TAB==='ver')scheduleDraw(120)});
  listen('config/ocrMap',v=>{OCR_MAP=v||{};updOcrTabBdg();if(TAB==='ocr')scheduleDraw(120)});
  {
   const attRef=db.ref('attendance');
   const attFn=attRef.on('value',s=>{ATT=s.val()||{};ATT_ERR=false;if(TAB==='att')scheduleDraw(120);refreshCrewsMgr()},e=>{ATT_ERR=true;if(window._admPushErr)window._admPushErr('FB_DENIED','attendance: '+((e&&e.message)||e));if(TAB==='att')scheduleDraw(120)});
   offs.push(()=>attRef.off('value',attFn));
  }
  if(!isSubAdm()){
   const slRef=db.ref('subadminLog');
   const slFn=slRef.on('value',s=>{
    SUB_LOG_ERR=false;
    const obj=s.val()||{};
    const all=Object.keys(obj).map(k=>Object.assign({k:k},obj[k])).sort((a,b)=>(+b.t||0)-(+a.t||0));
    if(all.length>300){
     SUB_LOG=all.slice(0,300);
     if(Date.now()-_lastSlPrune>10000){
      _lastSlPrune=Date.now();
      const del={};all.slice(300).forEach(x=>{del[x.k]=null});
      db.ref('subadminLog').update(del).catch(()=>{});
     }
    }else{
     SUB_LOG=all;
    }
    if(SUB_LOG_OPEN&&!document.hidden){
     renderSubLog();
     markSubLogSeen();
    }else{
     updSubLogBdg();
    }
   },e=>{
    SUB_LOG_ERR=true;
    SUB_LOG=[];
    if(window._admPushErr)window._admPushErr('FB_DENIED','subadminLog: '+((e&&e.message)||e));
    updSubLogBdg();
    if(SUB_LOG_OPEN)renderSubLog();
   });
   offs.push(()=>slRef.off('value',slFn));
  }else{
   SUB_LOG=[];SUB_LOG_ERR=false;updSubLogBdg();
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
   if(_admChatInit){
    const fresh=list.filter(m=>(+m.t||0)>_admLastNotifT&&!m.adm);
    if(fresh.length){
     const lm=fresh[fresh.length-1];
     _admLastNotifT=+lm.t||Date.now();
     localStorage.setItem('ADM_CHAT_NOTIF_T',String(_admLastNotifT));
     if(!CHAT_OPEN||document.hidden)admNotify((lm.name||'Водитель'),String(lm.txt||'').slice(0,140));
    }
   }else if(list.length){
    const mx=Math.max.apply(null,list.map(m=>+m.t||0));
    if(mx>_admLastNotifT){_admLastNotifT=mx;localStorage.setItem('ADM_CHAT_NOTIF_T',String(_admLastNotifT))}
   }
   _admChatInit=true;CHAT=list;
   if(CHAT_OPEN&&!document.hidden){markAdmChatSeen();renderAdmChat()}else updAdmChatBdg();
  });
  loadPub();
  tick=setInterval(()=>{if(document.hidden)return;if(TAB==='online'||TAB==='ver'||(TAB==='map'&&!isSubAdm()))draw()},15000);
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
 const dispHtml=d=>{const lb=LABELS[d.id],pr=profName(d);return lb&&pr&&lb!==pr?'<span data-no-i18n="1">'+esc(lb)+'</span> <span style="font-size:12px;font-weight:500;color:#94a3b8">(<span>в профиле:</span> <span data-no-i18n="1">'+esc(pr)+'</span>)</span>':'<span data-no-i18n="1">'+esc(lb||pr||devName(d.u.ua))+'</span>'};
 const devs=()=>{const now=Date.now();return Object.keys(USERS).map(k=>parseDev(k,USERS[k])).sort((a,b)=>{const al=now-(a.u.t||0)<TTL?1:0,bl=now-(b.u.t||0)<TTL?1:0;return bl-al||(b.u.t||0)-(a.u.t||0)})};
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

  CAR_CATALOG.forEach(c=>{
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
 // ===== Живая карта водителей =====
 const BASE_PT={lat:40.120847,lon:44.514271,name:"База EuroBaza (Арин Берд 7)"};
 const ADM_CDNS=[{css:"https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css",js:"https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"},{css:"https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css",js:"https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"}];
 const ADM_SAT_URL="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
 let _lfProm=null,_map=null,_markers={},_baseMk=null,_didFit=false,MAP_ONLY_ONLINE=true,_applyAdmSat=null;
 let _subMk=null,_subFit=null,_subRouteTok=0,_subCurPt=null,_subHist=[],_mapRO=null;
 let ADM_SAT=(()=>{try{return localStorage.getItem("ADM_MAP_SAT")!=="0"}catch(e){return true}})();
 function ensureLeaflet(){
  if(window.maplibregl&&maplibregl.Map)return Promise.resolve();
  if(_lfProm)return _lfProm;
  _lfProm=new Promise((res,rej)=>{let idx=0;const go=()=>{const s0=ADM_CDNS[idx],c=document.createElement("link");c.rel="stylesheet";c.href=s0.css;document.head.appendChild(c);const s=document.createElement("script");s.src=s0.js;s.onload=()=>{if(window.maplibregl&&maplibregl.Map)res();else fail()};const fail=()=>{s.remove();c.remove();idx++;if(idx<ADM_CDNS.length)go();else{_lfProm=null;rej(new Error("Ошибка загрузки MapLibre"))}};s.onerror=fail;document.head.appendChild(s)};go()});
  return _lfProm;
 }
 let _mapTok=0;
function destroyMap(){_mapTok++;if(_mapRO){try{_mapRO.disconnect()}catch(e){}_mapRO=null}if(_map){try{_map.remove()}catch(e){}_map=null}_markers={};_baseMk=null;_subMk=null;_subFit=null;_subRouteTok++;_didFit=false;_applyAdmSat=null}
 function fitAllDrivers(){
  if(!_map||!window.maplibregl)return;
  const now=Date.now(),baseLL=[BASE_PT.lon,BASE_PT.lat],pts=[baseLL];
  devs().forEach(d=>{if(typeof d.u.lat!=="number"||typeof d.u.lon!=="number")return;if(MAP_ONLY_ONLINE&&!(now-(d.u.t||0)<TTL))return;pts.push([d.u.lon,d.u.lat])});
  if(pts.length===1)_map.easeTo({center:baseLL,zoom:13,duration:300});
  else{const b=new maplibregl.LngLatBounds();pts.forEach(p=>b.extend(p));_map.fitBounds(b,{padding:44,maxZoom:15,duration:350})}
 }
 function syncMapMarkers(){
  if(!_map||!window.maplibregl)return;
  const now=Date.now(),seen={};
  devs().forEach(d=>{
   if(typeof d.u.lat!=="number"||typeof d.u.lon!=="number")return;
   const live=now-(d.u.t||0)<TTL;if(MAP_ONLY_ONLINE&&!live)return;
   seen[d.id]=true;
   const title=dispName(d),spd=typeof d.u.spd==="number"&&d.u.spd>2?" · "+d.u.spd+" км/ч":"";
   const popHtml='<div class="pop-t" data-no-i18n="1">'+esc(title)+'</div><div class="pop-s">'+(live?"🟢 В сети":"⚪ Был(а) "+ago(d.u.gt||d.u.t))+esc(spd)+'</div>';
   const htmlPin='<div class="drv-b'+(live?"":" off")+'"><i></i><span data-no-i18n="1">'+esc(title)+'</span></div>';
   if(_markers[d.id]){
    _markers[d.id].setLngLat([d.u.lon,d.u.lat]);
    const el=_markers[d.id].getElement();if(el)el.innerHTML=htmlPin;
    if(_markers[d.id].getPopup())_markers[d.id].getPopup().setHTML(popHtml);
   }else{
    const el=document.createElement("div");el.className="drv-pin";el.innerHTML=htmlPin;
    _markers[d.id]=new maplibregl.Marker({element:el,anchor:"center"}).setLngLat([d.u.lon,d.u.lat]).setPopup(new maplibregl.Popup({offset:18}).setHTML(popHtml)).addTo(_map);
   }
  });
  Object.keys(_markers).forEach(id=>{if(!seen[id]){_markers[id].remove();delete _markers[id]}});
  if(!_didFit){_didFit=true;fitAllDrivers()}
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
   if(!_subHist.length){el.innerHTML='';return}
   el.innerHTML='<div class="sec">Недавние проверки</div>'+_subHist.map((it,idx)=>
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
   _subCurPt=null;
   _subFit=null;
   _subRouteTok++;
   if(_subMk){try{_subMk.remove()}catch(e){}_subMk=null}
   if(_map&&_map.getSource('sub-route-src')){
    _map.getSource('sub-route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:[]}});
    if(_map.getLayer('sub-route-dash'))_map.setLayoutProperty('sub-route-dash','visibility','none');
    if(_map.getLayer('sub-route-solid'))_map.setLayoutProperty('sub-route-solid','visibility','none');
   }
   if(_map)_map.easeTo({center:[44.515,40.181],zoom:12.2,duration:300});
   const inp=g('subMapInp'),clr=g('subMapClr');
   if(inp)inp.value='';
   if(clr)clr.hidden=true;
   renderSubRes(null,null);
  };
  window._subClearPt=clearSubPoint;
  window._subRenderHist=renderSubHist;
  const showSubPoint=(pt,saveHist)=>{
   if(!_map||!window.maplibregl)return;
   const zone=window.ZoneService&&ZoneService.getZone?ZoneService.getZone(pt.lat,pt.lon):(typeof inKentron==='function'&&inKentron(pt.lat,pt.lon)?'kentron':null);
   const inK=!!zone;
   const item={name:cleanLbl(pt.name)||(pt.lat.toFixed(5)+', '+pt.lon.toFixed(5)),lat:pt.lat,lon:pt.lon,exact:pt.exact!==false,inK:inK,zone:zone,km:'',tm:''};
   _subCurPt=item;
   if(_subMk){try{_subMk.remove()}catch(e){}_subMk=null}
   const mel=document.createElement('div');
   mel.className='subm-mk '+(item.exact?(inK?'eve':'day'):'bad');
   mel.textContent=inK?'🌙':'☀️';
   const popHtml='<div class="pop-t" data-no-i18n="1">'+esc(item.name)+'</div><div class="pop-s">'+(inK?'🌙 Только вечером (после 21:00)':'☀️ Можно ставить днём')+'</div>';
   _subMk=new maplibregl.Marker({element:mel,anchor:'center'}).setLngLat([item.lon,item.lat]).setPopup(new maplibregl.Popup({offset:18}).setHTML(popHtml)).addTo(_map);

   const baseLL=[BASE_PT.lon,BASE_PT.lat],ptLL=[item.lon,item.lat];
   const straight=[baseLL,ptLL];
   if(_map.getSource('sub-route-src')){
    _map.getSource('sub-route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:straight}});
    if(_map.getLayer('sub-route-dash'))_map.setLayoutProperty('sub-route-dash','visibility','visible');
    if(_map.getLayer('sub-route-solid'))_map.setLayoutProperty('sub-route-solid','visibility','none');
   }
   _subFit=()=>{
    if(!_map)return;
    const b=new maplibregl.LngLatBounds();b.extend(baseLL);b.extend(ptLL);
    _map.fitBounds(b,{padding:48,maxZoom:15,duration:350});
   };
   _subFit();

   const approxKm=Math.max(1,Math.round(Math.hypot((item.lat-BASE_PT.lat)*111,(item.lon-BASE_PT.lon)*85)*1.25));
   item.km='~'+approxKm+' км';
   renderSubRes(item,{km:item.km,tm:'…'});
   if(saveHist){
    const idx=_subHist.findIndex(x=>x.name===item.name);
    if(idx>=0)_subHist.splice(idx,1);
    _subHist.unshift(item);
    if(_subHist.length>6)_subHist.pop();
    renderSubHist();
   }

   const tok=++_subRouteTok;
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
    if(tok!==_subRouteTok||!_map||TAB!=='map')return;
    const rc=r0.geometry&&r0.geometry.coordinates;
    if(!rc||!rc.length)return;
    if(_map.getSource('sub-route-src')){
     _map.getSource('sub-route-src').setData({type:'Feature',geometry:{type:'LineString',coordinates:rc}});
     if(_map.getLayer('sub-route-dash'))_map.setLayoutProperty('sub-route-dash','visibility','none');
     if(_map.getLayer('sub-route-solid'))_map.setLayoutProperty('sub-route-solid','visibility','visible');
    }
    item.km=Math.max(1,Math.round((r0.distance||0)/1000))+' км';
    item.tm=fmtMin(r0.duration||0);
    renderSubRes(item,{km:item.km,tm:item.tm});
    renderSubHist();
   }).catch(()=>{
    if(tok!==_subRouteTok||TAB!=='map')return;
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

   renderSubRes(_subCurPt,_subCurPt?{km:_subCurPt.km,tm:_subCurPt.tm}:null);
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
      if(!l.length){toast('Адрес не найден',true);renderSubRes(_subCurPt,_subCurPt?{km:_subCurPt.km,tm:_subCurPt.tm}:null);return}
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
    if(!l.length){toast('Адрес не найден',true);renderSubRes(_subCurPt,_subCurPt?{km:_subCurPt.km,tm:_subCurPt.tm}:null);return}
    if(l.length===1&&l[0].exact){await resolveAndShow(l[0]);return}
    showSugs(l);
    renderSubRes(_subCurPt,_subCurPt?{km:_subCurPt.km,tm:_subCurPt.tm}:null);
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
    const mTok=++_mapTok;
    await ensureLeaflet();if(mTok!==_mapTok||TAB!=='map'||!g('admMap'))return;
    if(_mapRO){try{_mapRO.disconnect()}catch(e){}_mapRO=null}
    if(_map){try{_map.remove()}catch(e){}_map=null}
    const kentronCenter=[44.515,40.181];
    const baseLL=[BASE_PT.lon,BASE_PT.lat];
    _map=new maplibregl.Map({container:'admMap',style:'https://tiles.openfreemap.org/styles/dark',center:kentronCenter,zoom:12.2,attributionControl:false});
    _map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),'top-left');
    const bel=document.createElement('div');bel.className='drv-pin';bel.innerHTML='<div class="drv-b base"><i></i><span>База EuroBaza</span></div>';
    _baseMk=new maplibregl.Marker({element:bel,anchor:'center'}).setLngLat(baseLL).setPopup(new maplibregl.Popup({offset:18}).setHTML('<div class="pop-t">🏁 '+esc(BASE_PT.name)+'</div>')).addTo(_map);

    let sr=false,fc=0,om=[],hs=false;
    const own=new Set(['adm-sat-layer','kentron-fill','kentron-line','saralanj-glow','saralanj-line','sub-route-glow','sub-route-dash','sub-route-solid']);
    const boostAdmLabels=sat=>{
     if(!_map)return;
     const tc=sat?'#ffffff':'#f1f5f9',hc=sat?'#000000':'#0f172a',hw=sat?2:1.2;
     const hyExpr=['coalesce',['get','name:hy'],['get','name:arm'],['get','name:nonlatin'],['get','name'],['get','name_en']];
     om.forEach(l=>{
      if(l.type!=='symbol'||!_map.getLayer(l.id))return;
      try{
       if(_map.getLayoutProperty(l.id,'text-field')!==undefined)_map.setLayoutProperty(l.id,'text-field',hyExpr);
       if(_map.getPaintProperty(l.id,'text-color')!==undefined){
        _map.setPaintProperty(l.id,'text-color',tc);
        _map.setPaintProperty(l.id,'text-halo-color',hc);
        _map.setPaintProperty(l.id,'text-halo-width',hw);
        _map.setPaintProperty(l.id,'text-halo-blur',0.5);
       }
      }catch(e){}
     });
    };
    _applyAdmSat=sat=>{
     if(!_map||!_map.getLayer('adm-sat-layer'))return;
     _map.setLayoutProperty('adm-sat-layer','visibility',sat?'visible':'none');
     om.forEach(l=>{if(!_map.getLayer(l.id))return;let v=l.vis;if(sat)v=(l.type==='symbol'||(l.type==='line'&&/admin|boundary/i.test(l.id)))?l.vis:'none';try{_map.setLayoutProperty(l.id,'visibility',v)}catch(e){}});
     boostAdmLabels(sat);
    };
    _map.on('style.load',()=>{
     if(!_map)return;sr=true;const st=_map.getStyle(),ls=(st&&st.layers)?st.layers.slice():[];
     om=ls.filter(l=>!own.has(l.id)).map(l=>({id:l.id,type:l.type,vis:(l.layout&&l.layout.visibility)||'visible'}));
     const sym=ls.find(l=>l.type==='symbol'),fid=sym?sym.id:undefined;hs=!!fid;
     if(!_map.getSource('adm-sat-src')){_map.addSource('adm-sat-src',{type:'raster',tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18});_map.addLayer({id:'adm-sat-layer',type:'raster',source:'adm-sat-src',layout:{visibility:ADM_SAT?'visible':'none'}},fid)}
     if(typeof KENTRON_POLY!=='undefined'&&!_map.getSource('kentron-src')){
      const ring=KENTRON_POLY.map(p=>[p[1],p[0]]);ring.push(ring[0]);
      _map.addSource('kentron-src',{type:'geojson',data:{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]}}});
      _map.addLayer({id:'kentron-fill',type:'fill',source:'kentron-src',paint:{'fill-color':'#ef4444','fill-opacity':0.2}},fid);
      _map.addLayer({id:'kentron-line',type:'line',source:'kentron-src',paint:{'line-color':'#ef4444','line-width':2.4,'line-dasharray':[3,3]}},fid);
     }
     if(typeof SARALANJ_LINE!=='undefined'&&SARALANJ_LINE.length>1&&!_map.getSource('saralanj-src')){
      const sLine=SARALANJ_LINE.map(p=>[p[1],p[0]]);
      _map.addSource('saralanj-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:sLine}}});
      _map.addLayer({id:'saralanj-glow',type:'line',source:'saralanj-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ef4444','line-width':14,'line-opacity':0.28}},fid);
      _map.addLayer({id:'saralanj-line',type:'line',source:'saralanj-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ef4444','line-width':3.2,'line-dasharray':[3,2]}},fid);
     }
     if(!_map.getSource('sub-route-src')){
      _map.addSource('sub-route-src',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:[]}}});
      _map.addLayer({id:'sub-route-glow',type:'line',source:'sub-route-src',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#0284c7','line-width':10,'line-opacity':0.42}},fid);
      _map.addLayer({id:'sub-route-dash',type:'line',source:'sub-route-src',layout:{'line-cap':'round','line-join':'round',visibility:'none'},paint:{'line-color':'#38bdf8','line-width':4.5,'line-opacity':0.98,'line-dasharray':[2,2]}},fid);
      _map.addLayer({id:'sub-route-solid',type:'line',source:'sub-route-src',layout:{'line-cap':'round','line-join':'round',visibility:'none'},paint:{'line-color':'#38bdf8','line-width':4.5,'line-opacity':1}},fid);
     }
     _applyAdmSat(hs?ADM_SAT:true);
     if(_subCurPt)showSubPoint(_subCurPt,false);
    });
    _map.on('click',ev=>{
     if(!ev||!ev.lngLat)return;
     if(ev.originalEvent&&ev.originalEvent.target&&ev.originalEvent.target.closest('.maplibregl-marker,.maplibregl-popup'))return;
     const lat=ev.lngLat.lat,lon=ev.lngLat.lng;
     showSubPoint({name:lat.toFixed(5)+', '+lon.toFixed(5),lat:lat,lon:lon,exact:true},true);
    });
    _map.on('error',ev=>{if(ev&&ev.sourceId==='adm-sat-src')return;if(!sr&&_map){fc++;try{if(fc===1)_map.setStyle('https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json');else if(fc===2)_map.setStyle({version:8,sources:{'adm-sat-src':{type:'raster',tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18}},layers:[{id:'adm-sat-layer',type:'raster',source:'adm-sat-src'}]})}catch(e){}}});
    if(typeof ResizeObserver!=='undefined'&&g('admMap')){_mapRO=new ResizeObserver(()=>{if(_map)_map.resize()});_mapRO.observe(g('admMap'))}
    setTimeout(()=>{if(_map)_map.resize()},80);setTimeout(()=>{if(_map)_map.resize()},350);
   }catch(e){if(g('subMapRes'))g('subMapRes').innerHTML='<div class="box mut">Ошибка карты: '+esc((e&&e.message)||e)+'</div>';return}
  }
  const sBtn=g('admSatBtn');if(sBtn){sBtn.classList.toggle('on',ADM_SAT);sBtn.textContent=ADM_SAT?'🛰️ Спутник':'🗺️ Схема'}
 }

 async function drawMap(){
  if(isSubAdm()){return drawSubMap()}
  const Llist=devs(),now=Date.now();
  const withGeo=Llist.filter(d=>typeof d.u.lat==="number"&&typeof d.u.lon==="number"&&(!MAP_ONLY_ONLINE||(now-(d.u.t||0)<TTL)));
  if(!g("admMap")){
   g("view").innerHTML='<div class="map-wrap"><div id="admMap"></div><div class="map-bar"><button type="button" id="admSatBtn" class="map-btn" data-act="mapsat"></button><button type="button" id="mapFilterBtn" class="map-btn" data-act="mapfilter">⚪ Все водители</button></div></div><div id="mapCards"></div>';
   try{
    const mTok=++_mapTok;
    await ensureLeaflet();if(mTok!==_mapTok||TAB!=="map"||!g("admMap"))return;
    if(_mapRO){try{_mapRO.disconnect()}catch(e){}_mapRO=null}
    if(_map){try{_map.remove()}catch(e){}_map=null}
    const baseLL=[BASE_PT.lon,BASE_PT.lat];
    _map=new maplibregl.Map({container:"admMap",style:"https://tiles.openfreemap.org/styles/dark",center:baseLL,zoom:12,attributionControl:false});
    _map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true}),"top-left");
    const bel=document.createElement("div");bel.className="drv-pin";bel.innerHTML='<div class="drv-b base"><i></i><span>База EuroBaza</span></div>';
    _baseMk=new maplibregl.Marker({element:bel,anchor:"center"}).setLngLat(baseLL).setPopup(new maplibregl.Popup({offset:18}).setHTML('<div class="pop-t">🏁 '+esc(BASE_PT.name)+'</div>')).addTo(_map);
    let sr=false,fc=0,om=[],hs=false;
    const boostAdmLabels=sat=>{
     if(!_map)return;
     const tc=sat?"#ffffff":"#f1f5f9";
     const hc=sat?"#000000":"#0f172a";
     const hw=sat?2:1.2;
     const hyExpr=["coalesce",["get","name:hy"],["get","name:arm"],["get","name:nonlatin"],["get","name"],["get","name_en"]];
     om.forEach(l=>{
      if(l.type!=="symbol"||!_map.getLayer(l.id))return;
      try{
       if(_map.getLayoutProperty(l.id,"text-field")!==undefined){
        _map.setLayoutProperty(l.id,"text-field",hyExpr);
       }
       if(_map.getPaintProperty(l.id,"text-color")!==undefined){
        _map.setPaintProperty(l.id,"text-color",tc);
        _map.setPaintProperty(l.id,"text-halo-color",hc);
        _map.setPaintProperty(l.id,"text-halo-width",hw);
        _map.setPaintProperty(l.id,"text-halo-blur",0.5);
       }
      }catch(e){}
     });
    };
    _applyAdmSat=sat=>{
     if(!_map||!_map.getLayer("adm-sat-layer"))return;
     _map.setLayoutProperty("adm-sat-layer","visibility",sat?"visible":"none");
     om.forEach(l=>{if(!_map.getLayer(l.id))return;let v=l.vis;if(sat)v=(l.type==="symbol"||(l.type==="line"&&/admin|boundary/i.test(l.id)))?l.vis:"none";try{_map.setLayoutProperty(l.id,"visibility",v)}catch(e){}});
     boostAdmLabels(sat);
    };
    _map.on("style.load",()=>{
     if(!_map)return;sr=true;const st=_map.getStyle(),ls=(st&&st.layers)?st.layers.slice():[];
     om=ls.filter(l=>l.id!=="adm-sat-layer").map(l=>({id:l.id,type:l.type,vis:(l.layout&&l.layout.visibility)||"visible"}));
     const sym=ls.find(l=>l.type==="symbol"),fid=sym?sym.id:undefined;hs=!!fid;
     if(!_map.getSource("adm-sat-src")){_map.addSource("adm-sat-src",{type:"raster",tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18});_map.addLayer({id:"adm-sat-layer",type:"raster",source:"adm-sat-src",layout:{visibility:ADM_SAT?"visible":"none"}},fid)}
     _applyAdmSat(hs?ADM_SAT:true);
    });
    _map.on("error",ev=>{if(ev&&ev.sourceId==="adm-sat-src")return;if(!sr&&_map){fc++;try{if(fc===1)_map.setStyle("https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json");else if(fc===2)_map.setStyle({version:8,sources:{"adm-sat-src":{type:"raster",tiles:[ADM_SAT_URL],tileSize:256,maxzoom:18}},layers:[{id:"adm-sat-layer",type:"raster",source:"adm-sat-src"}]})}catch(e){}}});
    setTimeout(()=>{if(_map)_map.resize()},80);setTimeout(()=>{if(_map)_map.resize()},350);
   }catch(e){if(g("mapCards"))g("mapCards").innerHTML='<div class="box mut">Ошибка карты: '+esc((e&&e.message)||e)+'</div>';return}
  }
  const sBtn=g("admSatBtn");if(sBtn){sBtn.classList.toggle("on",ADM_SAT);sBtn.textContent=ADM_SAT?"🛰️ Спутник":"🗺️ Схема"}
  const fBtn=g("mapFilterBtn");if(fBtn){fBtn.classList.toggle("on",MAP_ONLY_ONLINE);fBtn.textContent=MAP_ONLY_ONLINE?"🟢 Только онлайн":"⚪ Все водители"}
  try{syncMapMarkers()}catch(e){}
  let ch='<div class="sec">'+(MAP_ONLY_ONLINE?'Сейчас на линии (':'На карте (')+withGeo.length+')</div>';
  if(!withGeo.length)ch+='<div class="box mut">'+(MAP_ONLY_ONLINE?'Сейчас нет водителей в сети с активной геолокацией.':'Пока ни одно устройство не передало координаты.')+'</div>';
  else ch+=withGeo.map(d=>{const live=now-(d.u.t||0)<TTL,spd=typeof d.u.spd==="number"&&d.u.spd>2?" · "+d.u.spd+" км/ч":"";return'<div class="row" data-act="focus" data-id="'+esc(d.id)+'"><span class="dot'+(live?" on":"")+'"></span><div class="rm"><div class="rt" data-no-i18n="1">'+esc(dispName(d))+'</div><div class="rs">'+(live?"сейчас на линии":"обновлено "+ago(d.u.gt||d.u.t))+esc(spd)+'</div></div></div>'}).join("");
  if(g("mapCards"))g("mapCards").innerHTML=ch;
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
  let btnBadge = '<span class="onl-badge">' + CARS_LIST.length + '</span>';
  if(ONL_CAR === 'none'){
    btnLabel = '🚫 Без экипажа';
    btnBadge = '<span class="onl-badge' + (noCrewOnCount ? ' on' : '') + '">' + (noCrewOnCount ? '🟢 ' : '') + noCrewCount + '</span>';
  } else if(ONL_CAR !== 'all'){
    const cc = crewCount(ONL_CAR), co = crewOnCount(ONL_CAR);
    btnLabel = '🚚 <span data-no-i18n="1">' + esc(ONL_CAR) + '</span>';
    btnBadge = '<span class="onl-badge' + (co ? ' on' : '') + '">' + (co ? '🟢 ' : '') + cc + '</span>';
  }

  h += '<div class="onl-bar">'
     + '<button type="button" id="btnCrewFlt" class="onl-btn' + (ONL_CAR !== 'all' ? ' active' : '') + '" data-act="open-onl-flt">'
     + '<span>' + btnLabel + '</span>' + btnBadge + '<span style="opacity:.6;font-size:10px;margin-left:2px">▾</span></button>'
     + '<input id="onlSrch" class="sum-srch" type="search" value="' + esc(ONL_Q) + '" placeholder="Поиск по имени или экипажу...">'
     + '</div><div id="onlRows">';
  const FL=ONL_CAR==='all'?L:ONL_CAR==='none'?L.filter(d=>!String(d.u.car||'').trim()):L.filter(d=>String(d.u.car||'').toUpperCase()===ONL_CAR);
  const qn=ONL_Q.trim().toLowerCase(),FL2=qn?FL.filter(d=>(dispName(d)+' '+(d.u.car||'')+' '+devName(d.u.ua)).toLowerCase().includes(qn)):FL;
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
   const un=dmUnread(d.id);
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
    +'<div class="rv">'+money(car && car !== "ADMIN" ? parseCar(car).sum : (car === "ADMIN" ? 0 : d.cur.sum))+'</div>'
    +dmBtn+editNameBtn+pinBtn+blkBtn+delBtn+'</div>';
  }).join('');
  const tail='</div>'+(L.length&&!isSubAdm()?'<div class="mut hint">Нажмите на имя водителя, чтобы задать префикс. Кнопка ✏️ меняет имя профиля.</div>':'');
  if(g('onlSrch')&&document.activeElement===g('onlSrch')&&g('onlRows')){g('onlRows').innerHTML=rowsHtml;return}
  g('view').innerHTML=h+rowsHtml+tail;
  const si=g('onlSrch');if(si)si.oninput=e=>{ONL_Q=e.target.value;drawOnline()};
 }
 

const CAR_CATALOG=[
 {pk:"other",name:"Այլ",subs:[{sk:"a",name:"Աթոռ, դարակաշար",one:1,p1:50},{sk:"b",name:"Աթոռ սեղաններ",one:1,p1:100},{sk:"c",name:"Լվացարան",p1:300,p2:390},{sk:"d",name:"Կոմոդներ",p1:500,p2:650},{sk:"e",name:"Մահճակալ",p1:500,p2:650},{sk:"f",name:"Մոդուլներ",p1:250,p2:325},{sk:"g",name:"Ներքնակներ",p1:250,p2:325},{sk:"h",name:"Պահոցներ",p1:500,p2:650},{sk:"i",name:"դուռ",one:1,p1:500},{sk:"j",name:"Պուֆիկներ",p1:50,p2:65},{sk:"k",name:"Տումբաներ",p1:50,p2:65}]},
 {pk:"sofas",name:"Բազմոցներ",subs:[{sk:"a",name:"Բազկաթոռ",p1:500,p2:650},{sk:"b",name:"Բազմոց",p1:1000,p2:1300},{sk:"c",name:"Հավաքածու",p1:1500,p2:1950}]},
 {pk:"recep",name:"Ընդունարան",subs:[{sk:"a",name:"Մինչև 1,6",p1:700,p2:910},{sk:"b",name:"1,6 ից ավել",p1:1200,p2:1560}]},
 {pk:"kitchen",name:"Խոհանոցներ",subs:[{sk:"a",name:"1,6 մ",p1:1000,p2:1300},{sk:"b",name:"2-3 մ",p1:2500,p2:3250}]},
 {pk:"living",name:"Հյուրասրահ",subs:[{sk:"a",name:"մինչև 1,7",p1:1000,p2:1300},{sk:"b",name:"1,7 ից ավել",p1:2000,p2:2600},{sk:"c",name:"Էքսկլ.",p1:3000,p2:3900}]},
 {pk:"bedroom",name:"Ննջասենյակներ",subs:[{sk:"a",name:"2 դուռ",p1:1050,p2:1365},{sk:"b",name:"3 դուռ առանց կոմոդ",p1:1550,p2:2015},{sk:"c",name:"3 դուռ կոմոդով",p1:2050,p2:2665},{sk:"d",name:"4 դուռ",p1:2600,p2:3380},{sk:"e",name:"5 դուռ",p1:3100,p2:4030},{sk:"f",name:"6 դուռ",p1:3600,p2:4680},{sk:"g",name:"0,9*2",p1:3100,p2:4030}]},
 {pk:"wardrobe",name:"Պահարաններ",subs:[{sk:"a",name:"2 դուռ",p1:500,p2:650},{sk:"b",name:"3 դուռ",p1:1000,p2:1300},{sk:"c",name:"4 դուռ",p1:1500,p2:1950},{sk:"d",name:"5 դուռ",p1:2000,p2:2600},{sk:"e",name:"6 դուռ",p1:2500,p2:3250}]}
];
function parseCar(code){
 const raw=(CARS&&CARS[code])||{},qmap=raw.qty||{},hist=raw.hist||{};let sum=0,qty=0;const rows=[];
 CAR_CATALOG.forEach(c=>{const items=[];let cs=0;c.subs.forEach(x=>{const k1=c.pk+"_"+x.sk,k2=k1+"_2",q1=+qmap[k1]||0,q2=x.one?0:(+qmap[k2]||0),parts=[];if(q1>0)parts.push({l:x.one?"":"Город",n:q1,p:x.p1,v:q1*x.p1});if(q2>0)parts.push({l:"Район",n:q2,p:x.p2,v:q2*x.p2});if(parts.length){items.push({name:x.name,parts});parts.forEach(z=>{cs+=z.v;qty+=z.n})}});if(items.length){rows.push({name:c.name,sum:cs,items});sum+=cs}});
 const crew=devs().filter(d=>String(d.u.car||"").toUpperCase()===code).map(d=>dispName(d));
 return{code,sum,qty,rows,hist,crew,t:+raw.t||0};
}
const allCars=()=>getCarsList().map(parseCar);
function aggCarMonths(list){
 const map={};list.forEach(c=>Object.keys(c.hist).forEach(k=>{const h=c.hist[k];if(!h)return;const m=h.m||"",x=map[m]||(map[m]={m,sum:0,qty:0,byCar:{}});const sv=+h.sum||0,qv=+h.qty||0;x.sum+=sv;x.qty+=qv;const bc=x.byCar[c.code]||(x.byCar[c.code]={code:c.code,name:"Экипаж "+c.code,crew:c.crew,sum:0,qty:0});bc.sum+=sv;bc.qty+=qv}));
 return Object.keys(map).map(k=>{const x=map[k];x.cars=Object.keys(x.byCar).map(id=>x.byCar[id]).sort((a,b)=>b.sum-a.sum);return x}).sort((a,b)=>a.m<b.m?1:a.m>b.m?-1:0);
}

const ADM_COLOR_STOP_RX=/(?:^|[\s_\/-]+)(?:դուբ|կրաֆտ|սանոմա|սոնոմա|վենգե|սպիտակ|սեվ|սև|գրաֆիտ|մոխրագույն|շագանակագույն|բեժ|կրեմ|կրեմագույն|շիմո|լայթ|դարկ|գոլդ|ոսկեգույն|անտրացիտ|կաշմիր|կապուչինո|բետոն|մարմար|փայլուն|մատ|գլյանց|սիլվեր|արծաթագույն|պողպատե|կաղնի|ընկույզ|օրեխ|յասեն|բալ|վարդագույն|կապույտ|կանաչ|դեղին|կարմիր|բորդո|մետաքս|շոկոլադ|լոֆթ|дуб|крафт|сонома|венге|белый|бел|черный|графит|серый|беж|крем|шимо|лайт|дарк|голд|антрацит|кашмир|капучино|бетон|мрамор|глянец|мат|орех|ясень|шоколад)(?=$|[\s_\/-]+)/gi;
const admNormText=s=>String(s||'').toLowerCase().replace(/և|եւ/g,'եվ').replace(/ё/g,'е').replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim();
const admNormModel=s=>admNormText(s).replace(/[\"'«»().,]/g,' ').replace(/\s+/g,' ').trim();
const admFbKey=k=>admNormModel(k).replace(/[.#$\[\]\/]+/g,'_').slice(0,120);
const admStripColors=s=>admNormModel(s).replace(ADM_COLOR_STOP_RX,' ').replace(/\s+/g,' ').trim();
const admOcrFold=s=>admNormModel(s).replace(/ռ/g,'ր').replace(/թ/g,'տ').replace(/փ/g,'պ').replace(/ք/g,'կ').replace(/օ/g,'ո').replace(/է/g,'ե').replace(/[ձծ]/g,'ց').replace(/ղ/g,'դ');
function admNormDocItems(v){
 const arr=Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
 return arr.filter(x=>x&&typeof x==='object'&&x.c&&(+x.q||0)>0).map(x=>({n:String(x.n||'').trim().slice(0,120),c:String(x.c),q:Math.max(1,Math.round(+x.q||1))}));
}
function admFindCatSub(baseCode){
 const idx=String(baseCode||'').indexOf('_');if(idx<0)return null;
 const pk=baseCode.slice(0,idx),sk=baseCode.slice(idx+1);
 const c=CAR_CATALOG.find(x=>x.pk===pk),s=c&&c.subs.find(x=>x.sk===sk);
 return (c&&s)?{c,s}:null;
}
function admDocItemKey(baseCode,z){
 const f=admFindCatSub(baseCode);
 if(!f)return String(baseCode||'');
 return (!f.s.one&&z===2)?(baseCode+'_2'):baseCode;
}
function admCalcDoc(items,z){
 const p={},clean=[];let sum=0,qty=0;
 (items||[]).forEach(it=>{
  const f=admFindCatSub(it.c),q=Math.max(0,Math.round(+it.q||0));
  if(!f||q<1)return;
  const k=(!f.s.one&&z===2)?(it.c+'_2'):it.c;
  const pr=f.s.one?(+f.s.p1||0):(z===2?(+f.s.p2||0):(+f.s.p1||0));
  p[k]=(p[k]||0)+q;
  sum+=pr*q;qty+=q;
  clean.push({n:String(it.n||'').trim().slice(0,120),c:it.c,q});
 });
 return{p,sum,qty,items:clean};
}
function admLookupRuleCode(itemName,mapObj){
 const fk=admFbKey(itemName);
 if(!fk||!mapObj||typeof mapObj!=='object')return'';
 if(mapObj[fk]&&admFindCatSub(mapObj[fk]))return mapObj[fk];
 const sc=admStripColors(itemName),fc=sc?admOcrFold(sc):'';
 let foldHit='';
 for(const k in mapObj){
  const cd=mapObj[k];if(!cd||!admFindCatSub(cd))continue;
  if(admFbKey(k.replace(/_/g,' '))===fk)return cd;
  if(sc.length>=4){
   const ksc=admStripColors(k.replace(/_/g,' '));
   if(ksc.length>=4){
    if(ksc===sc)return cd;
    if(!foldHit&&admOcrFold(ksc)===fc)foldHit=cd;
   }
  }
 }
 return foldHit;
}
function admDocKeyInfo(k){
 const is2=String(k||'').endsWith('_2'),base=is2?String(k).slice(0,-2):String(k||'');
 const f=admFindCatSub(base);
 if(!f)return{label:k,price:0};
 const zn=f.s.one?'':(is2?' (Район)':' (Город)');
 return{label:nm(f.c.name)+' · '+nm(f.s.name)+zn,price:is2?(+f.s.p2||0):(+f.s.p1||0)};
}
function admPickCategory(curCode,subtitle,noI18n){
 return new Promise(resolve=>{
  const CAT_ICO={'Другое':'📦','Диваны':'🛋️','Ресепшен':'🗄️','Кухни':'🍳','Гостиная':'📺','Спальни':'🛏️','Шкафы':'🚪'};
  const allItems=Object.keys(OCR_CAT_NAMES).map(cd=>{
   const parts=OCR_CAT_NAMES[cd].split(' · ');
   return{cd,cat:parts[0]||'Другое',name:parts[1]||OCR_CAT_NAMES[cd]};
  });
  const catsList=Array.from(new Set(allItems.map(x=>x.cat)));
  const curObj=allItems.find(x=>x.cd===curCode);
  let selCat=curObj?curObj.cat:'all',q='',done=false;
  const ov=document.createElement('div');
  ov.className='ov';ov.style.zIndex='100002';
  ov.innerHTML='<div class="dlg aop-box" style="max-width:430px;height:min(85dvh,580px)">'
   +'<div class="aop-hd"><div><b>Выберите категорию</b>'+(subtitle?'<small'+(noI18n?' data-no-i18n="1"':'')+'>'+esc(subtitle)+'</small>':'')+'</div><button type="button" class="sel-x">✕</button></div>'
   +'<div class="aop-srch"><input id="adpInp" type="search" placeholder="🔍 Быстрый поиск мебели..."></div>'
   +'<div class="aop-chips" id="adpChips"><button type="button" data-c="all" class="'+(selCat==='all'?'on':'')+'">Все</button>'
   +catsList.map(c=>'<button type="button" data-c="'+esc(c)+'" class="'+(selCat===c?'on':'')+'">'+(CAT_ICO[c]||'📦')+' '+esc(c)+'</button>').join('')
   +'</div><div class="aop-list" id="adpList"></div></div>';
  document.body.appendChild(ov);
  const finish=val=>{if(done)return;done=true;ov.classList.remove('show');setTimeout(()=>ov.remove(),180);resolve(val)};
  ov.querySelector('.sel-x').onclick=()=>finish(null);
  ov.onclick=e=>{if(e.target===ov)finish(null)};
  const drawItems=()=>{
   const box=ov.querySelector('#adpList');
   const qTokens=ocrNorm(q).split(' ').filter(Boolean);
   const list=allItems.filter(it=>{
    if(selCat!=='all'&&it.cat!==selCat)return false;
    if(!qTokens.length)return true;
    const grp=(it.cd||'').split('_')[0];
    const hay=ocrNorm(it.name+' '+it.cat+' '+(OCR_HY_KW[grp]||''));
    return qTokens.every(t=>hay.includes(t));
   });
   if(!list.length){box.innerHTML='<div class="mut" style="text-align:center;padding:20px">Ничего не найдено</div>';return}
   box.innerHTML=list.map(it=>{
    const on=it.cd===curCode;
    return '<button type="button" class="aop-it'+(on?' on':'')+'" data-cd="'+it.cd+'"><span>'+(CAT_ICO[it.cat]||'📦')+'</span><span class="aop-tx"><b>'+esc(it.name)+'</b><small>'+esc(it.cat)+'</small></span><span class="sel-chk">'+(on?'✓':'')+'</span></button>';
   }).join('');
  };
  ov.querySelector('#adpChips').onclick=e=>{
   const b=e.target.closest('button[data-c]');if(!b)return;
   selCat=b.dataset.c;
   ov.querySelectorAll('#adpChips button').forEach(x=>x.classList.toggle('on',x===b));
   drawItems();
  };
  ov.querySelector('#adpInp').oninput=e=>{q=e.target.value.trim().toLowerCase();drawItems()};
  ov.querySelector('#adpList').onclick=e=>{
   const it=e.target.closest('button[data-cd]');if(!it)return;
   finish(it.dataset.cd);
  };
  drawItems();
  requestAnimationFrame(()=>ov.classList.add('show'));
 });
}
async function openAdmDocEditModal(code,dk){
 if(isSubAdm()){toast('Редактирование доступно только главному админу',true);return}
 const orig=CARS[code]&&CARS[code].docs&&CARS[code].docs[dk];
 if(!orig){toast('Запись уже удалена',true);return}
 if(orig.type==='manual'){toast('Ручные правки можно только отменить',true);return}
 const origIt=admNormDocItems(orig.it),hadItems=origIt.length>0;
 let curZ=(orig.z===1||orig.z===2)?orig.z:(orig.p&&Object.keys(orig.p).some(k=>k.endsWith('_2'))?2:1);
 const rows=hadItems
  ?origIt.map(it=>({n:it.n,c:it.c,q:it.q,origC:it.c}))
  :Object.keys(orig.p||{}).filter(k=>(+orig.p[k]||0)>0).map(k=>{
   const base=k.endsWith('_2')?k.slice(0,-2):k;
   return{n:'',c:base,q:Math.max(1,Math.round(+orig.p[k]||1)),origC:base};
  });
 const origSum=+orig.sum||0,origQty=+orig.qty||0;
 let saveToOcr=true;
 const ov=document.createElement('div');
 ov.className='ov';ov.style.zIndex='100000';
 ov.innerHTML='<div class="dlg aop-box" style="max-width:450px;height:min(90dvh,650px)">'
  +'<div class="aop-hd"><div><b>✏️ Редактирование накладной</b><small>№ <span data-no-i18n="1">'+esc(orig.doc||'\u2014')+'</span> · <span data-no-i18n="1">'+esc(code)+'</span> · '+(orig.by?'<span data-no-i18n="1">'+esc(orig.by)+'</span>':'<span>Водитель</span>')+'</small></div><button type="button" class="sel-x">✕</button></div>'
  +'<div class="ade-zone"><button type="button" class="ade-zbtn" data-z="1">🏙️ Город</button><button type="button" class="ade-zbtn" data-z="2">🗺️ Район</button></div>'
  +'<div class="ade-list" id="adeList"></div>'
  +'<label class="ade-chk" id="adeOcrWrap" hidden><input type="checkbox" id="adeOcrChk" checked><span>Сохранить изменения в словарь OCR для будущих накладных</span></label>'
  +'<div class="ade-sum" id="adeSum"></div>'
  +'<div class="ade-ft"><button type="button" id="adeCancel" style="flex:1;height:40px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer">Отмена</button><button type="button" id="adeSave" style="flex:1.4;height:40px;border-radius:11px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.35)">✓ Сохранить</button></div></div>';
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
 ov.querySelector('.sel-x').onclick=close;
 ov.querySelector('#adeCancel').onclick=close;
 ov.onclick=e=>{if(e.target===ov)close()};
 const render=()=>{
  ov.querySelectorAll('.ade-zbtn').forEach(b=>b.classList.toggle('on',+b.dataset.z===curZ));
  const box=ov.querySelector('#adeList');
  const html=rows.map((r,idx)=>{
   const k=admDocItemKey(r.c,curZ),inf=admDocKeyInfo(k),lineSum=inf.price*r.q;
   const chg=r.origC&&r.c!==r.origC;
   const nmEl=r.n?'<div class="ade-rnm" data-no-i18n="1">'+esc(r.n)+'</div>':'<div class="ade-rnm mut">Позиция без названия</div>';
   return '<div class="ade-row'+(chg?' chg':'')+'">'
    +'<div class="ade-rtop">'+nmEl+'<button type="button" class="ade-rdel" data-del="'+idx+'" title="Удалить позицию">✕</button></div>'
    +'<button type="button" class="ade-cat" data-cat="'+idx+'"><span>'+esc(OCR_CAT_NAMES[r.c]||inf.label)+'</span><span>▾</span></button>'
    +'<div class="ade-rbot"><div class="ade-qty"><button type="button" class="ade-qb" data-dec="'+idx+'">−</button><span class="ade-qv">'+r.q+'</span><button type="button" class="ade-qb" data-inc="'+idx+'">+</button></div><span class="ade-rsum">'+fm(lineSum)+' '+CUR+'</span></div></div>';
  }).join('');
  box.innerHTML=html+'<button type="button" class="ade-add" id="adeAdd">+ Добавить позицию</button>';
  const hasOcrDiff=rows.some(r=>r.n&&r.c&&r.origC&&r.c!==r.origC);
  const ow=ov.querySelector('#adeOcrWrap');if(ow)ow.hidden=!hasOcrDiff;
  const calc=admCalcDoc(rows,curZ),diff=calc.sum-origSum;
  const diffTxt=diff===0?'<span style="color:#94a3b8">без изменений</span>':('<b style="color:'+(diff>0?'#6ee7b7':'#fca5a5')+'">'+(diff>0?'+':'')+fm(diff)+' '+CUR+'</b>');
  ov.querySelector('#adeSum').innerHTML='<span><span>Было</span>: <b>'+fm(origQty)+' шт · '+fm(origSum)+' '+CUR+'</b></span><span><span>Станет</span>: <b>'+fm(calc.qty)+' шт · '+fm(calc.sum)+' '+CUR+'</b> ('+diffTxt+')</span>';
 };
 ov.querySelector('.ade-zone').onclick=e=>{
  const b=e.target.closest('.ade-zbtn');if(!b)return;
  curZ=+b.dataset.z===2?2:1;render();
 };
 ov.querySelector('#adeOcrChk').onchange=e=>{saveToOcr=!!e.target.checked};
 ov.querySelector('#adeList').onclick=async e=>{
  const addB=e.target.closest('#adeAdd');
  if(addB){
   const picked=await admPickCategory('','Новая позиция',false);
   if(picked){rows.push({n:'',c:picked,q:1,origC:''});render()}
   return;
  }
  const catB=e.target.closest('[data-cat]');
  if(catB){
   const i=+catB.dataset.cat,r=rows[i];if(!r)return;
   const picked=await admPickCategory(r.c,r.n||'',true);
   if(picked){r.c=picked;render()}
   return;
  }
  const incB=e.target.closest('[data-inc]');
  if(incB){const r=rows[+incB.dataset.inc];if(r){r.q=Math.min(999,r.q+1);render()}return}
  const decB=e.target.closest('[data-dec]');
  if(decB){const r=rows[+decB.dataset.dec];if(r&&r.q>1){r.q--;render()}return}
  const delB=e.target.closest('[data-del]');
  if(delB){rows.splice(+delB.dataset.del,1);render();return}
 };
 ov.querySelector('#adeSave').onclick=async()=>{
  if(isSubAdm())return;
  const calc=admCalcDoc(rows,curZ);
  if(!calc.items.length){toast('Добавьте хотя бы одну позицию или отмените накладную',true);return}
  const btn=ov.querySelector('#adeSave');btn.disabled=true;
  try{
   const docRef=db.ref('cars/'+code+'/docs/'+dk);
   const pre=(await docRef.once('value')).val();
   if(!pre||pre.type==='manual'){close();toast('Запись уже удалена',true);return}
   let prevP=null,nextDoc=null;
   const tr=await docRef.transaction(fresh=>{
    if(!fresh||fresh.type==='manual')return;
    prevP=(fresh.p&&typeof fresh.p==='object')?Object.assign({},fresh.p):{};
    nextDoc={doc:fresh.doc||'\u2014',by:fresh.by||'Водитель',t:fresh.t||Date.now(),sum:calc.sum,qty:calc.qty,z:curZ,p:calc.p,ed:Date.now()};
    if(fresh.rep)nextDoc.rep=fresh.rep;
    if(hadItems||calc.items.some(it=>it.n))nextDoc.it=calc.items;
    return nextDoc;
   });
   if(!tr.committed||!nextDoc){close();toast('Запись уже удалена',true);return}
   const oldP=prevP||{};
   const delta={};
   const allK=new Set([...Object.keys(oldP),...Object.keys(calc.p)]);
   let hasDelta=false;
   allK.forEach(k=>{const d=(+calc.p[k]||0)-(+oldP[k]||0);if(d!==0){delta[k]=d;hasDelta=true}});
   let qtyTr=null;
   if(hasDelta){
    qtyTr=await db.ref('cars/'+code+'/qty').transaction(cur=>{
     const next=(cur&&typeof cur==='object')?Object.assign({},cur):{};
     Object.keys(delta).forEach(k=>{
      const nv=Math.max(0,(+next[k]||0)+delta[k]);
      if(nv>0)next[k]=nv;else delete next[k];
     });
     return next;
    });
   }
   await db.ref('cars/'+code+'/t').set(Date.now());
   if(CARS[code]){
    if(!CARS[code].docs)CARS[code].docs={};
    CARS[code].docs[dk]=nextDoc;
    if(qtyTr&&qtyTr.snapshot)CARS[code].qty=qtyTr.snapshot.val()||{};
   }
   const savedRules=[];
   if(saveToOcr){
    const seenFk=new Set();
    for(const r of rows){
     if(r.n&&r.c&&r.origC&&r.c!==r.origC){
      const fk=admFbKey(r.n);
      if(fk&&!seenFk.has(fk)){
       seenFk.add(fk);
       await db.ref('config/ocrMap/'+fk).set(r.c);
       savedRules.push({key:fk,code:r.c});
      }
     }
    }
   }
   close();
   const sumOv=g('admSumOv');if(sumOv&&sumOv._refresh)sumOv._refresh();
   toast(savedRules.length?'Накладная обновлена · словарь OCR обновлён':'Накладная обновлена');
   if(savedRules.length){
    const rMap={};savedRules.forEach(x=>{rMap[x.key]=x.code});
    const plan=findAffectedDocsByRuleMap(rMap);
    if(plan.length)openRecalcModal(plan,'Найдены другие накладные с этим товаром');
   }
  }catch(err){btn.disabled=false;toast('Ошибка сохранения накладной',true)}
 };
 render();
 requestAnimationFrame(()=>ov.classList.add('show'));
}
function findAffectedDocsByRuleMap(ruleMapObj,useCodeFallback){
 if(isSubAdm())return[];
 const hasMap=ruleMapObj&&typeof ruleMapObj==='object';
 if(!hasMap&&!useCodeFallback)return[];
 const plan=[];
 getCarsList().forEach(carCode=>{
  const docs=(CARS[carCode]&&CARS[carCode].docs)||{};
  Object.keys(docs).forEach(dk=>{
   const x=docs[dk];if(!x||x.type==='manual')return;
   const items=admNormDocItems(x.it);if(!items.length)return;
   const z=(x.z===1||x.z===2)?x.z:1;
   const edits=[],newItems=[];
   items.forEach((it,idx)=>{
    const fbCode=(hasMap&&it.n)?admLookupRuleCode(it.n,ruleMapObj):'';
    let mapped=fbCode,src=fbCode?'firebase':'';
    if(!mapped&&useCodeFallback&&it.n&&typeof window.ocrClassifyByCode==='function'){
     const r=window.ocrClassifyByCode(it.n);
     if(r&&!r.ignore&&r.code&&admFindCatSub(r.code)){mapped=r.code;src='code'}
    }
    if(mapped&&mapped!==it.c){
     edits.push({idx,n:it.n,q:it.q,from:it.c,to:mapped,src});
     newItems.push({n:it.n,c:mapped,q:it.q});
    }else newItems.push(it);
   });
   if(!edits.length)return;
   const calc=admCalcDoc(newItems,z),oldSum=+x.sum||0;
   plan.push({carCode,dk,doc:x.doc||'\u2014',by:x.by||'Водитель',t:+x.t||0,z,edits,oldSum,newSum:calc.sum,diffSum:calc.sum-oldSum});
  });
 });
 return plan.sort((a,b)=>b.t-a.t);
}
function findAffectedDocsByRule(ruleKey,newCode){
 if(isSubAdm()||!ruleKey||!newCode||!admFindCatSub(newCode))return[];
 const m={};m[ruleKey]=newCode;
 return findAffectedDocsByRuleMap(m,false);
}
function findAffectedDocsByAllRules(){
 if(isSubAdm())return[];
 return findAffectedDocsByRuleMap(OCR_MAP,true);
}
async function applyBatchRecalc(plan){
 if(isSubAdm()||!plan||!plan.length)return 0;
 const byCar={};
 plan.forEach(p=>{(byCar[p.carCode]||(byCar[p.carCode]=[])).push(p)});
 let updatedCount=0;
 for(const carCode of Object.keys(byCar)){
  const carDelta={},docUpdates={};
  for(const item of byCar[carCode]){
   const docRef=db.ref('cars/'+carCode+'/docs/'+item.dk);
   const pre=(await docRef.once('value')).val();
   if(!pre||pre.type==='manual')continue;
   let prevP=null,nextDoc=null,newP=null;
   const tr=await docRef.transaction(fresh=>{
    if(!fresh||fresh.type==='manual')return;
    const curItems=admNormDocItems(fresh.it);if(!curItems.length)return;
    const z=(fresh.z===1||fresh.z===2)?fresh.z:1;
    let changed=false;
    const nextItems=curItems.map(it=>{
     const hit=item.edits.find(e=>e.n===it.n&&e.from===it.c);
     if(hit){changed=true;return{n:it.n,c:hit.to,q:it.q}}
     return it;
    });
    if(!changed)return;
    const calc=admCalcDoc(nextItems,z);
    prevP=(fresh.p&&typeof fresh.p==='object')?Object.assign({},fresh.p):{};
    newP=calc.p;
    nextDoc={doc:fresh.doc||'\u2014',by:fresh.by||'Водитель',t:fresh.t||Date.now(),sum:calc.sum,qty:calc.qty,z,p:calc.p,it:calc.items,ed:Date.now()};
    if(fresh.rep)nextDoc.rep=fresh.rep;
    return nextDoc;
   });
   if(!tr.committed||!nextDoc)continue;
   const oldP=prevP||{};
   const allK=new Set([...Object.keys(oldP),...Object.keys(newP||{})]);
   allK.forEach(k=>{const d=(+(newP&&newP[k])||0)-(+oldP[k]||0);if(d!==0)carDelta[k]=(carDelta[k]||0)+d});
   docUpdates[item.dk]=nextDoc;
   updatedCount++;
  }
  const dkList=Object.keys(docUpdates);
  if(!dkList.length)continue;
  const hasDelta=Object.keys(carDelta).some(k=>carDelta[k]!==0);
  let qtyTr=null;
  if(hasDelta){
   qtyTr=await db.ref('cars/'+carCode+'/qty').transaction(cur=>{
    const next=(cur&&typeof cur==='object')?Object.assign({},cur):{};
    Object.keys(carDelta).forEach(k=>{
     if(!carDelta[k])return;
     const nv=Math.max(0,(+next[k]||0)+carDelta[k]);
     if(nv>0)next[k]=nv;else delete next[k];
    });
    return next;
   });
  }
  await db.ref('cars/'+carCode+'/t').set(Date.now());
  if(CARS[carCode]){
   if(!CARS[carCode].docs)CARS[carCode].docs={};
   dkList.forEach(dk=>{CARS[carCode].docs[dk]=docUpdates[dk]});
   if(qtyTr&&qtyTr.snapshot)CARS[carCode].qty=qtyTr.snapshot.val()||{};
  }
 }
 const sumOv=g('admSumOv');if(sumOv&&sumOv._refresh)sumOv._refresh();
 return updatedCount;
}
function openRecalcModal(plan,subtitle){
 if(isSubAdm()||!plan||!plan.length)return;
 const picked=plan.map(()=>true);
 const ov=document.createElement('div');
 ov.className='ov';ov.style.zIndex='100001';
 const listHtml=plan.map((p,i)=>{
  const dCol=p.diffSum>0?'#6ee7b7':(p.diffSum<0?'#fca5a5':'#94a3b8');
  const dTxt=(p.diffSum>0?'+':'')+fm(p.diffSum)+' '+CUR;
  const lns=p.edits.map(e=>{
   const bdg=e.src==='code'?'<span class="arc-src cd">⚙️ <span>Код</span></span>':(e.src==='firebase'?'<span class="arc-src fb">☁️ <span>Словарь</span></span>':'');
   return '<div class="arc-ln"><div style="color:#f8fafc;font-weight:600"><span data-no-i18n="1">'+esc(e.n)+' ×'+e.q+'</span>'+bdg+'</div><div><span style="color:#fca5a5">'+esc(OCR_CAT_NAMES[e.from]||e.from)+'</span> → <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[e.to]||e.to)+'</b></div></div>';
  }).join('');
  return '<div class="arc-it" data-arc-card="'+i+'"><div class="arc-hd"><label class="arc-lbl"><input type="checkbox" data-arc-idx="'+i+'" checked><span class="arc-car" data-no-i18n="1">'+esc(p.carCode)+'</span><span>🧾 № <span data-no-i18n="1">'+esc(p.doc)+'</span></span></label><b style="color:'+dCol+'">'+dTxt+'</b></div>'+lns+'</div>';
 }).join('');
 ov.innerHTML='<div class="dlg aop-box" style="max-width:460px;height:min(86dvh,620px)">'
  +'<div class="aop-hd"><div><b>🔄 <span>Пересчёт накладных</span> (<span id="arcHdCnt" data-no-i18n="1">'+plan.length+'</span>)</b><small>'+esc(subtitle||'Обновление уже сохранённых накладных текущего месяца')+'</small></div><button type="button" class="sel-x">✕</button></div>'
  +'<div class="ade-list" id="arcList">'+listHtml+'</div>'
  +'<div class="ade-sum" id="arcSum"></div>'
  +'<div class="ade-ft"><button type="button" id="arcNo" style="flex:1;height:40px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer">Не менять</button><button type="button" id="arcGo" style="flex:1.4;height:40px;border-radius:11px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(14,165,233,.35)">🔄 <span>Пересчитать</span> (<span id="arcBtnCnt" data-no-i18n="1">'+plan.length+'</span>)</button></div></div>';
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
 const syncSum=()=>{
  const sel=plan.filter((_,i)=>picked[i]);
  const totDiff=sel.reduce((a,x)=>a+x.diffSum,0);
  const totCol=totDiff>0?'#6ee7b7':(totDiff<0?'#fca5a5':'#94a3b8');
  ov.querySelector('#arcSum').innerHTML='<span><span>Накладных</span>: <b data-no-i18n="1">'+sel.length+' / '+plan.length+'</b></span><span><span>Итого разница</span>: <b style="color:'+totCol+'">'+(totDiff>0?'+':'')+fm(totDiff)+' '+CUR+'</b></span>';
  const bc=ov.querySelector('#arcBtnCnt');if(bc)bc.textContent=String(sel.length);
  const btn=ov.querySelector('#arcGo');if(btn)btn.disabled=sel.length===0;
 };
 ov.querySelector('#arcList').onchange=e=>{
  const cb=e.target.closest('[data-arc-idx]');if(!cb)return;
  const i=+cb.dataset.arcIdx;picked[i]=!!cb.checked;
  const card=ov.querySelector('[data-arc-card="'+i+'"]');if(card)card.classList.toggle('off',!picked[i]);
  syncSum();
 };
 ov.querySelector('.sel-x').onclick=close;
 ov.querySelector('#arcNo').onclick=close;
 ov.onclick=e=>{if(e.target===ov)close()};
 ov.querySelector('#arcGo').onclick=async()=>{
  const sel=plan.filter((_,i)=>picked[i]);
  if(!sel.length){toast('Выберите хотя бы одну накладную',true);return}
  const btn=ov.querySelector('#arcGo');btn.disabled=true;
  try{
   const cnt=await applyBatchRecalc(sel);
   close();
   toast('Пересчитано накладных: '+cnt);
  }catch(err){btn.disabled=false;toast('Ошибка пересчёта накладных',true)}
 };
 syncSum();
 requestAnimationFrame(()=>ov.classList.add('show'));
}
async function cancelAdmDoc(code,dk,btn){
 if(isSubAdm()){toast('Удаление доступно только главному админу',true);return}
 const x=CARS[code]&&CARS[code].docs&&CARS[code].docs[dk];
 if(!x){toast('Запись уже удалена',true);return}
 const isMan=x.type==='manual';
 const hp=x.p&&typeof x.p==='object'&&Object.keys(x.p).length>0;
 const lbl=isMan?('ручное изменение от «'+(x.by||'Водитель')+'»'):('накладную № '+(x.doc||'\u2014'));
 const m=hp?('Отменить '+lbl+' ('+fm(+x.qty||0)+' шт · '+fm(+x.sum||0)+' '+CUR+')?\n\nПозиции будут откачены в итогах экипажа '+code+'.'):('Удалить запись ('+lbl+') из истории?\n\nДля старой записи состав не сохранён — удалится только запись.');
 if(!(await ask(m,{title:isMan?'Отмена изменения':'Отмена накладной',okText:'Отменить',danger:true})))return;
 if(btn)btn.disabled=true;
 try{
  const docRef=db.ref('cars/'+code+'/docs/'+dk);
  const pre=(await docRef.once('value')).val();
  if(!pre){toast('Запись уже удалена',true);return}
  let removedP=null;
  const tr=await docRef.transaction(cur=>{
   if(!cur)return;
   removedP=(cur.p&&typeof cur.p==='object')?Object.assign({},cur.p):null;
   return null;
  });
  if(!tr.committed){toast('Запись уже удалена',true);return}
  const pToSub=removedP||(hp?x.p:null);
  if(pToSub&&Object.keys(pToSub).length){
   const qtyTr=await db.ref('cars/'+code+'/qty').transaction(cur=>{
    const next=(cur&&typeof cur==='object')?Object.assign({},cur):{};
    Object.keys(pToSub).forEach(k=>{
     const nv=Math.max(0,(+next[k]||0)-(+pToSub[k]||0));
     if(nv>0)next[k]=nv;else delete next[k];
    });
    return next;
   });
   if(CARS[code]&&qtyTr&&qtyTr.snapshot)CARS[code].qty=qtyTr.snapshot.val()||{};
  }
  if(CARS[code]&&CARS[code].docs)delete CARS[code].docs[dk];
  await db.ref('cars/'+code+'/t').set(Date.now());
  const ov=g('admSumOv');if(ov&&ov._refresh)ov._refresh();else openAdmSumModal(code,'cur',true);toast(isMan?'Изменение отменено':'Накладная отменена');
 }catch(e){if(btn)btn.disabled=false;toast('Ошибка отмены',true)}
}
function openAdmSumModal(code,subKey,openDocs){
 if(!getCarsList().includes(code))return;const old=g("admSumOv");if(old)old.remove();
 const c=parseCar(code),isCur=subKey==="cur",rec=isCur?null:c.hist[subKey];if(!isCur&&!rec)return;
 const title=isCur?"Текущий месяц":monthName(rec.m||subKey),sub=isCur?"не сохранён":("сохранено "+ago(rec.t));
 let docQ="";
 const build=(op)=>{
  const c=parseCar(code);
   const rows=isCur?c.rows:(rec.rows||[]),totS=isCur?c.sum:(+rec.sum||0),totQ=isCur?c.qty:(+rec.qty||0);
 const dObj=(CARS[code]&&CARS[code].docs)||{},dList=isCur?Object.keys(dObj).map(k=>dObj[k]?Object.assign({_k:k},dObj[k]):null).filter(Boolean).sort((a,b)=>(+b.t||0)-(+a.t||0)):[];
 const dTotS=dList.reduce((a,x)=>a+(+x.sum||0),0),dTotQ=dList.reduce((a,x)=>a+(+x.qty||0),0);
 const canDel=!isSubAdm();
 const docsHtml=(isCur&&dList.length)?'<div class="sum-cat'+(op?' open':'')+'" data-docs-cat="1"><div class="sum-cat-h" data-atog="1"><div class="sum-cat-l"><span class="sum-chv">'+(op?'▾':'\u25b8')+'</span><div><div class="sum-cat-n">📜 История изменений</div><div class="sum-cat-s">Записей: '+dList.length+(dTotQ?' · '+fm(dTotQ)+' шт':'')+'</div></div></div><div class="sum-cat-r">'+(dTotS?fm(dTotS)+' '+CUR:dList.length+' шт')+'</div></div><div class="sum-cat-b">'
  +(dList.length>2?'<input class="sum-srch" data-docsrch="1" type="search" value="'+esc(docQ)+'" placeholder="🔍 Поиск по номеру, водителю или товару..." style="margin:6px 0 8px!important">':'')
  +dList.map(x=>{
  const isMan=x.type==='manual';
  const dd=x.t?new Date(x.t):null,tm=dd?(dd.toLocaleDateString(admLoc(),{day:'2-digit',month:'2-digit'})+' '+String(dd.getHours()).padStart(2,'0')+':'+String(dd.getMinutes()).padStart(2,'0')):'';
  const zn=!isMan?(x.z===1?'Город':(x.z===2?'Район':'')):'';
  const rp=(!isMan&&x.rep>1)?' <span class="sum-doc-rep">\u{1f501} Повтор'+(x.rep>2?' \u00d7'+x.rep:'')+'</span>':'';
  const edBdg=(!isMan&&x.ed)?' <span class="sum-doc-ed">✏️ <span>Испр.</span></span>':'';
  const qv=+x.qty||0,sv=+x.sum||0;
  const rSum=(sv||qv)?'<span class="sum-v" style="'+(sv<0?'color:#fca5a5':'')+'">'+(isMan&&sv>0?'+':'')+fm(sv)+' '+CUR+'</span>':'';
  const hdTitle=isMan?'✏️ Вручную':('🧾 № <span data-no-i18n="1">'+esc(x.doc||'\u2014')+'</span>');
  const rawIt=!isMan?admNormDocItems(x.it):[];
  let itsHtml='',hayParts=[x.doc||'',x.by||''];
  if(rawIt.length){
   itsHtml='<div class="sum-doc-its">'+rawIt.map(it=>{
    const k=admDocItemKey(it.c,x.z),inf=admDocKeyInfo(k),dv=it.q*inf.price;
    hayParts.push(it.n,inf.label);
    return '<div class="sum-doc-it"><div class="sum-doc-it-l">'+(it.n?'<div class="sum-doc-it-nm" data-no-i18n="1">'+esc(it.n)+'</div>':'')+'<div class="sum-doc-it-ct">'+esc(inf.label)+'</div></div><b style="color:#6ee7b7">+'+fm(it.q)+' шт'+(dv?' ('+fm(dv)+' '+CUR+')':'')+'</b></div>';
   }).join('')+'</div>';
  }else if(x.p&&typeof x.p==='object'&&Object.keys(x.p).length){
   itsHtml='<div class="sum-doc-its">'+Object.keys(x.p).map(k=>{
    const dn=+x.p[k]||0,inf=admDocKeyInfo(k),dv=dn*inf.price;
    const col=dn<0?'#fca5a5':'#6ee7b7';
    hayParts.push(inf.label);
    return '<div class="sum-doc-it"><span>'+esc(inf.label)+'</span><b style="color:'+col+'">'+(dn>0?'+':'')+fm(dn)+' шт'+(dv?' ('+fm(dv)+' '+CUR+')':'')+'</b></div>';
   }).join('')+'</div>';
  }
  const canEdit=canDel&&!isMan&&(rawIt.length>0||(x.p&&Object.keys(x.p).length>0));
  const editBtnHtml=canEdit?'<button type="button" class="sum-doc-edit" data-doc-edit="'+esc(x._k)+'" title="Изменить накладную"><span style="font-size:12px">✏️</span> Изменить</button>':'';
  const delBtnHtml=canDel?'<button type="button" class="sum-doc-del" data-doc-del="'+esc(x._k)+'" title="Отменить запись"><span style="font-size:12px">🗑️</span> Отменить</button>':'';
  const btnsHtml=(editBtnHtml||delBtnHtml)?'<div class="sum-doc-btns">'+editBtnHtml+delBtnHtml+'</div>':'';
  const hay=esc(hayParts.join(' ').toLowerCase());
  return '<div class="sum-it sum-doc-card" data-doc-hay="'+hay+'"><div class="sum-doc-hd"><div class="sum-it-t" style="margin:0">'+hdTitle+(zn?' <span class="sum-doc-z">'+zn+'</span>':'')+rp+edBdg+'</div>'+rSum+'</div>'+itsHtml+'<div class="sum-doc-ft"><span class="sum-f">'+(x.by?'<span data-no-i18n="1">'+esc(x.by)+'</span>':'<span>Водитель</span>')+(tm?' · <span data-no-i18n="1">'+tm+'</span>':'')+(qv?' · <span>'+(isMan&&qv>0?'+':'')+fm(qv)+' шт</span>':'')+'</span>'+btnsHtml+'</div></div>';
 }).join('')+'<div class="mut" data-doc-empty="1" style="display:none;text-align:center;padding:12px">Ничего не найдено</div></div></div>':'';
 const headLbl=isCur?'<span>Текущий месяц</span> · <span>не сохранён</span>':('<span>'+esc(title)+'</span> · <span>сохранено</span> <span>'+esc(ago(rec.t))+'</span>');
 const head="<div class=\"sum-dash\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">"+headLbl+"</div><div class=\"sum-val\" id=\"admTotVal\">"+fm(totS)+" <span>"+CUR+"</span></div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b id=\"admTotQty\">"+fm(totQ)+"</b><span>штук</span></div><div class=\"sum-kpi\"><b id=\"admTotCat\">"+rows.length+"</b><span>катег.</span></div></div></div></div>";
  return head+docsHtml+detail(rows);
 };
 const subHdHtml=c.crew.length?('<span>Экипаж</span>: <span data-no-i18n="1">'+esc(c.crew.join(", "))+'</span>'):'<span>Экипаж не назначен</span>';
 const ov=document.createElement("div");ov.id="admSumOv";ov.className="ov";
 const delH=(!isCur&&!isSubAdm())?"<button type=\"button\" id=\"admSumDel\" class=\"ach-clr\" style=\"margin-right:6px\">🗑️ Удалить</button>":"";
 const expH="<button type=\"button\" id=\"admSumCsv\" class=\"ach-clr\" style=\"background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#6ee7b7;margin-right:6px\">📥 Excel</button>";
 ov.innerHTML="<div class=\"dlg ach-box\" style=\"max-width:440px;height:88vh\"><div class=\"ach-hd\"><div class=\"ach-hd-l\"><div class=\"ach-hd-ic\">🚚</div><div><b>Экипаж <span data-no-i18n=\"1\">"+esc(code)+"</span></b><small>"+subHdHtml+"</small></div></div><div class=\"ach-acts\">"+expH+delH+"<button type=\"button\" id=\"admSumX\" class=\"ach-x\">✕</button></div></div><div id=\"admSumB\" class=\"ach-list\" style=\"background-image:none;padding:12px;display:block\">"+build(openDocs)+"</div></div>";
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove("show");setTimeout(()=>ov.remove(),180)};
 if(g("admSumCsv"))g("admSumCsv").onclick=()=>{
  const cNow=parseCar(code),rowsNow=isCur?cNow.rows:(rec.rows||[]),totSNow=isCur?cNow.sum:(+rec.sum||0),totQNow=isCur?cNow.qty:(+rec.qty||0);
  exportCarDetailCsv(code,title,rowsNow,totQNow,totSNow);
 };
 if(g("admSumDel"))g("admSumDel").onclick=async()=>{if(!await ask("Удалить сохранённый итог за «"+title+"» у экипажа "+code+"?",{title:"Удаление итога",okText:"Удалить",danger:true}))return;try{await db.ref("cars/"+code+"/hist/"+subKey).remove();close();toast("Итог удалён")}catch(e){toast("Ошибка удаления",true)}};
 g("admSumX").onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
 const root=g("admSumB");let flt="all",q="";
 const applyDocFilter=()=>{
  const ql=docQ.trim().toLowerCase();
  let vis=0;
  root.querySelectorAll(".sum-doc-card").forEach(el=>{
   const ok=!ql||(el.dataset.docHay||"").includes(ql);
   el.style.display=ok?"":"none";
   if(ok)vis++;
  });
  const emp=root.querySelector("[data-doc-empty]");
  if(emp)emp.style.display=(ql&&vis===0)?"":"none";
 };
 const apply=()=>{
  let gS=0,gQ=0,gC=0;
  const catStats=[];
  root.querySelectorAll(".adm-sum .sum-cat").forEach(cat=>{
   let cS=0,cQ=0,vc=0;
   cat.querySelectorAll(".sum-it").forEach(it=>{
    const mn=!q||(it.dataset.name||"").includes(q);
    let vr=0;
    it.querySelectorAll(".sum-r").forEach(r=>{
     const ok=mn&&(flt==="all"||r.dataset.zone===flt);
     r.style.display=ok?"":"none";
     if(ok){
      vr++;
      cQ+=parseFloat(r.dataset.q)||0;
      cS+=parseFloat(r.dataset.v)||0;
     }
    });
    it.style.display=vr?"":"none";
    if(vr)vc++;
   });
   cat.style.display=vc?"":"none";
   if(vc){gS+=cS;gQ+=cQ;gC++;catStats.push({cat,cS,cQ})}
  });
  catStats.forEach(({cat,cS,cQ})=>{
   const rEl=cat.querySelector(".sum-cat-r");
   const sEl=cat.querySelector(".sum-cat-s");
   const pct=gS?Math.round(cS*100/gS):0;
   if(rEl)rEl.textContent=money(cS);
   if(sEl)sEl.textContent=fm(cQ)+" шт · "+pct+"% от суммы";
  });
  const vEl=g("admTotVal"),qEl=g("admTotQty"),cEl=g("admTotCat");
  if(vEl)vEl.innerHTML=fm(gS)+" <span>"+CUR+"</span>";
  if(qEl)qEl.textContent=fm(gQ);
  if(cEl)cEl.textContent=fm(gC);
 };
 root.addEventListener("click",e=>{const ed=e.target.closest("[data-doc-edit]");if(ed){openAdmDocEditModal(code,ed.dataset.docEdit);return}const dl=e.target.closest("[data-doc-del]");if(dl){cancelAdmDoc(code,dl.dataset.docDel,dl);return}const fb=e.target.closest("[data-aseg] button");if(fb){flt=fb.dataset.f;root.querySelectorAll("[data-aseg] button").forEach(b=>b.classList.toggle("on",b===fb));apply();return}const tg=e.target.closest("[data-atog]");if(tg){const card=tg.closest(".sum-cat");if(card){card.classList.toggle("open");const ch=card.querySelector(".sum-chv");if(ch)ch.textContent=card.classList.contains("open")?"▾":"▸"}}});
 root.addEventListener("input",e=>{if(e.target&&e.target.matches("[data-docsrch]")){docQ=e.target.value;applyDocFilter();return}if(e.target&&e.target.matches("[data-asrch]")){q=e.target.value.trim().toLowerCase();apply()}});
 ov._refresh=()=>{const st=root.scrollTop;root.innerHTML=build(true);
  if(flt!=="all")root.querySelectorAll("[data-aseg] button").forEach(b=>b.classList.toggle("on",b.dataset.f===flt));
  const si=root.querySelector("[data-asrch]");if(si&&q)si.value=q;
  if(flt!=="all"||q)apply();
  if(docQ)applyDocFilter();
  root.scrollTop=st};
 if(openDocs)ov.classList.add("show");else requestAnimationFrame(()=>ov.classList.add("show"));
}
function drawTotals(){
 const CL=allCars(),carList=getCarsList();if(SEL!=="all"&&!carList.includes(SEL))SEL="all";
 const curSelLabel=SEL==="all"?"Все экипажи":(SEL==="ADMIN"?"Админ":"Экипаж "+SEL);
 let h="<button type=\"button\" class=\"sel-btn\" data-act=\"opensel\"><span class=\"sel-btn-l\"><span class=\"sel-ic\">🚚</span><span class=\"sel-btn-t\">"+esc(curSelLabel)+"</span></span><svg class=\"sel-chev\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m6 9 6 6 6-6\"/></svg></button>";
 const badge=cd=>cd==="ADMIN"?"<span style=\"min-width:36px;height:34px;padding:0 6px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.24),rgba(124,58,237,.12));border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0\">🛡️</span>":"<span data-no-i18n=\"1\" style=\"min-width:36px;height:34px;padding:0 6px;border-radius:11px;background:rgba(16,185,129,.16);border:1px solid rgba(52,211,153,.35);color:#6ee7b7;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0\">"+esc(cd)+"</span>";
 if(SEL==="all"){
  const curList=CL.filter(c=>c.qty>0||c.sum>0||c.crew.length>0).sort((a,b)=>b.sum-a.sum);
  const sum=curList.reduce((a,x)=>a+x.sum,0),qty=curList.reduce((a,x)=>a+x.qty,0);
  h+="<div class=\"sum-dash\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">Текущий месяц · по экипажам</div><div class=\"sum-val\">"+fm(sum)+" <span>"+CUR+"</span></div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b>"+fm(qty)+"</b><span>штук</span></div><div class=\"sum-kpi\"><b>"+curList.length+"</b><span>экипажей</span></div></div></div>"+(curList.length?"<button type=\"button\" class=\"cp-btn\" style=\"margin-top:12px;background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csvcur\">📥 Скачать Excel по экипажам</button>":"")+"</div>";
  if(curList.length){h+="<div class=\"sec\">Экипажи в текущем месяце ("+curList.length+")</div>"+curList.map(x=>{const dc=Object.keys((CARS[x.code]&&CARS[x.code].docs)||{}).length;return"<div class=\"st-row\" data-act=\"open-car-sum\" data-id=\""+esc(x.code)+"\" data-sub=\"cur\"><div style=\"display:flex;align-items:center;gap:10px;min-width:0\">"+badge(x.code)+"<div style=\"min-width:0\"><div class=\"st-nm\"><span>Экипаж</span> <span data-no-i18n=\"1\">"+esc(x.code)+"</span></div><div class=\"st-qt\"><span>"+fm(x.qty)+" шт</span>"+(dc?" · 📜 "+dc:"")+(x.crew.length?" · <span data-no-i18n=\"1\">"+esc(x.crew.join(", "))+"</span>":"")+"</div></div></div><div class=\"rv\" style=\"font-size:13.5px\">"+money(x.sum)+" ›</div></div>"}).join("")}
  const ms=aggCarMonths(CL);h+="<div class=\"sec\">Архив сохранённых месяцев ("+ms.length+")</div>";
  if(!ms.length)h+="<div class=\"mut box\">Сохранённых итогов по экипажам пока нет.</div>";
  h+=ms.map(x=>{const key="all|"+x.m,op=!!OPEN[key];return"<div class=\"mr col\" data-act=\"month\" data-key=\""+esc(key)+"\"><div class=\"mrt\"><div class=\"rm\"><div class=\"rt\">📅 "+esc(monthName(x.m))+"</div><div class=\"rs\"><span>"+fm(x.qty)+" шт</span> · <span>машин: "+x.cars.length+"</span></div></div><div class=\"rv\">"+money(x.sum)+"</div><span class=\"ar\">"+(op?"▾":"▸")+"</span></div>"+(op?"<div class=\"dt\" onclick=\"event.stopPropagation()\">"+x.cars.map(cv=>"<div class=\"st-row\" data-act=\"open-car-month\" data-id=\""+esc(cv.code)+"\" data-m=\""+esc(x.m)+"\"><div style=\"display:flex;align-items:center;gap:10px;min-width:0\">"+badge(cv.code)+"<div style=\"min-width:0\"><div class=\"st-nm\"><span>Экипаж</span> <span data-no-i18n=\"1\">"+esc(cv.code)+"</span></div><div class=\"st-qt\"><span>"+fm(cv.qty)+" шт</span>"+(cv.crew&&cv.crew.length?" · <span data-no-i18n=\"1\">"+esc(cv.crew.join(", "))+"</span>":"")+"</div></div></div><div class=\"rv\" style=\"font-size:13.5px\">"+money(cv.sum)+" ›</div></div>").join("")+"<button type=\"button\" class=\"cp-btn\" style=\"background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csvmonth\" data-m=\""+esc(x.m)+"\">📥 Скачать Excel за "+esc(monthName(x.m))+"</button></div>":"")+"</div>"}).join("");
 }else{
  const c=parseCar(SEL);
  const curDocsCount=Object.keys((CARS[SEL]&&CARS[SEL].docs)||{}).length;
  h+="<div class=\"sum-dash sum-dash-btn\" data-act=\"subopen\" data-sub=\"cur\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">Текущий месяц · открыть ›</div><div class=\"sum-val\">"+fm(c.sum)+" <span>"+CUR+"</span></div><div style=\"font-size:12px;color:#8b9bb4;margin-top:4px\">"+(c.crew.length?"<span>Экипаж</span>: <span data-no-i18n=\"1\">"+esc(c.crew.join(", "))+"</span>":"<span>Экипаж не назначен</span>")+"</div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b>"+fm(c.qty)+"</b><span>штук</span></div>"+(curDocsCount?"<div class=\"sum-kpi\"><b style=\"color:#fde047\">"+curDocsCount+"</b><span>записей</span></div>":"")+"</div></div>"+(c.qty>0||c.sum>0||curDocsCount>0?"<button type=\"button\" class=\"cp-btn\" style=\"margin-top:12px;background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csv-single-cur\" data-car=\""+esc(SEL)+"\">📊 Открыть таблицу / Excel</button>":"")+"</div><div class=\"sec\">Сохранённые итоги</div>";
  const ks=Object.keys(c.hist).filter(k=>c.hist[k]).sort((a,b)=>{const x=c.hist[a],y=c.hist[b];return(y.m||"")<(x.m||"")?-1:(y.m||"")>(x.m||"")?1:(y.t||0)-(x.t||0)});
  if(!ks.length)h+="<div class=\"mut box\">У экипажа "+esc(SEL)+" нет сохранённых итогов.</div>";
  h+=ks.map(k=>{const x=c.hist[k];const dBtn=!isSubAdm()?"<button type=\"button\" class=\"xb\" data-act=\"del-car-hist\" data-car=\""+esc(SEL)+"\" data-hk=\""+esc(k)+"\" aria-label=\"Удалить\">✕</button>":"";return"<div class=\"mr\" style=\"cursor:pointer\" data-act=\"subopen\" data-sub=\""+esc(k)+"\"><div class=\"rm\"><div class=\"rt\">"+esc(monthName(x.m))+"</div><div class=\"rs\"><span>"+fm(x.qty)+" шт</span> · <span>сохранено</span> <span>"+esc(ago(x.t))+"</span></div></div><div class=\"rv\">"+money(x.sum)+"</div>"+dBtn+"<span class=\"ar\">›</span></div>"}).join("");
 }
 g("view").innerHTML=h;
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
   +'<div class="box"><span>Отправляет всем устройствам команду перезагрузить приложение с сервера. Устройство обновится, когда приложение открыто и в нём не заполняется форма.</span><br><br>'
   +'<span>Последняя команда:</span> '+(FU?'<b data-no-i18n="1">'+esc(new Date(FU).toLocaleString(admLoc()))+'</b> (<b>'+esc(ago(FU))+'</b>)':'<b>ещё не отправлялась</b>')+'</div>'
   +'<button class="btn" data-act="force">🔄 Обновить у всех</button>';
  g('view').innerHTML=h;
 }
 const _ocrPrunedPend=new Set();
 function isStaleOcrPending(k,p){
  if(!p||!p.code||!OCR_CAT_NAMES[p.code])return true;
  if(p.from&&p.from===p.code)return true;
  if(OCR_MAP[k]&&OCR_MAP[k]===p.code)return true;
  return false;
 }
 function getOcrPending(){
  const list=[];
  Object.keys(USERS).forEach(uid=>{
   const op=USERS[uid]&&USERS[uid].ocrPending;
   if(op&&typeof op==='object'){
    Object.keys(op).forEach(k=>{
     const p=op[k];
     if(!p||!p.code||isStaleOcrPending(k,p))return;
     list.push({uid,k,p});
    });
   }
  });
  return list;
 }
 function pruneStaleOcrPending(){
  if(!auth||!auth.currentUser||isSubAdm())return;
  Object.keys(USERS).forEach(uid=>{
   const op=USERS[uid]&&USERS[uid].ocrPending;
   if(!op||typeof op!=='object')return;
   const patch={},added=[];
   Object.keys(op).forEach(k=>{
    const p=op[k];
    if(!p||!isStaleOcrPending(k,p))return;
    const pk=uid+'/'+k;
    if(_ocrPrunedPend.has(pk))return;
    _ocrPrunedPend.add(pk);
    patch[k]=null;
    added.push(pk);
   });
   if(added.length){
    db.ref('users/'+uid+'/ocrPending').update(patch).catch(()=>{added.forEach(pk=>_ocrPrunedPend.delete(pk))});
   }
  });
 }
 function updOcrTabBdg(){
  const b=g('ocrTabBdg');if(!b)return;
  const n=getOcrPending().length;
  b.textContent=n>99?'99+':String(n);
  b.hidden=n===0;
 }
 const ocrNorm=s=>String(s||'').toLowerCase().replace(/և|եւ/g,'եվ').replace(/ё/g,'е').replace(/[–—−]/g,'-').replace(/[,]/g,'.').replace(/[_\/]+/g,' ').replace(/\s+/g,' ').trim();
 const OCR_HY_KW={other:'այլ աթոռ դարակաշար սեղան լվացարան կոմոդ մահճակալ մոդուլ ներքնակ պահոց դուռ պուֆ տումբա ջահ արդուկ',sofas:'բազմոց բազկաթոռ հավաքածու',recep:'ընդունարան ռեսեպշեն նախասրահ',kitchen:'խոհանոց',living:'հյուրասրահ հյուրասենյակ տակդիր',bedroom:'ննջասենյակ ննջարան',wardrobe:'պահարան'};
 function drawOcr(){
  pruneStaleOcrPending();
  const pendList=getOcrPending();
  const allKeys=Object.keys(OCR_MAP).filter(k=>OCR_MAP[k]&&OCR_CAT_NAMES[OCR_MAP[k]]).sort();
  const recalcBtn=!isSubAdm()?'<button type="button" data-act="ocr-recalc" style="height:40px;padding:0 12px;border-radius:12px;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.42);color:#7dd3fc;font-size:13px;font-weight:700;white-space:nowrap">🔄 Пересчитать</button>':'';
  let h='<div class="sum-dash"><div class="sum-top" style="flex-wrap:wrap;gap:8px"><div><div class="sum-lbl">Общий словарь накладных</div><div class="sum-val">'+allKeys.length+' <span>правил</span></div></div><div style="display:flex;gap:6px;flex-wrap:wrap">'+recalcBtn+'<button type="button" data-act="ocr-add" style="height:40px;padding:0 14px;border-radius:12px;background:rgba(16,185,129,.22);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:13.5px;font-weight:700;white-space:nowrap">➕ Добавить</button></div></div></div>';
  if(pendList.length){
   h+='<div class="sec" style="color:#fde047">🧾 Ожидают подтверждения ('+pendList.length+')</div>';
   h+=pendList.map(({uid,k,p})=>{
    const prevCd=(p.from&&p.from!==p.code)?p.from:((OCR_MAP[k]&&OCR_MAP[k]!==p.code)?OCR_MAP[k]:'');
    const byHtml=p.by?'<span data-no-i18n="1">'+esc(p.by)+'</span>':'<span>Водитель</span>';
    const diffHtml=prevCd
     ?'<div class="rs" style="margin-top:4px;line-height:1.45"><span>Было:</span> <span style="color:#fca5a5">'+esc(OCR_CAT_NAMES[prevCd]||prevCd)+'</span><br><span>Стало:</span> <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[p.code]||p.code)+'</b> · <span>от</span> '+byHtml+'</div>'
     :'<div class="rs" style="margin-top:4px;line-height:1.45"><span style="display:inline-block;padding:1px 7px;border-radius:6px;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.38);color:#7dd3fc;font-size:11px;font-weight:700;margin-right:5px">🆕 Новый товар</span><span>Добавить в:</span> <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[p.code]||p.code)+'</b> · <span>от</span> '+byHtml+'</div>';
    return '<div class="mr col" style="cursor:default;border-color:rgba(250,204,21,.4);background:linear-gradient(180deg,rgba(36,30,14,.92) 0%,rgba(16,18,28,.96) 100%)">'
     +'<div class="rm"><div class="rt" style="font-size:14px">📄 <span data-no-i18n="1">'+esc(p.raw||k)+'</span></div>'+diffHtml+'</div>'
     +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'
     +'<button type="button" data-act="ocr-ok" data-uid="'+esc(uid)+'" data-k="'+esc(k)+'" data-code="'+esc(p.code)+'" style="height:36px;border-radius:10px;background:rgba(16,185,129,.22);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:13px;font-weight:700">✓ Одобрить для всех</button>'
     +'<button type="button" data-act="ocr-no" data-uid="'+esc(uid)+'" data-k="'+esc(k)+'" style="height:36px;border-radius:10px;background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.38);color:#fca5a5;font-size:13px;font-weight:700">✕ Отклонить</button>'
     +'</div></div>';
   }).join('');
  }
  h+='<div class="sec">Все правила ('+allKeys.length+')</div>';
  h+='<input id="ocrSrchInp" class="sum-srch" type="search" value="'+esc(OCR_Q)+'" placeholder="Поиск по названию или категории..." style="margin-bottom:10px!important"><div id="ocrRulesList"></div>';
  const curInp=g('ocrSrchInp'),wasFocused=curInp&&document.activeElement===curInp;
  const renderList=()=>{
   const box=g('ocrRulesList');if(!box)return;
   const tokens=ocrNorm(OCR_Q).split(' ').filter(Boolean);
   const keys=tokens.length?allKeys.filter(k=>{
    const cd=OCR_MAP[k],grp=(cd||'').split('_')[0];
    const hay=ocrNorm(k+' '+k.replace(/_/g,'.')+' '+(OCR_CAT_NAMES[cd]||'')+' '+(OCR_HY_KW[grp]||''));
    return tokens.every(t=>hay.includes(t));
   }):allKeys;
   if(!keys.length){box.innerHTML='<div class="mut box">'+(allKeys.length?'Ничего не найдено по запросу.':'Словарь пуст. Правила появятся после сканирования накладных или добавления вручную.')+'</div>';return;}
   box.innerHTML=keys.map(k=>{
    const cd=OCR_MAP[k];
    return '<div class="row" data-act="ocr-edit" data-k="'+esc(k)+'" style="padding:11px 12px">'
     +'<div class="rm"><div class="rt" style="font-size:14px">📄 <span data-no-i18n="1">'+esc(k)+'</span></div>'
     +'<div class="rs" style="color:#6ee7b7;font-weight:600">'+esc(OCR_CAT_NAMES[cd]||cd)+'</div></div>'
     +'<button type="button" class="xb" data-act="ocr-del" data-k="'+esc(k)+'" aria-label="Удалить">✕</button></div>';
   }).join('');
  };
  if(wasFocused&&g('ocrRulesList')){renderList();return;}
  g('view').innerHTML=h;
  renderList();
  const inp=g('ocrSrchInp');
  if(inp)inp.oninput=e=>{OCR_Q=e.target.value;renderList()};
 }
 // ===== Табель пропусков (по экипажам + ручные сотрудники без приложения) =====
 const ATT_WD=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
 function attCurYm(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
 function attShiftYm(ym,delta){
  const p=String(ym||attCurYm()).split('-');
  const d=new Date((+p[0]||new Date().getFullYear()),(+p[1]||1)-1+delta,1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 }
 function attBuildGroups(){
  const manualObj=(ATT&&ATT.workers)||{};
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
   name:LABELS[d.id]||profName(d)||devName(d.u.ua),
   car:String(d.u.car||'').toUpperCase()
  })).sort((a,b)=>a.name.localeCompare(b.name,'ru'));

  const offRank=wd=>(wd>=1&&wd<=6)?wd:(wd===0?7:8);
  const groups=CARS_LIST.map((code,idx)=>{
   const appM=appList.filter(x=>x.car===code);
   const manM=manualList.filter(x=>x.car===code);
   return {code:code,title:'Экипаж '+code,members:[...appM,...manM],_ord:idx};
  }).sort((a,b)=>(offRank(getCrewOff(a.code))-offRank(getCrewOff(b.code)))||(a._ord-b._ord));

  const known=new Set(CARS_LIST);
  const noCarApp=appList.filter(x=>!x.car||!known.has(x.car));
  const noCarMan=manualList.filter(x=>!x.car||!known.has(x.car));
  if(noCarApp.length||noCarMan.length){
   groups.push({code:'',title:'Без экипажа',members:[...noCarApp,...noCarMan]});
  }
  return groups;
 }
 function drawAtt(){
  const now=new Date(),curYm=attCurYm(),isCurMonth=ATT_YM===curYm,todayDay=isCurMonth?now.getDate():-1;
  const parts=ATT_YM.split('-'),yr=+parts[0]||now.getFullYear(),mo=(+parts[1]||1)-1;
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const groups=attBuildGroups();
  const allMembers=groups.reduce((a,gr)=>a.concat(gr.members),[]);
  const mData=(ATT&&ATT.months&&ATT.months[ATT_YM])||{};

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

  const structKey=ATT_YM+'|'+groups.map(gr=>gr.code+':'+getCrewOff(gr.code)+':'+gr.members.map(m=>m.pid+'='+m.name).join(',')).join(';');
  const exWrap=g('attWrap');

  // Точечное обновление без пересоздания DOM (ноль дёрганий и сбросов скролла)
  if(!ATT_ERR&&exWrap&&exWrap.dataset.sk===structKey){
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
  if(!ATT_ERR&&exWrap&&exWrap.dataset.ym===ATT_YM&&g('attBody')&&g('attFoot')){
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
   +'<div class="tile"><b id="attStatTd">'+(isCurMonth?todayAbs:'—')+'</b><span>'+(isCurMonth?'не вышли сегодня':'не тек. месяц')+'</span></div>'
   +'</div>';

  h+='<div class="att-bar">'
   +'<button type="button" class="att-nav" data-act="att-prev" aria-label="Предыдущий месяц">◀</button>'
   +'<div class="att-m-title"><span>📅 '+esc(monthName(ATT_YM))+'</span>'+(isCurMonth?'':'<button type="button" class="att-today-btn" data-act="att-today">Сегодня</button>')+'</div>'
   +'<button type="button" class="att-nav" data-act="att-next" aria-label="Следующий месяц">▶</button>'
   +'</div>';

  h+='<div class="att-acts">'
   +'<button type="button" class="att-act-btn add" data-act="att-add">➕ Рабочий</button>'
   +'<button type="button" class="att-act-btn sec-b" data-act="att-copy">📋 Отчёт</button>'
   +'<button type="button" class="att-act-btn sec-b" data-act="att-csv">📊 Excel</button>'
   +'</div>';

  if(ATT_ERR){
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

  h+='<div id="attWrap" class="att-wrap" data-ym="'+esc(ATT_YM)+'" data-sk="'+esc(structKey)+'"><table class="att-tbl"><thead>'+thead+'</thead><tbody id="attBody">'+tbody+'</tbody><tfoot id="attFoot">'+tfoot+'</tfoot></table></div>';
  h+='<div class="mut hint"><span>📱 — приложение</span> · <b style="color:#fbbf24">В</b> <span>— выходной</span> · <b style="color:#fca5a5">✕</b> <span>— не вышел на смену</span> · <b style="color:#6ee7b7">✓</b> <span>— вышел в выходной</span> · <span>Нажмите на день у экипажа, чтобы сменить выходной.</span></div>';
  g('view').innerHTML=h;

  const wrap=g('attWrap');
  if(wrap&&ATT_SCROLLED_YM!==ATT_YM){
   ATT_SCROLLED_YM=ATT_YM;
   const tdEl=g('attTdCol');
   if(tdEl){
    wrap.scrollLeft=Math.max(0,tdEl.offsetLeft-160);
   }
  }
 }
 function openAttPickCarModal(title,curCar,onPick){
  const ov=document.createElement('div');ov.className='ov';
  let items=CARS_LIST.map(c=>'<div class="sel-it'+(curCar===c?' on':'')+'" data-c="'+c+'"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Экипаж '+c+'</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>').join('');
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
  if(!ATT.months)ATT.months={};
  if(!ATT.months[ATT_YM])ATT.months[ATT_YM]={};
  if(!ATT.months[ATT_YM][pid])ATT.months[ATT_YM][pid]={};
  const isSet=!!ATT.months[ATT_YM][pid][day];
  // Оптимистическое точечное обновление без задержки и без дёрганий
  if(isSet)delete ATT.months[ATT_YM][pid][day];
  else ATT.months[ATT_YM][pid][day]=true;
  drawAtt();
  try{
   const ref=db.ref('attendance/months/'+ATT_YM+'/'+pid+'/'+day);
   if(isSet)await ref.remove();
   else await ref.set(true);
   if(isSubAdm()){
    let nm=pid,car='';
    if(String(pid).startsWith('u_')){
     const uid=String(pid).slice(2),du=USERS[uid];
     if(du){const dp=parseDev(uid,du);nm=dispName(dp);car=String(dp.u.car||'').toUpperCase()}
    }else{
     const w=ATT&&ATT.workers&&ATT.workers[pid];
     if(w){nm=w.name||pid;car=String(w.car||'').toUpperCase()}
    }
    const pts=ATT_YM.split('-'),yr=+pts[0]||new Date().getFullYear(),mo=(+pts[1]||1)-1;
    const wd=new Date(yr,mo,day).getDay();
    const isOff=car&&typeof getCrewOff==='function'&&getCrewOff(car)===wd;
    const dtStr=String(day).padStart(2,'0')+'.'+String(mo+1).padStart(2,'0')+'.'+yr;
    const ttl=isOff?(isSet?'Снята отметка выхода в выходной':'Выход в выходной'):(isSet?'Снят пропуск в табеле':'Отмечен пропуск в табеле');
    logSubAct('att',isSet?'att_unmark':'att_mark',ttl,nm+' · '+dtStr,{car:car,target:nm});
   }
  }catch(e){
   if(isSet)ATT.months[ATT_YM][pid][day]=true;
   else delete ATT.months[ATT_YM][pid][day];
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
  const w=(ATT&&ATT.workers&&ATT.workers[wid]);
  if(!w)return;
  const wCar=String(w.car||'').toUpperCase();
  const appUsers=devs().filter(d=>{
   const car=String(d.u.car||'').toUpperCase();
   const acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   return !blk && car!=='ADMIN';
  }).map(d=>({
   uid:d.id,
   name:LABELS[d.id]||profName(d)||devName(d.u.ua),
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
  const w=(ATT&&ATT.workers&&ATT.workers[wid]);
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
  if(!code||!CARS_LIST.includes(code))return;
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
  const p=ATT_YM.split('-'),yr=+p[0],mo=(+p[1]||1)-1;
  const dim=new Date(yr,mo+1,0).getDate();
  const mData=(ATT&&ATT.months&&ATT.months[ATT_YM])||{};
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
  const title=monthName(ATT_YM);
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
  const p=ATT_YM.split('-'),yr=+p[0],mo=(+p[1]||1)-1;
  const dim=new Date(yr,mo+1,0).getDate();
  const mData=(ATT&&ATT.months&&ATT.months[ATT_YM])||{};
  let totA=0,totW=0;
  const lines=['📅 '+trAdm('Табель')+' — '+trAdm(monthName(ATT_YM))];
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
 function draw(){
  if(g('panel').hidden)return;
  updOcrTabBdg();
  const sub=isSubAdm();
  const tabsEl=document.querySelector('.tabs');
  if(tabsEl)tabsEl.style.gridTemplateColumns='repeat(5,1fr)';
  const mapTab=document.querySelector('.tabs button[data-tab="map"]');
  const attTab=document.querySelector('.tabs button[data-tab="att"]');
  const ocrTab=document.querySelector('.tabs button[data-tab="ocr"]');
  const verTab=document.querySelector('.tabs button[data-tab="ver"]');
  const admAttBtn=g('admAttBtn');
  if(mapTab)mapTab.hidden=false;
  if(attTab)attTab.hidden=!sub;
  if(verTab)verTab.hidden=sub;
  if(admAttBtn){admAttBtn.hidden=sub;admAttBtn.classList.toggle('adm-att-on',TAB==='att');}
  if(ocrTab)ocrTab.hidden=false;
  if(sub&&SEL==='ADMIN')SEL='all';
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===TAB));
  const st=window.scrollY;
  const keepAttScroll=TAB==='att'&&!!g('attWrap');
  if(TAB!=='map'&&_map)destroyMap();
  if(TAB==='online')drawOnline();
  else if(TAB==='map')drawMap();
  else if(TAB==='att')drawAtt();
  else if(TAB==='totals')drawTotals();
  else if(TAB==='ocr')drawOcr();
  else drawVer();
  if(!keepAttScroll)window.scrollTo(0,st);
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

 
 
 
 async function migrateDevToCar(uid, carCode){
  if(!uid || !carCode || !USERS[uid]) return false;
  const u = USERS[uid];
  let raw = [];
  try { raw = JSON.parse(u.bonRaw || "[]"); } catch(e){}
  const qtyDelta = {};
  if (Array.isArray(raw)) {
   raw.forEach(c => {
    if (!c || !Array.isArray(c.subs)) return;
    c.subs.forEach(sub => {
     const q1 = +sub.qty || 0, q2 = sub.one ? 0 : (+sub.qty2 || 0);
     const k1 = c.pk + "_" + sub.sk, k2 = k1 + "_2";
     if (q1 > 0) qtyDelta[k1] = (qtyDelta[k1] || 0) + q1;
     if (q2 > 0) qtyDelta[k2] = (qtyDelta[k2] || 0) + q2;
    });
   });
  }
  let histObj = {};
  try { histObj = JSON.parse(u.hist || "{}"); } catch(e){}
  const hasQty = Object.keys(qtyDelta).length > 0;
  const hasHist = histObj && typeof histObj === "object" && Object.keys(histObj).length > 0;
  if (!hasQty && !hasHist) return false;
  if (hasQty) {
   await db.ref("cars/" + carCode + "/qty").transaction(cur => {
    const next = (cur && typeof cur === "object") ? Object.assign({}, cur) : {};
    Object.keys(qtyDelta).forEach(k => { next[k] = (+next[k] || 0) + qtyDelta[k]; });
    return next;
   });
   await db.ref("cars/" + carCode + "/t").set(Date.now());
  }
  if (hasHist) {
   await db.ref("cars/" + carCode + "/hist").update(histObj);
  }
  await db.ref("users/" + uid).update({ bonRaw: "[]", cur: JSON.stringify({ sum: 0, qty: 0, cats: [] }), hist: "{}" });
  return true;
 }

function openOcrRuleModal(ruleKey, curCode, isNew = false){
  const CAT_ICO = { 'Другое': '📦', 'Диваны': '🛋️', 'Ресепшен': '🗄️', 'Кухни': '🍳', 'Гостиная': '📺', 'Спальни': '🛏️', 'Шкафы': '🚪' };
  const allItems = Object.keys(OCR_CAT_NAMES).map(cd => {
   const parts = OCR_CAT_NAMES[cd].split(' · ');
   return { cd, cat: parts[0] || 'Другое', name: parts[1] || OCR_CAT_NAMES[cd] };
  });
  const catsList = Array.from(new Set(allItems.map(x => x.cat)));
  const curObj = allItems.find(x => x.cd === curCode);
  let selCat = curObj ? curObj.cat : 'all', q = '', selectedCd = curCode || '';

  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.style.zIndex = '99999';

  ov.innerHTML = '<div class="dlg aop-box" style="max-width:440px;height:min(88dvh,620px)">'
   + '<div class="aop-hd"><div><b>' + (isNew ? '➕ Новое правило OCR' : '✏️ Настройка правила') + '</b>' + (isNew ? '<small>Сопоставление товара из накладной с каталогом</small>' : '<small data-no-i18n="1">' + esc(ruleKey) + '</small>') + '</div><button type="button" class="sel-x">✕</button></div>'
   + (isNew ? '<div style="padding:10px 14px 6px;flex-shrink:0"><label style="display:block;font-size:11.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Текст из накладной (как написано в чеке):</label><input id="aopRuleKeyInp" type="text" value="' + esc(ruleKey || '') + '" placeholder="Например: Ննջասենյակ կ. Մոնա Լիզա" style="width:100%;height:38px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#f8fafc;font-size:13px;outline:none;box-sizing:border-box"></div>' : '')
   + '<div style="padding:4px 14px 0;flex-shrink:0"><label style="display:block;font-size:11.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Выберите категорию и модель для начисления бонуса:</label></div>'
   + '<div class="aop-srch"><input id="aopInp" type="search" placeholder="🔍 Быстрый поиск мебели..."></div>'
   + '<div class="aop-chips" id="aopChips"><button type="button" data-c="all" class="' + (selCat === 'all' ? 'on' : '') + '">Все</button>'
   + catsList.map(c => '<button type="button" data-c="' + esc(c) + '" class="' + (selCat === c ? 'on' : '') + '">' + (CAT_ICO[c] || '📦') + ' ' + esc(c) + '</button>').join('')
   + '</div><div class="aop-list" id="aopList"></div>'
   + '<div style="padding:10px 14px;background:rgba(0,0,0,.2);border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;flex-shrink:0">'
   + '<button type="button" id="aopCancelBtn" style="flex:1;height:40px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer">Отмена</button>'
   + '<button type="button" id="aopSaveBtn" style="flex:1.4;height:40px;border-radius:11px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.35)">✓ Сохранить правило</button>'
   + '</div></div>';
  document.body.appendChild(ov);

  const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 180); };
  ov.querySelector('.sel-x').onclick = close;
  ov.querySelector('#aopCancelBtn').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };

  const drawItems = () => {
   const box = g('aopList');
   const qTokens = ocrNorm(q).split(' ').filter(Boolean);
   const list = allItems.filter(it => {
    if (selCat !== 'all' && it.cat !== selCat) return false;
    if (!qTokens.length) return true;
    const grp = (it.cd || '').split('_')[0];
    const hay = ocrNorm(it.name + ' ' + it.cat + ' ' + (OCR_HY_KW[grp] || ''));
    return qTokens.every(t => hay.includes(t));
   });
   if (!list.length) { box.innerHTML = '<div class="mut" style="text-align:center;padding:20px">Ничего не найдено</div>'; return; }
   box.innerHTML = list.map(it => {
    const on = it.cd === selectedCd;
    return '<button type="button" class="aop-it' + (on ? ' on' : '') + '" data-cd="' + it.cd + '"><span>' + (CAT_ICO[it.cat] || '📦') + '</span><span class="aop-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.cat) + '</small></span><span class="sel-chk">' + (on ? '✓' : '') + '</span></button>';
   }).join('');
  };

  g('aopChips').onclick = e => {
   const b = e.target.closest('button[data-c]'); if (!b) return;
   selCat = b.dataset.c;
   g('aopChips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
   drawItems();
  };
  g('aopInp').oninput = e => { q = e.target.value.trim().toLowerCase(); drawItems(); };
  g('aopList').onclick = e => {
   const it = e.target.closest('button[data-cd]'); if (!it) return;
   selectedCd = it.dataset.cd;
   drawItems();
  };

  g('aopSaveBtn').onclick = async () => {
   const finalKey = isNew ? (g('aopRuleKeyInp') ? g('aopRuleKeyInp').value : '') : ruleKey;
   const fixedKey = (isNew && typeof window.ocrFixName === 'function') ? window.ocrFixName(finalKey) : finalKey;
   const cleanKey = isNew ? admFbKey(fixedKey) : String(ruleKey || '');
   if (!cleanKey) { toast('Введите название товара из накладной', true); return; }
   if (!selectedCd) { toast('Выберите категорию мебели из списка', true); return; }
   close();
   try {
    await db.ref('config/ocrMap/' + cleanKey).set(selectedCd);
    logSubAct('ocr', isNew ? 'ocr_add' : 'ocr_edit', isNew ? 'Добавлено правило OCR' : 'Изменено правило OCR', cleanKey + ' → ' + (OCR_CAT_NAMES[selectedCd] || selectedCd), { target: cleanKey });
    toast('Правило успешно сохранено');
    if (typeof drawOcr === 'function') drawOcr();
    if (!isSubAdm()) {
     const plan = findAffectedDocsByRule(cleanKey, selectedCd);
     if (plan.length) openRecalcModal(plan, 'Найдены накладные с этим товаром');
    }
   } catch (err) {
    toast('Ошибка сохранения: ' + err.message, true);
   }
  };

  drawItems();
  requestAnimationFrame(() => ov.classList.add('show'));
 }
 
function openOnlCrewModal(){
  const L=devs(),now=Date.now();
  const crewCount = c => L.filter(d => String(d.u.car||'').toUpperCase() === c).length;
  const crewOnCount = c => L.filter(d => String(d.u.car||'').toUpperCase() === c && now - (d.u.t||0) < TTL).length;
  const noCrewCount = L.filter(d => !String(d.u.car||'').trim()).length;
  const noCrewOnCount = L.filter(d => !String(d.u.car||'').trim() && now - (d.u.t||0) < TTL).length;
  const onTotal = L.filter(d => now - (d.u.t||0) < TTL).length;

  const ov=document.createElement('div');ov.className='ov';
  let items = '<div class="sel-it' + (ONL_CAR === 'all' ? ' on' : '') + '" data-c="all">'
            + '<div class="sel-it-l"><span class="sel-ic">🌐</span><div><div class="sel-it-nm">Все экипажи</div><div class="sel-it-sb">Все водители и устройства</div></div></div>'
            + '<div class="sel-it-r"><span class="onl-badge' + (onTotal ? ' on' : '') + '">' + CARS_LIST.length + '</span></div></div>';

  CARS_LIST.forEach(c => {
    const total = crewCount(c), on = crewOnCount(c);
    const badge = '<span class="onl-badge' + (on ? ' on' : '') + '">' + (on ? '🟢 ' + on + ' / ' : '') + total + '</span>';
    const crewNames = devs().filter(x => String(x.u.car||'').toUpperCase() === c).map(x => dispName(x)).join(', ');
    items += '<div class="sel-it' + (ONL_CAR === c ? ' on' : '') + '" data-c="' + c + '">'
           + '<div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm"><span>Экипаж</span> <span data-no-i18n="1">' + c + '</span></div><div class="sel-it-sb">' + (crewNames ? '<span data-no-i18n="1">' + esc(crewNames) + '</span>' : 'Нет назначенных водителей') + '</div></div></div>'
           + '<div class="sel-it-r">' + badge + '</div></div>';
  });

  items += '<div class="sel-it' + (ONL_CAR === 'none' ? ' on' : '') + '" data-c="none">'
         + '<div class="sel-it-l"><span class="sel-ic" style="background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#fbbf24">🚫</span><div><div class="sel-it-nm">Без экипажа</div><div class="sel-it-sb">Водители без назначенного экипажа</div></div></div>'
         + '<div class="sel-it-r"><span class="onl-badge' + (noCrewOnCount ? ' on' : '') + '">' + (noCrewOnCount ? '🟢 ' + noCrewOnCount + ' / ' : '') + noCrewCount + '</span></div></div>';

  ov.innerHTML = '<div class="dlg sel-dlg"><div class="sel-hd"><b>🚚 Фильтр по экипажам</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">' + items + '</div></div>';
  document.body.appendChild(ov);
  const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 180); };
  ov.querySelector('.sel-x').onclick = close;
  ov.onclick = e => {
    if(e.target === ov){ close(); return; }
    const it = e.target.closest('.sel-it'); if(!it) return;
    ONL_CAR = it.dataset.c || 'all';
    close();
    drawOnline();
  };
  requestAnimationFrame(() => ov.classList.add('show'));
}

function openCarModal(uid){
  if(!uid||!USERS[uid])return;
  const d=parseDev(uid,USERS[uid]),curCar=String(d.u.car||'').toUpperCase();
  if(isSubAdm()&&curCar==='ADMIN'){toast('Нельзя менять экипаж администратора',true);return}
  const ov=document.createElement('div');ov.className='ov';
  const crewOf=c=>devs().filter(x=>String(x.u.car||'').toUpperCase()===c).map(x=>dispName(x)).join(', ');
  let items='<div class="sel-it'+(!curCar?' on':'')+'" data-c=""><div class="sel-it-l"><span class="sel-ic" style="background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#fbbf24">🚫</span><div><div class="sel-it-nm">Без экипажа</div><div class="sel-it-sb">Начисление бонусов заблокировано</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  items+=CARS_LIST.map(c=>{
   const on=curCar===c,crew=crewOf(c),nt=(CREWS_META[c]&&CREWS_META[c].note)||'';
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
     const hasOld = (+d.cur.sum > 0) || (d.hist && Object.keys(d.hist).length > 0);
     if (hasOld && await ask("У водителя есть личные бонусы (" + money(d.cur.sum) + "). Перенести их в общий котёл экипажа " + nc + "?", { title: "Перенос бонусов", okText: "Перенести" })) {
      moved = await migrateDevToCar(uid, nc);
     }
     const wObj = (ATT && ATT.workers) || {};
     const uNames = [LABELS[uid], profName(d)].filter(Boolean).map(s => String(s).trim().toLowerCase());
     const matchWid = Object.keys(wObj).find(k => {
      const w = wObj[k];
      if (!w || !w.name) return false;
      return String(w.car || '').toUpperCase() === nc && uNames.includes(String(w.name).trim().toLowerCase());
     });
     if (matchWid && await ask('В табеле экипажа ' + nc + ' уже есть добавленный вручную «' + wObj[matchWid].name + '». Перенести всю его статистику на этот аккаунт и убрать дубликат?', { title: 'Перенос табеля', okText: 'Перенести' })) {
      await attMergeManualToApp(matchWid, uid);
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
  const CL=allCars(),ov=document.createElement('div');ov.className='ov';
  const totSum=CL.reduce((a,c)=>a+c.sum,0);
  let items='<div class="sel-it'+(SEL==='all'?' on':'')+'" data-val="all"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Все экипажи</div><div class="sel-it-sb">Экипажей: '+CARS_LIST.length+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(totSum)+'</span><span class="sel-chk">✓</span></div></div>';
  items+=CL.map(c=>{
   const on=SEL===c.code,isAdm=c.code==='ADMIN';
   const ic=isAdm?'<span class="sel-ic" style="background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.4);color:#c4b5fd">🛡️</span>':'<span class="sel-ic" data-no-i18n="1" style="font-weight:800;font-size:13px">'+c.code+'</span>';
   const nm=isAdm?'<span data-no-i18n="1">Admin</span>':('<span>Экипаж</span> <span data-no-i18n="1">'+c.code+'</span>');
   const nt=!isAdm&&CREWS_META[c.code]&&CREWS_META[c.code].note||'';
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
  ov.onclick=e=>{if(e.target===ov){close();return}const it=e.target.closest('.sel-it');if(it){SEL=it.dataset.val;close();draw()}};
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
   if(tEl)tEl.innerHTML='<span>🚚 Управление экипажами</span> <span style="font-size:12.5px;color:#94a3b8;font-weight:700">('+CARS_LIST.length+')</span>';
   if(!CARS_LIST.length){
    listEl.innerHTML='<div class="mut box" style="text-align:center;margin:8px 0">Экипажей пока нет. Нажмите «Добавить новый экипаж».</div>';
    return;
   }
   const ordered=CARS_LIST.map((cd,idx)=>({cd,idx})).sort((a,b)=>(offRank(getCrewOff(a.cd))-offRank(getCrewOff(b.cd)))||(a.idx-b.idx));
   const wObj=(ATT&&ATT.workers)||{};
   listEl.innerHTML=ordered.map(({cd})=>{
    const offLbl=getCrewOffLbl(cd);
    const note=(CREWS_META[cd]&&CREWS_META[cd].note)||'';
    const appDrvs=devs().filter(d=>{
     if(String(d.u.car||'').toUpperCase()!==cd)return false;
     const acc=accByUid(d.id);
     return !((acc&&acc.blocked)||d.u.blocked);
    }).map(d=>LABELS[d.id]||profName(d)||devName(d.u.ua));
    const manDrvs=Object.keys(wObj).map(k=>wObj[k]).filter(w=>w&&w.name&&String(w.car||'').toUpperCase()===cd).map(w=>String(w.name).trim());
    const allMems=[...appDrvs,...manDrvs];
    const carInfo=parseCar(cd);
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
  const curNote=isEdit&&CREWS_META[oldCode]?CREWS_META[oldCode].note||'':'';
  const allDrvs=devs().filter(d=>{
   const acc=accByUid(d.id),blk=!!((acc&&acc.blocked)||d.u.blocked);
   const c=String(d.u.car||'').toUpperCase();
   return !blk&&c!=='ADMIN';
  }).sort((a,b)=>(LABELS[a.id]||profName(a)||'').localeCompare(LABELS[b.id]||profName(b)||'','ru'));
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
    const nm=LABELS[d.id]||profName(d)||devName(d.u.ua);
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
   if((!isEdit||isRename)&&CARS_LIST.includes(newCode)){
    errEl.textContent='Экипаж «'+newCode+'» уже существует';
    codeInp.focus();return;
   }
   if(isRename){
    const okRen=await ask('Переименовать экипаж «'+oldCode+'» → «'+newCode+'»?\n\nВсе водители, бонусы, архив и сотрудники табеля будут перенесены на новый код.',{title:'Переименование экипажа',okText:'Переименовать'});
    if(!okRen)return;
   }
   saving=true;saveBtn.disabled=true;
   const wasSel=isRename&&SEL===oldCode,wasOnl=isRename&&ONL_CAR===oldCode;
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
     const wObj=(ATT&&ATT.workers)||{};
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
    if(wasSel)SEL=newCode;
    if(wasOnl)ONL_CAR=newCode;
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
  if(!code||!CARS_LIST.includes(code))return;
  const drvIds=devs().filter(d=>String(d.u.car||'').toUpperCase()===code).map(d=>d.id);
  const wObj=(ATT&&ATT.workers)||{};
  const manIds=Object.keys(wObj).filter(wid=>wObj[wid]&&String(wObj[wid].car||'').toUpperCase()===code);
  const carInfo=parseCar(code);
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
   if(SEL===code)SEL='all';
   if(ONL_CAR===code)ONL_CAR='all';
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
  const cur=LABELS[id]||'';
  const v=await askInput('Префикс водителя', 'Оставьте поле пустым, чтобы сбросить префикс', cur, 'Введите префикс или заметку...');
  if(v===null)return;
  const t=v.trim().slice(0,40);
  try{if(t)await db.ref('labels/'+id).set(t);else await db.ref('labels/'+id).remove();toast('Сохранено')}
  catch(e){toast('Не удалось: '+((e&&e.message)||e),true)}
 }
 async function editUserName(id){
  if(!id)return;
  const du=USERS[id]||{},acc=accByUid(id);
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
     const base=oldSnap.val()||Object.assign({},ACCOUNTS[acc.key]);
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
  if(a==='pub'){e.preventDefault();PUB=undefined;draw();loadPub()}
  else if(a==='force')force();
  else if(a==='del'){e.stopPropagation();if(!isSubAdm())del(b.dataset.id)}
  else if(a==='setcar'){e.stopPropagation();openCarModal(b.dataset.id)}
  else if(a==='rename'){if(!isSubAdm())rename(b.dataset.id)}
  else if(a==='editname'){e.stopPropagation();if(!isSubAdm())editUserName(b.dataset.id)}
  else if(a==='dm'){e.stopPropagation();openAdmDm(b.dataset.id)}
  else if(a==='block'){e.stopPropagation();if(isSubAdm())return;const id=b.dataset.id,k=b.dataset.key,isBlk=b.dataset.blk==='1',du=USERS[id]||{};const who=dispName(parseDev(id,du));const ok=await ask(isBlk?'Разблокировать водителя и телефон «'+who+'»?':'Заблокировать водителя и этот телефон («'+who+'»)? Он сразу выйдет и не сможет войти даже под новым именем.',{title:isBlk?'Разблокировка':'Блокировка',okText:isBlk?'Разблокировать':'Заблокировать',danger:!isBlk});if(!ok)return;try{const nv=isBlk?null:true;await db.ref('users/'+id+'/blocked').set(nv);if(k)await db.ref('accounts/'+k+'/blocked').set(nv);if(du.devId)await db.ref('accounts/__dev_'+du.devId).set(isBlk?null:{blocked:true});if(!isBlk)await db.ref('online/'+id).remove();toast(isBlk?'Разблокировано':'Заблокировано')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='pin'){e.stopPropagation();if(isSubAdm())return;const k=b.dataset.key,cur=ACCOUNTS[k]&&ACCOUNTS[k].pin||'';const np=await askInput('Смена ПИН-кода','Введите новый 4-значный код для водителя',cur,'Например: 1234');if(np===null)return;const clean=np.replace(/\D/g,'');if(clean.length!==4){toast('Нужно ровно 4 цифры',true);return}try{await db.ref('accounts/'+k+'/pin').set(clean);toast('ПИН-код обновлён')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='month'){OPEN[b.dataset.key]=!OPEN[b.dataset.key];draw()}
  else if(a==='subopen'){openAdmSumModal(SEL,b.dataset.sub)}
  else if(a==='subback'){delete OPEN['sub|'+SEL];draw()}
  else if(a==='open-car-sum'){e.stopPropagation();openAdmSumModal(b.dataset.id,b.dataset.sub||"cur")}
  else if(a==='open-car-month'){e.stopPropagation();const cv=parseCar(b.dataset.id);const hk=Object.keys(cv.hist).find(k=>cv.hist[k]&&cv.hist[k].m===b.dataset.m);if(hk)openAdmSumModal(b.dataset.id,hk);else{SEL=b.dataset.id;draw()}}
  else if(a==='opensel'){e.stopPropagation();openSelectModal()}
  else if(a==='cpcur'){e.stopPropagation();const curList=allCars().filter(c=>c.qty>0||c.sum>0).map(c=>({name:'Экипаж '+c.code+(c.crew.length?' ('+c.crew.join(', ')+')':''),sum:c.sum,qty:c.qty})).sort((a,b)=>b.sum-a.sum);copyReport('Текущий месяц (по экипажам)',curList,curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0))}
  else if(a==='csvcur'){
   e.stopPropagation();
   const curList=allCars().filter(c=>c.qty>0||c.sum>0||c.crew.length>0).sort((a,b)=>b.sum-a.sum);
   exportCrewMonthCsv('Текущий_месяц_по_экипажам',curList,curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0));
  }
  else if(a==='cpmonth'){e.stopPropagation();const mObj=aggCarMonths(allCars()).find(x=>x.m===b.dataset.m);if(mObj)copyReport(monthName(mObj.m),mObj.cars,mObj.qty,mObj.sum)}
  else if(a==='csvmonth'){
   e.stopPropagation();
   const mObj=aggCarMonths(allCars()).find(x=>x.m===b.dataset.m);
   if(mObj)exportCrewMonthCsv(monthName(mObj.m),mObj.cars,mObj.qty,mObj.sum);
   else toast('Нет данных за этот месяц',true);
  }
  else if(a==='ocr-ok'){e.stopPropagation();const uid=b.dataset.uid,k=b.dataset.k,cd=b.dataset.code;if(!uid||!k||!cd)return;try{const rawP=USERS[uid]&&USERS[uid].ocrPending&&USERS[uid].ocrPending[k];const fixedRaw=rawP&&rawP.raw&&typeof window.ocrFixName==='function'?window.ocrFixName(rawP.raw):(typeof window.ocrFixName==='function'?window.ocrFixName(k):k);const mapK=admFbKey(fixedRaw)||k;await db.ref('config/ocrMap/'+mapK).set(cd);const pendDels=[];Object.keys(USERS).forEach(u=>{const op=USERS[u]&&USERS[u].ocrPending;if(!op)return;if(op[k])pendDels.push(db.ref('users/'+u+'/ocrPending/'+k).remove());if(mapK!==k&&op[mapK])pendDels.push(db.ref('users/'+u+'/ocrPending/'+mapK).remove());});if(!pendDels.length)pendDels.push(db.ref('users/'+uid+'/ocrPending/'+k).remove());await Promise.all(pendDels);const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):uid;logSubAct('ocr','ocr_ok','Одобрена заявка OCR',mapK+' → '+(OCR_CAT_NAMES[cd]||cd)+' (от '+who+')',{target:mapK});toast('Правило добавлено для всех');if(!isSubAdm()){const plan=findAffectedDocsByRule(mapK,cd);if(plan.length)openRecalcModal(plan,'Найдены накладные с этим товаром')}}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='ocr-recalc'){e.stopPropagation();if(isSubAdm())return;const plan=findAffectedDocsByAllRules();if(!plan.length)toast('Все накладные уже актуальны');else openRecalcModal(plan,'Сверка накладных со словарём OCR и правилами кода')}
  else if(a==='ocr-add'){e.stopPropagation();openOcrRuleModal('','',true)}
  else if(a==='ocr-edit'){e.stopPropagation();const k=b.dataset.k;if(k)openOcrRuleModal(k,OCR_MAP[k]||'',false)}
  else if(a==='ocr-del'){e.stopPropagation();const k=b.dataset.k;if(!k)return;if(!(await ask('Удалить правило «'+k+'» из общего словаря?',{title:'Удаление правила',okText:'Удалить',danger:true})))return;try{await db.ref('config/ocrMap/'+k).remove();logSubAct('ocr','ocr_del','Удалено правило OCR',k,{target:k,danger:true});toast('Правило удалено')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='ocr-no'){e.stopPropagation();const uid=b.dataset.uid,k=b.dataset.k;if(!uid||!k)return;try{await db.ref('users/'+uid+'/ocrPending/'+k).remove();const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):uid;logSubAct('ocr','ocr_no','Отклонена заявка OCR',k+' (от '+who+')',{target:k,danger:true});toast('Запрос отклонён')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='onlcar'){ONL_CAR=b.dataset.c||'all';drawOnline()}
  else if(a==='open-onl-flt'){openOnlCrewModal()}
  else if(a==='del-car-hist'){e.stopPropagation();if(isSubAdm())return;const car=b.dataset.car,hk=b.dataset.hk,rec=CARS[car]&&CARS[car].hist&&CARS[car].hist[hk];if(!car||!hk)return;if(!await ask('Удалить сохранённый итог за «'+monthName(rec&&rec.m||hk)+'» у экипажа '+car+'?',{title:'Удаление итога',okText:'Удалить',danger:true}))return;try{await db.ref('cars/'+car+'/hist/'+hk).remove();toast('Итог удалён')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='csv-single-cur'){e.stopPropagation();const car=b.dataset.car||SEL,c=parseCar(car);exportCarDetailCsv(car,'Текущий_месяц',c.rows,c.qty,c.sum)}
  else if(a==='mapfilter'){MAP_ONLY_ONLINE=!MAP_ONLY_ONLINE;_didFit=false;drawMap()}
  else if(a==='mapsat'){ADM_SAT=!ADM_SAT;try{localStorage.setItem('ADM_MAP_SAT',ADM_SAT?'1':'0')}catch(e){}if(_applyAdmSat)_applyAdmSat(ADM_SAT);const sb=g('admSatBtn');if(sb){sb.classList.toggle('on',ADM_SAT);sb.textContent=ADM_SAT?'🛰️ Спутник':'🗺️ Схема'}}
  else if(a==='submap-north'){if(_map)_map.easeTo({bearing:0,pitch:0,duration:300})}
  else if(a==='submap-fit'){if(_subFit)_subFit();else if(_map)_map.easeTo({center:[44.515,40.181],zoom:12.2,duration:350})}
  else if(a==='submap-clear'){e.stopPropagation();if(typeof window._subClearPt==='function')window._subClearPt()}
  else if(a==='submap-hdel'){e.stopPropagation();const idx=+b.dataset.idx;if(idx>=0&&idx<_subHist.length){const rem=_subHist.splice(idx,1)[0];if(_subCurPt&&rem&&_subCurPt.name===rem.name&&typeof window._subClearPt==='function')window._subClearPt();if(typeof window._subRenderHist==='function')window._subRenderHist()}}
  else if(a==='submap-hist'){const it=_subHist[+b.dataset.idx];if(it&&typeof window._subShowPt==='function')window._subShowPt(it,false)}
  else if(a==='focus'){const mk=_markers[b.dataset.id];if(mk&&_map){_map.easeTo({center:mk.getLngLat(),zoom:16,duration:400});const p=mk.getPopup();if(p&&!p.isOpen())mk.togglePopup()}}
  else if(a==='att-prev'){ATT_YM=attShiftYm(ATT_YM,-1);ATT_SCROLLED_YM='';drawAtt()}
  else if(a==='att-next'){ATT_YM=attShiftYm(ATT_YM,1);ATT_SCROLLED_YM='';drawAtt()}
  else if(a==='att-today'){ATT_YM=attCurYm();ATT_SCROLLED_YM='';drawAtt()}
  else if(a==='att-add'){attAddWorker(b.dataset.car)}
  else if(a==='att-off'){e.stopPropagation();openCrewOffModal(b.dataset.car)}
  else if(a==='att-tog'){attToggle(b.dataset.w,+b.dataset.d)}
  else if(a==='att-worker'){openAttWorkerModal(b.dataset.w)}
  else if(a==='att-csv'){attExportCsv()}
  else if(a==='att-copy'){attCopyReport()}
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
 function getDmSeenDlvStorageKey(){
  return isSubAdm() ? 'SUBADM_DM_SEEN_DLV' : 'ADM_DM_SEEN_DLV';
 }
 function getDmSeenDlv(){
  try{ return JSON.parse(localStorage.getItem(getDmSeenDlvStorageKey())||'{}'); }catch(e){ return {}; }
 }
 function setDmSeenDlv(obj){
  try{ localStorage.setItem(getDmSeenDlvStorageKey(), JSON.stringify(obj)); }catch(e){}
 }
 let _admDmInit=false,
     _admDmSeenAdm=(()=>{try{return JSON.parse(localStorage.getItem('ADM_DM_SEEN_ADM')||'{}')}catch(e){return{}}})(),
     _admDmNotif=(()=>{try{return JSON.parse(localStorage.getItem('ADM_DM_NOTIF')||'{}')}catch(e){return{}}})();
 function getDmList(uid, channel){
  const obj=DMS[uid]||{};
  const ch=channel||(isSubAdm()?'dlv':DM_TAB);
  if(Array.isArray(obj)) return ch==='dlv'?[]:obj;
  const list=(ch==='dlv'?obj.dlv:obj.adm)||[];
  return Array.isArray(list)?list:[];
 }
 function dmUnreadAdm(uid){
  const seen=+(_admDmSeenAdm[uid]||0);
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
  const targetCh = ch || (isSubAdm()?'dlv':DM_TAB);
  const list=getDmList(uid, targetCh);
  if(!list.length)return;
  const mx=Math.max.apply(null,list.map(m=>+m.t||0));
  if(mx>0){
   if(targetCh === 'dlv' || isSubAdm()){
    const curDlv = getDmSeenDlv();
    curDlv[uid]=mx;
    setDmSeenDlv(curDlv);
   } else {
    _admDmSeenAdm[uid]=mx;
    try{localStorage.setItem('ADM_DM_SEEN_ADM',JSON.stringify(_admDmSeenAdm))}catch(e){}
   }
  }
  updAdmDmTabBadges();
 }
 function updAdmDmTabBadges(){
  if(!DM_UID || isSubAdm()) return;
  const uAdm = dmUnreadAdm(DM_UID), uDlv = dmUnreadDlv(DM_UID);
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
   if(_admDmInit){
    const prevN=+(_admDmNotif[uid]||0);
    const fresh=relevant.filter(m=>(+m.t||0)>prevN&&!m.adm);
    if(fresh.length){
     const lm=fresh[fresh.length-1];
     _admDmNotif[uid]=+lm.t||Date.now();
     try{localStorage.setItem('ADM_DM_NOTIF',JSON.stringify(_admDmNotif))}catch(e){}
     if(DM_UID!==uid||document.hidden){
      const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):(lm.name||trAdm('Водитель'));
      admNotify(who+' ('+trAdm('лично')+')',String(lm.txt||'').slice(0,140),{tag:'eurobaza-dm-'+uid,action:'OPEN_DM',uid:uid});
     }
    }
   }else if(relevant.length){
    const mx=Math.max.apply(null,relevant.map(m=>+m.t||0));
    if(mx>(+(_admDmNotif[uid]||0))){_admDmNotif[uid]=mx;try{localStorage.setItem('ADM_DM_NOTIF',JSON.stringify(_admDmNotif))}catch(e){}}
   }
  });
  _admDmInit=true;
  DMS=next;
  if(DM_UID){
   if(!document.hidden)markAdmDmSeen(DM_UID, DM_TAB);
   updAdmDmTabBadges();
   renderAdmDm();
  }
  if(TAB==='online')drawOnline();
 }
 function getAdmChatSeenKey(){return isSubAdm()?'SUBADM_CHAT_SEEN':'ADM_CHAT_SEEN'}
 function updAdmChatBdg(){
  const b=g('admChatBdg');if(!b)return;
  const seen=+(localStorage.getItem(getAdmChatSeenKey())||0);
  const n=CHAT.filter(m=>(+m.t||0)>seen&&!m.adm).length;
  b.textContent=n>99?'99+':String(n);b.hidden=n===0;
 }
 function markAdmChatSeen(){
  if(!CHAT.length)return;
  const mx=Math.max.apply(null,CHAT.map(m=>+m.t||0));
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
  if(!CHAT.length){box.innerHTML='<div class="mut" style="text-align:center;padding:24px">Сообщений пока нет</div>';return}
  box.innerHTML=CHAT.map(m=>{
   const d=m.t?new Date(m.t):null,tm=d?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
   const isDeliv=m.adm&&(m.role==='delivery'||m.name==='Доставка');
   const car=!m.adm?String((m.uid&&USERS[m.uid]&&USERS[m.uid].car)||m.car||'').toUpperCase():'';
   const drvName=(m.uid&&USERS[m.uid])?dispName(parseDev(m.uid,USERS[m.uid])):(m.name||'Водитель');
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
  CHAT_OPEN=true;markAdmChatSeen();
  const ov=document.createElement('div');ov.id='admChatOv';ov.className='ov';
  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">💬</div><div><b>Общий чат</b><small>Канал водителей (до 50 сообщ.)</small></div></div><div class="ach-acts"><button type="button" id="achClr" class="ach-clr">Очистить</button><button type="button" id="achX" class="ach-x">✕</button></div></div><div id="achList" class="ach-list"></div><div class="ach-bar"><input id="achInp" maxlength="300" placeholder="Написать водителям..."><button type="button" id="achSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;CHAT_OPEN=false;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
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
  const curCh=isSubAdm()?'dlv':DM_TAB;
  const list=getDmList(DM_UID,curCh);
  if(!list.length){
   const emptyHint=curCh==='dlv'?'Сообщений от доставки пока нет. Напишите водителю!':'Личных сообщений от админа пока нет.';
   box.innerHTML='<div class="mut" style="text-align:center;padding:24px">'+emptyHint+'</div>';
   return;
  }
  box.innerHTML=list.map(m=>{
   const d=m.t?new Date(m.t):null,tm=d?String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
   const isDeliv=m.adm&&(m.role==='delivery'||m.name==='Доставка');
   const car=!m.adm?String((USERS[DM_UID]&&USERS[DM_UID].car)||m.car||'').toUpperCase():'';
   const drvName=USERS[DM_UID]?dispName(parseDev(DM_UID,USERS[DM_UID])):(m.name||'Водитель');
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
  DM_UID=uid;
  if(isSubAdm()){
   DM_TAB='dlv';
  } else {
   const uAdm = dmUnreadAdm(uid), uDlv = dmUnreadDlv(uid);
   if(uAdm > 0) DM_TAB = 'adm';
   else if(uDlv > 0) DM_TAB = 'dlv';
   else DM_TAB = 'adm';
  }
  markAdmDmSeen(uid, DM_TAB);if(TAB==='online')drawOnline();
  const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):'Водитель';
  const hdCar=USERS[uid]?String(USERS[uid].car||'').toUpperCase():'';
  const ov=document.createElement('div');ov.id='admDmOv';ov.className='ov';
  
  const tabsHtml=!isSubAdm()
   ? '<div style="display:flex;gap:6px;padding:8px 14px 4px;background:#131c2c;border-bottom:1px solid rgba(255,255,255,.08)">'
     + '<button type="button" id="admDmTabAdm" style="display:inline-flex;align-items:center;justify-content:center;flex:1;padding:6px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid '+(DM_TAB==='adm'?'rgba(250,204,21,.5)':'transparent')+';background:'+(DM_TAB==='adm'?'rgba(250,204,21,.18)':'transparent')+';color:'+(DM_TAB==='adm'?'#fde047':'#94a3b8')+';cursor:pointer"><span>👑 Чат с Админом</span><span id="admDmTabAdmBdg" class="dm-tab-bdg" hidden>0</span></button>'
     + '<button type="button" id="admDmTabDlv" style="display:inline-flex;align-items:center;justify-content:center;flex:1;padding:6px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid '+(DM_TAB==='dlv'?'rgba(56,189,248,.5)':'transparent')+';background:'+(DM_TAB==='dlv'?'rgba(56,189,248,.18)':'transparent')+';color:'+(DM_TAB==='dlv'?'#7dd3fc':'#94a3b8')+';cursor:pointer"><span>🚚 Чат с Доставкой</span><span id="admDmTabDlvBdg" class="dm-tab-bdg" hidden>0</span></button>'
     + '</div>'
   : '';

  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">✉️</div><div><b style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">'+crewBadgeHtml(hdCar)+'<span data-no-i18n="1">'+esc(who)+'</span></b><small>'+(isSubAdm()?'Личный чат с Отделом доставки':'Личные чаты (Админ / Доставка)')+'</small></div></div><div class="ach-acts">'+(isSubAdm()?'':'<button type="button" id="admDmClr" class="ach-clr">Очистить</button>')+'<button type="button" id="admDmX" class="ach-x">✕</button></div></div>'+tabsHtml+'<div id="admDmList" class="ach-list"></div><div class="ach-bar"><input id="admDmInp" maxlength="300" placeholder="'+(isSubAdm()?'Сообщение водителю от отдела доставки...':'Личное сообщение водителю...')+'"><button type="button" id="admDmSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  updAdmDmTabBadges();
  let closed=false;
  const close=()=>{if(closed)return;closed=true;if(DM_UID===uid)DM_UID=null;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();close()}};
  g('admDmX').onclick=close;ov.onclick=e=>{if(e.target===ov)close()};

  if(!isSubAdm()){
   const tAdm=g('admDmTabAdm'), tDlv=g('admDmTabDlv');
   if(tAdm&&tDlv){
    tAdm.onclick=()=>{
     DM_TAB='adm';
     tAdm.style.borderColor='rgba(250,204,21,.5)'; tAdm.style.background='rgba(250,204,21,.18)'; tAdm.style.color='#fde047';
     tDlv.style.borderColor='transparent'; tDlv.style.background='transparent'; tDlv.style.color='#94a3b8';
     markAdmDmSeen(uid, 'adm');
     if(TAB==='online')drawOnline();
     renderAdmDm();
    };
    tDlv.onclick=()=>{
     DM_TAB='dlv';
     tDlv.style.borderColor='rgba(56,189,248,.5)'; tDlv.style.background='rgba(56,189,248,.18)'; tDlv.style.color='#7dd3fc';
     tAdm.style.borderColor='transparent'; tAdm.style.background='transparent'; tAdm.style.color='#94a3b8';
     markAdmDmSeen(uid, 'dlv');
     if(TAB==='online')drawOnline();
     renderAdmDm();
    };
   }
  }

  const clrBtn=g('admDmClr');
  if(clrBtn){
   clrBtn.onclick=async()=>{
    const curCh=isSubAdm()?'dlv':DM_TAB;
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
    const curCh=isSubAdm()?'dlv':DM_TAB,dk=b.dataset.dk;
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
   const curCh=isSubAdm()?'dlv':DM_TAB;
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
  const src=list||SUB_LOG;
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
  const tdCnt=SUB_LOG.filter(x=>(+x.t||0)>=tdStart).length;
  const wkCnt=SUB_LOG.filter(x=>(+x.t||0)>=wkStart).length;
  if(statsEl){
   statsEl.innerHTML='<div class="slog-st ok"><b data-no-i18n="1">'+tdCnt+'</b><small>Сегодня</small></div>'
    +'<div class="slog-st hi"><b data-no-i18n="1">'+wkCnt+'</b><small>За 7 дней</small></div>'
    +'<div class="slog-st"><b data-no-i18n="1">'+SUB_LOG.length+'</b><small>Всего записей</small></div>';
  }
  if(subEl){
   subEl.innerHTML='<span>Доставка</span> · <span data-no-i18n="1">'+esc(SUB_EMAIL)+'</span>';
  }
  const cats=[
   {k:'all',ic:'✨',n:'Все'},
   {k:'att',ic:'📅',n:'Табель'},
   {k:'crew',ic:'🚚',n:'Экипажи'},
   {k:'chat',ic:'💬',n:'Чаты'},
   {k:'ocr',ic:'📖',n:'Словарь'},
   {k:'sys',ic:'⚙️',n:'Система'}
  ];
  if(chipsEl){
   chipsEl.innerHTML=cats.map(c=>{
    const cnt=c.k==='all'?SUB_LOG.length:SUB_LOG.filter(x=>x.cat===c.k).length;
    return '<button type="button" class="slog-chip'+(SUB_LOG_CAT===c.k?' on':'')+'" data-cat="'+c.k+'"><span>'+c.ic+' '+c.n+'</span><span class="cnt" data-no-i18n="1">'+cnt+'</span></button>';
   }).join('');
  }
  if(SUB_LOG_ERR){
   const ruleSnippet='"subadminLog": {\n  ".read": "auth != null && auth.token.email == \'vazgenstepanyan2002@gmail.com\'",\n  ".write": "auth != null && auth.token.email == \'vazgenstepanyan2002@gmail.com\'",\n  "$id": {\n    ".write": "auth != null && auth.token.email == \'diannakirakosyan@gmail.com\' && !data.exists() && newData.exists()",\n    ".validate": "newData.hasChildren([\'cat\', \'act\', \'t\']) && newData.child(\'t\').isNumber()"\n  }\n}';
   box.innerHTML='<div class="slog-rule"><b>⚠️ Требуется правило в Firebase Realtime Database</b><div style="margin-top:4px"><span>Добавьте узел</span> <code data-no-i18n="1">subadminLog</code> <span>в консоли Firebase (Rules), чтобы сохранять и читать журнал действий субадмина:</span></div><pre data-no-i18n="1">'+esc(ruleSnippet)+'</pre><button type="button" id="slogCopyRule">📋 Скопировать правило</button></div>';
   const cp=g('slogCopyRule');
   if(cp)cp.onclick=()=>{
    const done=()=>toast('Правило скопировано в буфер');
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(ruleSnippet).then(done).catch(()=>toast('Не удалось скопировать',true));
    else toast('Скопируйте вручную из окна',true);
   };
   return;
  }
  const q=(SUB_LOG_Q||'').trim().toLowerCase();
  const filt=SUB_LOG.filter(x=>{
   if(SUB_LOG_CAT!=='all'&&x.cat!==SUB_LOG_CAT)return false;
   if(!q)return true;
   const hay=((x.title||'')+' '+(x.detail||'')+' '+(x.car||'')+' '+(x.target||'')).toLowerCase();
   return hay.includes(q);
  });
  if(!filt.length){
   box.innerHTML='<div class="slog-empty"><div class="eic">'+(SUB_LOG.length?'🔍':'📋')+'</div><div>'+(SUB_LOG.length?'По выбранному фильтру записей нет':'Действий субадмина пока не зафиксировано')+'</div></div>';
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
    const isNew=(+x.t||0)>SUB_LOG_PREV_SEEN;
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
 function openSubLogModal(){
  if(isSubAdm())return;
  const old=g('subLogOv');if(old){if(typeof old._close==='function')old._close();else old.remove()}
  SUB_LOG_PREV_SEEN=subLogSeen();
  SUB_LOG_CAT='all';SUB_LOG_Q='';SUB_LOG_OPEN=true;
  const ov=document.createElement('div');ov.id='subLogOv';ov.className='ov';
  ov.innerHTML='<div class="dlg slog-box">'
   +'<div class="slog-hd">'
   +'<div class="slog-hd-l"><div class="slog-hd-ic">📋</div><div class="slog-hd-t"><b>Лог субадмина</b><small id="slogSub"></small></div></div>'
   +'<div class="slog-acts">'
   +'<button type="button" id="slogCsv" class="slog-btn csv" title="Выгрузить в Excel" aria-label="Выгрузить в Excel">📥</button>'
   +'<button type="button" id="slogClr" class="slog-btn clr" title="Очистить журнал" aria-label="Очистить журнал">🗑️</button>'
   +'<button type="button" id="slogX" class="ach-x" aria-label="Закрыть">✕</button>'
   +'</div></div>'
   +'<div id="slogStats" class="slog-stats"></div>'
   +'<div class="slog-ctrl">'
   +'<div class="slog-srch"><span class="slog-srch-ic">🔍</span><input id="slogInp" type="search" placeholder="Поиск по имени, экипажу, тексту..."><button type="button" id="slogClrQ" class="slog-srch-clr" hidden>✕</button></div>'
   +'<div id="slogChips" class="slog-chips"></div>'
   +'</div>'
   +'<div id="slogList" class="slog-list"></div>'
   +'</div>';
  document.body.appendChild(ov);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;SUB_LOG_OPEN=false;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  ov._close=close;
  const onK=e=>{if(e.key==='Escape'&&(!g('cOv')||g('cOv').hidden)){e.preventDefault();close()}};
  g('slogX').onclick=close;
  ov.onclick=e=>{if(e.target===ov)close()};
  const inp=g('slogInp'),clrQ=g('slogClrQ');
  inp.oninput=e=>{SUB_LOG_Q=e.target.value||'';clrQ.hidden=!SUB_LOG_Q;renderSubLog()};
  clrQ.onclick=()=>{inp.value='';SUB_LOG_Q='';clrQ.hidden=true;renderSubLog();inp.focus()};
  g('slogChips').onclick=e=>{
   const b=e.target.closest('.slog-chip');if(!b)return;
   SUB_LOG_CAT=b.dataset.cat||'all';
   renderSubLog();
  };
  g('slogCsv').onclick=()=>{
   const q=(SUB_LOG_Q||'').trim().toLowerCase();
   const filt=SUB_LOG.filter(x=>(SUB_LOG_CAT==='all'||x.cat===SUB_LOG_CAT)&&(!q||((x.title||'')+' '+(x.detail||'')+' '+(x.car||'')+' '+(x.target||'')).toLowerCase().includes(q)));
   exportSubLogCsv(filt);
  };
  g('slogClr').onclick=async()=>{
   if(!SUB_LOG.length){toast('Журнал уже пуст');return}
   if(!(await ask('Очистить весь журнал действий субадмина ('+SUB_LOG.length+' зап.)? Это действие необратимо.',{title:'Очистка журнала',okText:'Очистить',danger:true})))return;
   try{await db.ref('subadminLog').remove();toast('Журнал очищен')}catch(err){toast('Ошибка очистки',true)}
  };
  document.addEventListener('keydown',onK);
  renderSubLog();
  markSubLogSeen();
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function openAdmMenu(){
  const sub=isSubAdm(),u=auth.currentUser;
  const curL=window.getLang?window.getLang():'ru';
  const lName=curL==='hy'?'Հայերեն':(curL==='en'?'English':'Русский');
  const ov=document.createElement('div');ov.className='ov';
  let items='';
  if(!sub){
   const slNew=subLogUnread();
   const slSub=slNew?('Новых событий: '+slNew+' · всего '+SUB_LOG.length):(SUB_LOG.length?('Записей в журнале: '+SUB_LOG.length):'История действий отдела доставки');
   items+='<div class="sel-it'+(TAB==='att'?' on':'')+'" data-op="att"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(168,85,247,.16);border-color:rgba(192,132,252,.4);color:#d8b4fe">📅</span><div><div class="sel-it-nm">Табель пропусков</div><div class="sel-it-sb">Учёт выходов и отсутствий по экипажам</div></div></div>'+(TAB==='att'?'<div class="sel-it-r"><span class="sel-chk">✓</span></div>':'')+'</div>';
   items+='<div class="sel-it" data-op="crews"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(16,185,129,.18);border-color:rgba(52,211,153,.45);color:#6ee7b7">🚚</span><div><div class="sel-it-nm">Управление экипажами</div><div class="sel-it-sb">Экипажей: '+CARS_LIST.length+' · добавить, настроить, удалить</div></div></div></div>';
   items+='<div class="sel-it" data-op="sublog" style="'+(slNew?'border-color:rgba(167,139,250,.48)':'')+'"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(139,92,246,.18);border-color:rgba(167,139,250,.45);color:#c4b5fd">📋</span><div><div class="sel-it-nm">Лог субадмина</div><div class="sel-it-sb">'+slSub+'</div></div></div>'+(slNew?'<div class="sel-it-r"><span class="menu-bdg" data-no-i18n="1">'+(slNew>99?'99+':slNew)+'</span></div>':'')+'</div>';
  }else{
   items+='<div class="sel-it'+(TAB==='ver'?' on':'')+'" data-op="ver"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(168,85,247,.16);border-color:rgba(192,132,252,.4);color:#d8b4fe">🔄</span><div><div class="sel-it-nm">Версия приложения</div><div class="sel-it-sb">Обновление и версии на устройствах</div></div></div>'+(TAB==='ver'?'<div class="sel-it-r"><span class="sel-chk">✓</span></div>':'')+'</div>';
  }
  items+='<div class="sel-it" data-op="lang"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#6ee7b7">🌐</span><div><div class="sel-it-nm">Язык интерфейса</div><div class="sel-it-sb">'+lName+'</div></div></div></div>'
   +'<div class="sel-it" data-op="diag"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(56,189,248,.14);border-color:rgba(56,189,248,.38);color:#7dd3fc">🩺</span><div><div class="sel-it-nm">Диагностика и API</div><div class="sel-it-sb">Статус сервисов, кэша и ошибок</div></div></div></div>'
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
   if(op==='att'){TAB='att';draw()}
   else if(op==='crews'){openCrewsManagerModal()}
   else if(op==='sublog'){openSubLogModal()}
   else if(op==='ver'){TAB='ver';draw()}
   else if(op==='lang'){openAdmLangModal()}
   else if(op==='diag'){if(typeof window._openAdmDiag==='function')window._openAdmDiag()}
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
 auth.onAuthStateChanged(u=>{
  if(u&&!u.isAnonymous&&u.email){
   let profNick='';try{profNick=(localStorage.getItem('USER_NAME')||'').trim()}catch(e){}
   if(g('admNick'))g('admNick').textContent=profNick||'Admin';
   g('login').hidden=true;g('panel').hidden=false;g('who').innerHTML=(isSubAdm()?'<span>Доставка</span> · ':'')+'<span data-no-i18n="1">'+esc(u.email||'')+'</span>';
   start();draw();
   if(isSubAdm()&&!_subLoginLogged){
    _subLoginLogged=true;
    logSubAct('sys','login','Вход в админ-панель',devInfo(navigator.userAgent));
   }
  }else{
   stop();
   if(_map)destroyMap();
   USERS={};LABELS={};syncCrewsFromLabels();ACCOUNTS={};ATT={};ATT_ERR=false;SUB_LOG=[];SUB_LOG_ERR=false;SUB_LOG_OPEN=false;_subLoginLogged=false;updSubLogBdg();CARS={};OCR_MAP={};CHAT=[];DMS={};DM_UID=null;CHAT_OPEN=false;_admChatInit=false;_admDmInit=false;SEL='all';
   document.querySelectorAll('.ov').forEach(o=>{if(o.id==='cOv'||o.id==='dlgOv'){o.classList.remove('show');o.hidden=true}else if(typeof o._close==='function')o._close();else o.remove()});
   g('panel').hidden=true;g('login').hidden=false;
  }
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden||g('panel').hidden)return;
  if(CHAT_OPEN)markAdmChatSeen();
  if(DM_UID){markAdmDmSeen(DM_UID,DM_TAB);updAdmDmTabBadges();if(TAB==='online')drawOnline()}
  if(SUB_LOG_OPEN)markSubLogSeen();
 });
})();


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

  async function openDiag() {
    const oldDg = document.getElementById('dgOv');
    if (oldDg) { if (typeof oldDg._close === 'function') oldDg._close(); else oldDg.remove(); }
    const ov = document.createElement('div');
    ov.id = 'dgOv';
    ov.className = 'ov show';
    ov.style.cssText = 'position:fixed;inset:0;overflow:hidden;touch-action:none;display:flex;align-items:center;justify-content:center;padding:12px;z-index:9999';
    ov.innerHTML = '<div class="dlg" style="position:relative;overflow:hidden;max-width:440px;width:100%;padding:14px;border-radius:24px;background:linear-gradient(180deg,rgba(19,28,43,.98) 0%,rgba(10,15,25,.99) 100%);border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 60px rgba(0,0,0,.85)"><div style="position:absolute;top:0;left:24px;right:24px;height:1px;background:linear-gradient(90deg,transparent,rgba(52,211,153,.7),rgba(250,204,21,.5),transparent)"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="display:flex;align-items:center;gap:9px"><span style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,rgba(16,185,129,.22),rgba(14,165,233,.18));border:1px solid rgba(52,211,153,.38);color:#6ee7b7;display:flex;align-items:center;justify-content:center">🩺</span><div><div style="font-size:15px;font-weight:800;color:#f8fafc;line-height:1.15">Диагностика и API</div><div style="font-size:10.5px;color:#94a3b8">Статус сервисов и кэша</div></div></div><button id="dgClose" style="width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:14px;cursor:pointer">✕</button></div><div id="dgBody" style="display:flex;flex-direction:column;gap:8px"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><button id="dgRe" style="height:40px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;background:rgba(16,185,129,.16);border:1px solid rgba(52,211,153,.38);color:#6ee7b7">↻ Проверить</button><button id="dgClrCache" style="height:40px;border-radius:12px;font-size:12.5px;font-weight:700;cursor:pointer;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.36);color:#fca5a5">✕ Сбросить кэш</button></div></div>';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(ov);
    const close = () => { document.body.style.overflow = ''; ov.remove(); };
    ov._close = close;
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
      let srvVer = '—';
      const checks = await Promise.all([
        probe('Firebase Auth', maskKey(fbKey), async () => { const ok = Boolean(fbKey && fbKey.startsWith('AIza') && window.firebase && firebase.auth().currentUser); return { ok, detail: ok ? 'Сессия ОК' : 'Нет сессии' }; }),
        probe('Realtime DB', 'europe-west1', async () => { const u = window.firebase && firebase.auth().currentUser, tk = u ? await u.getIdToken() : ''; const r = await fetch(fbDb + '/config.json' + (tk ? '?auth=' + tk : '')); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; }),
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
      let swInfo = 'Нет', cacheList = 'пусто';
      if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); swInfo = reg && reg.active ? reg.active.state : 'не активен'; }
      if ('caches' in window) { const ks = await caches.keys(); if (ks.length) cacheList = ks.join(', '); }
      const grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' + checks.map(c => {
        const bg = c.ok ? 'rgba(16,185,129,.10)' : 'rgba(239,68,68,.14)', bd = c.ok ? 'rgba(52,211,153,.28)' : 'rgba(248,113,113,.36)', dot = c.ok ? '#10b981' : '#ef4444', stCol = c.ok ? '#6ee7b7' : '#fca5a5';
        return '<div style="padding:8px 9px;border-radius:12px;background:' + bg + ';border:1px solid ' + bd + ';display:flex;flex-direction:column;gap:2px"><div style="display:flex;align-items:center;gap:5px"><i style="width:7px;height:7px;border-radius:50%;background:' + dot + ';box-shadow:0 0 7px ' + dot + ';flex-shrink:0"></i><span style="font-size:11.5px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escD(c.name) + '</span></div><div' + (c.keyInfo === 'не найден' ? '' : ' data-no-i18n="1"') + ' title="' + escD(c.keyInfo) + '" style="font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escD(c.keyInfo) + '</div><div style="font-size:10.5px;font-weight:600;color:' + stCol + '">' + escD(c.detail) + '</div></div>';
      }).join('') + '</div>';
      const errBar = ERR_LOG.length ? '<div style="padding:7px 10px;border-radius:12px;background:rgba(239,68,68,.12);border:1px solid rgba(248,113,113,.3);font-size:10.5px;color:#fca5a5"><b>Ошибки (' + ERR_LOG.length + '):</b> <span data-no-i18n="1">' + escD(ERR_LOG[0] && ERR_LOG[0].msg) + '</span></div>' : '<div style="padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;font-size:11px;color:#94a3b8"><span>Журнал ошибок JS</span><span style="color:#6ee7b7;font-weight:600">0 ошибок</span></div>';
      box.innerHTML = grid + '<div style="padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;gap:3px;font-size:11px"><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Версия на сервере</span><code data-no-i18n="1" style="color:#fde047;font-weight:700">' + escD(srvVer) + '</code></div><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Service Worker</span><span style="color:#e2e8f0;font-weight:600">' + escD(swInfo) + '</span></div><div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#94a3b8;flex-shrink:0">Cache</span><code' + (cacheList === 'пусто' ? '' : ' data-no-i18n="1"') + ' style="color:#7dd3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escD(cacheList) + '</code></div></div>' + errBar;
    };
    ov.querySelector('#dgRe').onclick = run;
    run();
  }

  window._openAdmDiag = openDiag;
  document.addEventListener('click', e => {
    if (e.target && e.target.closest('#diagBtn')) openDiag();
  });
})();

;(function(){
  const v = document.getElementById('view');
  if (!v) return;
  const apply = box => {
    const flt = box.dataset.flt || 'all';
    const q = (box.dataset.q || '').toLowerCase();
    box.querySelectorAll('.sum-cat').forEach(cat => {
      let vc = 0;
      cat.querySelectorAll('.sum-it').forEach(it => {
        const mn = !q || (it.dataset.name || '').includes(q);
        let vr = 0;
        it.querySelectorAll('.sum-r').forEach(r => {
          const ok = mn && (flt === 'all' || r.dataset.zone === flt);
          r.style.display = ok ? '' : 'none';
          if (ok) vr++;
        });
        it.style.display = vr ? '' : 'none';
        if (vr) vc++;
      });
      cat.style.display = vc ? '' : 'none';
    });
  };
  v.addEventListener('click', e => {
    const fb = e.target.closest('[data-aseg] button');
    if (fb) {
      e.stopPropagation();
      const box = fb.closest('.adm-sum');
      box.dataset.flt = fb.dataset.f;
      box.querySelectorAll('[data-aseg] button').forEach(b => b.classList.toggle('on', b === fb));
      apply(box);
      return;
    }
    const tg = e.target.closest('[data-atog]');
    if (tg) {
      e.stopPropagation();
      const card = tg.closest('.sum-cat');
      if (card) {
        card.classList.toggle('open');
        const ch = card.querySelector('.sum-chv');
        if (ch) ch.textContent = card.classList.contains('open') ? '▾' : '▸';
      }
    }
  });
  v.addEventListener('input', e => {
    if (e.target && e.target.matches('[data-asrch]')) {
      const box = e.target.closest('.adm-sum');
      box.dataset.q = e.target.value.trim();
      apply(box);
    }
  });
})();

/* ADM-MODAL-BACK */
;(function(){
  const getOpenOvs = () => Array.from(document.querySelectorAll(".ov")).filter(el => !el.hidden && el.classList.contains("show"));
  let depth = 0, fromPop = false, skipPop = 0;
  const sync = () => {
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
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
})();
