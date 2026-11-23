let ADR_CACHE = (() => {
 try {
  const v = JSON.parse(localStorage.getItem("ADR_CACHE") || "null");
  return Array.isArray(v) ? v : [];
 } catch(e) { return []; }
})();
function saveAdrCache(it){
 if(!it || !it.name || typeof it.lat !== 'number' || !Number.isFinite(it.lat) || typeof it.lon !== 'number' || !Number.isFinite(it.lon)) return;
 const idx = ADR_CACHE.findIndex(x => x && x.name === it.name);
 if(idx >= 0) ADR_CACHE.splice(idx, 1);
 ADR_CACHE.unshift({name: it.name, lat: it.lat, lon: it.lon, exact: it.exact !== false});
 if(ADR_CACHE.length > 500) ADR_CACHE.pop();
 try { localStorage.setItem("ADR_CACHE", JSON.stringify(ADR_CACHE)); } catch(e) {}
}
function _fetchT(url, ms){
 if(typeof AbortController === 'undefined') return fetch(url);
 const ctrl = new AbortController();
 const tid = setTimeout(() => ctrl.abort(), ms);
 return fetch(url, {signal: ctrl.signal}).finally(() => clearTimeout(tid));
}
const SUG_KEY='7149646b-4ffe-4382-b926-544de306c692';
const YKEY='a197b5c2-1e4f-480d-abab-9ab7bd63b447';
async function yan(q){
 const errArr=c=>{const a=[];a.err=c;return a};
 if(!navigator.onLine)return errArr('off');
 try{
  const r=await _fetchT('https://geocode-maps.yandex.ru/1.x/?format=json&results=5&lang=ru_RU&rspn=1&bbox=43.4,38.8~46.7,41.3&apikey='+YKEY+'&geocode='+encodeURIComponent(q), 10000);
  if(!r.ok)return errArr(r.status===403||r.status===429?'limit':'srv');
  const j=await r.json();
  const out=[];
  ((j.response&&j.response.GeoObjectCollection&&j.response.GeoObjectCollection.featureMember)||[]).forEach(m=>{
   const g=m&&m.GeoObject,md=g&&g.metaDataProperty&&g.metaDataProperty.GeocoderMetaData;
   const pos=g&&g.Point&&typeof g.Point.pos==='string'?g.Point.pos.split(' '):null;
   if(!md||!md.text||!pos||pos.length<2)return;
   const lat=+pos[1],lon=+pos[0];
   if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
   out.push({name:md.text.replace(/^Армения, /,'')+(md.precision==='exact'?'':' 📍'),lat:lat,lon:lon,exact:md.precision==='exact'});
  });
  return out;
 }catch(e){return errArr(navigator.onLine?'net':'off')}
}

