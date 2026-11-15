function vib(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}
function toast(msg,type){
 let t=document.getElementById('toast');
 if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t)}
 t.textContent=msg;t.className='show '+(type||'ok');
 clearTimeout(toast._t);toast._t=setTimeout(()=>{t.className=''},2600);
 vib(type==='err'?[60,40,60]:30);
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
