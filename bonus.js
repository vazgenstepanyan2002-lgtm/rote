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
    +'<span class="bn-ct"><span class="bn-cname">'+esc(c.name)+'</span><span class="bn-sub" id="bq'+ci+'"></span></span>'
    +'<span class="bn-cs" id="bc'+ci+'"></span>'
    +'<span class="bn-ar">'+(c.col?'▸':'▾')+'</span></div>';
   if(!c.col){
    h+=c.subs.map((s,si)=>{
     const a='data-c="'+ci+'" data-s="'+si+'"';
     return '<div class="bn-s bn-k"><div class="bn-sh2"><span class="bn-nm">'+esc(s.name)+'</span><span class="bn-ss" id="bs'+ci+'_'+si+'"></span></div>'
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
 // ===== Итоги по месяцам =====
 const MK=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 const HIST=()=>{try{const v=JSON.parse(localStorage.getItem('BON_HIST')||'{}');return v&&typeof v==='object'?v:{}}catch(e){return{}}};
 const saveHist=h=>{try{localStorage.setItem('BON_HIST',JSON.stringify(h))}catch(e){}};
 const qtyOf=rows=>rows.reduce((a,c)=>a+c.items.reduce((b,it)=>b+it.parts.reduce((x,z)=>x+z.n,0),0),0);
 const sumOf=rows=>rows.reduce((a,c)=>a+c.sum,0);
 function monthName(k){const p=k.split('-');return new Date(+p[0],+p[1]-1,1).toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}
 // Новый месяц: итоги прошлого сохраняем, количества обнуляем
 function rollMonth(){
  const now=MK(new Date());let cur=null;
  try{cur=localStorage.getItem('BON_M')}catch(e){}
  if(!cur){try{localStorage.setItem('BON_M',now)}catch(e){}return}
  if(cur===now)return;
  const rows=sumRows();
  if(rows.length){const h=HIST();h[cur]={sum:sumOf(rows),qty:qtyOf(rows),rows:rows};saveHist(h)}
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0;s.qty2=0}));save();
  try{localStorage.setItem('BON_M',now)}catch(e){}
 }
 function rowHtml(k,name,sum,qty){
  return '<div class="bn-mr" data-m="'+k+'"><span class="bn-mn">'+esc(name)+'</span><span class="bn-mq">'+fm(qty)+'</span><span class="bn-mv">'+fm(sum)+' '+CUR+'</span></div>';
 }
 function histView(){
  const h=HIST(),keys=Object.keys(h).sort().reverse(),cr=sumRows();
  let html='<div class="bn-th"><span>Месяц</span><span>Штук</span><span>Сумма</span></div>';
  html+=rowHtml('cur','Текущий месяц',sumOf(cr),qtyOf(cr));
  keys.forEach(k=>{html+=rowHtml(k,monthName(k),h[k].sum,h[k].qty)});
  if(!keys.length)html+='<div class="bn-empty">Закрытых месяцев пока нет. Итоги сохранятся, когда начнётся новый месяц.</div>';
  g('bnSmList').innerHTML=html;
  g('bnSmTot').textContent=fm(sumOf(cr))+' '+CUR;g('bnSmQty').textContent=fm(qtyOf(cr));
 }
 function detailView(rows,title){
  let q=qtyOf(rows);
  let html='<div class="bn-back" data-m="back">← Все месяцы</div><div class="bn-mt">'+esc(title)+'</div>';
  if(!rows.length)html+='<div class="bn-empty">Ничего не выбрано.</div>';
  else html+=rows.map(c=>'<div class="bn-sc"><div class="bn-sch"><span>'+esc(c.name)+'</span><b>'+fm(c.sum)+' '+CUR+'</b></div>'
   +c.items.map(it=>'<div class="bn-si"><div class="bn-sin">'+esc(it.name)+'</div>'
    +it.parts.map(z=>'<div class="bn-sp"><span>'+(z.l?z.l+' · ':'')+fm(z.n)+' × '+fm(z.p)+'</span><b>'+fm(z.v)+' '+CUR+'</b></div>').join('')
    +'</div>').join('')+'</div>').join('');
  g('bnSmList').innerHTML=html;
  g('bnSmTot').textContent=fm(sumOf(rows))+' '+CUR;g('bnSmQty').textContent=fm(q);
 }
 function showMonth(k){
  if(k==='back')return histView();
  if(k==='cur')return detailView(sumRows(),'Текущий месяц');
  const d=HIST()[k];if(!d)return;
  detailView(d.rows,monthName(k));
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
   t+=c.sum;s+='\n'+c.name+' — '+fm(c.sum)+' '+CUR+'\n';
   c.items.forEach(it=>{
    s+='• '+it.name+'\n';
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
   +'<div class="bn-btns"><button id="bnSmCp">📄 Скопировать</button></div></div></div></div>';
  document.body.appendChild(m);
  m.onclick=e=>{if(e.target===m)closeBon()};
  g('bnX').onclick=()=>closeBon();
  g('bnRst').onclick=resetQty;
  g('bnSumB').onclick=openSum;g('bnSmList').addEventListener('click',e=>{const r=e.target.closest('[data-m]');if(r)showMonth(r.dataset.m)});g('bnSmX').onclick=()=>closeSum();g('bnSmCp').onclick=copySum;g('bnSm').onclick=e=>{if(e.target===g('bnSm'))closeSum()};
  const l=g('bnList');
  l.addEventListener('input',onInput);
  l.addEventListener('click',onClick);
  return m;
 }

 function openBon(){
  rollMonth();const m=ensure();render();
  m.classList.add('open');lock(true);
  try{history.pushState({bn:1},'')}catch(e){}
 }
 function closeBon(src){
  const m=g('bnMdl');if(!m||!m.classList.contains('open'))return;
  const ov=g('bnSm');if(ov)ov.classList.remove('open');m.classList.remove('open');lock(false);
  if(src!=='pop'){try{if(history.state&&history.state.bn)setTimeout(()=>history.back(),0)}catch(e){}}
 }
 window.addEventListener('popstate',()=>{if(skipPop>0){skipPop--;return}const o=g('bnSm');if(o&&o.classList.contains('open')){o.classList.remove('open');return}const m=g('bnMdl');if(m&&m.classList.contains('open'))closeBon('pop')});
 window.openBon=openBon;window.closeBon=closeBon;

 const f=document.createElement('button');
 f.className='fab fab-l';f.textContent='🧮 Бонусы';f.onclick=openBon;
 document.body.appendChild(f);
})();
