const $=id=>document.getElementById(id);
let P=JSON.parse(localStorage.getItem('P')||'[]');
function save(){localStorage.setItem('P',JSON.stringify(P));draw()}
function draw(){if($('cnt'))$('cnt').textContent=P.length;$('l').innerHTML=P.map((p,i)=>`<li class="${p.pin?'pin':''}"><span style="flex:1">${p.name}</span><div class="cbtns"><a class="st ${p.pin?'on':''}" href="#" onclick="pin(${i});return false">${p.pin?'⭐':'☆'}</a><a class="x" href="#" onclick="del(${i});return false">✕</a></div></li>`).join('')}
function del(i){P.splice(i,1);save();window.toast&&toast('Адрес удалён')}
function pin(i){const v=!P[i].pin;P.forEach(x=>x.pin=false);P[i].pin=v;save()}

function pos(){return new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude}),no,{enableHighAccuracy:true,timeout:15000}))}
$('a').onkeydown=ev=>{if(ev.key==='Enter')add()};
draw();

function voice(){
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){$('s').textContent='Голосовой ввод не поддерживается в этом браузере';return}
 const r=new SR(),m=$('mic');
 r.lang=window.LANG_SR||'ru-RU';r.interimResults=false;
 r.onstart=()=>{m.classList.add('rec');$('s').textContent='Говорите адрес...'};
 r.onend=()=>{m.classList.remove('rec')};
 r.onerror=()=>{m.classList.remove('rec');$('s').textContent='Не удалось распознать голос'};
 r.onresult=e=>{const t=e.results.item(0).item(0).transcript;$('a').value=t;$('s').textContent='';$('a').dispatchEvent(new Event('input'))};
 r.start();
}
;
let SPEC_PTS=(()=>{try{const v=JSON.parse(localStorage.getItem('SPEC')||'null');if(Array.isArray(v))return v}catch(e){}return[{name:'Артак',lat:40.163019,lon:44.388218},{name:'Геворг Спайка',lat:40.127240,lon:44.490112}]})();
let _spTok=0;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function saveSpec(){localStorage.setItem('SPEC',JSON.stringify(SPEC_PTS))}
function drawSpec(me,dists,durs){
 if(!SPEC_PTS.length){$('ptList').innerHTML='<div style="color:#94a3b8;font-size:14px;padding:6px 2px">Список пуст. Добавьте точку ниже.</div>';return}
 $('ptList').innerHTML=SPEC_PTS.map((p,i)=>{
  let info='';
  if(durs&&durs[i]!=null){
   const d=dists&&dists[i],km=d?' • '+(d<10000?(d/1000).toFixed(1):Math.round(d/1000))+' км':'';
   info='<span class="t-tag" style="color:#34d399">⏱ ~'+fmtT(durs[i])+km+'</span>';
  }else if(me){
   const d=Math.hypot((me.lat-p.lat)*111000,(me.lon-p.lon)*85000)*1.35,t=d/11;
   const km=' • '+(d<10000?(d/1000).toFixed(1):Math.round(d/1000))+' км';
   info='<span class="t-tag" style="color:#34d399">⏱ ~'+fmtT(t)+km+'</span>';
  }else{
   info='<span class="t-tag" style="color:#94a3b8">Определяю геопозицию...</span>';
  }
  return '<div class="pt-r"><a class="pt-i" href="yandexnavi://build_route_on_map?lat_to='+p.lat+'&lon_to='+p.lon+'"><span>'+esc(p.name)+info+'</span><span style="color:#fc0">🧭 Поехали</span></a><a class="x" href="#" onclick="delSpec('+i+');return false">✕</a></div>';
 }).join('');
}
async function delSpec(i){
 if(!SPEC_PTS[i])return;
 if(!await askC('Удалить точку «'+SPEC_PTS[i].name+'»?','Удалить'))return;
 SPEC_PTS.splice(i,1);saveSpec();window.toast&&toast('Точка удалена');openPts();
}
async function addSpec(){
 const n=$('pn').value.trim(),c=$('pc').value.trim(),m=$('ptMsg');
 if(!n){m.textContent='Введите название точки';return}
 let lat,lon;
 if(c){
  const nums=c.match(/-?\d+(?:[.,]\d+)?/g);
  if(!nums||nums.length!==2){m.textContent='Нужно два числа: 40.1630, 44.3882';return}
  lat=parseFloat(nums[0].replace(',','.'));lon=parseFloat(nums[1].replace(',','.'));
  if(lat>43&&lon<43){const t=lat;lat=lon;lon=t}
  if(!(lat>38.8&&lat<41.3&&lon>43.4&&lon<46.7)){m.textContent='Координаты вне Армении, проверьте';return}
 }else{
  m.textContent='Определяю вашу геопозицию...';
  try{const me=await pos();lat=me.lat;lon=me.lon}catch(e){m.textContent='Нет доступа к геолокации. Введите координаты вручную';return}
 }
 SPEC_PTS.push({name:n,lat:+lat.toFixed(6),lon:+lon.toFixed(6)});saveSpec();
 $('pn').value='';$('pc').value='';m.textContent='';window.toast&&toast('Точка добавлена');openPts();
}
async function fillPos(){
 const m=$('ptMsg');
 m.textContent='Определяю вашу геопозицию...';
 try{const me=await pos();$('pc').value=me.lat.toFixed(6)+', '+me.lon.toFixed(6);m.textContent='Координаты подставлены. Введите название и нажмите «Добавить точку»'}
 catch(e){m.textContent='Нет доступа к геолокации. Разрешите её для Chrome'}
}
async function openPts(){
 const tok=++_spTok;
 $('ptMdl').classList.add('open');
 drawSpec(null,null,null);
 if(!SPEC_PTS.length)return;
 let me;
 try{me=await pos()}catch(e){
  if(tok!==_spTok)return;
  $('ptList').querySelectorAll('.t-tag').forEach(t=>{t.textContent='Включите геолокацию для расчёта времени';t.style.color='#fbbf24'});
  return;
 }
 if(tok!==_spTok)return;
 drawSpec(me,null,null);
 try{
  const all=[me].concat(SPEC_PTS);
  const r=await fT('https://router.project-osrm.org/table/v1/driving/'+all.map(p=>p.lon+','+p.lat).join(';')+'?sources=0&annotations=duration,distance');
  const j=await r.json();
  if(tok!==_spTok)return;
  if(j.durations&&j.durations[0])drawSpec(me,j.distances[0].slice(1),j.durations[0].slice(1));
 }catch(e){}
}
;
let _defPrompt=null;
const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
if(!isStandalone&&!localStorage.getItem('INST_HIDE')){
 window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _defPrompt=e;
  $('instTxt').textContent='📲 Установить EuroBaza на главный экран';
  $('instBtn').style.display='block';
  $('instBar').style.display='flex';
 });
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
 if(isIOS){
  $('instTxt').innerHTML='📲 Чтобы установить на iPhone: нажмите <b>Поделиться</b> (квадрат со стрелкой) → <b>На экран «Домой»</b>';
  $('instBar').style.display='flex';
 }
}
async function runInstall(){
 if(!_defPrompt)return;
 _defPrompt.prompt();
 const res=await _defPrompt.userChoice;
 if(res.outcome==='accepted')$('instBar').style.display='none';
 _defPrompt=null;
}
window.addEventListener('appinstalled',()=>{$('instBar').style.display='none'});
;
const fT=async u=>{let last;for(let i=0;i<2;i++){try{return await fetch(u,{signal:AbortSignal.timeout(9000)})}catch(e){last=e;if(!navigator.onLine)throw e;await new Promise(r=>setTimeout(r,400*(i+1)))}}throw last};
const BASE={name:'🏁 Возврат на базу (Арин Берд 7)',lat:40.120847,lon:44.514271};
function solve(D,n,bIdx){const skipPen=(a,b,used)=>{let pen=0;for(let j=1;j<=n;j++)if(!used[j]&&j!==b){const det=D[a][j]+D[j][b]-D[a][b];if(det<900)pen+=3600}return pen};let best=[],bc=Infinity;const pI=P.findIndex(x=>x&&x.pin)+1;if(n<=8){const rec=(path,used,c)=>{if(c>=bc)return;if(path.length===n){const l=path[path.length-1],t=c+(bIdx?D[l][bIdx]:0);if(t<bc){bc=t;best=path.slice()}return}const last=path.length?path[path.length-1]:0;for(let i=1;i<=n;i++)if(!used[i]){const pen=skipPen(last,i,used);used[i]=1;path.push(i);rec(path,used,c+D[last][i]+pen);path.pop();used[i]=0}};if(pI>0){const u=Array(n+2).fill(0);u[pI]=1;rec([pI],u,D[0][pI])}else rec([],Array(n+2).fill(0),0)}else{const used=Array(n+2).fill(0);let cur=0;if(pI>0){used[pI]=1;best.push(pI);cur=pI}for(let k=best.length;k<n;k++){let b=-1,bv=Infinity;for(let i=1;i<=n;i++)if(!used[i]){const v=D[cur][i]+skipPen(cur,i,used);if(v<bv){bv=v;b=i}}used[b]=1;best.push(b);cur=b}const st=pI>0?1:0;const cost=p=>{let c=0,l=0;for(let k=0;k<p.length;k++){const x=p[k];c+=D[l][x];if(k>=st)for(let m=k+1;m<p.length;m++){const j=p[m];if(D[l][j]+D[j][x]-D[l][x]<900)c+=3600}l=x}return c+(bIdx?D[l][bIdx]:0)};let imp=true,it=0;while(imp&&it++<50){imp=false;for(let i=st;i<n-1;i++)for(let j=i+1;j<n;j++){const q=best.slice(0,i).concat(best.slice(i,j+1).reverse(),best.slice(j+1));if(cost(q)<cost(best)-1e-9){best=q;imp=true}}}}return best}
function etaBase(){const d=localStorage.getItem('DEP');if(d&&/^\d\d:\d\d$/.test(d)){const x=new Date();x.setHours(+d.slice(0,2),+d.slice(3,5),0,0);return x.getTime()}return +localStorage.getItem('R_T0')||Date.now()}
function hm(ms){const x=new Date(ms),p=n=>String(n).padStart(2,'0');return p(x.getHours())+':'+p(x.getMinutes())+(x.getDate()!==new Date().getDate()?' (+1 д)':'')}
function setDep(v){if(v)localStorage.setItem('DEP',v);else{localStorage.removeItem('DEP');localStorage.setItem('R_T0',Date.now())}updEta()}
function updEta(){return;const c=window.CUR;if(!c)return;const i=$('dep');if(i&&document.activeElement!==i)i.value=localStorage.getItem('DEP')||'';const els=document.querySelectorAll('#o ol li .eta');const ok=c.every(x=>typeof x.st==='number');let t=etaBase()-600000;c.forEach((it,k)=>{t+=(it.st||0)*1000;if(els[k])els[k].textContent=ok?'🕒 '+hm(t):''})}
function fmtT(s){const m=Math.round(s/60);return m<60?m+' мин':Math.floor(m/60)+' ч '+(m%60)+' мин'}
function buildNav(arr){const to=arr.at(-1),via=arr.slice(0,-1);let u='yandexnavi://build_route_on_map?lat_to='+to.lat+'&lon_to='+to.lon;via.forEach((p,i)=>u+='&lat_via_'+i+'='+p.lat+'&lon_via_'+i+'='+p.lon);return u}
async function go(){if(!P.length)return;const back=$('ret').checked;$('o').innerHTML='';$('s').textContent='Определяю местоположение...';let me;try{me=await pos()}catch(e){$('s').textContent='Разрешите доступ к геолокации для Chrome';window.toast&&toast('Нет доступа к геолокации','err');return}const pts=back?[me,...P,BASE]:[me,...P],bIdx=back?pts.length-1:0;$('s').textContent='Считаю лучший порядок...';let D,approx=false;try{const r=await fT('https://router.project-osrm.org/table/v1/driving/'+pts.map(p=>p.lon+','+p.lat).join(';')+'?annotations=duration');D=(await r.json()).durations;if(!D)throw 0;D=D.map((row,i)=>row.map((v,j)=>{if(v==null){approx=true;return Math.hypot((pts[i].lat-pts[j].lat)*111,(pts[i].lon-pts[j].lon)*85)*90}return v}))}catch(e){approx=true;D=pts.map(a=>pts.map(b=>Math.hypot((a.lat-b.lat)*111,(a.lon-b.lon)*85)*90))}let Dist=pts.map(a=>pts.map(b=>Math.hypot((a.lat-b.lat)*111000,(a.lon-b.lon)*85000)*1.35));const idx=solve(D,P.length,bIdx);if(back)idx.push(bIdx);try{const rPts=[pts.at(0),...idx.map(i=>pts.at(i))],rr=await fT('https://router.project-osrm.org/route/v1/driving/'+rPts.map(p=>p.lon+','+p.lat).join(';')+'?overview=false'),legs=(await rr.json()).routes.at(0).legs;if(legs)legs.forEach((leg,k)=>{const a=k===0?0:idx.at(k-1),b=idx.at(k);D[a][b]=leg.duration;Dist[a][b]=leg.distance})}catch(e){approx=true}let prev=0,totT=0,totD=0;let curOrder=idx.map(i=>{const sT=600+D.at(prev).at(i),sD=Dist.at(prev).at(i);totT+=sT;totD+=sD;prev=i;const sKm=sD?' • '+(sD<10000?(sD/1000).toFixed(1):Math.round(sD/1000))+' км':'';return{name:pts.at(i).name,lat:pts.at(i).lat,lon:pts.at(i).lon,st:sT,sub:'+'+fmtT(sT)+sKm}});const startPt=pts.at(0);$('s').textContent='';const km=totD?' • '+Math.round(totD/1000)+' км':'',liHtml=curOrder.map(it=>`<li><span style="flex:1">${it.name}<span class="t-tag">(${it.sub})</span></span><span class="dh">☰</span></li>`).join('');localStorage.removeItem('DEP');localStorage.setItem('R_T0',Date.now());renderOut(curOrder,startPt,totT,totD,approx);window.toast&&toast(approx?'Маршрут построен (время приблизительно)':'Маршрут построен',approx?'err':'ok')}
function renderOut(curOrder,startPt,totT,totD,approx){window.CUR=curOrder;localStorage.setItem('R_SAVE',JSON.stringify({curOrder:curOrder,startPt:startPt,totT:totT,totD:totD,approx:!!approx}));const km=totD?' • '+Math.round(totD/1000)+' км':'',liHtml=curOrder.map(it=>`<li><span style="flex:1">${it.name}<span class="t-tag">(${it.sub})</span></span><span class="dh">☰</span></li>`).join('');$('o').innerHTML=`<h3>Порядок (потяните ☰):</h3><div class="stat">⏱ Весь путь: ~${fmtT(totT)}${km}${approx?' ⚠ приблизительно':''}</div><ol>${liHtml}</ol><a class="nav" href="${buildNav(curOrder)}">Открыть в навигаторе</a>`;updEta();const ol=$('o').querySelector('ol');let dragEl=null;ol.addEventListener('touchstart',ev=>{const h=ev.target.closest('.dh');if(!h)return;dragEl=h.closest('li');dragEl.classList.add('drag')},{passive:true});ol.addEventListener('touchmove',ev=>{if(!dragEl)return;ev.preventDefault();const over=document.elementFromPoint(ev.touches.item(0).clientX,ev.touches.item(0).clientY),target=over&&over.closest('#o ol li');if(target&&target!==dragEl){const items=Array.from(ol.children),fromI=items.indexOf(dragEl),toI=items.indexOf(target);if(fromI<toI)target.after(dragEl);else target.before(dragEl);curOrder.splice(toI,0,curOrder.splice(fromI,1).at(0))}},{passive:false});ol.addEventListener('touchend',async()=>{if(!dragEl)return;dragEl.classList.remove('drag');dragEl=null;const navA=document.querySelector('#o a.nav');if(navA)navA.href=buildNav(curOrder);let tT=totT,tD=totD,ap=!!approx;try{const rPts=new Array(startPt).concat(curOrder),rr=await fT('https://router.project-osrm.org/route/v1/driving/'+rPts.map(p=>p.lon+','+p.lat).join(';')+'?overview=false'),legs=(await rr.json()).routes.at(0).legs;if(legs){ap=false;tT=0;tD=0;const lis=ol.querySelectorAll('li');legs.forEach((leg,k)=>{const sT=600+leg.duration,sD=leg.distance;tT+=sT;tD+=sD;const sKm=sD?' • '+(sD<10000?(sD/1000).toFixed(1):Math.round(sD/1000))+' км':'',sub='+'+fmtT(sT)+sKm;curOrder.at(k).sub=sub;curOrder.at(k).st=sT;const tag=lis.item(k)&&lis.item(k).querySelector('.t-tag');if(tag)tag.textContent='('+sub+')'});const st=document.querySelector('#o .stat');if(st)st.textContent='⏱ Весь путь: ~'+fmtT(tT)+(tD?' • '+Math.round(tD/1000)+' км':'')+(ap?' ⚠ приблизительно':'')}}catch(e){ap=true}localStorage.setItem('R_SAVE',JSON.stringify({curOrder:curOrder,startPt:startPt,totT:tT,totD:tD,approx:ap}));updEta()})}
try{const sv=JSON.parse(localStorage.getItem('R_SAVE')||'null');if(sv&&sv.curOrder&&sv.curOrder.length)renderOut(sv.curOrder,sv.startPt,sv.totT,sv.totD,sv.approx)}catch(e){}
;
(function(){
 const K='APP_V',g=id=>document.getElementById(id);
 
 // 1. Слушаем обновление Service Worker'а
 if ('serviceWorker' in navigator) {
   navigator.serviceWorker.addEventListener('controllerchange', () => {
     window.location.reload();
   });
 }

 async function chk(){
  try{
   const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});
   const v=(await r.json()).v,old=localStorage.getItem(K);
   if(!old){localStorage.setItem(K,v);return}
   if(old===v)return;
   const busy=(g('a')&&g('a').value.trim())||(g('ptMdl')&&g('ptMdl').classList.contains('open'))||(g('pn')&&g('pn').value.trim())||(g('cm')&&g('cm').classList.contains('open'))||(g('mapM')&&g('mapM').classList.contains('open'))||(g('bnMdl')&&g('bnMdl').classList.contains('open'));
   if(busy)return;
   localStorage.setItem(K,v);
   
   // 2. Если есть новый SW, говорим ему примениться (это вызовет controllerchange -> reload)
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.getRegistration().then(reg => {
       if (reg && reg.waiting) {
         reg.waiting.postMessage({type: 'SKIP_WAITING'});
       } else {
         // Если SW еще не готов, просто перезагружаем
         window.location.reload();
       }
     }).catch(() => window.location.reload());
   } else {
     window.location.reload();
   }
  }catch(e){}
 }
 chk();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)chk()});
 setInterval(chk,60000);
})();
;
(function lockScroll(){
 const m=document.getElementById('ptMdl');if(!m)return;
 const upd=()=>{const o=m.classList.contains('open');document.documentElement.classList.toggle('lock',o);document.body.classList.toggle('lock',o)};
 new MutationObserver(upd).observe(m,{attributes:true,attributeFilter:['class']});
 upd();
})();
;
function askC(text,ok,icon){return new Promise(res=>{
 const g=id=>document.getElementById(id),m=g('cm'),y=g('cmOk'),n=g('cmNo');
 g('cmT').textContent=text;g('cmI').textContent=icon||'🗑️';y.textContent=ok||'OK';m.classList.add('open');
 const done=v=>{m.classList.remove('open');y.onclick=n.onclick=m.onclick=null;res(v)};
 y.onclick=()=>done(true);n.onclick=()=>done(false);m.onclick=e=>{if(e.target===m)done(false)};
})}

;
(function ptBack(){
 const m=document.getElementById('ptMdl');if(!m)return;
 let was=m.classList.contains('open');
 new MutationObserver(()=>{
  const now=m.classList.contains('open');
  if(now===was)return;
  was=now;
  if(now){try{history.pushState({pt:1},'')}catch(e){}}
  else{try{if(history.state&&history.state.pt)setTimeout(()=>history.back(),0)}catch(e){}}
 }).observe(m,{attributes:true,attributeFilter:['class']});
 window.addEventListener('popstate',()=>{if(m.classList.contains('open'))m.classList.remove('open')});
})();
