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
 try{const v=JSON.parse(localStorage.getItem('BON')||'[]');if(Array.isArray(v))B=v.filter(c=>c&&Array.isArray(c.subs))}catch(e){}
 const save=()=>{try{localStorage.setItem('BON',JSON.stringify(B))}catch(e){}};

 // Берём только готовый список; из сохранённого переносим количества и «свёрнуто/развёрнуто»
 function sync(){
  B=PRE.map(p=>{
   const oc=B.find(c=>c.pk===p.pk)||{};
   return {pk:p.pk,name:p.name,col:oc.col===undefined?true:!!oc.col,subs:p.subs.map(s=>{
    const os=(oc.subs||[]).find(x=>x.sk===s.sk)||{};
    return {sk:s.sk,one:s.one?1:0,name:s.name,qty:num(os.qty),price:s.price,qty2:s.one?0:num(os.qty2),price2:s.one?0:s.price2};
   })};
  });
  save();
 }
 sync();
 try{if(!localStorage.getItem('BON_INIT')){B.forEach(c=>{c.col=true});save();localStorage.setItem('BON_INIT','1')}}catch(e){}

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

 function onInput(e){
  const t=e.target,c=B[+t.dataset.c],s=c&&c.subs[+t.dataset.s];
  if(!c||!s||!t.classList.contains('bn-q'))return;
  s['qty'+(t.dataset.k||'')]=num(t.value);
  save();upd();
 }

 async function onClick(e){
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,ci=+b.dataset.c,si=+b.dataset.s,c=B[ci],s=c&&c.subs[si];
  if(!c)return;
  if(a==='inc'||a==='dec'){
   if(!s)return;
   const kk='qty'+(b.dataset.k||'');
   s[kk]=Math.max(0,r3(num(s[kk])+(a==='inc'?1:-1)));
   const q=b.parentNode.querySelector('.bn-q');if(q)q.value=s[kk];
   save();upd();
  }else if(a==='col'){
   c.col=!c.col;save();render();
  }
 }

 async function resetQty(){
  if(!await askC('Обнулить все количества?','Обнулить','🔄'))return;
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0;s.qty2=0}));save();render();tst('Количества обнулены');
 }

 let skipPop=0;
 const SUMM=[['','Город'],['2','Район']];
 function sumRows(){
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
 const cqOf=c=>c.items.reduce((a,it)=>a+it.parts.reduce((b,z)=>b+z.n,0),0);
 const MK=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 const HIST=()=>{try{const v=JSON.parse(localStorage.getItem('BON_HIST')||'{}');return v&&typeof v==='object'?v:{}}catch(e){return{}}};
 const saveHist=h=>{try{localStorage.setItem('BON_HIST',JSON.stringify(h))}catch(e){}};
 const qtyOf=rows=>rows.reduce((a,c)=>a+cqOf(c),0);
 const sumOf=rows=>rows.reduce((a,c)=>a+c.sum,0);
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
   const h=HIST();delete h[k];saveHist(h);
   tst('Итоги удалены');histView();
  });
 }
 function rowHtml(k,name,sub,sum,qty,cur){
  return '<div class="bn-mr'+(cur?' bn-mr-cur':'')+'" data-m="'+k+'" role="button">'
   +'<span class="bn-mi">'+(cur?'🟢':'📅')+'</span>'
   +'<span class="bn-mtx"><span class="bn-mn">'+esc(name)+'</span><span class="bn-mq">'+fm(qty)+' шт'+(sub?' · '+esc(sub):'')+'</span></span>'
   +'<span class="bn-mv">'+fm(sum)+' '+CUR+'</span><span class="bn-mc">›</span></div>';
 }
 function histView(){setFoot();
  const h=HIST(),ks=Object.keys(h).sort((a,b)=>(h[b].t||0)-(h[a].t||0));
  const cr=sumRows(),cs=sumOf(cr),cq=qtyOf(cr);
  let html='<div class="bn-hero bn-hero-btn" data-m="cur"><span class="bn-hero-l">Текущий месяц</span><b class="bn-hero-v">'+fm(cs)+' '+CUR+'</b><span class="bn-hero-q">'+fm(cq)+' шт</span></div>';
  html+='<div class="bn-sec">Сохранённые итоги</div>';
  ks.forEach(k=>{
   const d=h[k];
   html+=rowHtml(k,monthName(d.m||k),new Date(d.t||0).toLocaleDateString('ru-RU',{day:'numeric',month:'short'}),d.sum,d.qty,false);
  });
  if(!ks.length)html+='<div class="bn-tip">Нажмите «💾 Сохранить», когда захотите зафиксировать итоги. Количества тогда обнулятся.</div>';
  g('bnSmList').innerHTML=html;
  g('bnSmTot').textContent=fm(cs)+' '+CUR;g('bnSmQty').textContent=fm(cq);
 }
 function detailView(rows,title,sub){
  const q=qtyOf(rows);
  let html='<div class="bn-back" data-m="back">← Все итоги</div>'
   +'<div class="bn-hero"><span class="bn-hero-l">'+esc(title)+'</span><b class="bn-hero-v">'+fm(sumOf(rows))+' '+CUR+'</b><span class="bn-hero-q">'+fm(q)+' шт'+(sub?' · '+esc(sub):'')+'</span></div>';
  if(!rows.length)html+='<div class="bn-empty">Ничего не выбрано.</div>';
  else html+=rows.map(c=>'<div class="bn-sc"><div class="bn-sch"><span>'+esc(furnitureName(c.name))+'<i class="bn-cq">'+fm(cqOf(c))+' шт</i></span><b>'+fm(c.sum)+' '+CUR+'</b></div>'
   +c.items.map(it=>'<div class="bn-si"><div class="bn-sin">'+esc(furnitureName(it.name))+'</div>'
    +it.parts.map(z=>{
      const reg=z.l==='Район';
      const cls=reg?'bn-reg':(z.l?'bn-city':'bn-one');
      return '<div class="bn-pr"><span class="bn-tag '+cls+'">'+(z.l||'Шт')+'</span>'
       +'<span class="bn-qb">'+fm(z.n)+'<small>шт</small></span>'
       +'<span class="bn-pp">× '+fm(z.p)+' '+CUR+'</span><b>'+fm(z.v)+' '+CUR+'</b></div>';
    }).join('')
    +'</div>').join('')+'</div>').join('');
  g('bnSmList').innerHTML=html;
  g('bnSmTot').textContent=fm(sumOf(rows))+' '+CUR;g('bnSmQty').textContent=fm(q);
 }
 function showMonth(k){
  if(k==='back')return histView();
  if(k==='cur'){setFoot();return detailView(sumRows(),'Текущий месяц')}
  const d=HIST()[k];if(!d)return;
  setFoot(k);
  detailView(d.rows,monthName(d.m||k),new Date(d.t||0).toLocaleDateString('ru-RU',{day:'numeric',month:'long'}));
 }
 async function saveMonth(){
  const rows=sumRows();
  if(!rows.length){tst('Пока ничего не выбрано','err');return}
  const mk=await pickMonth();if(!mk)return;
  const ok=await askC('Сохранить итоги за выбранный месяц и обнулить количества?','Сохранить','💾');
  if(!ok)return;
  const now=new Date(),id=now.getTime().toString(36);
  const h=HIST();
  h[id]={m:mk,t:now.getTime(),sum:sumOf(rows),qty:qtyOf(rows),rows:rows};
  saveHist(h);
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0;s.qty2=0}));
  save();render();histView();
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
 function copySum(){
  const rows=sumRows();
  if(!rows.length){tst('Пока ничего не выбрано','err');return}
  let t=0,q=0,s='Итоги\n';
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

 function ensure(){
  let m=g('bnMdl');if(m)return m;
  m=document.createElement('div');m.id='bnMdl';m.className='mdl';
  m.innerHTML='<div class="mdl-b bn-b"><div class="mdl-h"><span>🧮 Бонусы</span><button class="mdl-x" id="bnX">✕</button></div>'
   +'<div id="bnList"></div>'
   +'<div class="bn-ft"><div class="bn-tr"><span>Общая сумма</span><b id="bnTot">0</b></div>'
   +'<div class="bn-tr bn-sm"><span>Всего штук: <b id="bnQty">0</b></span></div>'
   +'<div class="bn-btns"><button id="bnSumB">📋 Итоги</button><button id="bnRst">🔄 Обнулить</button></div></div></div>'
   +'<div class="bn-ov" id="bnSm"><div class="mdl-b bn-b"><div class="mdl-h"><span>📋 Итоги</span><button class="mdl-x" id="bnSmX">✕</button></div><div id="bnSmList"></div>'
   +'<div class="bn-ft"><div class="bn-tr"><span>Общая сумма</span><b id="bnSmTot">0</b></div><div class="bn-tr bn-sm"><span>Всего штук: <b id="bnSmQty">0</b></span></div>'
   +'<div class="bn-btns"><button id="bnSave">💾 Сохранить</button><button id="bnSmCp">📄 Скопировать</button></div></div></div></div>';
  document.body.appendChild(m);
  m.onclick=e=>{if(e.target===m)closeBon()};
  g('bnX').onclick=()=>closeBon();
  g('bnRst').onclick=resetQty;
  g('bnSumB').onclick=openSum;g('bnSmList').addEventListener('click',e=>{const r=e.target.closest('[data-m]');if(r)showMonth(r.dataset.m)});g('bnSmX').onclick=()=>closeSum();g('bnSmCp').onclick=copySum;g('bnSave').onclick=saveMonth;g('bnSm').onclick=e=>{if(e.target===g('bnSm'))closeSum()};
  const l=g('bnList');
  l.addEventListener('input',onInput);
  l.addEventListener('click',onClick);
  return m;
 }

 function openBon(){
  const m=ensure();render();
  m.classList.add('open');lock(true);
  try{history.pushState({bn:1},'')}catch(e){}
 }
 function closeBon(src){
  const m=g('bnMdl');if(!m||!m.classList.contains('open'))return;
  const ov=g('bnSm');if(ov)ov.classList.remove('open');m.classList.remove('open');lock(false);
  if(src!=='pop'){try{if(history.state&&history.state.bn)setTimeout(()=>history.back(),0)}catch(e){}}
 }
 window.addEventListener('popstate',()=>{if(skipPop>0){skipPop--;return}const o=g('bnSm');if(o&&o.classList.contains('open')){o.classList.remove('open');return}const m=g('bnMdl');if(m&&m.classList.contains('open'))closeBon('pop')});

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
