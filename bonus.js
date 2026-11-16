(function(){
 const g=id=>document.getElementById(id);
 const CUR='֏';
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const num=v=>{const n=parseFloat(String(v).replace(',','.').replace(/\s/g,''));return isFinite(n)&&n>0?n:0};
 const r3=n=>Math.round(n*1000)/1000;
 const fm=n=>(Math.round(n*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const tst=(t,k)=>{window.toast&&toast(t,k)};
 function lock(on){document.documentElement.classList.toggle('lock',on);document.body.classList.toggle('lock',on)}

 // Готовые разделы: названия и цены менять и удалять нельзя, количество меняется
 const PRE=[
  {pk:'other',name:'Այլ',subs:[
   {sk:'a',name:'Աթոռ, դարակաշար',one:1,price:50},
   {sk:'b',name:'Աթոռ սեղաններ',one:1,price:100}]},
  {pk:'sofas',name:'Բազմոցներ',subs:[
   {sk:'a',name:'Բազկաթոռ',price:500,price2:650},
   {sk:'b',name:'Բազմոց',price:1000,price2:1300},
   {sk:'c',name:'Հավաքածու',price:1500,price2:1950}]},
  {pk:'recep',name:'Ընդունարան',subs:[
   {sk:'a',name:'Մինչև 1,6',price:700,price2:910},
   {sk:'b',name:'1,6 ից ավել',price:1200,price2:1560}]}
 ];

 let B=[];
 try{const v=JSON.parse(localStorage.getItem('BON')||'[]');if(Array.isArray(v))B=v.filter(c=>c&&Array.isArray(c.subs))}catch(e){}
 const save=()=>{try{localStorage.setItem('BON',JSON.stringify(B))}catch(e){}};

 function sync(){
  const out=[];
  PRE.forEach(p=>{
   const oc=B.find(c=>c.pk===p.pk)||{};
   out.push({pk:p.pk,lock:1,name:p.name,col:!!oc.col,subs:p.subs.map(s=>{
    const os=(oc.subs||[]).find(x=>x.sk===s.sk)||{};
    return {sk:s.sk,lock:1,one:s.one?1:0,name:s.name,qty:num(os.qty),price:s.price,qty2:s.one?0:num(os.qty2),price2:s.one?0:s.price2};
   })});
  });
  B.forEach(c=>{if(!c.pk)out.push(c)});
  B=out;save();
 }
 sync();

 function upd(){
  let t=0,q=0;
  B.forEach((c,ci)=>{
   let cs=0;
   c.subs.forEach((s,si)=>{
    const v=num(s.qty)*num(s.price)+num(s.qty2)*num(s.price2);cs+=v;q+=num(s.qty)+num(s.qty2);
    const e=g('bs'+ci+'_'+si);if(e)e.textContent='= '+fm(v)+' '+CUR;
   });
   t+=cs;
   const e=g('bc'+ci);if(e)e.textContent=fm(cs)+' '+CUR;
  });
  g('bnTot').textContent=fm(t)+' '+CUR;
  g('bnQty').textContent=fm(q);
 }

 const row=(a,s,k,ro,lab)=>(lab?'<div class="bn-lb">'+lab+'</div>':'')+'<div class="bn-sr">'
  +'<button class="bn-pm bn-m" data-act="dec" data-k="'+k+'" '+a+'>−</button>'
  +'<input class="bn-q" data-k="'+k+'" '+a+' inputmode="decimal" value="'+num(s['qty'+k])+'">'
  +'<button class="bn-pm" data-act="inc" data-k="'+k+'" '+a+'>+</button>'
  +'<span class="bn-x">×</span>'
  +'<input class="bn-p" data-k="'+k+'" '+a+' inputmode="decimal" placeholder="Цена"'+(ro?' readonly':'')+' value="'+(num(s['price'+k])||'')+'">'
  +'</div>';

 function render(){
  const l=g('bnList'),st=l.scrollTop;
  if(!B.length){
   l.innerHTML='<div class="bn-empty">Пока нет категорий. Создайте первую ниже, например «Напитки».</div>';
   upd();return;
  }
  l.innerHTML=B.map((c,ci)=>{
   let h='<div class="bn-c"><div class="bn-ch">'
    +'<button class="bn-ic" data-act="col" data-c="'+ci+'">'+(c.col?'▸':'▾')+'</button>'
    +'<input class="bn-cn" data-c="'+ci+'" value="'+esc(c.name)+'" placeholder="Категория"'+(c.lock?' readonly':'')+'>'
    +'<span class="bn-cs" id="bc'+ci+'"></span>'
    +(c.lock?'':'<button class="bn-ic bn-del" data-act="delc" data-c="'+ci+'">✕</button>')+'</div>';
   if(!c.col){
    h+=c.subs.map((s,si)=>{
     const a='data-c="'+ci+'" data-s="'+si+'"',ro=!!(s.lock||c.lock);
     return '<div class="bn-s"><div class="bn-sh">'
      +'<input class="bn-sn" '+a+' value="'+esc(s.name)+'" placeholder="Название"'+(ro?' readonly':'')+'>'
      +(ro?'':'<button class="bn-ic bn-del" data-act="dels" '+a+'>✕</button>')+'</div>'
      +row(a,s,'',ro,s.one?'':'Город')
      +(s.one?'':row(a,s,'2',ro,'Район'))
      +'<div class="bn-ss" id="bs'+ci+'_'+si+'"></div></div>';
    }).join('');
    if(!c.lock)h+='<div class="bn-add"><input class="bn-an" data-c="'+ci+'" placeholder="Новая подкатегория"><button class="bn-pm" data-act="addsub" data-c="'+ci+'">＋</button></div>';
   }
   return h+'</div>';
  }).join('');
  l.scrollTop=st;
  upd();
 }

 function onInput(e){
  const t=e.target,c=B[+t.dataset.c],s=c&&c.subs[+t.dataset.s];
  if(!c||t.readOnly)return;
  if(t.classList.contains('bn-cn'))c.name=t.value;
  else if(t.classList.contains('bn-sn')&&s)s.name=t.value;
  else if(t.classList.contains('bn-q')&&s)s['qty'+(t.dataset.k||'')]=num(t.value);
  else if(t.classList.contains('bn-p')&&s)s['price'+(t.dataset.k||'')]=num(t.value);
  else return;
  save();upd();
 }

 async function onClick(e){
  const b=e.target.closest('button[data-act]');if(!b)return;
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
  }else if(a==='delc'){
   if(c.lock)return;
   if(!await askC('Удалить категорию «'+(c.name||'без названия')+'» со всеми подкатегориями?','Удалить'))return;
   B.splice(ci,1);save();render();tst('Категория удалена');
  }else if(a==='dels'){
   if(!s||s.lock||c.lock)return;
   if(!await askC('Удалить «'+(s.name||'без названия')+'»?','Удалить'))return;
   c.subs.splice(si,1);save();render();tst('Удалено');
  }else if(a==='addsub'){
   if(c.lock)return;
   const inp=b.parentNode.querySelector('.bn-an'),n=inp.value.trim();
   if(!n){tst('Введите название подкатегории','err');return}
   c.subs.push({name:n,qty:0,price:0,qty2:0,price2:0});save();render();tst('Подкатегория добавлена');
  }
 }

 function addCat(){
  const i=g('bnNew'),n=i.value.trim();
  if(!n){tst('Введите название категории','err');return}
  B.push({name:n,subs:[]});save();i.value='';render();
  const l=g('bnList');l.scrollTop=l.scrollHeight;
  tst('Категория добавлена');
 }

 async function resetQty(){
  if(!B.length)return;
  if(!await askC('Обнулить все количества? Цены и названия останутся.','Обнулить','🔄'))return;
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0;s.qty2=0}));save();render();tst('Количества обнулены');
 }

 function ensure(){
  let m=g('bnMdl');if(m)return m;
  m=document.createElement('div');m.id='bnMdl';m.className='mdl';
  m.innerHTML='<div class="mdl-b bn-b"><div class="mdl-h"><span>🧮 Бонусы</span><button class="mdl-x" id="bnX">✕</button></div>'
   +'<div id="bnList"></div>'
   +'<div class="bn-newc"><input id="bnNew" placeholder="Новая категория"><button class="bn-pm" id="bnNewB">＋ Категория</button></div>'
   +'<div class="bn-ft"><div class="bn-tr"><span>Общая сумма</span><b id="bnTot">0</b></div>'
   +'<div class="bn-tr bn-sm"><span>Всего штук: <b id="bnQty">0</b></span><button id="bnRst">🔄 Обнулить количества</button></div></div></div>';
  document.body.appendChild(m);
  m.onclick=e=>{if(e.target===m)closeBon()};
  g('bnX').onclick=()=>closeBon();
  g('bnNewB').onclick=addCat;
  g('bnNew').onkeydown=e=>{if(e.key==='Enter')addCat()};
  g('bnRst').onclick=resetQty;
  const l=g('bnList');
  l.addEventListener('input',onInput);
  l.addEventListener('click',onClick);
  l.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('bn-an')){const b=e.target.nextElementSibling;if(b)b.click()}});
  return m;
 }

 function openBon(){
  const m=ensure();render();
  m.classList.add('open');lock(true);
  try{history.pushState({bn:1},'')}catch(e){}
 }
 function closeBon(src){
  const m=g('bnMdl');if(!m||!m.classList.contains('open'))return;
  m.classList.remove('open');lock(false);
  if(src!=='pop'){try{if(history.state&&history.state.bn)setTimeout(()=>history.back(),0)}catch(e){}}
 }
 window.addEventListener('popstate',()=>{const m=g('bnMdl');if(m&&m.classList.contains('open'))closeBon('pop')});
 window.openBon=openBon;window.closeBon=closeBon;

 const f=document.createElement('button');
 f.className='fab fab-l';f.textContent='🧮 Бонусы';f.onclick=openBon;
 document.body.appendChild(f);
})();
