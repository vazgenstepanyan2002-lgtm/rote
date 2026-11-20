const KENTRON_POLY=[
  [40.1881,44.5094],
  [40.1891,44.5152],
  [40.1877,44.5221],
  [40.1826,44.5238],
  [40.1759,44.5202],
  [40.1731,44.5155],
  [40.1748,44.5081],
  [40.1795,44.5061],
  [40.1846,44.5068]
];
function inKentron(lat,lon){
  let ins=false;
  for(let i=0,j=KENTRON_POLY.length-1;i<KENTRON_POLY.length;j=i++){
    const a=KENTRON_POLY[i],b=KENTRON_POLY[j];
    const yi=a[0],xi=a[1],yj=b[0],xj=b[1];
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/((yj-yi)||1e-12)+xi))ins=!ins;
  }
  return ins;
}
const $=id=>document.getElementById(id);
let P=JSON.parse(localStorage.getItem('P')||'[]');
function save(){localStorage.setItem('P',JSON.stringify(P));draw()}
function syncGoGrp(){const g=$('goGrp');if(g)g.classList.toggle('show',P.length>0||!!($('o')&&$('o').innerHTML.trim()))}
function draw(){if($('cnt'))$('cnt').textContent=P.length;syncGoGrp();$('l').innerHTML=P.map((p,i)=>{const kz=inKentron(p.lat,p.lon)?' <span style="color:#fca5a5;font-size:12px;font-weight:700">⛔ Покр Кентрон</span>':'';return`<li class="${p.pin?'pin':''}"><span style="flex:1">${p.name}${kz}</span><div class="cbtns"><a class="st ${p.pin?'on':''}" href="#" onclick="pin(${i});return false">${p.pin?'⭐':'☆'}</a><a class="x" href="#" onclick="del(${i});return false">✕</a></div></li>`}).join('')}
function del(i){P.splice(i,1);save();window.toast&&toast('Адрес удалён')}
function pin(i){const v=!P[i].pin;P.forEach(x=>x.pin=false);P[i].pin=v;save()}

function pos(){return new Promise((ok,no)=>navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lon:p.coords.longitude}),no,{enableHighAccuracy:true,timeout:15000}))}
$('a').onkeydown=ev=>{if(ev.key==='Enter')add()};
draw();

