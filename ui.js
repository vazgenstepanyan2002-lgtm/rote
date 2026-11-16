function vib(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
function toast(msg,type){
 let t=document.getElementById('toast');
 if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}
 t.textContent=msg;t.className='show '+(type||'ok');
 clearTimeout(toast._t);toast._t=setTimeout(()=>{t.className=''},2600);
 if(type==='err')vib([60,40,60]);
}
let _busyN=0;
function busy(on){
 _busyN=Math.max(0,_busyN+(on?1:-1));
 let e=document.getElementById('busy');
 if(!e){e=document.createElement('div');e.id='busy';document.body.appendChild(e)}
 e.className=_busyN?'on':'';
}
['go','add','addSpec'].forEach(n=>{
 const o=window[n];if(typeof o!=='function')return;
 window[n]=async function(){busy(1);try{return await o.apply(this,arguments)}finally{busy(0)}};
});

function updHint(){
 const l=document.getElementById('l');if(!l)return;
 let h=document.getElementById('hint');
 if(!h){h=document.createElement('div');h.id='hint';h.textContent='Пока нет адресов. Введите адрес выше или нажмите 🎤 и продиктуйте';l.after(h)}
 h.className=(typeof P!=='undefined'&&P.length)?'':'show';
}
(function(){const d=window.draw;if(typeof d==='function'){window.draw=function(){d.apply(this,arguments);updHint()}}updHint()})();

function showVer(){
 const e=document.getElementById('ver');if(!e)return;
 const f=v=>/^\d{14}$/.test(v||'')?'версия от '+v.slice(6,8)+'.'+v.slice(4,6)+'.'+v.slice(0,4)+' '+v.slice(8,10)+':'+v.slice(10,12):'версия: нет данных';
 let v=null;try{v=localStorage.getItem('APP_V')}catch(x){}
 if(v){e.textContent=f(v);return}
 fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(j=>{e.textContent=f(j.v)}).catch(()=>{e.textContent=f('')});
}
(function(){
 const f=document.createElement('div');f.id='ft';
 f.innerHTML='<span id="ver"></span>';
 const o=document.getElementById('o');if(o)o.after(f);else document.body.appendChild(f);
 showVer();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)showVer()});
})();

function gmapsUrl(h){
 const q=new URLSearchParams(h.split('?')[1]||''),via=[];
 for(let i=0;q.has('lat_via_'+i);i++)via.push(q.get('lat_via_'+i)+','+q.get('lon_via_'+i));
 return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination='+q.get('lat_to')+','+q.get('lon_to')+(via.length?'&waypoints='+encodeURIComponent(via.join('|')):'');
}
document.addEventListener('click',e=>{
 const a=e.target.closest&&e.target.closest('a[href^="yandexnavi://"]');if(!a)return;
 const h=a.getAttribute('href');let left=false;const f=()=>{left=true};
 document.addEventListener('visibilitychange',f);window.addEventListener('pagehide',f);window.addEventListener('blur',f);
 setTimeout(async()=>{
  document.removeEventListener('visibilitychange',f);window.removeEventListener('pagehide',f);window.removeEventListener('blur',f);
  if(left||document.hidden)return;
  if(await askC('Яндекс Навигатор не открылся. Открыть маршрут в Google Maps?','Открыть','🧭'))window.open(gmapsUrl(h),'_blank');
 },2500);
});

// TAPVIB: лёгкая вибрация при нажатии на кнопки
document.addEventListener('click',e=>{
 const t=e.target&&e.target.closest&&e.target.closest('button,a,.inp-x,.inp-mic,.inst-x,.ret-box');
 if(t)vib(40);
},true);

