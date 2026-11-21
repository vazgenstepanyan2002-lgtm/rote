window.addEventListener('error',e=>{window.toast&&toast('Ошибка: '+(e.message||'неизвестно'),'err')});
window.addEventListener('unhandledrejection',e=>{window.toast&&toast('Ошибка: '+((e.reason&&e.reason.message)||e.reason||'неизвестно'),'err')});
let _iosSw=null;
function iosHaptic(){
 try{
  if(!_iosSw){
   const lb=document.createElement('label');
   lb.style.cssText='position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
   const cb=document.createElement('input');
   cb.type='checkbox';cb.setAttribute('switch','');
   lb.appendChild(cb);document.body.appendChild(lb);
   _iosSw=lb;
  }
  _iosSw.click();
 }catch(e){}
}
function vib(p){
 try{
  if(localStorage.getItem('NO_VIB')==='1')return;
  if(navigator.vibrate){navigator.vibrate(p);return;}
  if(/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)){
   iosHaptic();
   if(Array.isArray(p)&&p.length>1)setTimeout(iosHaptic,90);
  }
 }catch(e){}
}
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

window.getVerText=function(cb){
 const f=v=>/^\d{14}$/.test(v||'')?'Версия от '+v.slice(6,8)+'.'+v.slice(4,6)+'.'+v.slice(0,4)+' '+v.slice(8,10)+':'+v.slice(10,12):'Версия: нет данных';
 let v=null;try{v=localStorage.getItem('APP_V')}catch(x){}
 if(v)return cb(f(v));
 fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(j=>cb(f(j.v))).catch(()=>cb(f('')));
};
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
 const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 return isIOS?('https://maps.apple.com/?daddr='+la+','+lo+'&dirflg=d'):('geo:'+la+','+lo+'?q='+la+','+lo);
}
document.addEventListener('click',e=>{
 if(navMode()!=='sys')return;
 const a=e.target.closest&&e.target.closest('a[href^="yandexnavi://"]');if(!a)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const url=sysUrl(a.getAttribute('href'));
 if(url.indexOf('geo:')===0){const t=document.createElement('a');t.href=url;document.body.appendChild(t);t.click();t.remove()}
 else window.open(url,'_blank');
},true);
(function(){
 window.mountNavSwitch=function(){
  const o=document.getElementById('o');if(!o)return;
  const navA=o.querySelector('a.nav');if(!navA)return;
  let b=document.getElementById('navBtn');
  if(!b){
   b=document.createElement('button');b.id='navBtn';b.type='button';b.className='nav-sw';
   b.onclick=()=>{
    try{localStorage.setItem('NAV',navMode()==='ya'?'sys':'ya')}catch(e){}
    lab();window.toast&&toast(navMode()==='ya'?'Откроется Яндекс Навигатор':'Откроется навигатор по умолчанию');
   };
   navA.before(b);
  }
  const lab=()=>{
   const ya=navMode()==='ya';
   b.innerHTML='<span class="nav-sw-l"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg><span>Навигатор</span></span><span class="nav-sw-v">'+(ya?'Яндекс':'По умолчанию')+' ⇄</span>';
  };
  lab();
 };
 const o=document.getElementById('o');
 if(o)new MutationObserver(window.mountNavSwitch).observe(o,{childList:true});
 window.mountNavSwitch();
})();

// NET: уведомления о смене статуса сети
(function(){
 window.addEventListener('online',()=>{window.toast&&toast('Интернет восстановлен','ok')});
 window.addEventListener('offline',()=>{window.toast&&toast('Нет интернета. Работаю в офлайн-режиме','err')});
})();

// CHAT-DOCK-BTN
(function(){
 if(document.getElementById('chatDockBtn'))return;
 const b=document.createElement('button');b.id='chatDockBtn';b.className='fab fab-c';
 b.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Чат</span><span id="dockChatBdg" class="dock-bdg" hidden>0</span>';
 b.onclick=()=>{if(window.openChat)window.openChat()};
 document.body.appendChild(b);
})();
// DOCK-AUTO-HIDE: автоматическое скрытие нижнего док-бара при открытии Бонусов, Точек или модалок
(function(){
  function syncDock(){
    const hasModal = Array.from(document.querySelectorAll(".ov, .mdl, [role='dialog']")).some(el => {
      if (el.hidden) return false;
      const st = getComputedStyle(el);
      return st.display !== "none" && st.visibility !== "hidden" && parseFloat(st.opacity || "1") > 0.05;
    });
    document.body.classList.toggle("dock-hide", hasModal);
  }
  const mo = new MutationObserver(syncDock);
  if (document.body) {
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
    syncDock();
  }
})();