let _sr=null,_srTimer=null;
function voice(){
 const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const isPWA=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 const inp=$('a'),m=$('mic'),st=$('s');
 if(!SR||(isIOS&&isPWA)){
  inp.focus();
  st.textContent='Нажмите микрофон 🎙 на клавиатуре iPhone и продиктуйте';
  return;
 }
 if(_sr){
  try{_sr.stop()}catch(e){}
  _sr=null;clearTimeout(_srTimer);m.classList.remove('rec');st.textContent='';
  return;
 }
 let lang=window.LANG_SR||'ru-RU';
 if(isIOS&&lang==='hy-AM')lang='ru-RU';
 const r=new SR();_sr=r;
 r.lang=lang;
 r.interimResults=true;
 r.continuous=false;
 const stopRec=()=>{clearTimeout(_srTimer);if(_sr===r){_sr=null;try{r.stop()}catch(e){}}m.classList.remove('rec')};
 r.onstart=()=>{m.classList.add('rec');st.textContent=isIOS?'Говорите адрес (или нажмите 🎙 на клавиатуре)...':'Говорите адрес...'};
 r.onend=()=>{clearTimeout(_srTimer);if(_sr===r)_sr=null;m.classList.remove('rec');if(inp.value.trim())st.textContent=''};
 r.onerror=ev=>{
  clearTimeout(_srTimer);if(_sr===r)_sr=null;m.classList.remove('rec');
  if(ev&&ev.error==='aborted')return;
  if(isIOS){inp.focus();st.textContent='Нажмите микрофон 🎙 на клавиатуре iPhone и продиктуйте';}
  else st.textContent='Не удалось распознать голос';
 };
 r.onresult=e=>{
  let full='';
  for(let i=0;i<e.results.length;i++){
   full+=e.results.item(i).item(0).transcript;
  }
  const txt=full.trim();
  if(txt){
   inp.value=txt;
   st.textContent='';
   inp.dispatchEvent(new Event('input'));
  }
  if(isIOS){
   clearTimeout(_srTimer);
   _srTimer=setTimeout(stopRec,2000);
  }
 };
 try{r.start()}catch(e){
  _sr=null;m.classList.remove('rec');
  if(isIOS){inp.focus();st.textContent='Нажмите микрофон 🎙 на клавиатуре iPhone и продиктуйте';}
  else st.textContent='Не удалось распознать голос';
 }
}
;
let SPEC_PTS=(()=>{try{const v=JSON.parse(localStorage.getItem('SPEC')||'null');if(Array.isArray(v))return v}catch(e){}return[{name:'Артак',lat:40.163019,lon:44.388218},{name:'Геворг Спайка',lat:40.127240,lon:44.490112}]})();
let _spTok=0;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function saveSpec(){localStorage.setItem('SPEC',JSON.stringify(SPEC_PTS));if(window._admPushNow)window._admPushNow()}
function drawSpec(me,dists,durs){
 if(!SPEC_PTS.length){$('ptList').innerHTML='<div class="pt-empty">Список пуст. Добавьте точку ниже.</div>';return}
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
  return '<div class="pt-r"><a class="pt-i" href="yandexnavi://build_route_on_map?lat_to='+p.lat+'&lon_to='+p.lon+'"><span class="pt-ic"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span><span class="pt-tx"><b>'+esc(p.name)+'</b>'+info+'</span><span class="pt-go">🧭 Поехали</span></a><a class="pt-del" href="#" onclick="delSpec('+i+');return false" aria-label="Удалить">✕</a></div>';
 }).join('');
}
async function delSpec(i){
 if(!SPEC_PTS[i])return;
 if(!await askC('Удалить точку «'+SPEC_PTS[i].name+'»?','Удалить'))return;
 SPEC_PTS.splice(i,1);saveSpec();window.toast&&toast('Точка удалена');openPts();
}
function openAddSpec(){
 $('pn').value='';$('pc').value='';$('ptMsg').textContent='';
 $('ptAddMdl').classList.add('open');
}
function closeAddSpec(){
 $('ptAddMdl').classList.remove('open');
 $('ptMsg').textContent='';
}
async function addSpec(){
 const n=$('pn').value.trim(),c=$('pc').value.trim(),m=$('ptMsg');
 if(!n){m.textContent='Введите название точки';return}
 let lat,lon;
 if(c){
  const nums=c.match(/-?\d+(?:[.,]\d+)?/g);
  if(!nums||nums.length!==2){m.textContent='Нужно два числа: 40.1630, 44.3882';return}
  lat=parseFloat(nums.at(0).replace(',','.'));lon=parseFloat(nums.at(1).replace(',','.'));
  if(lat>43&&lon<43){const t=lat;lat=lon;lon=t}
  if(!(lat>38.8&&lat<41.3&&lon>43.4&&lon<46.7)){m.textContent='Координаты вне Армении, проверьте';return}
 }else{
  m.textContent='Определяю вашу геопозицию...';
  try{const me=await pos();lat=me.lat;lon=me.lon}catch(e){m.textContent='Нет доступа к геолокации. Введите координаты вручную';return}
 }
 SPEC_PTS.push({name:n,lat:+lat.toFixed(6),lon:+lon.toFixed(6)});saveSpec();
 closeAddSpec();window.toast&&toast('Точка добавлена');openPts();
}
async function fillPos(){
 const m=$('ptMsg');
 m.textContent='Определяю вашу геопозицию...';
 try{const me=await pos();$('pc').value=me.lat.toFixed(6)+', '+me.lon.toFixed(6);m.textContent='Координаты подставлены. Введите название и нажмите «Сохранить»'}
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
let _defPrompt=null;window._pwaPrompt=null;window._updAuthInst=null;
const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
if(!isStandalone&&!localStorage.getItem('INST_HIDE')){
 window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _defPrompt=e;window._pwaPrompt=e;if(window._updAuthInst)window._updAuthInst();
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
 _defPrompt=null;window._pwaPrompt=null;if(window._updAuthInst)window._updAuthInst();
}
window.addEventListener('appinstalled',()=>{window._pwaPrompt=null;$('instBar').style.display='none';if(window._updAuthInst)window._updAuthInst()});
;
const fT=async u=>{let last;for(let i=0;i<2;i++){try{return await fetch(u,{signal:AbortSignal.timeout(9000)})}catch(e){last=e;if(!navigator.onLine)throw e;await new Promise(r=>setTimeout(r,400*(i+1)))}}throw last};
const BASE={name:'🏁 Возврат на базу (Арин Берд 7)',lat:40.120847,lon:44.514271};
function solve(D,n,bIdx){
 if(n<=0)return[];
 if(n===1)return[1];
 const pI=P.findIndex(x=>x&&x.pin)+1;
 if(n<=13){
  const N=1<<n,FULL=N-1,dp=new Float64Array(N*n),par=new Int8Array(N*n);
  dp.fill(Infinity);par.fill(-1);
  if(pI>0){dp[(1<<(pI-1))*n+(pI-1)]=D[0][pI]}
  else{for(let i=0;i<n;i++)dp[(1<<i)*n+i]=D[0][i+1]}
  for(let mask=1;mask<FULL;mask++){
   for(let last=0;last<n;last++){
    if(!(mask&(1<<last)))continue;
    const curC=dp[mask*n+last];
    if(curC===Infinity)continue;
    const row=D[last+1];
    for(let nxt=0;nxt<n;nxt++){
     if(mask&(1<<nxt))continue;
     const nm=mask|(1<<nxt),nc=curC+row[nxt+1],idx=nm*n+nxt;
     if(nc<dp[idx]){dp[idx]=nc;par[idx]=last}
    }
   }
  }
  let bc=Infinity,bl=0;
  for(let last=0;last<n;last++){
   const c=dp[FULL*n+last]+(bIdx?D[last+1][bIdx]:0);
   if(c<bc){bc=c;bl=last}
  }
  const res=new Array(n);let m=FULL,cur=bl;
  for(let k=n-1;k>=0;k--){res[k]=cur+1;const pr=par[m*n+cur];m^=(1<<cur);cur=pr}
  return res;
 }
 const st=pI>0?1:0;
 const cost=p=>{
  let c=0,l=0;
  for(let k=0;k<p.length;k++){c+=D[l][p[k]];l=p[k]}
  return c+(bIdx?D[l][bIdx]:0);
 };
 const nn=first=>{
  const used=Array(n+2).fill(0),arr=[];let cur=0;
  if(first>0){used[first]=1;arr.push(first);cur=first}
  while(arr.length<n){
   let b=-1,bv=Infinity;
   for(let i=1;i<=n;i++)if(!used[i]){const v=D[cur][i];if(v<bv){bv=v;b=i}}
   used[b]=1;arr.push(b);cur=b;
  }
  return arr;
 };
 const opt=arr=>{
  let p=arr.slice(),pc=cost(p),imp=true,it=0;
  while(imp&&it++<40){
   imp=false;
   for(let i=st;i<n-1;i++)for(let j=i+1;j<n;j++){
    const q=p.slice(0,i).concat(p.slice(i,j+1).reverse(),p.slice(j+1)),qc=cost(q);
    if(qc<pc-1e-6){p=q;pc=qc;imp=true}
   }
   for(const len of[1,2]){
    for(let i=st;i<=n-len;i++){
     const seg=p.slice(i,i+len),rest=p.slice(0,i).concat(p.slice(i+len));
     for(let j=st;j<=rest.length;j++){
      if(j===i)continue;
      const q=rest.slice(0,j).concat(seg,rest.slice(j)),qc=cost(q);
      if(qc<pc-1e-6){p=q;pc=qc;imp=true}
     }
    }
   }
  }
  return{p,c:pc};
 };
 const seeds=pI>0?[nn(pI)]:Array.from({length:n},(_,i)=>nn(i+1)).sort((a,b)=>cost(a)-cost(b)).slice(0,6);
 let best=[],bc=Infinity;
 for(const sd of seeds){const r=opt(sd);if(r.c<bc){bc=r.c;best=r.p}}
 return best;
}
function etaBase(){const d=localStorage.getItem('DEP');if(d&&/^\d\d:\d\d$/.test(d)){const x=new Date();x.setHours(+d.slice(0,2),+d.slice(3,5),0,0);return x.getTime()}return +localStorage.getItem('R_T0')||Date.now()}
function hm(ms){const x=new Date(ms),p=n=>String(n).padStart(2,'0');return p(x.getHours())+':'+p(x.getMinutes())+(x.getDate()!==new Date().getDate()?' (+1 д)':'')}
function setDep(v){if(v)localStorage.setItem('DEP',v);else{localStorage.removeItem('DEP');localStorage.setItem('R_T0',Date.now())}updEta()}
function updEta(){return;const c=window.CUR;if(!c)return;const i=$('dep');if(i&&document.activeElement!==i)i.value=localStorage.getItem('DEP')||'';const els=document.querySelectorAll('#o ol li .eta');const ok=c.every(x=>typeof x.st==='number');let t=etaBase()-600000;c.forEach((it,k)=>{t+=(it.st||0)*1000;if(els[k])els[k].textContent=ok?'🕒 '+hm(t):''})}
function fmtT(s){const m=Math.round(s/60);return m<60?m+' мин':Math.floor(m/60)+' ч '+(m%60)+' мин'}
function buildNav(arr){const active=arr.filter(x=>!x.done);if(!active.length)return"#";const to=active.at(-1),via=active.slice(0,-1);let u='yandexnavi://build_route_on_map?lat_to='+to.lat+'&lon_to='+to.lon;via.forEach((p,i)=>u+='&lat_via_'+i+'='+p.lat+'&lon_via_'+i+'='+p.lon);return u}

function segCrossesKentron(a,b){
  if(!a||!b)return false;
  if(inKentron(a.lat,a.lon)||inKentron(b.lat,b.lon))return true;
  for(let k=1;k<=11;k++){const t=k/12;if(inKentron(a.lat+(b.lat-a.lat)*t,a.lon+(b.lon-a.lon)*t))return true;}
  return false;
}
function getShift(){try{return localStorage.getItem("SHIFT_MODE")==="night"?"night":"day"}catch(e){return"day"}}
function setShift(mode){
  const m=mode==="night"?"night":"day";
  try{localStorage.setItem("SHIFT_MODE",m)}catch(e){}
  const dBtn=$("shDay"),nBtn=$("shNight");
  if(dBtn)dBtn.classList.toggle("on",m==="day");
  if(nBtn)nBtn.classList.toggle("on",m==="night");
  window.toast&&toast(m==="day"?"☀️ Дневная смена: порядок в обход Покр Кентрона до 21:00":"🌙 Ночная смена: въезд в Покр Кентрон разрешён");
}
setShift(getShift());
async function go(){
  if(!P.length)return;
  const isDay=getShift()==="day",back=$("ret").checked;
  let activeP=P.slice(),allowKentron=false;
  if(isDay){
    const blocked=activeP.filter(p=>inKentron(p.lat,p.lon));
    if(blocked.length){
      const act=await askKentron(blocked);
      if(!act)return;
      if(act==="keep"){
        allowKentron=true;
      }else if(act==="del"){
        P=P.filter(p=>!inKentron(p.lat,p.lon));
        save();
        activeP=P.slice();
        window.toast&&toast("Адреса в Покр Кентроне удалены");
        if(!activeP.length){$("o").innerHTML="";$("s").textContent="";return}
      }
    }
  }
  $("o").innerHTML="";$("s").textContent="Определяю местоположение...";
  let me;try{me=await pos()}catch(e){$("s").textContent="Разрешите доступ к геолокации для Chrome";window.toast&&toast("Нет доступа к геолокации","err");return}
  const pts=back?[me,...activeP,BASE]:[me,...activeP],bIdx=back?pts.length-1:0;
  $("s").textContent=(isDay&&!allowKentron)?"Считаю порядок в обход Покр Кентрона...":"Считаю лучший порядок...";
  let D,approx=false;
  const osrmJson=async(kind,coords,qs)=>{
    const h1=["router","project-osrm","org"].join(".");
    const h2=["routing","openstreetmap","de"].join(".");
    const urls=[
      ["https:","",h1,kind,"v1","driving",coords].join("/")+qs,
      ["https:","",h2,"routed-car",kind,"v1","driving",coords].join("/")+qs
    ];
    for(const u of urls){
      try{
        const r=await fT(u);
        if(!r.ok)continue;
        const j=await r.json();
        if(j&&j.code==="Ok")return j;
      }catch(e){}
    }
    throw 0;
  };
  try{
    const j=await osrmJson("table",pts.map(p=>p.lon+","+p.lat).join(";"),"?annotations=duration");
    D=j.durations;if(!D)throw 0;
    D=D.map((row,i)=>row.map((v,j)=>{if(v==null){approx=true;return Math.hypot((pts[i].lat-pts[j].lat)*111,(pts[i].lon-pts[j].lon)*85)*90}return v}));
  }catch(e){approx=true;D=pts.map(a=>pts.map(b=>Math.hypot((a.lat-b.lat)*111,(a.lon-b.lon)*85)*90))}
  if(isDay&&!allowKentron)for(let i=0;i<pts.length;i++)for(let j=0;j<pts.length;j++)if(i!==j&&segCrossesKentron(pts[i],pts[j]))D[i][j]+=420;
  let Dist=pts.map(a=>pts.map(b=>Math.hypot((a.lat-b.lat)*111000,(a.lon-b.lon)*85000)*1.35));
  const origP=P;P=activeP;const idx=solve(D,activeP.length,bIdx);P=origP;
  if(back)idx.push(bIdx);
  try{
    const rPts=[pts.at(0),...idx.map(i=>pts.at(i))];
    const j2=await osrmJson("route",rPts.map(p=>p.lon+","+p.lat).join(";"),"?overview=false");
    const legs=j2.routes&&j2.routes.at(0)&&j2.routes.at(0).legs;
    if(legs){
      approx=false;
      legs.forEach((leg,k)=>{const a=k===0?0:idx.at(k-1),b=idx.at(k);D[a][b]=leg.duration;Dist[a][b]=leg.distance});
    }else approx=true;
  }catch(e){approx=true}
  let prev=0,totT=0,totD=0;
  let curOrder=idx.map(i=>{
    const sT=(bIdx&&i===bIdx?0:600)+D.at(prev).at(i),sD=Dist.at(prev).at(i);totT+=sT;totD+=sD;prev=i;
    const sKm=sD?" • "+(sD<10000?(sD/1000).toFixed(1):Math.round(sD/1000))+" км":"";
    return{name:pts.at(i).name,lat:pts.at(i).lat,lon:pts.at(i).lon,st:sT,sub:"+"+fmtT(sT)+sKm};
  });
  $("s").textContent="";localStorage.removeItem("DEP");localStorage.setItem("R_T0",Date.now());
  renderOut(curOrder,pts.at(0),totT,totD,approx);
  window.toast&&toast(approx?"Маршрут построен (время приблизительно)":"Маршрут построен",approx?"err":"ok");
}
function toggleDone(k){
  const c=window.CUR;if(!c||!c[k])return;
  c[k].done=!c[k].done;
  try{
    const sv=JSON.parse(localStorage.getItem("R_SAVE")||"{}")||{};
    sv.curOrder=c;
    localStorage.setItem("R_SAVE",JSON.stringify(sv));
    renderOut(c,sv.startPt,sv.totT,sv.totD,sv.approx);
  }catch(e){}
  window.toast&&toast(c[k].done?"✅ Адрес отмечен как выполненный":"↩️ Адрес возвращён в маршрут");
}
function renderOut(curOrder,startPt,totT,totD,approx){syncGoGrp();window.CUR=curOrder;localStorage.setItem('R_SAVE',JSON.stringify({curOrder:curOrder,startPt:startPt,totT:totT,totD:totD,approx:!!approx}));const km=totD?' • '+Math.round(totD/1000)+' км':'',liHtml=curOrder.map((it,k)=>`<li class="${it.done?'done':''}"><span class="done-btn" onclick="toggleDone(${k})" title="Выполнено">✓</span><span class="ord-txt" style="flex:1">${it.name}<span class="t-tag">(${it.sub})</span></span><span class="dh">☰</span></li>`).join('');$('o').innerHTML=`<h3>Порядок (потяните ☰):</h3><div class="stat">⏱ Весь путь: ~${fmtT(totT)}${km}${approx?' ⚠ приблизительно':''}</div><ol>${liHtml}</ol><a class="nav" href="${buildNav(curOrder)}" onclick="if(this.getAttribute('href')==='#'){event.preventDefault();window.toast&&toast('Все адреса в маршруте уже выполнены','err');}"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg><span>Открыть в навигаторе</span></a>`;updEta();const ol=$('o').querySelector('ol');let dragEl=null;ol.addEventListener('touchstart',ev=>{const h=ev.target.closest('.dh');if(!h)return;dragEl=h.closest('li');dragEl.classList.add('drag')},{passive:true});ol.addEventListener('touchmove',ev=>{if(!dragEl)return;ev.preventDefault();const over=document.elementFromPoint(ev.touches.item(0).clientX,ev.touches.item(0).clientY),target=over&&over.closest('#o ol li');if(target&&target!==dragEl){const items=Array.from(ol.children),fromI=items.indexOf(dragEl),toI=items.indexOf(target);if(fromI<toI)target.after(dragEl);else target.before(dragEl);curOrder.splice(toI,0,curOrder.splice(fromI,1).at(0))}},{passive:false});ol.addEventListener('touchend',async()=>{if(!dragEl)return;dragEl.classList.remove('drag');dragEl=null;const navA=document.querySelector('#o a.nav');if(navA)navA.href=buildNav(curOrder);let tT=totT,tD=totD,ap=!!approx;try{const rPts=new Array(startPt).concat(curOrder),rc=rPts.map(p=>p.lon+','+p.lat).join(';'),getLegs=async u=>{const r=await fT(u+rc+'?overview=false');if(!r.ok)throw 0;const j=await r.json();if(!j.routes||!j.routes.at(0))throw 0;return j.routes.at(0).legs};let legs=null;try{legs=await getLegs('https://router.project-osrm.org/route/v1/driving/')}catch(e){legs=await getLegs('https://routing.openstreetmap.de/routed-car/route/v1/driving/')}if(legs){ap=false;tT=0;tD=0;const lis=ol.querySelectorAll('li');legs.forEach((leg,k)=>{const isBase=String((curOrder.at(k)&&curOrder.at(k).name)||'').indexOf('🏁')===0,sT=(isBase?0:600)+leg.duration,sD=leg.distance;tT+=sT;tD+=sD;const sKm=sD?' • '+(sD<10000?(sD/1000).toFixed(1):Math.round(sD/1000))+' км':'',sub='+'+fmtT(sT)+sKm;curOrder.at(k).sub=sub;curOrder.at(k).st=sT;const tag=lis.item(k)&&lis.item(k).querySelector('.t-tag');if(tag)tag.textContent='('+sub+')'});const st=document.querySelector('#o .stat');if(st)st.textContent='⏱ Весь путь: ~'+fmtT(tT)+(tD?' • '+Math.round(tD/1000)+' км':'')+(ap?' ⚠ приблизительно':'')}}catch(e){ap=true}localStorage.setItem('R_SAVE',JSON.stringify({curOrder:curOrder,startPt:startPt,totT:tT,totD:tD,approx:ap}));updEta()})}
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
   const busy=window._ocrScanning||(g('a')&&g('a').value.trim())||(g('ptMdl')&&g('ptMdl').classList.contains('open'))||(g('pn')&&g('pn').value.trim())||(g('cm')&&g('cm').classList.contains('open'))||(g('mapM')&&g('mapM').classList.contains('open'))||(g('bnMdl')&&g('bnMdl').classList.contains('open'));
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
function askC(text,ok,icon,noText){return new Promise(res=>{
 const g=id=>document.getElementById(id),m=g('cm'),y=g('cmOk'),n=g('cmNo');
 g('cmT').style.whiteSpace="pre-line";
 g('cmT').textContent=text;g('cmI').textContent=icon||'🗑️';y.textContent=ok||'OK';n.textContent=noText||'Отмена';m.classList.add('open');
 const done=v=>{m.classList.remove('open');g('cmT').style.whiteSpace="";n.textContent='Отмена';y.onclick=n.onclick=m.onclick=null;res(v)};
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
 window.addEventListener('popstate',()=>{const am=document.getElementById('ptAddMdl');if(am&&am.classList.contains('open')){am.classList.remove('open');return}if(m.classList.contains('open'))m.classList.remove('open')});
})();

function askKentron(list){
  return new Promise(res=>{
    let m=$("kzMdl");if(m)m.remove();
    m=document.createElement("div");
    m.id="kzMdl";
    m.className="cm open";
    const items=list.map(x=>'<div class="kz-it"><span>📍</span><b>'+esc(x.name)+'</b></div>').join("");
    m.innerHTML='<div class="cm-b kz-box">'
      +'<button type="button" class="pm-x" id="kzX" aria-label="Закрыть">✕</button>'
      +'<div class="kz-ring"><div class="kz-in"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></div></div>'
      +'<div class="kz-pill"><i></i>Покр Кентрон · до 21:00</div>'
      +'<div class="kz-t">Въезд грузовым запрещён</div>'
      +'<div class="kz-s">В дневную смену в Малом центре работают камеры фиксации для грузового транспорта.</div>'
      +'<div class="kz-list">'+items+'</div>'
      +'<div class="kz-acts">'
      +'<button type="button" class="kz-del" id="kzDel">🗑️ Удалить</button>'
      +'<button type="button" class="kz-go" id="kzGo">Продолжить</button>'
      +'</div></div>';
    document.body.appendChild(m);
    const done=v=>{m.remove();res(v)};
    $("kzX").onclick=()=>done(null);
    $("kzDel").onclick=()=>done("del");
    $("kzGo").onclick=()=>done("keep");
    m.onclick=e=>{if(e.target===m)done(null)};
  });
}