// NAVSYS: открывать навигатор по умолчанию вместо Яндекса
function navMode(){try{return localStorage.getItem('NAV')==='ya'?'ya':'sys'}catch(e){return 'sys'}}
function sysUrl(h){
 const q=new URLSearchParams(h.split('?')[1]||'');
 if(q.has('lat_via_0'))return gmapsUrl(h);
 const la=q.get('lat_to'),lo=q.get('lon_to');
 return 'geo:'+la+','+lo+'?q='+la+','+lo;
}
document.addEventListener('click',e=>{
 if(navMode()!=='sys')return;
 const a=e.target.closest&&e.target.closest('a[href^="yandexnavi://"]');if(!a)return;
 e.preventDefault();e.stopPropagation();
 const url=sysUrl(a.getAttribute('href'));
 if(url.indexOf('geo:')===0){const t=document.createElement('a');t.href=url;document.body.appendChild(t);t.click();t.remove()}
 else window.open(url,'_blank');
},true);
(function(){
 const f=document.getElementById('ft');if(!f)return;
 const b=document.createElement('button');b.id='navBtn';
 const lab=()=>{b.textContent='🧭 Навигатор: '+(navMode()==='ya'?'Яндекс':'по умолчанию')};
 b.onclick=()=>{
  try{localStorage.setItem('NAV',navMode()==='ya'?'sys':'ya')}catch(e){}
  lab();window.toast&&toast(navMode()==='ya'?'Откроется Яндекс Навигатор':'Откроется навигатор по умолчанию');
 };
 lab();f.appendChild(b);
})();

// NET: индикатор онлайн/офлайн
(function(){
 const updNet=()=>{
  const on=navigator.onLine;
  let b=document.getElementById('netIco');
  if(!b){
   b=document.createElement('span');b.id='netIco';b.className='net-ico';
   const h=document.querySelector('h2 .badge');if(!h)return;
   h.after(b);
  }
  b.textContent=on?'📶':'📵';
  b.title=on?'Интернет есть':'Нет интернета';
  b.classList.toggle('off',!on);
 };
 window.addEventListener('online',()=>{updNet();window.toast&&toast('Интернет восстановлен','ok')});
 window.addEventListener('offline',()=>{updNet();window.toast&&toast('Нет интернета. Работаю в офлайн-режиме','err')});
 updNet();
})();

// ONLINE: счётчик активных пользователей через Supabase
(function(){
 const URL='https://supabase.co';
 const KEY='sb_publishable_IQ02Jspk2jh8x0HqzhZ95Q_lcv1BOkO';
 const HDR={'apikey':KEY,'Authorization':'Bearer '+KEY,'Content-Type':'application/json'};
 let uid=localStorage.getItem('EB_UID');
 if(!uid){uid='u_'+Math.random().toString(36).slice(2,10);localStorage.setItem('EB_UID',uid)}
 let b=document.getElementById('onlB');
 if(!b){
  b=document.createElement('span');b.id='onlB';b.className='onl-b';b.style.cursor='pointer';
  b.title='Онлайн сейчас';b.textContent='🟢 1';
  const ref=document.getElementById('netIco')||document.querySelector('h2 .badge');
  if(ref)ref.before(b);
 }
 let lastCnt=1,lastErr='';
 b.onclick=()=>{
  if(lastErr){window.toast&&toast('Ошибка связи с базой: '+lastErr,'err');return}
  window.toast&&toast('Сейчас в приложении: '+lastCnt+' чел.','ok');
 };
 async function beat(){
  if(!navigator.onLine)return;
  const now=Date.now();
  try{
   const r1=await fetch(URL+'?on_conflict=id',{
    method:'POST',
    headers:Object.assign({'Prefer':'resolution=merge-duplicates,return=minimal'},HDR),
    body:JSON.stringify({id:uid,ts:now})
   });
   if(!r1.ok)throw new Error('HTTP '+r1.status);
   const r2=await fetch(URL+'?select=id,ts&ts=gt.'+(now-65000),{headers:HDR});
   if(!r2.ok)throw new Error('HTTP '+r2.status);
   const rows=await r2.json();
   lastErr='';
   lastCnt=Math.max(1,Array.isArray(rows)?rows.length:1);
   b.textContent='🟢 '+lastCnt;
   if(Math.random()<0.25)fetch(URL+'?ts=lt.'+(now-180000),{method:'DELETE',headers:HDR}).catch(()=>{});
  }catch(e){lastErr=e.message||'нет ответа'}
 }
 beat();
 setInterval(()=>{if(!document.hidden)beat()},15000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)beat()});
 window.addEventListener('pagehide',()=>{
  try{fetch(URL+'?id=eq.'+uid,{method:'DELETE',headers:HDR,keepalive:true})}catch(e){}
 });
})();