async function sugList(q){
 window._sugSrc='';
 if(SUG_KEY==='PASTE_SUGGEST_KEY'){window._sugSrc='нет ключа Геосаджеста';return []}
 try{
  const r=await _fetchT('https://suggest-maps.yandex.ru/v1/suggest?apikey='+SUG_KEY+'&lang=ru_RU&results=6&bbox=43.4,38.8~46.7,41.3&strict_bounds=1&text='+encodeURIComponent(q), 9000);
  if(!r.ok){window._sugSrc='Геосаджест: ошибка '+r.status;return []}
  const j=await r.json();
  window._sugSrc='Геосаджест';
  const items=(j.results||[]).map(x=>{
   const t=(x&&x.title&&x.title.text)||'',st=(x&&x.subtitle&&x.subtitle.text)||'';
   const full=st?t+', '+st:t;
   return{name:full.replace(/^Армения, /,'')+' 🔎',text:full,lat:null,lon:null,exact:false};
  }).filter(it=>it.text);
  const key=x=>x.text.replace(/\s*[\u{1F4CD}\u{1F50E}]/gu,'').trim().toLowerCase();
  const seen=new Set();
  return items.filter(it=>{const k=key(it);if(!k||seen.has(k))return false;seen.add(k);return true;});
 }catch(e){window._sugSrc='Геосаджест: нет связи';return []}
}
function showList(list,msg){
 const ia=document.getElementById('a');
 if(!ia)return;
 let b=document.getElementById('sg');
 if(!b){b=document.createElement('div');b.id='sg';const w=ia.closest('.inp-w');(w||ia).after(b)}
 b.innerHTML='';
 if(list.length&&msg){
  const h=document.createElement('div');
  h.style.cssText='margin-top:8px;font-size:13px';
  h.textContent=msg;
  b.appendChild(h);
 }
 list.forEach(it=>{
  const x=document.createElement('button');
  x.textContent=it.name;
  x.setAttribute('data-no-i18n','1');
  x.style.cssText='margin-top:4px;padding:10px;font-size:14px;text-align:left;background:#fc0;color:#000';
  x.onclick=()=>choose(it);
  b.appendChild(x);
 });
}
let _pick=null;
function choose(it){
 const a=document.getElementById('a');
 if(!a)return;
 a.value=it.name.replace(/\s*[\u{1F50E}\u{1F4CD}]$/u,'');
 _pick={label:a.value,name:it.name,text:it.text,lat:it.lat,lon:it.lon,exact:it.exact};
 showList([]);
 const s=document.getElementById('s');
 if(s)s.textContent='';
 a.focus();
}
// Добавление выбранного адреса (вызывается только по Enter или кнопке)
async function addPick(it){
 const clean=t=>String(t||'').replace(/[\s]*[\u{1F50E}\u{1F4CD}]\s*$/u,'').trim();
 let lat=it.lat,lon=it.lon,name=clean(it.name),exact=it.exact;
 if(lat==null||lon==null){const hit=ADR_CACHE.find(x=>x&&x.name===clean(it.text||it.name)&&typeof x.lat==='number'&&Number.isFinite(x.lat));if(hit){lat=hit.lat;lon=hit.lon;name=hit.name;exact=hit.exact!==false}}
 if(lat==null||lon==null){
  const q=clean(it.text||it.name);
  const l=await yan(q);
  if(!l.length){
   const E=l.err;
   window.toast&&toast(E?'Не удалось найти координаты: '+({off:'нет интернета',net:'нет связи',limit:'лимит Яндекса',srv:'Яндекс не отвечает'}[E]||E):'Не удалось найти координаты: «'+q+'»','err');
   return;
  }
  lat=l[0].lat;lon=l[0].lon;name=clean(l[0].name);exact=l[0].exact;
 }
 const normN=t=>String(t||'').toLowerCase().replace(/\s+/g,' ').trim();
 const dup=P.find(x=>normN(x.name)===normN(name)||(typeof x.lat==='number'&&Number.isFinite(x.lat)&&typeof x.lon==='number'&&Number.isFinite(x.lon)&&Math.hypot((x.lat-lat)*111000,(x.lon-lon)*85000)<35));
 if(dup&&typeof askC==='function'){const ok=await askC('Адрес уже есть в списке:\n«'+dup.name+'»\n\nДобавить ещё раз?','Добавить','⚠️');if(!ok)return;}
 saveAdrCache({name:name,lat:lat,lon:lon,exact:exact});
 if(it.text)saveAdrCache({name:clean(it.text),lat:lat,lon:lon,exact:exact});
 P.push({name:name,lat:lat,lon:lon});
 const ia=document.getElementById('a');if(ia)ia.value='';
 _pick=null;
 showList([]);
 const s=document.getElementById('s');if(s)s.textContent='';
 window.toast&&toast('Адрес добавлен');
 save();
}
window.add=async function(){
 const s=document.getElementById('s'),ia=document.getElementById('a');
 if(!ia)return;
 const q=ia.value.trim();
 if(!q)return;
 if(_pick&&q===_pick.label){await addPick(_pick);return}
 if(s)s.textContent='Ищу адрес в Яндексе...';
 const l=await yan(q);
 if(!l.length){const E=l.err,m=E==='off'?'Нет интернета. Проверьте сеть и повторите':E==='net'?'Не удалось связаться с Яндексом. Проверьте сеть':E==='limit'?'Яндекс отклонил запрос (лимит или ключ API)':E==='srv'?'Яндекс временно не отвечает. Попробуйте позже':'Адрес не найден. Попробуйте написать иначе или добавьте город';if(s)s.textContent=m;window.toast&&toast(m,'err');return}
 if(l.length===1&&l[0].exact){await addPick(l[0]);return}
 if(s)s.textContent='';
 window.toast&&toast('Выберите адрес из списка, чтобы добавить','err');showList(l,'Выберите нужный вариант:');
};

let _liveSearch;
const _inpA = document.getElementById("a");
if (_inpA) _inpA.addEventListener("input", function(){
 _pick=null;
 clearTimeout(_liveSearch);
 const q = this.value.trim();
 if(q.length < 2){ showList(new Array()); return; }
 _liveSearch = setTimeout(async function(){
  const l = await sugList(q);
  if(_inpA.value.trim() === q){
   showList(l, l.length ? "Выберите нужный вариант · источник: "+(window._sugSrc||"?")+":" : "");
  }
 }, 400);
});
