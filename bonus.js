(function(){
 const g=id=>document.getElementById(id);
 const CUR='֏';
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const num=v=>{const n=parseFloat(String(v).replace(',','.').replace(/\s/g,''));return isFinite(n)&&n>0?n:0};
 const r3=n=>Math.round(n*1000)/1000;
 const fm=n=>(Math.round(n*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const tst=(t,k)=>{window.toast&&toast(t,k)};
 function lock(on){document.documentElement.classList.toggle('lock',on);document.body.classList.toggle('lock',on)}

 // Фиксированный список: названия и цены менять нельзя, добавлять и удалять нельзя
 const S=(sk,name,price,price2)=>({sk:sk,name:name,price:price,price2:price2});
 const PRE=[
  {pk:'other',name:'Այլ',subs:[
   {sk:'a',name:'Աթոռ, դարակաշար',one:1,price:50},
   {sk:'b',name:'Աթոռ սեղաններ',one:1,price:100},
   S('c','Լվացարան',300,390),
   S('d','Կոմոդներ',500,650),
   S('e','Մահճակալ',500,650),
   S('f','Մոդուլներ',250,325),
   S('g','Ներքնակներ',250,325),
   S('h','Պահոցներ',500,650),
   {sk:'i',name:'դուռ',one:1,price:500},
   S('j','Պուֆիկներ',50,65),
   S('k','Տումբաներ',50,65)]},
  {pk:'sofas',name:'Բազմոցներ',subs:[
   S('a','Բազկաթոռ',500,650),
   S('b','Բազմոց',1000,1300),
   S('c','Հավաքածու',1500,1950)]},
  {pk:'recep',name:'Ընդունարան',subs:[
   S('a','Մինչև 1,6',700,910),
   S('b','1,6 ից ավել',1200,1560)]},
  {pk:'kitchen',name:'Խոհանոցներ',subs:[
   S('a','1,6 մ',1000,1300),
   S('b','2-3 մ',2500,3250)]},
  {pk:'living',name:'Հյուրասրահ',subs:[
   S('a','մինչև 1,7',1000,1300),
   S('b','1,7 ից ավել',2000,2600),
   S('c','Էքսկլ.',3000,3900)]},
  {pk:'bedroom',name:'Ննջասենյակներ',subs:[
   S('a','2 դուռ',1050,1365),
   S('b','3 դուռ առանց կոմոդ',1550,2015),
   S('c','3 դուռ կոմոդով',2050,2665),
   S('d','4 դուռ',2600,3380),
   S('e','5 դուռ',3100,4030),
   S('f','6 դուռ',3600,4680),
   S('g','0,9*2',3100,4030)]},
  {pk:'wardrobe',name:'Պահարաններ',subs:[
   S('a','2 դուռ',500,650),
   S('b','3 դուռ',1000,1300),
   S('c','4 դուռ',1500,1950),
   S('d','5 դուռ',2000,2600),
   S('e','6 դուռ',2500,3250)]}
 ];


 // FURNITURE_NAMES_I18N
 const FURNITURE_NAMES_I18N = {
  'Այլ':['Другое','Other'],
  'Աթոռ, դարակաշար':['Стулья, стеллажи','Chairs, shelving'],
  'Աթոռ սեղաններ':['Стулья, столы','Chairs, tables'],
  'Լվացարան':['Раковина','Sink'],
  'Կոմոդներ':['Комоды','Dressers'],
  'Մահճակալ':['Кровать','Bed'],
  'Մոդուլներ':['Модули','Modules'],
  'Ներքնակներ':['Матрасы','Mattresses'],
  'Պահոցներ':['Системы хранения','Storage units'],
  'դուռ':['Дверь','Door'],
  'Պուֆիկներ':['Пуфы','Poufs'],
  'Տումբաներ':['Тумбы','Cabinets'],
  'Բազմոցներ':['Диваны','Sofas'],
  'Բազկաթոռ':['Кресло','Armchair'],
  'Բազմոց':['Диван','Sofa'],
  'Հավաքածու':['Комплект','Set'],
  'Ընդունարան':['Ресепшен','Reception desk'],
  'Խոհանոցներ':['Кухни','Kitchens'],
  'Հյուրասրահ':['Гостиная','Living room'],
  'Ննջասենյակներ':['Спальни','Bedrooms'],
  'Պահարաններ':['Шкафы','Wardrobes'],
  'Մինչև 1,6':['До 1,6','Up to 1.6'],
  '1,6 ից ավել':['Более 1,6','Over 1.6'],
  '1,6 մ':['1,6 м','1.6 m'],
  '2-3 մ':['2–3 м','2–3 m'],
  'մինչև 1,7':['До 1,7','Up to 1.7'],
  '1,7 ից ավել':['Более 1,7','Over 1.7'],
  'Էքսկլ.':['Эксклюзив','Exclusive'],
  '2 դուռ':['2 двери','2 doors'],
  '3 դուռ':['3 двери','3 doors'],
  '3 դուռ առանց կոմոդ':['3 двери без комода','3 doors without dresser'],
  '3 դուռ կոմոդով':['3 двери с комодом','3 doors with dresser'],
  '4 դուռ':['4 двери','4 doors'],
  '5 դուռ':['5 дверей','5 doors'],
  '6 դուռ':['6 дверей','6 doors']
 };
 function furnitureName(value) {
  const pair = FURNITURE_NAMES_I18N[value];
  if (!pair) return value;
  const lang = window.getLang ? window.getLang() : 'ru';
  return lang === 'hy' ? value : pair[lang === 'en' ? 1 : 0];
 }

 const ICO={other:'📦',sofas:'🛋️',recep:'🗄️',kitchen:'🍳',living:'📺',bedroom:'🛏️',wardrobe:'🚪'};
 let B=[];
 try{const v=window.StorageService?window.StorageService.getJSON('BON',[]):JSON.parse(localStorage.getItem('BON')||'[]');if(Array.isArray(v))B=v.filter(c=>c&&Array.isArray(c.subs))}catch(e){}
 const save=(pk,sk,k,val)=>{
 if (!CAR_CODE || !window.firebase || !firebase.apps || !firebase.apps.length) return;
 if (pk && sk) {
  const key = pk + "_" + sk + (k === "2" ? "_2" : "");
  firebase.database().ref("cars/" + CAR_CODE + "/qty/" + key).set(val > 0 ? val : null).catch(()=>{});
  firebase.database().ref("cars/" + CAR_CODE + "/t").set(Date.now()).catch(()=>{});
 }
};
 let CAR_CODE = "";
 try { CAR_CODE = window.StorageService ? window.StorageService.get("USER_CAR", "") : (localStorage.getItem("USER_CAR") || ""); } catch(e){}
 let _carRef = null, _carFn = null, _histRef = null, _histFn = null, _carHist = {};

 function updCarBadge(){
  const sub = document.querySelector("#bnMdl .bn-hd-s");
  if (!sub) return;
  if (CAR_CODE === "ADMIN") {
   sub.textContent = "Расчёт по категориям мебели";
  } else if (CAR_CODE) {
   sub.innerHTML = '<span style="display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:99px;background:rgba(16,185,129,.18);border:1px solid rgba(52,211,153,.4);color:#6ee7b7;font-weight:700;font-size:11.5px">🚚 Экипаж ' + esc(CAR_CODE) + '</span>';
  } else {
   sub.innerHTML = '<span style="color:#fbbf24;font-weight:600;cursor:pointer" id="bnNoCrewHdr">⚠️ Экипаж не назначен администратором</span>';
   const hBtn = g('bnNoCrewHdr'); if (hBtn) hBtn.onclick = () => showNoCrewAlert();
  }
 }

 function bindCarPool(code){
  code = String(code || "").trim().toUpperCase();
  if (code === CAR_CODE && _carRef) { updCarBadge(); return; }
  if (_carRef && _carFn) { try { _carRef.off("value", _carFn); } catch(e){} }
  if (_histRef && _histFn) { try { _histRef.off("value", _histFn); } catch(e){} }
  _carRef = null; _carFn = null; _histRef = null; _histFn = null; _carHist = {};
  CAR_CODE = code;
  try { if (code) localStorage.setItem("USER_CAR", code); else localStorage.removeItem("USER_CAR"); } catch(e){}
  updCarBadge();
  if (!code || !window.firebase || !firebase.apps || !firebase.apps.length) {
   B.forEach(c => c.subs.forEach(s => { s.qty = 0; s.qty2 = 0; }));
   if (g("bnMdl") && g("bnMdl").classList.contains("open")) render();
   return;
  }
  const db = firebase.database();
  _carRef = db.ref("cars/" + code + "/qty");
  _carFn = _carRef.on("value", snap => {
   const qmap = snap.val() || {};
   B.forEach(c => c.subs.forEach(s => {
    const k1 = c.pk + "_" + s.sk, k2 = k1 + "_2";
    s.qty = num(qmap[k1]);
    s.qty2 = s.one ? 0 : num(qmap[k2]);
   }));
   if (g("bnMdl") && g("bnMdl").classList.contains("open")) {
    B.forEach((c, ci) => c.subs.forEach((s, si) => {
     const inp1 = document.querySelector('#bnList .bn-q[data-c="'+ci+'"][data-s="'+si+'"][data-k=""]');
     if (inp1 && document.activeElement !== inp1) inp1.value = s.qty;
     const inp2 = document.querySelector('#bnList .bn-q[data-c="'+ci+'"][data-s="'+si+'"][data-k="2"]');
     if (inp2 && document.activeElement !== inp2) inp2.value = s.qty2;
    }));
    upd();
   }
  });
  _histRef = db.ref("cars/" + code + "/hist");
  _histFn = _histRef.on("value", snap => {
   _carHist = snap.val() || {};
   const sm = g("bnSm");
   if (sm && sm.classList.contains("open")) histView();
  });
 }
 window._setDriverCar = bindCarPool;


 // Берём только готовый список; состояние свёрнутости храним отдельно в BON_COL (по умолчанию всё свёрнуто)
 function loadColMap(){
  try{return JSON.parse(localStorage.getItem('BON_COL')||'{}')||{}}catch(e){return{}}
 }
 function saveColMap(){
  try{
   const m={};
   B.forEach(c=>{m[c.pk]=!!c.col});
   localStorage.setItem('BON_COL',JSON.stringify(m));
  }catch(e){}
 }
 function sync(){
  const colMap=loadColMap();
  B=PRE.map(p=>{
   const oc=B.find(c=>c.pk===p.pk)||{};
   return {pk:p.pk,name:p.name,col:colMap[p.pk]===undefined?true:!!colMap[p.pk],subs:p.subs.map(s=>{
    const os=(oc.subs||[]).find(x=>x.sk===s.sk)||{};
    return {sk:s.sk,one:s.one?1:0,name:s.name,qty:num(os.qty),price:s.price,qty2:s.one?0:num(os.qty2),price2:s.one?0:s.price2};
   })};
  });
  save();
 }
 sync();
 try{localStorage.removeItem('BON')}catch(e){}

 function upd(){
  let t=0,q=0;
  B.forEach((c,ci)=>{
   let cs=0,cq=0;
   c.subs.forEach((s,si)=>{
    const v=num(s.qty)*num(s.price)+num(s.qty2)*num(s.price2);const dq=num(s.qty)+num(s.qty2);cs+=v;q+=dq;cq+=dq;
    const e=g('bs'+ci+'_'+si);if(e)e.textContent=fm(v)+' '+CUR;
   });
   t+=cs;{const e2=g('bq'+ci);if(e2){e2.textContent=cq?('Выбрано: '+fm(cq)+' шт'):(c.subs.length+' поз.');e2.classList.toggle('on',cq>0)}}
   const e=g('bc'+ci);if(e)e.textContent=fm(cs)+' '+CUR;
  });
  g('bnTot').textContent=fm(t)+' '+CUR;
  g('bnQty').textContent=fm(q);
 }

 const row=(a,s,k,lab)=>'<div class="bn-sr">'
  +'<button class="bn-pm bn-m" data-act="dec" data-k="'+k+'" '+a+'>−</button>'
  +'<input class="bn-q" data-k="'+k+'" '+a+' inputmode="decimal" value="'+num(s['qty'+k])+'">'
  +'<button class="bn-pm" data-act="inc" data-k="'+k+'" '+a+'>+</button>'
  +'<span class="bn-x">×</span>'
  +'<span class="bn-pv">'+(lab?'<small class="bn-pl">'+lab+'</small>':'')+fm(num(s['price'+k]))+'</span></div>';

 function render(){
  const l=g('bnList'),st=l.scrollTop;
  l.innerHTML=B.map((c,ci)=>{
   let h='<div class="bn-c'+(c.col?'':' open')+'" data-pk="'+c.pk+'"><div class="bn-ch" data-act="col" data-c="'+ci+'">'
    +'<span class="bn-ic2">'+(ICO[c.pk]||'📦')+'</span>'
    +'<span class="bn-ct"><span class="bn-cname">'+esc(furnitureName(c.name))+'</span><span class="bn-sub" id="bq'+ci+'"></span></span>'
    +'<span class="bn-cs" id="bc'+ci+'"></span>'
    +'<span class="bn-ar">'+(c.col?'▸':'▾')+'</span></div>';
   if(!c.col){
    h+=c.subs.map((s,si)=>{
     const a='data-c="'+ci+'" data-s="'+si+'"';
     return '<div class="bn-s bn-k"><div class="bn-sh2"><span class="bn-nm">'+esc(furnitureName(s.name))+'</span><span class="bn-ss" id="bs'+ci+'_'+si+'"></span></div>'
      +row(a,s,'',s.one?'':'Город')
      +(s.one?'':row(a,s,'2','Район'))
      +'</div>';
    }).join('');
   }
   return h+'</div>';
  }).join('');
  l.scrollTop=st;
  upd();
 }

 function showNoCrewAlert(){
  let m=g('noCrewMdl');if(m)m.remove();
  const L=curLang();
  const T={
   ru:{pill:'Доступ ограничен',title:'Экипаж не назначен',text:'Чтобы сохранять бонусы и журнал накладных, обратитесь к администратору — он назначит экипаж и откроет доступ к общему котлу.',chat:'Написать админу',ok:'Понятно'},
   hy:{pill:'Մուտքը սահմանափակ է',title:'Անձնակազմը նշանակված չէ',text:'Բոնուսներն ու ապրանքագրերի մատյանը պահպանելու համար դիմեք ադմինիստրատորին՝ անձնակազմ նշանակելու և մուտք տրամադրելու համար։',chat:'Գրել ադմինին',ok:'Պարզ է'},
   en:{pill:'Access restricted',title:'Crew not assigned',text:'To save bonuses and the invoice log, please contact the administrator to assign a crew and grant access to the shared pool.',chat:'Message admin',ok:'Got it'}
  }[L]||{pill:'Доступ ограничен',title:'Экипаж не назначен',text:'Чтобы сохранять бонусы и журнал накладных, обратитесь к администратору — он назначит экипаж и откроет доступ к общему котлу.',chat:'Написать админу',ok:'Понятно'};

  m=document.createElement('div');m.id='noCrewMdl';m.className='cm open';
  m.innerHTML='<div class="cm-b nc-box">'
    +'<button type="button" class="pm-x" id="ncX" aria-label="Закрыть">✕</button>'
    +'<div class="nc-ring"><div class="nc-in"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div></div>'
    +'<div class="nc-pill"><i></i><span>'+esc(T.pill)+'</span></div>'
    +'<div class="nc-t">'+esc(T.title)+'</div>'
    +'<div class="nc-s">'+esc(T.text)+'</div>'
    +'<div class="nc-acts">'
    +'<button type="button" class="nc-chat" id="ncChat"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>'+esc(T.chat)+'</span></button>'
    +'<button type="button" class="nc-ok" id="ncOk">'+esc(T.ok)+'</button>'
    +'</div></div>';
  document.body.appendChild(m);
  const close=()=>m.remove();
  g('ncX').onclick=close;
  g('ncOk').onclick=close;
  m.onclick=ev=>{if(ev.target===m)close()};
  g('ncChat').onclick=()=>{
   close();
   if(window.openDmChat)window.openDmChat();
   else if(window.toast)toast(T.text);
  };
 }

 function onInput(e){
  const t=e.target,c=B[+t.dataset.c],s=c&&c.subs[+t.dataset.s];
  if(!c||!s||!t.classList.contains('bn-q'))return;
  if(!CAR_CODE){t.value=0;showNoCrewAlert();return}
  const kk='qty'+(t.dataset.k||'');s[kk]=num(t.value);
  save(c.pk,s.sk,t.dataset.k||'',s[kk]);upd();
 }

 async function onClick(e){
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,ci=+b.dataset.c,si=+b.dataset.s,c=B[ci],s=c&&c.subs[si];
  if(!c)return;
  if(a==='inc'||a==='dec'){
   if(!s)return;
   if(!CAR_CODE){showNoCrewAlert();return}
   const kk='qty'+(b.dataset.k||'');
   s[kk]=Math.max(0,r3(num(s[kk])+(a==='inc'?1:-1)));
   const q=b.parentNode.querySelector('.bn-q');if(q)q.value=s[kk];
   save(c.pk,s.sk,b.dataset.k||'',s[kk]);upd();
  }else if(a==='col'){
   c.col=!c.col;saveColMap();render();
  }
 }

 async function resetQty(){
  if(!CAR_CODE){showNoCrewAlert();return}
  let rs=0,rq=0;B.forEach(c=>c.subs.forEach(s=>{const q1=num(s.qty),q2=num(s.qty2);rs+=q1*num(s.price)+q2*num(s.price2);rq+=q1+q2}));
  const msg=rq>0?(CAR_CODE==='ADMIN'?'Обнулить '+fm(rq)+' шт на сумму '+fm(rs)+' '+CUR+'?':'Обнулить '+fm(rq)+' шт ('+fm(rs)+' '+CUR+') у экипажа '+CAR_CODE+' и очистить журнал накладных?'):'Количества по нулям. Очистить журнал накладных?';
  if(!await askC(msg,'Обнулить','🔄'))return;
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0;s.qty2=0}));
  if(window.firebase&&firebase.apps&&firebase.apps.length){firebase.database().ref('cars/'+CAR_CODE+'/qty').remove().catch(()=>{});firebase.database().ref('cars/'+CAR_CODE+'/docs').remove().catch(()=>{});}
  render();tst('Количества обнулены');
 }

 let skipPop=0;
 const SUMM=[['','Город'],['2','Район']];
 function sumRows(){
  if(window.BonusEngine)return window.BonusEngine.computeSummaryRows(B);
  const out=[];
  B.forEach(c=>{
   const items=[];let cs=0;
   c.subs.forEach(s=>{
    const parts=[];
    SUMM.forEach(x=>{
     const n=num(s['qty'+x[0]]),p=num(s['price'+x[0]]);
     if(n>0)parts.push({l:s.one?'':x[1],n:n,p:p,v:n*p});
    });
    if(parts.length){items.push({name:s.name,parts:parts});parts.forEach(z=>{cs+=z.v})}
   });
   if(items.length)out.push({name:c.name,sum:cs,items:items});
  });
  return out;
 }
 // ===== Итоги: сохранение по кнопке и просмотр =====
 const cqOf=c=>window.BonusEngine?window.BonusEngine.categoryQuantity(c):c.items.reduce((a,it)=>a+it.parts.reduce((b,z)=>b+z.n,0),0);
 const MK=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 const HIST=()=>_carHist||{};
 const saveHistRec=(id,rec)=>{if(CAR_CODE&&window.firebase&&firebase.apps&&firebase.apps.length)firebase.database().ref('cars/'+CAR_CODE+'/hist/'+id).set(rec).catch(()=>{})};
 const delHistRec=id=>{if(CAR_CODE&&window.firebase&&firebase.apps&&firebase.apps.length)firebase.database().ref('cars/'+CAR_CODE+'/hist/'+id).remove().catch(()=>{})};
 const qtyOf=rows=>window.BonusEngine?window.BonusEngine.totalQuantity(rows):rows.reduce((a,c)=>a+cqOf(c),0);
 const sumOf=rows=>window.BonusEngine?window.BonusEngine.totalSum(rows):rows.reduce((a,c)=>a+c.sum,0);
 // ===== Названия месяцев на текущем языке =====
 const MN={ru:['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'],hy:['Հունվար','Փետրվար','Մարտ','Ապրիլ','Մայիս','Հունիս','Հուլիս','Օգոստոս','Սեպտեմբեր','Հոկտեմբեր','Նոյեմբեր','Դեկտեմբեր'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
 function curLang(){try{return window.getLang?window.getLang():'ru'}catch(e){return 'ru'}}
 function capName(n){return n.charAt(0).toUpperCase()+n.slice(1)}
 function monthName(k){
  const p=String(k).split('-');if(p.length<2)return String(k);
  const L=curLang(),nm=capName((MN[L]||MN.ru)[+p[1]-1]||'');
  return L==='ru'?nm+' '+p[0]+' г.':nm+' '+p[0];
 }
 // Окно выбора месяца и года, возвращает 'YYYY-MM' или null
 function pickMonth(){return new Promise(res=>{
  const old=g('mPick');if(old)old.remove();
  const now=new Date(),L=curLang(),names=MN[L]||MN.ru;
  const opts=names.map((n,i)=>'<option value="'+(i+1)+'"'+(i===now.getMonth()?' selected':'')+'>'+capName(n)+'</option>').join('');
  const m=document.createElement('div');m.id='mPick';m.className='cm open';
  m.innerHTML='<div class="cm-b bn-pk"><div class="cm-i">📅</div><div class="cm-t">Выберите месяц и год</div>'
   +'<div class="bn-pkr"><select id="pkM">'+opts+'</select><input id="pkY" type="number" inputmode="numeric" min="2000" max="2100" value="'+now.getFullYear()+'"></div>'
   +'<div class="cm-r"><button id="pkNo">Отмена</button><button id="pkOk" class="cm-ok">Сохранить</button></div></div>';
  document.body.appendChild(m);
  const done=v=>{m.remove();res(v)};
  g('pkNo').onclick=()=>done(null);
  g('pkOk').onclick=()=>{
   const mo=+g('pkM').value,y=+g('pkY').value;
   if(!(y>=2000&&y<=2100)){tst('Укажите год от 2000 до 2100','err');return}
   done(y+'-'+String(mo).padStart(2,'0'));
  };
  m.onclick=e=>{if(e.target===m)done(null)};
 })}
 function setFoot(k){
  const b=g('bnSave');if(!b)return;
  if(k&&k!=='cur'&&HIST()[k]){b.textContent='🗑️ Удалить';b.classList.add('bn-del');b.onclick=()=>deleteMonth(k)}
  else{b.textContent='💾 Сохранить';b.classList.remove('bn-del');b.onclick=saveMonth}
 }
 function deleteMonth(k){
  const d=HIST()[k];if(!d)return;
  askC('Удалить эти итоги? Это действие нельзя отменить.','Удалить','🗑️').then(y=>{
   if(!y)return;
   const h=HIST();delete h[k];delHistRec(k);
   tst('Итоги удалены');histView();
  });
 }
 function rowHtml(k,name,sub,sum,qty,cur){
  return '<div class="bn-mr'+(cur?' bn-mr-cur':'')+'" data-m="'+k+'" role="button">'
   +'<span class="bn-mi">'+(cur?'🟢':'📅')+'</span>'
   +'<span class="bn-mtx"><span class="bn-mn">'+esc(name)+'</span><span class="bn-mq">'+fm(qty)+' шт'+(sub?' · '+esc(sub):'')+'</span></span>'
   +'<span class="bn-mv">'+fm(sum)+' '+CUR+'</span><span class="bn-mc">›</span></div>';
 }
 function buildModernDetail(rows,title,sub,withBack){
  let totS=0,totQ=0,cityS=0,regS=0,oneS=0;
  rows.forEach(c=>c.items.forEach(it=>it.parts.forEach(z=>{
   totS+=z.v;totQ+=z.n;
   if(z.l==='Район')regS+=z.v;else if(z.l==='Город')cityS+=z.v;else oneS+=z.v;
  })));
  const pCity=totS?Math.round(cityS*100/totS):0,pReg=totS?Math.round(regS*100/totS):0,pOne=Math.max(0,100-pCity-pReg);
  let html=(withBack?'<div class="bn-back" data-m="back">← Все итоги</div>':'')
   +'<div class="sum-dash"><div class="sum-top"><div><div class="sum-lbl">'+esc(title)+(sub?' · '+esc(sub):'')+'</div><div class="sum-val">'+fm(totS)+' <span>'+CUR+'</span></div></div>'
   +'<div class="sum-kpis"><div class="sum-kpi"><b>'+fm(totQ)+'</b><span>штук</span></div><div class="sum-kpi"><b>'+rows.length+'</b><span>катег.</span></div></div></div>'
   +(totS>0&&((cityS>0&&regS>0)||oneS>0)?'<div class="sum-bar-w"><div class="sum-bar">'
    +(pCity?'<i style="width:'+pCity+'%;background:#38bdf8"></i>':'')+(pReg?'<i style="width:'+pReg+'%;background:#a78bfa"></i>':'')+(pOne?'<i style="width:'+pOne+'%;background:#34d399"></i>':'')
    +'</div><div class="sum-leg">'
    +(cityS?'<span><i style="background:#38bdf8"></i>Город '+pCity+'% ('+fm(cityS)+')</span>':'')
    +(regS?'<span><i style="background:#a78bfa"></i>Район '+pReg+'% ('+fm(regS)+')</span>':'')
    +(oneS?'<span><i style="background:#34d399"></i>Фикс '+pOne+'% ('+fm(oneS)+')</span>':'')
    +'</div></div>':'')+'</div>';
  if(!rows.length)return html+'<div class="bn-empty">Ничего не выбрано.</div>';
  html+='<div class="sum-tools"><div class="sum-seg" id="bnSeg"><button type="button" class="on" data-f="all">Все</button><button type="button" data-f="Город">Город</button><button type="button" data-f="Район">Район</button><button type="button" data-f="Шт">Фикс</button></div><input id="bnSrch" class="sum-srch" type="search" placeholder="Поиск позиции..."></div>';
  html+='<div id="bnCats">'+rows.map((c,idx)=>{
   const cq=cqOf(c),pct=totS?Math.round(c.sum*100/totS):0;
   const body=c.items.map(it=>'<div class="sum-it" data-name="'+esc(furnitureName(it.name).toLowerCase())+'"><div class="sum-it-t">'+esc(furnitureName(it.name))+'</div>'
    +it.parts.map(z=>{const cls=z.l==='Район'?'reg':(z.l?'city':'one');return '<div class="sum-r" data-zone="'+esc(z.l||'Шт')+'" data-q="'+(+z.n||0)+'" data-v="'+(+z.v||0)+'"><span class="bn-tag '+cls+'">'+(z.l||'Шт')+'</span><span class="sum-f"><b>'+fm(z.n)+'</b> × '+fm(z.p)+' '+CUR+'</span><b class="sum-v">'+fm(z.v)+' '+CUR+'</b></div>';}).join('')+'</div>').join('');
   return '<div class="sum-cat" data-ci="'+idx+'"><div class="sum-cat-h" data-tog="1"><div class="sum-cat-l"><span class="sum-chv">▸</span><div><div class="sum-cat-n">'+esc(furnitureName(c.name))+'</div><div class="sum-cat-s">'+fm(cq)+' шт · '+pct+'% от суммы</div></div></div><div class="sum-cat-r">'+fm(c.sum)+' '+CUR+'</div></div><div class="sum-cat-b">'+body+'</div></div>';
  }).join('')+'</div>';
  return html;
 }
 function bindSumTools(root){
  if(!root)return;
  if(root._sumBound){if(root._resetSumTools)root._resetSumTools();return;}
  root._sumBound=true;
  let flt='all',q='';
  root._resetSumTools=()=>{flt='all';q='';};
  const apply=()=>{
   let gS=0,gQ=0,gC=0;
   const catStats=[];
   root.querySelectorAll('.sum-cat').forEach(cat=>{
    let cS=0,cQ=0,vc=0;
    cat.querySelectorAll('.sum-it').forEach(it=>{
     const mn=!q||(it.dataset.name||'').includes(q);
     let vr=0;
     it.querySelectorAll('.sum-r').forEach(r=>{
      const ok=mn&&(flt==='all'||r.dataset.zone===flt);
      r.style.display=ok?'':'none';
      if(ok){
       vr++;
       cQ+=parseFloat(r.dataset.q)||0;
       cS+=parseFloat(r.dataset.v)||0;
      }
     });
     it.style.display=vr?'':'none';
     if(vr)vc++;
    });
    cat.style.display=vc?'':'none';
    if(vc){gS+=cS;gQ+=cQ;gC++;catStats.push({cat,cS,cQ})}
   });
   catStats.forEach(({cat,cS,cQ})=>{
    const rEl=cat.querySelector('.sum-cat-r');
    const sEl=cat.querySelector('.sum-cat-s');
    const pct=gS?Math.round(cS*100/gS):0;
    if(rEl)rEl.textContent=fm(cS)+' '+CUR;
    if(sEl)sEl.textContent=fm(cQ)+' шт · '+pct+'% от суммы';
   });
   const vEl=root.querySelector('.sum-val');
   const kpis=root.querySelectorAll('.sum-kpi b');
   if(vEl)vEl.innerHTML=fm(gS)+' <span>'+CUR+'</span>';
   if(kpis[0])kpis[0].textContent=fm(gQ);
   if(kpis[1])kpis[1].textContent=fm(gC);
  };
  root.addEventListener('click',e=>{
   const fb=e.target.closest('#bnSeg button');if(fb){flt=fb.dataset.f;root.querySelectorAll('#bnSeg button').forEach(b=>b.classList.toggle('on',b===fb));apply();return}
   const tg=e.target.closest('[data-tog]');if(tg){const card=tg.closest('.sum-cat');if(card){card.classList.toggle('open');const ch=card.querySelector('.sum-chv');if(ch)ch.textContent=card.classList.contains('open')?'▾':'▸'}}
  });
  root.addEventListener('input',e=>{if(e.target&&e.target.id==='bnSrch'){q=e.target.value.trim().toLowerCase();apply()}});
 }
 let CUR_VIEW={k:"cur",title:"Текущий месяц",rows:null};
 function histView(){CUR_VIEW={k:"cur",title:"Текущий месяц",rows:null};setFoot();
  const h=HIST(),ks=Object.keys(h).sort((a,b)=>(h[b].t||0)-(h[a].t||0));
  const cr=sumRows(),cs=sumOf(cr),cq=qtyOf(cr);
  let html='<div class="sum-dash sum-dash-btn" data-m="cur"><div class="sum-top"><div><div class="sum-lbl">Текущий месяц · открыть ›</div><div class="sum-val">'+fm(cs)+' <span>'+CUR+'</span></div></div><div class="sum-kpis"><div class="sum-kpi"><b>'+fm(cq)+'</b><span>штук</span></div></div></div></div>';
  html+='<div class="bn-sec">Архив по месяцам ('+ks.length+')</div>';
  ks.forEach(k=>{const d=h[k];html+=rowHtml(k,monthName(d.m||k),new Date(d.t||0).toLocaleDateString(curLang()==='hy'?'hy-AM':(curLang()==='en'?'en-US':'ru-RU'),{day:'numeric',month:'short'}),d.sum,d.qty,false)});
  if(!ks.length)html+='<div class="bn-tip">Нажмите «💾 Сохранить», когда захотите зафиксировать итоги. Количества тогда обнулятся.</div>';
  const box=g('bnSmList');box.innerHTML=html;bindSumTools(box);
  g('bnSmTot').textContent=fm(cs)+' '+CUR;g('bnSmQty').textContent=fm(cq);
 }
 function detailView(rows,title,sub){
  const q=qtyOf(rows),box=g('bnSmList');
  box.innerHTML=buildModernDetail(rows,title,sub,true);bindSumTools(box);
  g('bnSmTot').textContent=fm(sumOf(rows))+' '+CUR;g('bnSmQty').textContent=fm(q);
 }
 function showMonth(k){
  if(k==='back')return histView();
  if(k==='cur'){CUR_VIEW={k:'cur',title:'Текущий месяц',rows:null};setFoot();return detailView(sumRows(),'Текущий месяц','')}
  const d=HIST()[k];if(!d)return;
  CUR_VIEW={k:k,title:monthName(d.m||k),rows:d.rows||[]};
  setFoot(k);detailView(d.rows,monthName(d.m||k),new Date(d.t||0).toLocaleDateString(curLang()==='hy'?'hy-AM':(curLang()==='en'?'en-US':'ru-RU'),{day:'numeric',month:'long'}));
 }
 async function saveMonth(){
  if(!CAR_CODE){showNoCrewAlert();return}
  const rows=sumRows();
  if(!rows.length){tst('Пока ничего не выбрано','err');return}
  const mk=await pickMonth();if(!mk)return;
  const ok=await askC('Сохранить итоги за выбранный месяц и обнулить количества?','Сохранить','💾');
  if(!ok)return;
  const now=new Date(),id=now.getTime().toString(36);
  const h=HIST(),rec={m:mk,t:now.getTime(),sum:sumOf(rows),qty:qtyOf(rows),rows:rows};
  h[id]=rec;
  saveHistRec(id,rec);
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0;s.qty2=0}));
  if(CAR_CODE&&window.firebase&&firebase.apps&&firebase.apps.length){firebase.database().ref('cars/'+CAR_CODE+'/qty').remove().catch(()=>{});firebase.database().ref('cars/'+CAR_CODE+'/docs').remove().catch(()=>{});}render();histView();
  tst('Итоги сохранены');
 }
 function openSum(){
  histView();
  g('bnSm').classList.add('open');
  try{history.pushState({bs:1},'')}catch(e){}
 }
 function closeSum(){
  const o=g('bnSm');if(!o||!o.classList.contains('open'))return;
  o.classList.remove('open');
  try{if(history.state&&history.state.bs){skipPop++;setTimeout(()=>history.back(),0)}}catch(e){}
 }
 function downloadBonusCsv(filename,rows){
  if(!rows||!rows.length){tst('Нет данных для выгрузки','err');return}
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
  tst('Таблица Excel скачана');
 }
 function exportBonusMonthCsv(){
  const isCur=!CUR_VIEW||CUR_VIEW.k==='cur';
  const rows=isCur?sumRows():(CUR_VIEW.rows||[]);
  if(!rows.length){tst('Пока ничего не выбрано','err');return}
  const L=curLang();
  const H={
   ru:['Категория','Позиция мебели','Зона','Кол-во (шт)','Тариф (֏)','Сумма (֏)','ИТОГО'],
   hy:['Կատեգորիա','Ապրանքի անվանում','Գոտի','Քանակ (հատ)','Սակագին (֏)','Գումար (֏)','ԸՆԴԱՄԵՆԸ'],
   en:['Category','Furniture item','Zone','Quantity (pcs)','Rate (֏)','Amount (֏)','TOTAL']
  }[L]||['Категория','Позиция мебели','Зона','Кол-во (шт)','Тариф (֏)','Сумма (֏)','ИТОГО'];
  const header=[H[0],H[1],H[2],H[3],H[4],H[5]];
  const data=[];let totQ=0,totS=0;
  rows.forEach(c=>{
   (c.items||[]).forEach(it=>{
    (it.parts||[]).forEach(z=>{
     const zn=z.l==='Район'?(L==='hy'?'Մարզ':(L==='en'?'Region':'Район')):(z.l==='Город'?(L==='hy'?'Քաղաք':(L==='en'?'City':'Город')):(L==='hy'?'Հատ':(L==='en'?'Pcs':'Шт')));
     totQ+=+z.n||0;totS+=+z.v||0;
     data.push([furnitureName(c.name),furnitureName(it.name),zn,+z.n||0,+z.p||0,+z.v||0]);
    });
   });
  });
  const totalRow=[H[6],'','',totQ,'',totS];
  const fn=('EuroBaza_'+(CAR_CODE||'CREW')+'_'+(isCur?'Текущий_месяц':CUR_VIEW.title).replace(/[\s\/:*?"<>|]+/g,'_')+'.csv');
  if(window.TableViewer){
   TableViewer.open({
    title:(isCur?'Текущий месяц':CUR_VIEW.title)+' · Экипаж '+(CAR_CODE||''),
    filename:fn,
    headers:header,
    rows:data,
    totalRow:totalRow
   });
   return;
  }
  downloadBonusCsv(fn,[header,...data,totalRow]);
 }
 function copySum(){
  const isCur=!CUR_VIEW||CUR_VIEW.k==='cur';
  const rows=isCur?sumRows():(CUR_VIEW.rows||[]);
  if(!rows.length){tst('Пока ничего не выбрано','err');return}
  let t=0,q=0,s=(isCur?'Итоги':('Итоги · '+CUR_VIEW.title))+'\n';
  rows.forEach(c=>{
   t+=c.sum;s+='\n'+furnitureName(c.name)+' — '+fm(c.sum)+' '+CUR+'\n';
   c.items.forEach(it=>{
    s+='• '+furnitureName(it.name)+'\n';
    it.parts.forEach(z=>{q+=z.n;s+='   '+(z.l?z.l+': ':'')+fm(z.n)+' × '+fm(z.p)+' = '+fm(z.v)+' '+CUR+'\n'});
   });
  });
  s+='\nВсего штук: '+fm(q)+'\nОбщая сумма: '+fm(t)+' '+CUR;
  try{navigator.clipboard.writeText(window.i18nCopy?i18nCopy(s):s).then(()=>tst('Скопировано')).catch(()=>tst('Не удалось скопировать','err'))}catch(e){tst('Не удалось скопировать','err')}
 }

 async function openDocsLog(){
  if(!CAR_CODE){showNoCrewAlert();return}
  let m=g('bnDocsMdl');if(m)m.remove();m=document.createElement('div');m.id='bnDocsMdl';m.className='cm open';
  m.innerHTML='<div class="cm-b ob-pk-box" style="max-width:420px;height:min(82dvh,580px);display:flex;flex-direction:column;padding:0;overflow:hidden"><div class="ob-pk-hd" style="padding:14px 16px;flex-shrink:0"><div><b>🧾 Журнал накладных</b><small>Экипаж '+esc(CAR_CODE)+'</small></div><button type="button" class="pt-x" id="bdX">✕</button></div><div style="padding:8px 12px;background:rgba(0,0,0,.18);border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0"><input id="bdSearch" type="search" placeholder="🔍 Поиск по номеру накладной или позиции..." style="width:100%;height:36px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#f8fafc;font-size:12.5px;outline:none;box-sizing:border-box"></div><div class="ob-pk-list" id="bdList" style="flex:1;overflow:auto;padding:12px"><div class="pt-empty">Загрузка...</div></div></div>';
  document.body.appendChild(m);const cl=()=>m.remove();g('bdX').onclick=cl;m.onclick=ev=>{if(ev.target===m)cl()};
  try{
   const val=(await firebase.database().ref('cars/'+CAR_CODE+'/docs').once('value')).val()||{};
   const allList=Object.keys(val).map(k=>val[k]).filter(Boolean).sort((a,b)=>(+b.t||0)-(+a.t||0)),box=g('bdList');if(!box)return;
   if(!allList.length){box.innerHTML='<div class="pt-empty">Отсканированных накладных пока нет.</div>';return}

   const renderDocs=list=>{
    if(!list.length){box.innerHTML='<div class="pt-empty">Ничего не найдено</div>';return}
    let totS=0,totQ=0;list.forEach(x=>{totS+=(+x.sum||0);totQ+=(+x.qty||0)});
    const headHtml='<div class="bd-sum"><span>Накладных: <b>'+list.length+'</b></span>'+((totQ||totS)?'<span><b>'+fm(totQ)+' шт</b> · <b style="color:#fde047">'+fm(totS)+' '+CUR+'</b></span>':'')+'</div>';
    box.innerHTML=headHtml+list.map(x=>{
     const d=x.t?new Date(x.t):null,tm=d?d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'):'';
     const zn=x.z===1?'Город':(x.z===2?'Район':'');const rp=x.rep>1?'<span class="bd-rep">\u{1f501} <span>Повтор</span>'+(x.rep>2?' \u00d7'+x.rep:'')+'</span>':'';
     const right=(x.qty||x.sum)?'<div class="bd-r"><b>'+fm(+x.sum||0)+' '+CUR+'</b><small>'+fm(+x.qty||0)+' шт</small></div>':'';
     return '<div class="bd-card"><div class="bd-top"><div class="bd-l"><span class="bd-ic">🧾</span><div><div class="bd-num"><span>№ '+esc(x.doc||'—')+'</span>'+(zn?'<span class="bd-z">'+zn+'</span>':'')+rp+'</div><div class="bd-meta">'+esc(x.by||'Водитель')+(tm?' · '+tm:'')+'</div></div></div>'+right+'</div></div>';
    }).join('');
   };
   renderDocs(allList);

   const sinp=g('bdSearch');
   if(sinp){
    sinp.oninput=()=>{
     const q=sinp.value.trim().toLowerCase();
     if(!q){renderDocs(allList);return}
     renderDocs(allList.filter(x=>{
      const docNum=String(x.doc||'').toLowerCase();
      const who=String(x.by||'').toLowerCase();
      const pKeys=x.p&&typeof x.p==='object'?Object.keys(x.p).join(' ').toLowerCase():'';
      return docNum.includes(q)||who.includes(q)||pKeys.includes(q);
     }));
    };
   }
  }catch(e){const box=g('bdList');if(box)box.innerHTML='<div class="pt-empty">Ошибка загрузки журнала</div>'}
 }
 function ensure(){
  let m=g('bnMdl');if(m)return m;
  m=document.createElement('div');m.id='bnMdl';m.className='mdl';
  m.innerHTML='<div class="mdl-b bn-b"><div class="bn-hd"><div class="bn-hd-l"><div class="bn-hd-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg></div><div><div class="bn-hd-t">Бонусы</div><div class="bn-hd-s">Расчёт по категориям мебели</div></div></div><div style="display:flex;align-items:center;gap:7px;flex-shrink:0"><button type="button" class="bn-cam-btn" id="bnDocsBtn" title="Журнал накладных" style="background:rgba(250,204,21,.15)!important;border-color:rgba(250,204,21,.4)!important;color:#fde047!important">🧾</button><button type="button" class="bn-cam-btn" id="bnCamBtn" title="Сканировать накладную" aria-label="Сканировать накладную"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></button><button type="button" class="bn-x-btn" id="bnX" aria-label="Закрыть">✕</button></div></div>'
   +'<div id="bnList"></div>'
   +'<div class="bn-ft"><div class="bn-tr"><span>Общая сумма</span><b id="bnTot">0</b></div>'
   +'<div class="bn-tr bn-sm"><span>Всего штук: <b id="bnQty">0</b></span></div>'
   +'<div class="bn-btns"><button id="bnSumB">📋 Итоги</button><button id="bnRst">🔄 Обнулить</button></div></div></div>'
   +'<div class="bn-ov" id="bnSm"><div class="mdl-b bn-b"><div class="bn-hd"><div class="bn-hd-l"><div class="bn-hd-ic bn-hd-ic2"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg></div><div><div class="bn-hd-t">Итоги</div><div class="bn-hd-s">Сводка и история начислений</div></div></div><button type="button" class="bn-x-btn" id="bnSmX" aria-label="Закрыть">✕</button></div><div id="bnSmList"></div>'
   +'<div class="bn-ft"><div class="bn-tr"><span>Общая сумма</span><b id="bnSmTot">0</b></div><div class="bn-tr bn-sm"><span>Всего штук: <b id="bnSmQty">0</b></span></div>'
   +'<div class="bn-btns"><button id="bnSave">💾 Сохранить</button><button id="bnSmCsv" style="background:linear-gradient(135deg,rgba(56,189,248,.24),rgba(14,165,233,.16))!important;color:#7dd3fc!important;border:1px solid rgba(56,189,248,.42)!important">📥 Excel</button></div></div></div></div>';
  document.body.appendChild(m);
  m.onclick=e=>{if(e.target===m)closeBon()};
  g('bnX').onclick=()=>closeBon();if(g('bnDocsBtn'))g('bnDocsBtn').onclick=openDocsLog;if(g('bnCamBtn'))g('bnCamBtn').onclick=()=>{if(!CAR_CODE){showNoCrewAlert();return}if(window.openBonusScanner)window.openBonusScanner()};
  g('bnRst').onclick=resetQty;
  g('bnSumB').onclick=openSum;g('bnSmList').addEventListener('click',e=>{const r=e.target.closest('[data-m]');if(r)showMonth(r.dataset.m)});g('bnSmX').onclick=()=>closeSum();if(g('bnSmCsv'))g('bnSmCsv').onclick=exportBonusMonthCsv;g('bnSave').onclick=saveMonth;g('bnSm').onclick=e=>{if(e.target===g('bnSm'))closeSum()};
  const l=g('bnList');
  l.addEventListener('input',onInput);
  l.addEventListener('click',onClick);
  return m;
 }

 function openBon(noPush){
  if (!CAR_CODE) {
   showNoCrewAlert();
   return;
  }
  if(!_carRef&&window.firebase&&firebase.apps&&firebase.apps.length)bindCarPool(CAR_CODE);
  const m=ensure();updCarBadge();render();
  m.classList.add('open');lock(true);
  try{sessionStorage.setItem('BON_WAS_OPEN','1')}catch(e){}
  if(!noPush){try{history.pushState({bn:1},'')}catch(e){}}
 }
 function closeBon(src){
  const m=g('bnMdl');if(!m||!m.classList.contains('open'))return;
  const ov=g('bnSm');if(ov)ov.classList.remove('open');m.classList.remove('open');lock(false);
  try{sessionStorage.removeItem('BON_WAS_OPEN')}catch(e){}
  if(src!=='pop'){try{if(history.state&&history.state.bn)setTimeout(()=>history.back(),0)}catch(e){}}
 }
 window.addEventListener('popstate',()=>{if(skipPop>0){skipPop--;return}const repush=()=>{const m=g('bnMdl');if(m&&m.classList.contains('open'))try{history.pushState({bn:1},'')}catch(e){}};if(g('ocrLiveCam')){const c=g('olcClose');if(c)c.click();repush();return}if(g('ocrCatMdl')){const c=g('obPkX');if(c)c.click();repush();return}if(g('ocrSrcMdl')){const c=g('ocrPickNo');if(c)c.click();repush();return}if(g('ocrBonMdl')){const c=g('obX');if(c)c.click();repush();return}const o=g('bnSm');if(o&&o.classList.contains('open')){o.classList.remove('open');repush();return}const m=g('bnMdl');if(m&&m.classList.contains('open'))closeBon('pop')});
 const restoreBon=()=>{try{if(sessionStorage.getItem('BON_WAS_OPEN')==='1'&&(!g('bnMdl')||!g('bnMdl').classList.contains('open')))openBon(true)}catch(e){}};setTimeout(restoreBon,120);document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(restoreBon,150)});

 // Перерисовка названий мебели при смене языка приложения
 new MutationObserver(()=>{
  const m=g('bnMdl');
  if(m && m.classList.contains('open')) {
   render();
   const sm=g('bnSm');
   if(sm && sm.classList.contains('open')) histView();
  }
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

 window.openBon=openBon;window.closeBon=closeBon;

 const f=document.createElement('button');
 f.className='fab fab-l';f.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg><span>Бонусы</span>';f.onclick=openBon;
 document.body.appendChild(f);
})();
