// EuroBaza: административная панель (вход через Firebase Auth, чтение users, labels, config)
(function(){
 'use strict';
 const g=id=>document.getElementById(id);
 const esc=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const CUR='֏',TTL=75000;
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

 const CARS_LIST=['BB','CC','VV','RR','EE','GG','XX','ZZ'];
 const CREW_OFF={BB:1,CC:2,VV:3,RR:4,EE:5,GG:6,XX:0,ZZ:0};
 const CREW_OFF_LBL={BB:'Пн',CC:'Вт',VV:'Ср',RR:'Чт',EE:'Пт',GG:'Сб',XX:'Вс',ZZ:'Вс'};
const getCarsList=()=>isSubAdm()?CARS_LIST:[...CARS_LIST,'ADMIN'];
 let USERS={},LABELS={},ACCOUNTS={},CARS={},OCR_PEND={},OCR_MAP={},OCR_Q='',CHAT=[],CHAT_OPEN=false,DMS={},DM_UID=null,DM_TAB='adm',FU=0,PUB=undefined,TAB='online',SEL='all',ONL_CAR='all',ONL_Q='';
 let ATT={},ATT_ERR=false,ATT_SCROLLED_YM='',ATT_YM=(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')})();
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
  listen('cars',v=>{CARS=v||{};draw()});
  listen('labels',v=>{LABELS=v||{};draw()});
  listen('accounts',v=>{ACCOUNTS=v||{};draw()});
  listen('dm',onDmSnap);
  listen('config/forceUpdate',v=>{FU=+v||0;draw()});
  listen('config/ocrMap',v=>{OCR_MAP=v||{};if(TAB==='ocr')drawOcr()});
  {
   const attRef=db.ref('attendance');
   const attFn=attRef.on('value',s=>{ATT=s.val()||{};ATT_ERR=false;if(TAB==='att')drawAtt()},()=>{ATT_ERR=true;if(TAB==='att')drawAtt()});
   offs.push(()=>attRef.off('value',attFn));
  }
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
  const csvContent='\uFEFF'+rows.map(r=>r.map(v=>{
   const s=String(v===null||v===undefined?'':v).replace(/"/g,'""');
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
  if(!items||!items.length){toast('Нет данных для выгрузки',true);return}
  const header=['Экипаж / Водители','Количество (шт)','Сумма (֏)'];
  const data=items.map(it=>[it.name,it.qty,it.sum]);
  const totalRow=['ИТОГО',totQty,totSum];
  const fn=('EuroBaza_'+title.replace(/[\s\/:*?"<>|]+/g,'_')+'.csv');
  if(window.TableViewer){
   TableViewer.open({
    title:'Ведомость по экипажам · '+title.replace(/_/g,' '),
    filename:fn,
    headers:header,
    rows:data,
    totalRow:totalRow
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
 let ADM_SAT=(()=>{try{return localStorage.getItem("ADM_MAP_SAT")!=="0"}catch(e){return true}})();
 function ensureLeaflet(){
  if(window.maplibregl&&maplibregl.Map)return Promise.resolve();
  if(_lfProm)return _lfProm;
  _lfProm=new Promise((res,rej)=>{let idx=0;const go=()=>{const s0=ADM_CDNS[idx],c=document.createElement("link");c.rel="stylesheet";c.href=s0.css;document.head.appendChild(c);const s=document.createElement("script");s.src=s0.js;s.onload=()=>{if(window.maplibregl&&maplibregl.Map)res();else fail()};const fail=()=>{s.remove();c.remove();idx++;if(idx<ADM_CDNS.length)go();else{_lfProm=null;rej(new Error("Ошибка загрузки MapLibre"))}};s.onerror=fail;document.head.appendChild(s)};go()});
  return _lfProm;
 }
 function destroyMap(){if(_map){try{_map.remove()}catch(e){}_map=null}_markers={};_baseMk=null;_didFit=false;_applyAdmSat=null}
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
   const popHtml='<div class="pop-t">'+esc(title)+'</div><div class="pop-s">'+(live?"🟢 В сети":"⚪ Был(а) "+ago(d.u.gt||d.u.t))+esc(spd)+'</div>';
   const htmlPin='<div class="drv-b'+(live?"":" off")+'"><i></i><span>'+esc(title)+'</span></div>';
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
 async function drawMap(){
  const Llist=devs(),now=Date.now();
  const withGeo=Llist.filter(d=>typeof d.u.lat==="number"&&typeof d.u.lon==="number"&&(!MAP_ONLY_ONLINE||(now-(d.u.t||0)<TTL)));
  if(!g("admMap")){
   g("view").innerHTML='<div class="map-wrap"><div id="admMap"></div><div class="map-bar"><button type="button" id="admSatBtn" class="map-btn" data-act="mapsat"></button><button type="button" id="mapFilterBtn" class="map-btn" data-act="mapfilter">⚪ Все водители</button></div></div><div id="mapCards"></div>';
   try{
    await ensureLeaflet();if(TAB!=="map"||!g("admMap"))return;
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
  else ch+=withGeo.map(d=>{const live=now-(d.u.t||0)<TTL,spd=typeof d.u.spd==="number"&&d.u.spd>2?" · "+d.u.spd+" км/ч":"";return'<div class="row" data-act="focus" data-id="'+esc(d.id)+'"><span class="dot'+(live?" on":"")+'"></span><div class="rm"><div class="rt">'+esc(dispName(d))+'</div><div class="rs">'+(live?"сейчас на линии":"обновлено "+ago(d.u.gt||d.u.t))+esc(spd)+'</div></div></div>'}).join("");
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
  let btnBadge = '<span class="onl-badge">' + L.length + '</span>';
  if(ONL_CAR === 'none'){
    btnLabel = '🚫 Без экипажа';
    btnBadge = '<span class="onl-badge' + (noCrewOnCount ? ' on' : '') + '">' + (noCrewOnCount ? '🟢 ' : '') + noCrewCount + '</span>';
  } else if(ONL_CAR !== 'all'){
    const cc = crewCount(ONL_CAR), co = crewOnCount(ONL_CAR);
    btnLabel = '🚚 ' + ONL_CAR;
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

   const row1=new Array(
    pill('📱 '+esc(devInfo(d.u.ua)),pBase),
    pill('🌐 '+esc((d.u.lang||'ru').toUpperCase()),pBase)
   );
   if(acc&&acc.pin)row1.push(pill('🔑 '+esc(acc.pin),pPin));

   const car=String(d.u.car||'').toUpperCase();
   const pCar=car?'background:rgba(16,185,129,.18);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-weight:800;':'background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.35);color:#fbbf24;font-weight:700;';
   const row2=new Array(
    pill(live?'🟢 В сети':'🕒 '+esc(ago(d.u.t)),live?pOn:pBase),
    pill('📦 '+esc(verFmt(d.u.v)),pBase)
   );
   if(d.u.addr!=null)row2.push(pill('📍 '+esc(d.u.addr),pAdr));


   const blkBadge=blk?' <span style="display:inline-block;background:rgba(239,68,68,.2);border:1px solid rgba(239,68,68,.45);color:#fca5a5;font-size:10px;font-weight:800;padding:1px 6px;border-radius:99px;vertical-align:middle;margin-left:4px">🚫 БЛОК</span>':'';
   const rowStyle=blk?' style="cursor:default;border-color:rgba(239,68,68,.45);background:linear-gradient(180deg,rgba(45,18,24,.88) 0%,rgba(22,12,16,.95) 100%)"':' style="cursor:default"';
   const sub=isSubAdm();
   const un=dmUnread(d.id);
   const dmBtn='<button class="dm-btn" data-act="dm" data-id="'+esc(d.id)+'" aria-label="Личный чат">✉️'+(un?'<span class="dm-bdg">'+(un>99?'99+':un)+'</span>':'')+'</button>';
   const editNameBtn=sub?'':'<button class="xb" style="background:rgba(168,85,247,.16);border-color:rgba(192,132,252,.38);color:#d8b4fe" data-act="editname" data-id="'+esc(d.id)+'" aria-label="Изменить имя">✏️</button>';
   const pinBtn=(!sub&&acc)?'<button class="xb" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.35);color:#fde047" data-act="pin" data-key="'+esc(acc.key)+'" aria-label="ПИН">🔑</button>':'';
   const blkBtn=sub?'':(blk
    ?'<button class="xb" style="background:rgba(16,185,129,.18);border-color:rgba(52,211,153,.4);color:#34d399" data-act="block" data-id="'+esc(d.id)+'" data-key="'+esc(acc?acc.key:'')+'" data-blk="1" aria-label="Разблокировать">✅</button>'
    :'<button class="xb" style="background:rgba(249,115,22,.16);border-color:rgba(249,115,22,.38);color:#fb923c" data-act="block" data-id="'+esc(d.id)+'" data-key="'+esc(acc?acc.key:'')+'" data-blk="0" aria-label="Заблокировать">🚫</button>');
   const delBtn=sub?'':'<button class="xb" data-act="del" data-id="'+esc(d.id)+'" aria-label="Удалить">✕</button>';

   return '<div class="row"'+rowStyle+'><span class="dot'+(live&&!blk?' on':'')+'"></span>'
    +'<div class="rm"><div class="rt" style="margin-bottom:6px;display:flex;align-items:center;gap:8px"><div'+(sub?' style="min-width:0;flex:1"':' data-act="rename" data-id="'+esc(d.id)+'" style="min-width:0;flex:1;cursor:pointer"')+'>'+dispHtml(d)+blkBadge+'</div>'+(car==="ADMIN"?(sub?'<span style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.2),rgba(124,58,237,.1));border:1px solid rgba(167,139,250,.45);color:#c4b5fd;font-size:12.5px;font-weight:800;letter-spacing:.3px;line-height:1"><span style="font-size:13px">🛡️</span><span>Админ</span></span>':'<button type="button" data-act="setcar" data-id="'+esc(d.id)+'" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.24),rgba(124,58,237,.12));border:1px solid rgba(167,139,250,.5);box-shadow:0 2px 10px rgba(139,92,246,.16);color:#c4b5fd;font-size:12.5px;font-weight:800;letter-spacing:.3px;cursor:pointer;line-height:1"><span style="font-size:13px">🛡️</span><span>Админ</span><span style="opacity:.65;font-size:10px">▾</span></button>'):car?'<button type="button" data-act="setcar" data-id="'+esc(d.id)+'" style="flex-shrink:0;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:11px;background:linear-gradient(135deg,rgba(16,185,129,.24),rgba(5,150,105,.12));border:1px solid rgba(52,211,153,.5);box-shadow:0 2px 10px rgba(16,185,129,.16);color:#6ee7b7;font-size:12.5px;font-weight:800;letter-spacing:.4px;cursor:pointer;line-height:1"><span style="font-size:14px">🚚</span><span>'+esc(car)+'</span><span style="opacity:.65;font-size:10px">▾</span></button>':'<button type="button" data-act="setcar" data-id="'+esc(d.id)+'" style="flex-shrink:0;display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:11px;background:rgba(245,158,11,.13);border:1px dashed rgba(251,191,36,.45);color:#fbbf24;font-size:11.5px;font-weight:700;cursor:pointer;line-height:1"><span>🚚</span><span>Экипаж</span><span style="opacity:.7;font-size:10px">▾</span></button>')+'</div>'
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

function admDocKeyInfo(k){
 const is2=String(k||'').endsWith('_2'),base=is2?String(k).slice(0,-2):String(k||'');
 const idx=base.indexOf('_');if(idx<0)return{label:k,price:0};
 const pk=base.slice(0,idx),sk=base.slice(idx+1);
 const c=CAR_CATALOG.find(x=>x.pk===pk),s=c&&c.subs.find(x=>x.sk===sk);
 if(!c||!s)return{label:k,price:0};
 const zn=s.one?'':(is2?' (Район)':' (Город)');
 return{label:nm(c.name)+' · '+nm(s.name)+zn,price:is2?(+s.p2||0):(+s.p1||0)};
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
  if(hp){const qr=db.ref('cars/'+code+'/qty'),cur=(await qr.once('value')).val()||{},pt={};
   Object.keys(x.p).forEach(k=>{const nv=Math.max(0,(+cur[k]||0)-(+x.p[k]||0));pt[k]=nv>0?nv:null;if(CARS[code]&&CARS[code].qty){if(nv>0)CARS[code].qty[k]=nv;else delete CARS[code].qty[k]}});
   await qr.update(pt)}
  await db.ref('cars/'+code+'/docs/'+dk).remove();
  if(CARS[code]&&CARS[code].docs)delete CARS[code].docs[dk];
  await db.ref('cars/'+code+'/t').set(Date.now());
  const ov=g('admSumOv');if(ov&&ov._refresh)ov._refresh();else openAdmSumModal(code,'cur',true);toast(isMan?'Изменение отменено':'Накладная отменена');
 }catch(e){if(btn)btn.disabled=false;toast('Ошибка отмены',true)}
}
function openAdmSumModal(code,subKey,openDocs){
 if(!getCarsList().includes(code))return;const old=g("admSumOv");if(old)old.remove();
 const c=parseCar(code),isCur=subKey==="cur",rec=isCur?null:c.hist[subKey];if(!isCur&&!rec)return;
 const title=isCur?"Текущий месяц":monthName(rec.m||subKey),sub=isCur?"не сохранён":("сохранено "+ago(rec.t));
 const build=(op)=>{
  const c=parseCar(code);
   const rows=isCur?c.rows:(rec.rows||[]),totS=isCur?c.sum:(+rec.sum||0),totQ=isCur?c.qty:(+rec.qty||0);
 const dObj=(CARS[code]&&CARS[code].docs)||{},dList=isCur?Object.keys(dObj).map(k=>dObj[k]?Object.assign({_k:k},dObj[k]):null).filter(Boolean).sort((a,b)=>(+b.t||0)-(+a.t||0)):[];
 const dTotS=dList.reduce((a,x)=>a+(+x.sum||0),0),dTotQ=dList.reduce((a,x)=>a+(+x.qty||0),0);
 const canDel=!isSubAdm();
 const docsHtml=(isCur&&dList.length)?'<div class="sum-cat'+(op?' open':'')+'"><div class="sum-cat-h" data-atog="1"><div class="sum-cat-l"><span class="sum-chv">'+(op?'▾':'\u25b8')+'</span><div><div class="sum-cat-n">📜 История изменений</div><div class="sum-cat-s">Записей: '+dList.length+(dTotQ?' · '+fm(dTotQ)+' шт':'')+'</div></div></div><div class="sum-cat-r">'+(dTotS?fm(dTotS)+' '+CUR:dList.length+' шт')+'</div></div><div class="sum-cat-b">'+dList.map(x=>{
  const isMan=x.type==='manual';
  const dd=x.t?new Date(x.t):null,tm=dd?(dd.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})+' '+String(dd.getHours()).padStart(2,'0')+':'+String(dd.getMinutes()).padStart(2,'0')):'';
  const zn=!isMan?(x.z===1?'Город':(x.z===2?'Район':'')):'';
  const rp=(!isMan&&x.rep>1)?' <span class="sum-doc-rep">\u{1f501} Повтор'+(x.rep>2?' \u00d7'+x.rep:'')+'</span>':'';
  const qv=+x.qty||0,sv=+x.sum||0;
  const rSum=(sv||qv)?'<span class="sum-v" style="'+(sv<0?'color:#fca5a5':'')+'">'+(isMan&&sv>0?'+':'')+fm(sv)+' '+CUR+'</span>':'';
  const hdTitle=isMan?'✏️ Вручную':('🧾 № '+esc(x.doc||'\u2014'));
  const itsHtml=(x.p&&typeof x.p==='object'&&Object.keys(x.p).length)?'<div class="sum-doc-its">'+Object.keys(x.p).map(k=>{
   const dn=+x.p[k]||0,inf=admDocKeyInfo(k),dv=dn*inf.price;
   const col=dn<0?'#fca5a5':'#6ee7b7';
   return '<div class="sum-doc-it"><span>'+esc(inf.label)+'</span><b style="color:'+col+'">'+(dn>0?'+':'')+fm(dn)+' шт'+(dv?' ('+fm(dv)+' '+CUR+')':'')+'</b></div>';
  }).join('')+'</div>':'';
  const delBtnHtml=canDel?'<button type="button" class="sum-doc-del" data-doc-del="'+esc(x._k)+'" title="Отменить запись"><span style="font-size:12px">🗑️</span> Отменить</button>':'';
  return '<div class="sum-it"><div class="sum-doc-hd"><div class="sum-it-t" style="margin:0">'+hdTitle+(zn?' <span class="sum-doc-z">'+zn+'</span>':'')+rp+'</div>'+rSum+'</div>'+itsHtml+'<div class="sum-doc-ft"><span class="sum-f">'+esc(x.by||'Водитель')+(tm?' · '+tm:'')+(qv?' · '+(isMan&&qv>0?'+':'')+fm(qv)+' шт':'')+'</span>'+delBtnHtml+'</div></div>';
 }).join('')+'</div></div>':'';
 const head="<div class=\"sum-dash\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">"+esc(title)+" · "+esc(sub)+"</div><div class=\"sum-val\" id=\"admTotVal\">"+fm(totS)+" <span>"+CUR+"</span></div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b id=\"admTotQty\">"+fm(totQ)+"</b><span>штук</span></div><div class=\"sum-kpi\"><b id=\"admTotCat\">"+rows.length+"</b><span>катег.</span></div></div></div></div>";
  return head+docsHtml+detail(rows);
 };
 const subHd=c.crew.length?"Экипаж: "+c.crew.join(", "):"Экипаж не назначен";
 const ov=document.createElement("div");ov.id="admSumOv";ov.className="ov";
 const delH=(!isCur&&!isSubAdm())?"<button type=\"button\" id=\"admSumDel\" class=\"ach-clr\" style=\"margin-right:6px\">🗑️ Удалить</button>":"";
 const expH="<button type=\"button\" id=\"admSumCsv\" class=\"ach-clr\" style=\"background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#6ee7b7;margin-right:6px\">📥 Excel</button>";
 ov.innerHTML="<div class=\"dlg ach-box\" style=\"max-width:440px;height:88vh\"><div class=\"ach-hd\"><div class=\"ach-hd-l\"><div class=\"ach-hd-ic\">🚚</div><div><b>Экипаж "+esc(code)+"</b><small>"+esc(subHd)+"</small></div></div><div class=\"ach-acts\">"+expH+delH+"<button type=\"button\" id=\"admSumX\" class=\"ach-x\">✕</button></div></div><div id=\"admSumB\" class=\"ach-list\" style=\"background-image:none;padding:12px;display:block\">"+build(openDocs)+"</div></div>";
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove("show");setTimeout(()=>ov.remove(),180)};
 if(g("admSumCsv"))g("admSumCsv").onclick=()=>{
  const cNow=parseCar(code),rowsNow=isCur?cNow.rows:(rec.rows||[]),totSNow=isCur?cNow.sum:(+rec.sum||0),totQNow=isCur?cNow.qty:(+rec.qty||0);
  exportCarDetailCsv(code,title,rowsNow,totQNow,totSNow);
 };
 if(g("admSumDel"))g("admSumDel").onclick=async()=>{if(!await ask("Удалить сохранённый итог за «"+title+"» у экипажа "+code+"?",{title:"Удаление итога",okText:"Удалить",danger:true}))return;try{await db.ref("cars/"+code+"/hist/"+subKey).remove();close();toast("Итог удалён")}catch(e){toast("Ошибка удаления",true)}};
 g("admSumX").onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
 const root=g("admSumB");let flt="all",q="";
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
 root.addEventListener("click",e=>{const dl=e.target.closest("[data-doc-del]");if(dl){cancelAdmDoc(code,dl.dataset.docDel,dl);return}const fb=e.target.closest("[data-aseg] button");if(fb){flt=fb.dataset.f;root.querySelectorAll("[data-aseg] button").forEach(b=>b.classList.toggle("on",b===fb));apply();return}const tg=e.target.closest("[data-atog]");if(tg){const card=tg.closest(".sum-cat");if(card){card.classList.toggle("open");const ch=card.querySelector(".sum-chv");if(ch)ch.textContent=card.classList.contains("open")?"▾":"▸"}}});
 root.addEventListener("input",e=>{if(e.target&&e.target.matches("[data-asrch]")){q=e.target.value.trim().toLowerCase();apply()}});
 ov._refresh=()=>{const st=root.scrollTop;root.innerHTML=build(true);
  if(flt!=="all")root.querySelectorAll("[data-aseg] button").forEach(b=>b.classList.toggle("on",b.dataset.f===flt));
  const si=root.querySelector("[data-asrch]");if(si&&q)si.value=q;
  if(flt!=="all"||q)apply();root.scrollTop=st};
 if(openDocs)ov.classList.add("show");else requestAnimationFrame(()=>ov.classList.add("show"));
}
function drawTotals(){
 const CL=allCars(),carList=getCarsList();if(SEL!=="all"&&!carList.includes(SEL))SEL="all";
 const curSelLabel=SEL==="all"?"Все экипажи":(SEL==="ADMIN"?"Админ":"Экипаж "+SEL);
 let h="<button type=\"button\" class=\"sel-btn\" data-act=\"opensel\"><span class=\"sel-btn-l\"><span class=\"sel-ic\">🚚</span><span class=\"sel-btn-t\">"+esc(curSelLabel)+"</span></span><svg class=\"sel-chev\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m6 9 6 6 6-6\"/></svg></button>";
 const badge=cd=>cd==="ADMIN"?"<span style=\"min-width:36px;height:34px;padding:0 6px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.24),rgba(124,58,237,.12));border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0\">🛡️</span>":"<span style=\"min-width:36px;height:34px;padding:0 6px;border-radius:11px;background:rgba(16,185,129,.16);border:1px solid rgba(52,211,153,.35);color:#6ee7b7;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0\">"+esc(cd)+"</span>";
 if(SEL==="all"){
  const curList=CL.filter(c=>c.qty>0||c.sum>0||c.crew.length>0).sort((a,b)=>b.sum-a.sum);
  const sum=curList.reduce((a,x)=>a+x.sum,0),qty=curList.reduce((a,x)=>a+x.qty,0);
  h+="<div class=\"sum-dash\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">Текущий месяц · по экипажам</div><div class=\"sum-val\">"+fm(sum)+" <span>"+CUR+"</span></div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b>"+fm(qty)+"</b><span>штук</span></div><div class=\"sum-kpi\"><b>"+curList.length+"</b><span>экипажей</span></div></div></div>"+(curList.length?"<button type=\"button\" class=\"cp-btn\" style=\"margin-top:12px;background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csvcur\">📥 Скачать Excel по экипажам</button>":"")+"</div>";
  if(curList.length){h+="<div class=\"sec\">Экипажи в текущем месяце ("+curList.length+")</div>"+curList.map(x=>{const dc=Object.keys((CARS[x.code]&&CARS[x.code].docs)||{}).length;return"<div class=\"st-row\" data-act=\"open-car-sum\" data-id=\""+esc(x.code)+"\" data-sub=\"cur\"><div style=\"display:flex;align-items:center;gap:10px;min-width:0\">"+badge(x.code)+"<div style=\"min-width:0\"><div class=\"st-nm\">Экипаж "+esc(x.code)+"</div><div class=\"st-qt\">"+fm(x.qty)+" шт"+(dc?" · 📜 "+dc:"")+(x.crew.length?" · "+esc(x.crew.join(", ")):"")+"</div></div></div><div class=\"rv\" style=\"font-size:13.5px\">"+money(x.sum)+" ›</div></div>"}).join("")}
  const ms=aggCarMonths(CL);h+="<div class=\"sec\">Архив сохранённых месяцев ("+ms.length+")</div>";
  if(!ms.length)h+="<div class=\"mut box\">Сохранённых итогов по экипажам пока нет.</div>";
  h+=ms.map(x=>{const key="all|"+x.m,op=!!OPEN[key];return"<div class=\"mr col\" data-act=\"month\" data-key=\""+esc(key)+"\"><div class=\"mrt\"><div class=\"rm\"><div class=\"rt\">📅 "+esc(monthName(x.m))+"</div><div class=\"rs\">"+fm(x.qty)+" шт · машин: "+x.cars.length+"</div></div><div class=\"rv\">"+money(x.sum)+"</div><span class=\"ar\">"+(op?"▾":"▸")+"</span></div>"+(op?"<div class=\"dt\" onclick=\"event.stopPropagation()\">"+x.cars.map(cv=>"<div class=\"st-row\" data-act=\"open-car-month\" data-id=\""+esc(cv.code)+"\" data-m=\""+esc(x.m)+"\"><div style=\"display:flex;align-items:center;gap:10px;min-width:0\">"+badge(cv.code)+"<div style=\"min-width:0\"><div class=\"st-nm\">Экипаж "+esc(cv.code)+"</div><div class=\"st-qt\">"+fm(cv.qty)+" шт"+(cv.crew&&cv.crew.length?" · "+esc(cv.crew.join(", ")):"")+"</div></div></div><div class=\"rv\" style=\"font-size:13.5px\">"+money(cv.sum)+" ›</div></div>").join("")+"<button type=\"button\" class=\"cp-btn\" style=\"background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csvmonth\" data-m=\""+esc(x.m)+"\">📥 Скачать Excel за "+esc(monthName(x.m))+"</button></div>":"")+"</div>"}).join("");
 }else{
  const c=parseCar(SEL);
  const curDocsCount=Object.keys((CARS[SEL]&&CARS[SEL].docs)||{}).length;
  h+="<div class=\"sum-dash sum-dash-btn\" data-act=\"subopen\" data-sub=\"cur\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">Текущий месяц · открыть ›</div><div class=\"sum-val\">"+fm(c.sum)+" <span>"+CUR+"</span></div><div style=\"font-size:12px;color:#8b9bb4;margin-top:4px\">"+(c.crew.length?"Экипаж: "+esc(c.crew.join(", ")):"Экипаж не назначен")+"</div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b>"+fm(c.qty)+"</b><span>штук</span></div>"+(curDocsCount?"<div class=\"sum-kpi\"><b style=\"color:#fde047\">"+curDocsCount+"</b><span>записей</span></div>":"")+"</div></div>"+(c.qty>0||c.sum>0||curDocsCount>0?"<button type=\"button\" class=\"cp-btn\" style=\"margin-top:12px;background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csv-single-cur\" data-car=\""+esc(SEL)+"\">📊 Открыть таблицу / Excel</button>":"")+"</div><div class=\"sec\">Сохранённые итоги</div>";
  const ks=Object.keys(c.hist).filter(k=>c.hist[k]).sort((a,b)=>{const x=c.hist[a],y=c.hist[b];return(y.m||"")<(x.m||"")?-1:(y.m||"")>(x.m||"")?1:(y.t||0)-(x.t||0)});
  if(!ks.length)h+="<div class=\"mut box\">У экипажа "+esc(SEL)+" нет сохранённых итогов.</div>";
  h+=ks.map(k=>{const x=c.hist[k];const dBtn=!isSubAdm()?"<button type=\"button\" class=\"xb\" data-act=\"del-car-hist\" data-car=\""+esc(SEL)+"\" data-hk=\""+esc(k)+"\" aria-label=\"Удалить\">✕</button>":"";return"<div class=\"mr\" style=\"cursor:pointer\" data-act=\"subopen\" data-sub=\""+esc(k)+"\"><div class=\"rm\"><div class=\"rt\">"+esc(monthName(x.m))+"</div><div class=\"rs\">"+fm(x.qty)+" шт · сохранено "+esc(ago(x.t))+"</div></div><div class=\"rv\">"+money(x.sum)+"</div>"+dBtn+"<span class=\"ar\">›</span></div>"}).join("");
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
   +'<div class="box">Отправляет всем устройствам команду перезагрузить приложение с сервера. Устройство обновится, когда приложение открыто и в нём не заполняется форма.<br><br>'
   +'Последняя команда: <b>'+(FU?esc(new Date(FU).toLocaleString('ru-RU'))+' ('+esc(ago(FU))+')':'ещё не отправлялась')+'</b></div>'
   +'<button class="btn" data-act="force">🔄 Обновить у всех</button>';
  g('view').innerHTML=h;
 }
 function getOcrPending(){
  const list=[];
  Object.keys(USERS).forEach(uid=>{
   const op=USERS[uid]&&USERS[uid].ocrPending;
   if(op&&typeof op==='object'){
    Object.keys(op).forEach(k=>{if(op[k]&&op[k].code)list.push({uid,k,p:op[k]})});
   }
  });
  return list;
 }
 function updOcrTabBdg(){
  const b=g('ocrTabBdg');if(!b)return;
  const n=getOcrPending().length;
  b.textContent=n>99?'99+':String(n);
  b.hidden=n===0;
 }
 const ocrNorm=s=>String(s||'').toLowerCase().replace(/և/g,'եվ').replace(/ё/g,'е').replace(/[–—−]/g,'-').replace(/[,]/g,'.').replace(/[_\/]+/g,' ').replace(/\s+/g,' ').trim();
 const OCR_HY_KW={other:'այլ աթոռ դարակաշար սեղան լվացարան կոմոդ մահճակալ մոդուլ ներքնակ պահոց դուռ պուֆ տումբա',sofas:'բազմոց բազկաթոռ հավաքածու',recep:'ընդունարան ռեսեպշեն նախասրահ',kitchen:'խոհանոց',living:'հյուրասրահ հյուրասենյակ',bedroom:'ննջասենյակ ննջարան',wardrobe:'պահարան'};
 function drawOcr(){
  const pendList=getOcrPending();
  const allKeys=Object.keys(OCR_MAP).filter(k=>OCR_MAP[k]&&OCR_CAT_NAMES[OCR_MAP[k]]).sort();
  let h='<div class="sum-dash"><div class="sum-top"><div><div class="sum-lbl">Общий словарь накладных</div><div class="sum-val">'+allKeys.length+' <span>правил</span></div></div><button type="button" data-act="ocr-add" style="height:40px;padding:0 14px;border-radius:12px;background:rgba(16,185,129,.22);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:13.5px;font-weight:700;white-space:nowrap">➕ Добавить</button></div></div>';
  if(pendList.length){
   h+='<div class="sec" style="color:#fde047">🧾 Ожидают подтверждения ('+pendList.length+')</div>';
   h+=pendList.map(({uid,k,p})=>{
    const prevCd=p.from||OCR_MAP[k]||'';
    const diffHtml=prevCd
     ?'<div class="rs" style="margin-top:4px;line-height:1.45">Было: <span style="color:#fca5a5">'+esc(OCR_CAT_NAMES[prevCd]||prevCd)+'</span><br>Стало: <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[p.code]||p.code)+'</b> · от '+esc(p.by||'Водитель')+'</div>'
     :'<div class="rs" style="margin-top:4px;line-height:1.45"><span style="display:inline-block;padding:1px 7px;border-radius:6px;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.38);color:#7dd3fc;font-size:11px;font-weight:700;margin-right:5px">🆕 Новый товар</span>Добавить в: <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[p.code]||p.code)+'</b> · от '+esc(p.by||'Водитель')+'</div>';
    return '<div class="mr col" style="cursor:default;border-color:rgba(250,204,21,.4);background:linear-gradient(180deg,rgba(36,30,14,.92) 0%,rgba(16,18,28,.96) 100%)">'
     +'<div class="rm"><div class="rt" style="font-size:14px">📄 '+esc(p.raw||k)+'</div>'+diffHtml+'</div>'
     +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'
     +'<button type="button" data-act="ocr-ok" data-uid="'+esc(uid)+'" data-k="'+esc(k)+'" data-code="'+esc(p.code)+'" style="height:36px;border-radius:10px;background:rgba(16,185,129,.22);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:13px;font-weight:700">✓ Одобрить для всех</button>'
     +'<button type="button" data-act="ocr-no" data-uid="'+esc(uid)+'" data-k="'+esc(k)+'" style="height:36px;border-radius:10px;background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.38);color:#fca5a5;font-size:13px;font-weight:700">✕ Отклонить</button>'
     +'</div></div>';
   }).join('');
   h+='<div class="sec">Все правила ('+allKeys.length+')</div>';
  }
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
     +'<div class="rm"><div class="rt" style="font-size:14px">📄 '+esc(k)+'</div>'
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

  const groups=CARS_LIST.map(code=>{
   const appM=appList.filter(x=>x.car===code);
   const manM=manualList.filter(x=>x.car===code);
   return {code:code,title:'Экипаж '+code,members:[...appM,...manM]};
  });

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
   const offWd=(gr.code&&CREW_OFF[gr.code]!==undefined)?CREW_OFF[gr.code]:-1;
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

  const structKey=ATT_YM+'|'+groups.map(gr=>gr.code+':'+gr.members.map(m=>m.pid+'='+m.name).join(',')).join(';');
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
   const offWd=(!isNone && CREW_OFF[gr.code]!==undefined)?CREW_OFF[gr.code]:-1;
   const offLbl=(!isNone && CREW_OFF_LBL[gr.code])?CREW_OFF_LBL[gr.code]:'';
   const ga=gAbs[gr.code]||0,gw=gWork[gr.code]||0;
   tbody+='<tr class="att-grp"><td class="att-nm-col"><div class="att-grp-hd">'
    +'<span class="att-grp-t'+(isNone?' none':'')+'">'+(isNone?'🚫 Без экипажа':'🚚 '+esc(gr.code)+(offLbl?' <span class="att-off-b" title="Выходной: '+offLbl+'">'+offLbl+'</span>':''))+'</span>'
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
     ?'<div class="att-nm-app"><span>'+esc(m.name)+'</span><i>📱</i></div>'
     :'<button type="button" class="att-nm-btn" data-act="att-worker" data-w="'+esc(m.wid)+'"><span>'+esc(m.name)+'</span><i>✎</i></button>';
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
   h+='<div class="box" style="border-color:rgba(239,68,68,.45);color:#fca5a5">Нет доступа к разделу <b>attendance</b> в Firebase. Добавьте правило <code>attendance</code> в консоли Firebase (см. <code>Правила FireBase.md</code>).</div>';
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
  h+='<div class="mut hint">📱 — приложение · <b style="color:#fbbf24">В</b> — выходной · <b style="color:#fca5a5">✕</b> — не вышел на смену · <b style="color:#6ee7b7">✓</b> — вышел в выходной.</div>';
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
   return '<div class="sel-it'+(same?' on':'')+'" data-uid="'+esc(u.uid)+'"><div class="sel-it-l"><span class="sel-ic">📱</span><div><div class="sel-it-nm">'+esc(u.name)+'</div><div class="sel-it-sb">'+esc(sub)+'</div></div></div></div>';
  }).join('');
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>🔗 Привязать «'+esc(w.name)+'»</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
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
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>👷 '+esc(w.name)+'</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'
   +'<div class="sel-it" data-op="link" style="border-color:rgba(56,189,248,.35)"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc">🔗</span><div><div class="sel-it-nm" style="color:#7dd3fc">Привязать к аккаунту</div><div class="sel-it-sb">Перенести статистику на пользователя приложения</div></div></div></div>'
   +'<div class="sel-it" data-op="ren"><div class="sel-it-l"><span class="sel-ic">✏️</span><div><div class="sel-it-nm">Переименовать</div><div class="sel-it-sb">Изменить имя сотрудника</div></div></div></div>'
   +'<div class="sel-it" data-op="car"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Сменить экипаж</div><div class="sel-it-sb">Сейчас: '+(curCar?'Экипаж '+esc(curCar):'Без экипажа')+'</div></div></div></div>'
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
    try{await db.ref('attendance/workers/'+wid+'/name').set(clean);toast('Имя обновлено')}
    catch(err){toast('Ошибка сохранения',true)}
   }else if(op==='car'){
    openAttPickCarModal('Экипаж для '+w.name,curCar,async nc=>{
     try{await db.ref('attendance/workers/'+wid+'/car').set(nc||'');toast(nc?'Перенесён в экипаж '+nc:'Перенесён в «Без экипажа»')}
     catch(err){toast('Ошибка сохранения',true)}
    });
   }else if(op==='del'){
    if(!(await ask('Удалить «'+w.name+'» из списка рабочих?',{title:'Удаление рабочего',okText:'Удалить',danger:true})))return;
    try{await db.ref('attendance/workers/'+wid).remove();toast('Сотрудник удалён')}
    catch(err){toast('Ошибка удаления',true)}
   }
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 function attExportCsv(){
  const groups=attBuildGroups().filter(gr=>!!gr.code);
  const hasAny=groups.some(gr=>gr.members.length);
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
   const offWd=(gr.code&&CREW_OFF[gr.code]!==undefined)?CREW_OFF[gr.code]:-1;
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
  const lines=['📅 Табель — '+monthName(ATT_YM)];
  groups.forEach(gr=>{
   if(!gr.members.length)return;
   const offWd=(gr.code&&CREW_OFF[gr.code]!==undefined)?CREW_OFF[gr.code]:-1;
   lines.push('',(gr.code?'🚚 Экипаж '+gr.code:'🚫 Без экипажа')+':');
   gr.members.forEach(m=>{
    const wm=mData[m.pid]||{},absDays=[],workDays=[];
    for(let d=1;d<=dim;d++){
     if(!wm[d])continue;
     if(new Date(yr,mo,d).getDay()===offWd)workDays.push(d);
     else absDays.push(d);
    }
    totA+=absDays.length;totW+=workDays.length;
    let line='• '+m.name+': ✕ '+absDays.length+(absDays.length?' ('+absDays.join(', ')+')':'');
    if(workDays.length)line+=' · ✓ в вых. '+workDays.length+' ('+workDays.join(', ')+')';
    lines.push(line);
   });
  });
  lines.push('','Всего пропусков (✕): '+totA+(totW?' · Выходов в выходной (✓): '+totW:''));
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
  const admAttBtn=g('admAttBtn');
  if(mapTab)mapTab.hidden=sub;
  if(attTab)attTab.hidden=!sub;
  if(admAttBtn){admAttBtn.hidden=sub;admAttBtn.classList.toggle('adm-att-on',TAB==='att');}
  if(ocrTab)ocrTab.hidden=false;
  if(sub&&TAB==='map')TAB='online';
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

 
 
 
 async function migrateDevToCar(uid, carCode){
  if(!uid || !carCode || !USERS[uid]) return false;
  const u = USERS[uid];
  let raw = [];
  try { raw = JSON.parse(u.bonRaw || "[]"); } catch(e){}
  const qtyPatch = {};
  const curQ = (CARS && CARS[carCode] && CARS[carCode].qty) || {};
  if (Array.isArray(raw)) {
   raw.forEach(c => {
    if (!c || !Array.isArray(c.subs)) return;
    c.subs.forEach(sub => {
     const q1 = +sub.qty || 0, q2 = sub.one ? 0 : (+sub.qty2 || 0);
     const k1 = c.pk + "_" + sub.sk, k2 = k1 + "_2";
     if (q1 > 0) qtyPatch[k1] = (+curQ[k1] || 0) + q1;
     if (q2 > 0) qtyPatch[k2] = (+curQ[k2] || 0) + q2;
    });
   });
  }
  let histObj = {};
  try { histObj = JSON.parse(u.hist || "{}"); } catch(e){}
  const hasQty = Object.keys(qtyPatch).length > 0;
  const hasHist = histObj && typeof histObj === "object" && Object.keys(histObj).length > 0;
  if (!hasQty && !hasHist) return false;
  if (hasQty) {
   await db.ref("cars/" + carCode + "/qty").update(qtyPatch);
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
   + '<div class="aop-hd"><div><b>' + (isNew ? '➕ Новое правило OCR' : '✏️ Настройка правила') + '</b><small>' + (isNew ? 'Сопоставление товара из накладной с каталогом' : esc(ruleKey)) + '</small></div><button type="button" class="sel-x">✕</button></div>'
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
   const cleanKey = String(finalKey || '').toLowerCase().replace(/[\"'«»().,]/g,' ').replace(/\s+/g,' ').trim().replace(/[.#$\[\]\/]+/g,'_').slice(0,120);
   if (!cleanKey) { toast('Введите название товара из накладной', true); return; }
   if (!selectedCd) { toast('Выберите категорию мебели из списка', true); return; }
   close();
   try {
    await db.ref('config/ocrMap/' + cleanKey).set(selectedCd);
    toast('Правило успешно сохранено');
    if (typeof drawOcr === 'function') drawOcr();
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
            + '<div class="sel-it-r"><span class="onl-badge' + (onTotal ? ' on' : '') + '">' + (onTotal ? '🟢 ' + onTotal + ' / ' : '') + L.length + '</span></div></div>';

  CARS_LIST.forEach(c => {
    const total = crewCount(c), on = crewOnCount(c);
    const badge = '<span class="onl-badge' + (on ? ' on' : '') + '">' + (on ? '🟢 ' + on + ' / ' : '') + total + '</span>';
    const crewNames = devs().filter(x => String(x.u.car||'').toUpperCase() === c).map(x => dispName(x)).join(', ');
    items += '<div class="sel-it' + (ONL_CAR === c ? ' on' : '') + '" data-c="' + c + '">'
           + '<div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Экипаж ' + c + '</div><div class="sel-it-sb">' + (crewNames ? esc(crewNames) : 'Нет назначенных водителей') + '</div></div></div>'
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
   const on=curCar===c,crew=crewOf(c);
   return '<div class="sel-it'+(on?' on':'')+'" data-c="'+c+'"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Экипаж '+c+'</div><div class="sel-it-sb">'+(crew?esc(crew):'Экипаж свободен')+'</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  }).join('');
  if(!isSubAdm()){
   items+='<div class="sel-it'+(curCar==="ADMIN"?' on':'')+'" data-c="ADMIN"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.4);color:#c4b5fd">🛡️</span><div><div class="sel-it-nm">Админ</div><div class="sel-it-sb">Открыть бонусы (скрыто из списков)</div></div></div><div class="sel-it-r"><span class="sel-chk">✓</span></div></div>';
  }
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>🚚 Экипаж: '+esc(dispName(d))+'</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
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
    toast(nc === "ADMIN" ? "Включён режим Админ" : (nc ? ('Назначен экипаж ' + nc + (moved ? ' · бонусы перенесены' : '') + (attMoved ? ' · табель перенесён' : '')) : 'Экипаж снята'));
   }catch(err){toast('Ошибка сохранения',true)}
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }

function openSelectModal(){
  const CL=allCars(),carList=getCarsList(),ov=document.createElement('div');ov.className='ov';
  const totSum=CL.reduce((a,c)=>a+c.sum,0);
  let items='<div class="sel-it'+(SEL==='all'?' on':'')+'" data-val="all"><div class="sel-it-l"><span class="sel-ic">🚚</span><div><div class="sel-it-nm">Все экипажи</div><div class="sel-it-sb">Экипажей: '+carList.length+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(totSum)+'</span><span class="sel-chk">✓</span></div></div>';
  items+=CL.map(c=>{
   const on=SEL===c.code,isAdm=c.code==='ADMIN';
   const ic=isAdm?'<span class="sel-ic" style="background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.4);color:#c4b5fd">🛡️</span>':'<span class="sel-ic" style="font-weight:800;font-size:13px">'+c.code+'</span>';
   const nm=isAdm?'Админ':('Экипаж '+c.code);
   return '<div class="sel-it'+(on?' on':'')+'" data-val="'+c.code+'"><div class="sel-it-l">'+ic+'<div><div class="sel-it-nm">'+nm+'</div><div class="sel-it-sb">'+(c.crew.length?esc(c.crew.join(', ')):(isAdm?'Администратор':'Экипаж не назначен'))+'</div></div></div><div class="sel-it-r"><span class="sel-it-sm">'+money(c.sum)+'</span><span class="sel-chk">✓</span></div></div>';
  }).join('');
  ov.innerHTML='<div class="dlg sel-dlg"><div class="sel-hd"><b>Выберите экипаж</b><button type="button" class="sel-x">✕</button></div><div class="sel-list">'+items+'</div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
  ov.querySelector('.sel-x').onclick=close;
  ov.onclick=e=>{if(e.target===ov){close();return}const it=e.target.closest('.sel-it');if(it){SEL=it.dataset.val;close();draw()}};
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
  else if(a==='block'){e.stopPropagation();const id=b.dataset.id,k=b.dataset.key,isBlk=b.dataset.blk==='1',du=USERS[id]||{};const who=dispName(parseDev(id,du));const ok=await ask(isBlk?'Разблокировать водителя и телефон «'+who+'»?':'Заблокировать водителя и этот телефон («'+who+'»)? Он сразу выйдет и не сможет войти даже под новым именем.',{title:isBlk?'Разблокировка':'Блокировка',okText:isBlk?'Разблокировать':'Заблокировать',danger:!isBlk});if(!ok)return;try{const nv=isBlk?null:true;await db.ref('users/'+id+'/blocked').set(nv);if(k)await db.ref('accounts/'+k+'/blocked').set(nv);if(du.devId)await db.ref('accounts/__dev_'+du.devId).set(isBlk?null:{blocked:true});if(!isBlk)await db.ref('online/'+id).remove();toast(isBlk?'Разблокировано':'Заблокировано')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='pin'){e.stopPropagation();const k=b.dataset.key,cur=ACCOUNTS[k]&&ACCOUNTS[k].pin||'';const np=await askInput('Смена ПИН-кода','Введите новый 4-значный код для водителя',cur,'Например: 1234');if(np===null)return;const clean=np.replace(/\D/g,'');if(clean.length!==4){toast('Нужно ровно 4 цифры',true);return}try{await db.ref('accounts/'+k+'/pin').set(clean);toast('ПИН-код обновлён')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='month'){OPEN[b.dataset.key]=!OPEN[b.dataset.key];draw()}
  else if(a==='subopen'){openAdmSumModal(SEL,b.dataset.sub)}
  else if(a==='subback'){delete OPEN['sub|'+SEL];draw()}
  else if(a==='open-car-sum'){e.stopPropagation();openAdmSumModal(b.dataset.id,b.dataset.sub||"cur")}
  else if(a==='open-car-month'){e.stopPropagation();const cv=parseCar(b.dataset.id);const hk=Object.keys(cv.hist).find(k=>cv.hist[k]&&cv.hist[k].m===b.dataset.m);if(hk)openAdmSumModal(b.dataset.id,hk);else{SEL=b.dataset.id;draw()}}
  else if(a==='opensel'){e.stopPropagation();openSelectModal()}
  else if(a==='cpcur'){e.stopPropagation();const curList=allCars().filter(c=>c.qty>0||c.sum>0).map(c=>({name:'Экипаж '+c.code+(c.crew.length?' ('+c.crew.join(', ')+')':''),sum:c.sum,qty:c.qty})).sort((a,b)=>b.sum-a.sum);copyReport('Текущий месяц (по экипажам)',curList,curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0))}
  else if(a==='csvcur'){
   e.stopPropagation();
   const curList=allCars().filter(c=>c.qty>0||c.sum>0||(c.docs&&Object.keys(c.docs).length>0)).map(c=>({name:'Экипаж '+c.code+(c.crew.length?' ('+c.crew.join(', ')+')':''),sum:c.sum,qty:c.qty})).sort((a,b)=>b.sum-a.sum);
   exportCrewMonthCsv('Текущий_месяц_по_экипажам',curList.length?curList:[{name:'Экипажи',sum:0,qty:0}],curList.reduce((a,x)=>a+x.qty,0),curList.reduce((a,x)=>a+x.sum,0));
  }
  else if(a==='cpmonth'){e.stopPropagation();const mObj=aggCarMonths(allCars()).find(x=>x.m===b.dataset.m);if(mObj)copyReport(monthName(mObj.m),mObj.cars,mObj.qty,mObj.sum)}
  else if(a==='csvmonth'){
   e.stopPropagation();
   const mObj=aggCarMonths(allCars()).find(x=>x.m===b.dataset.m);
   if(mObj)exportCrewMonthCsv(monthName(mObj.m),mObj.cars,mObj.qty,mObj.sum);
   else toast('Нет данных за этот месяц',true);
  }
  else if(a==='ocr-ok'){e.stopPropagation();const uid=b.dataset.uid,k=b.dataset.k,cd=b.dataset.code;if(!uid||!k||!cd)return;try{await db.ref('config/ocrMap/'+k).set(cd);await db.ref('users/'+uid+'/ocrPending/'+k).remove();toast('Правило добавлено для всех')}catch(err){toast('Ошибка сохранения',true)}}
  else if(a==='ocr-add'){e.stopPropagation();openOcrRuleModal('','',true)}
  else if(a==='ocr-edit'){e.stopPropagation();const k=b.dataset.k;if(k)openOcrRuleModal(k,OCR_MAP[k]||'',false)}
  else if(a==='ocr-del'){e.stopPropagation();const k=b.dataset.k;if(!k)return;if(!(await ask('Удалить правило «'+k+'» из общего словаря?',{title:'Удаление правила',okText:'Удалить',danger:true})))return;try{await db.ref('config/ocrMap/'+k).remove();toast('Правило удалено')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='ocr-no'){e.stopPropagation();const uid=b.dataset.uid,k=b.dataset.k;if(!uid||!k)return;try{await db.ref('users/'+uid+'/ocrPending/'+k).remove();toast('Запрос отклонён')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='onlcar'){ONL_CAR=b.dataset.c||'all';drawOnline()}
  else if(a==='open-onl-flt'){openOnlCrewModal()}
  else if(a==='del-car-hist'){e.stopPropagation();if(isSubAdm())return;const car=b.dataset.car,hk=b.dataset.hk,rec=CARS[car]&&CARS[car].hist&&CARS[car].hist[hk];if(!car||!hk)return;if(!await ask('Удалить сохранённый итог за «'+monthName(rec&&rec.m||hk)+'» у экипажа '+car+'?',{title:'Удаление итога',okText:'Удалить',danger:true}))return;try{await db.ref('cars/'+car+'/hist/'+hk).remove();toast('Итог удалён')}catch(err){toast('Ошибка удаления',true)}}
  else if(a==='csv-single-cur'){e.stopPropagation();const car=b.dataset.car||SEL,c=parseCar(car);exportCarDetailCsv(car,'Текущий_месяц',c.rows,c.qty,c.sum)}
  else if(a==='mapfilter'){MAP_ONLY_ONLINE=!MAP_ONLY_ONLINE;_didFit=false;drawMap()}
  else if(a==='mapsat'){ADM_SAT=!ADM_SAT;try{localStorage.setItem('ADM_MAP_SAT',ADM_SAT?'1':'0')}catch(e){}if(_applyAdmSat)_applyAdmSat(ADM_SAT);const sb=g('admSatBtn');if(sb){sb.classList.toggle('on',ADM_SAT);sb.textContent=ADM_SAT?'🛰️ Спутник':'🗺️ Схема'}}
  else if(a==='focus'){const mk=_markers[b.dataset.id];if(mk&&_map){_map.easeTo({center:mk.getLngLat(),zoom:16,duration:400});const p=mk.getPopup();if(p&&!p.isOpen())mk.togglePopup()}}
  else if(a==='att-prev'){ATT_YM=attShiftYm(ATT_YM,-1);ATT_SCROLLED_YM='';drawAtt()}
  else if(a==='att-next'){ATT_YM=attShiftYm(ATT_YM,1);ATT_SCROLLED_YM='';drawAtt()}
  else if(a==='att-today'){ATT_YM=attCurYm();ATT_SCROLLED_YM='';drawAtt()}
  else if(a==='att-add'){attAddWorker(b.dataset.car)}
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
    const all=Object.keys(data).map(k=>Object.assign({k:k},data[k])).sort((a,b)=>(+a.t||0)-(+b.t||0));
    return all.slice(-50);
   };
   let admMsgs=[],dlvMsgs=[];
   if(obj.dlv&&typeof obj.dlv==='object'){
    dlvMsgs=parseCh(obj.dlv);
    const admObj=obj.adm&&typeof obj.adm==='object'?obj.adm:(Array.isArray(obj)?{}:obj);
    admMsgs=parseCh(admObj);
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
      const who=USERS[uid]?dispName(parseDev(uid,USERS[uid])):(lm.name||'Водитель');
      admNotify(who+' (лично)',String(lm.txt||'').slice(0,140),{tag:'eurobaza-dm-'+uid,action:'OPEN_DM',uid:uid});
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
 function crewBadgeHtml(car){
  const c=String(car||'').trim().toUpperCase();
  if(!c)return '';
  if(c==='ADMIN')return '<span class="ch-crew adm-c">🛡️ Админ</span>';
  return '<span class="ch-crew">🚚 '+esc(c)+'</span>';
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
   const admCrewWho=/^(admin|админ|администратор)$/i.test(drvName.trim())?'👑 Администратор':('👑 Админ · '+esc(drvName));
   const who=m.adm?(isDeliv?'👩‍💼 Доставка':'👑 Администратор'):(isAdmCrew?admCrewWho:(crewBadgeHtml(car)+'<span>'+esc(drvName)+'</span>'));
   return '<div class="ach-m'+(m.adm?(isDeliv?' dlv':' adm'):(isAdmCrew?' adm':''))+'"><div class="ach-mt"><span>'+who+'</span>'+(isSubAdm()?'':'<button type="button" class="ach-del" data-ck="'+esc(m.k)+'" aria-label="Удалить">✕</button>')+'</div><div class="ach-bd"><span class="ach-tx">'+esc(m.txt||'')+'</span><span class="ach-tm">'+tm+'</span></div></div>';
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
   const who=m.adm?(isDeliv?'👩‍💼 Доставка':'👑 Администратор'):(crewBadgeHtml(car)+'<span>'+esc(drvName)+'</span>');
   const dBtn=!isSubAdm()?'<button type="button" class="ach-del" data-dk="'+esc(m.k)+'" aria-label="Удалить">✕</button>':'';
   return '<div class="ach-m'+(m.adm?(isDeliv?' dlv':' adm'):'')+'"><div class="ach-mt"><span>'+who+'</span>'+dBtn+'</div><div class="ach-bd"><span class="ach-tx">'+esc(m.txt||'')+'</span><span class="ach-tm">'+tm+'</span></div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
 }
 function openAdmDm(uid){
  if(!uid)return;
  reqAdmNotify();
  const old=g('admDmOv');if(old)old.remove();
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

  ov.innerHTML='<div class="dlg ach-box"><div class="ach-hd"><div class="ach-hd-l"><div class="ach-hd-ic">✉️</div><div><b style="display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap">'+crewBadgeHtml(hdCar)+'<span>'+esc(who)+'</span></b><small>'+(isSubAdm()?'Личный чат с Отделом доставки':'Личные чаты (Админ / Доставка)')+'</small></div></div><div class="ach-acts">'+(isSubAdm()?'':'<button type="button" id="admDmClr" class="ach-clr">Очистить</button>')+'<button type="button" id="admDmX" class="ach-x">✕</button></div></div>'+tabsHtml+'<div id="admDmList" class="ach-list"></div><div class="ach-bar"><input id="admDmInp" maxlength="300" placeholder="'+(isSubAdm()?'Сообщение водителю от отдела доставки...':'Личное сообщение водителю...')+'"><button type="button" id="admDmSnd" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
  document.body.appendChild(ov);
  updAdmDmTabBadges();
  const close=()=>{DM_UID=null;ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  const onK=e=>{if(e.key==='Escape')close()};
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
  const old=g('pwOv');if(old)old.remove();
  const ov=document.createElement('div');ov.id='pwOv';ov.className='ov';
  ov.innerHTML='<div class="dlg" style="max-width:380px;text-align:left"><div class="dlg-ic" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.38);color:#fde047">🔑</div><div class="dlg-t" style="text-align:center">Смена пароля</div><div class="dlg-m" style="text-align:center;margin-bottom:14px">'+esc(u.email)+'</div><input id="pwOld" class="dlg-inp" type="password" autocomplete="current-password" placeholder="Текущий пароль" style="margin-bottom:10px"><input id="pwNew1" class="dlg-inp" type="password" autocomplete="new-password" placeholder="Новый пароль (минимум 6 символов)" style="margin-bottom:10px"><input id="pwNew2" class="dlg-inp" type="password" autocomplete="new-password" placeholder="Повторите новый пароль" style="margin-bottom:10px"><div id="pwErr" style="color:#f87171;font-size:12.5px;min-height:18px;margin-bottom:10px;text-align:center"></div><div class="dlg-act"><button type="button" id="pwNo" class="dlg-no">Отмена</button><button type="button" id="pwOk" class="dlg-ok">Сохранить</button></div></div>';
  document.body.appendChild(ov);
  const close=()=>{ov.classList.remove('show');document.removeEventListener('keydown',onK);setTimeout(()=>ov.remove(),180)};
  const onK=e=>{if(e.key==='Escape')close()};
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
 function openAdmMenu(){
  const sub=isSubAdm(),u=auth.currentUser;
  const curL=window.getLang?window.getLang():'ru';
  const lName=curL==='hy'?'Հայերեն':(curL==='en'?'English':'Русский');
  const ov=document.createElement('div');ov.className='ov';
  let items='';
  if(!sub){
   items+='<div class="sel-it'+(TAB==='att'?' on':'')+'" data-op="att"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(168,85,247,.16);border-color:rgba(192,132,252,.4);color:#d8b4fe">📅</span><div><div class="sel-it-nm">Табель пропусков</div><div class="sel-it-sb">Учёт выходов и отсутствий по экипажам</div></div></div>'+(TAB==='att'?'<div class="sel-it-r"><span class="sel-chk">✓</span></div>':'')+'</div>';
  }
  items+='<div class="sel-it" data-op="lang"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#6ee7b7">🌐</span><div><div class="sel-it-nm">Язык интерфейса</div><div class="sel-it-sb">'+lName+'</div></div></div></div>'
   +'<div class="sel-it" data-op="diag"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(56,189,248,.14);border-color:rgba(56,189,248,.38);color:#7dd3fc">🩺</span><div><div class="sel-it-nm">Диагностика и API</div><div class="sel-it-sb">Статус сервисов, кэша и ошибок</div></div></div></div>'
   +'<div class="sel-it" data-op="pw"><div class="sel-it-l"><span class="sel-ic" style="background:rgba(250,204,21,.14);border-color:rgba(250,204,21,.38);color:#fde047">🔑</span><div><div class="sel-it-nm">Сменить пароль</div><div class="sel-it-sb">'+(u&&u.email?esc(u.email):'Безопасность аккаунта')+'</div></div></div></div>'
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
   else if(op==='lang'){openAdmLangModal()}
   else if(op==='diag'){if(typeof window._openAdmDiag==='function')window._openAdmDiag()}
   else if(op==='pw'){openChangePw()}
   else if(op==='out'){
    if(await ask('Выйти из панели администратора?',{title:'Выход',okText:'Выйти',danger:true}))auth.signOut();
   }
  };
  requestAnimationFrame(()=>ov.classList.add('show'));
 }
 if(g('admMenuBtn'))g('admMenuBtn').onclick=openAdmMenu;
 if(g('admChatBtn'))g('admChatBtn').onclick=openAdmChat;
 auth.onAuthStateChanged(u=>{
  if(u){
   g('login').hidden=true;g('panel').hidden=false;g('who').textContent=(isSubAdm()?'Доставка · ':'')+(u.email||'');
   start();draw();
  }else{
   stop();USERS={};LABELS={};ACCOUNTS={};ATT={};ATT_ERR=false;
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
                        probe('Gemini OCR', maskKey(['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('')), async () => { const gk = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join(''); const gh = ['generativelanguage', 'googleapis', 'com'].join('.'); const u = 'https' + '://' + gh + '/v1beta/models/gemini-3.5-flash-lite?key=' + encodeURIComponent(gk); const r = await fetch(u); return { ok: r.ok, detail: r.ok ? 'HTTP 200' : 'HTTP ' + r.status }; })
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
      const errBar = ERR_LOG.length ? '<div style="padding:7px 10px;border-radius:12px;background:rgba(239,68,68,.12);border:1px solid rgba(248,113,113,.3);font-size:10.5px;color:#fca5a5"><b>Ошибки (' + ERR_LOG.length + '):</b> ' + String((ERR_LOG[0] && ERR_LOG[0].msg) || '').replace(/[<>&"]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[s])) + '</div>' : '<div style="padding:7px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;justify-content:space-between;font-size:11px;color:#94a3b8"><span>Журнал ошибок JS</span><span style="color:#6ee7b7;font-weight:600">0 ошибок</span></div>';
      box.innerHTML = grid + '<div style="padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;gap:3px;font-size:11px"><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Версия на сервере</span><code style="color:#fde047;font-weight:700">' + srvVer + '</code></div><div style="display:flex;justify-content:space-between"><span style="color:#94a3b8">Service Worker</span><span style="color:#e2e8f0;font-weight:600">' + swInfo + '</span></div><div style="display:flex;justify-content:space-between;gap:8px"><span style="color:#94a3b8;flex-shrink:0">Cache</span><code style="color:#7dd3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + cacheList + '</code></div></div>' + errBar;
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
  const getOpenOvs = () => Array.from(document.querySelectorAll(".ov")).filter(el => !el.hidden && (el.classList.contains("show") || getComputedStyle(el).display !== "none"));
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
    if (skipPop > 0) { skipPop--; return; }
    const list = getOpenOvs();
    if (!list.length) return;
    window._admSkipBack = true;
    fromPop = true;
    const top = list[list.length - 1];
    const btn = top.querySelector("#cNo, #admSumX, #achX, #admDmX, #dgClose, #pwNo, .sel-x, .ach-x");
    if (btn) btn.click();
    else top.click();
    setTimeout(() => { fromPop = false; depth = getOpenOvs().length; }, 220);
  }, true);
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
})();
