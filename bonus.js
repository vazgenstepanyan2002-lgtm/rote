(function(){
 const g=id=>document.getElementById(id);
 const CUR='֏';
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 let B=[];
 try{const v=JSON.parse(localStorage.getItem('BON')||'[]');if(Array.isArray(v))B=v.filter(c=>c&&Array.isArray(c.subs))}catch(e){}
 const num=v=>{const n=parseFloat(String(v).replace(',','.').replace(/\s/g,''));return isFinite(n)&&n>0?n:0};
 const r3=n=>Math.round(n*1000)/1000;
 const fm=n=>(Math.round(n*100)/100).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const save=()=>{try{localStorage.setItem('BON',JSON.stringify(B))}catch(e){}};
 const tst=(t,k)=>{window.toast&&toast(t,k)};
 function lock(on){document.documentElement.classList.toggle('lock',on);document.body.classList.toggle('lock',on)}

 function upd(){
  let t=0,q=0;
  B.forEach((c,ci)=>{
   let cs=0;
   c.subs.forEach((s,si)=>{
    const v=num(s.qty)*num(s.price);cs+=v;q+=num(s.qty);
    const e=g('bs'+ci+'_'+si);if(e)e.textContent='= '+fm(v)+' '+CUR;
   });
   t+=cs;
   const e=g('bc'+ci);if(e)e.textContent=fm(cs)+' '+CUR;
  });
  g('bnTot').textContent=fm(t)+' '+CUR;
  g('bnQty').textContent=fm(q);
 }

 function render(){
  const l=g('bnList'),st=l.scrollTop;
  if(!B.length){
   l.innerHTML='<div class="bn-empty">Пока нет категорий. Создайте первую ниже, например «Напитки».</div>';
   upd();return;
  }
  l.innerHTML=B.map((c,ci)=>{
   let h='<div class="bn-c"><div class="bn-ch">'
    +'<button class="bn-ic" data-act="col" data-c="'+ci+'">'+(c.col?'▸':'▾')+'</button>'
    +'<input class="bn-cn" data-c="'+ci+'" value="'+esc(c.name)+'" placeholder="Категория">'
    +'<span class="bn-cs" id="bc'+ci+'"></span>'
    +'<button class="bn-ic bn-del" data-act="delc" data-c="'+ci+'">✕</button></div>';
   if(!c.col){
    h+=c.subs.map((s,si)=>{
     const a='data-c="'+ci+'" data-s="'+si+'"';
     return '<div class="bn-s"><div class="bn-sh">'
      +'<input class="bn-sn" '+a+' value="'+esc(s.name)+'" placeholder="Название">'
      +'<button class="bn-ic bn-del" data-act="dels" '+a+'>✕</button></div>'
      +'<div class="bn-sr">'
      +'<button class="bn-pm bn-m" data-act="dec" '+a+'>−</button>'
      +'<input class="bn-q" '+a+' inputmode="decimal" value="'+num(s.qty)+'">'
      +'<button class="bn-pm" data-act="inc" '+a+'>+</button>'
      +'<span class="bn-x">×</span>'
      +'<input class="bn-p" '+a+' inputmode="decimal" placeholder="Цена" value="'+(num(s.price)||'')+'">'
      +'</div><div class="bn-ss" id="bs'+ci+'_'+si+'"></div></div>';
    }).join('');
    h+='<div class="bn-add"><input class="bn-an" data-c="'+ci+'" placeholder="Новая подкатегория"><button class="bn-pm" data-act="addsub" data-c="'+ci+'">＋</button></div>';
   }
   return h+'</div>';
  }).join('');
  l.scrollTop=st;
  upd();
 }

 function onInput(e){
  const t=e.target,c=B[+t.dataset.c],s=c&&c.subs[+t.dataset.s];
  if(!c)return;
  if(t.classList.contains('bn-cn'))c.name=t.value;
  else if(t.classList.contains('bn-sn')&&s)s.name=t.value;
  else if(t.classList.contains('bn-q')&&s)s.qty=num(t.value);
  else if(t.classList.contains('bn-p')&&s)s.price=num(t.value);
  else return;
  save();upd();
 }

 async function onClick(e){
  const b=e.target.closest('button[data-act]');if(!b)return;
  const a=b.dataset.act,ci=+b.dataset.c,si=+b.dataset.s,c=B[ci],s=c&&c.subs[si];
  if(!c)return;
  if(a==='inc'||a==='dec'){
   if(!s)return;
   s.qty=Math.max(0,r3(num(s.qty)+(a==='inc'?1:-1)));
   const q=b.parentNode.querySelector('.bn-q');if(q)q.value=s.qty;
   save();upd();
  }else if(a==='col'){
   c.col=!c.col;save();render();
  }else if(a==='delc'){
   if(!await askC('Удалить категорию «'+(c.name||'без названия')+'» со всеми подкатегориями?','Удалить'))return;
   B.splice(ci,1);save();render();tst('Категория удалена');
  }else if(a==='dels'){
   if(!s)return;
   if(!await askC('Удалить «'+(s.name||'без названия')+'»?','Удалить'))return;
   c.subs.splice(si,1);save();render();tst('Удалено');
  }else if(a==='addsub'){
   const inp=b.parentNode.querySelector('.bn-an'),n=inp.value.trim();
   if(!n){tst('Введите название подкатегории','err');return}
   c.subs.push({name:n,qty:0,price:0});save();render();tst('Подкатегория добавлена');
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
  B.forEach(c=>c.subs.forEach(s=>{s.qty=0}));save();render();tst('Количества обнулены');
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
