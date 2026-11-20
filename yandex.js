let ADR_CACHE = JSON.parse(localStorage.getItem("ADR_CACHE") || "null") || new Array();
function saveAdrCache(it){
 if(!it || !it.name) return;
 const idx = ADR_CACHE.findIndex(x => x.name === it.name);
 if(idx >= 0) ADR_CACHE.splice(idx, 1);
 ADR_CACHE.unshift({name: it.name, lat: it.lat, lon: it.lon});
 if(ADR_CACHE.length > 500) ADR_CACHE.pop();
 localStorage.setItem("ADR_CACHE", JSON.stringify(ADR_CACHE));
}
const SUG_KEY='7149646b-4ffe-4382-b926-544de306c692';
const YKEY='a197b5c2-1e4f-480d-abab-9ab7bd63b447';
async function yan(q){
 const errArr=c=>{const a=[];a.err=c;return a};
 if(!navigator.onLine)return errArr('off');
 try{
  const r=await fetch('https://geocode-maps.yandex.ru/1.x/?format=json&results=5&lang=ru_RU&rspn=1&bbox=43.4,38.8~46.7,41.3&apikey='+YKEY+'&geocode='+encodeURIComponent(q));
  if(!r.ok)return errArr(r.status===403||r.status===429?'limit':'srv');
  const j=await r.json();
  return ((j.response&&j.response.GeoObjectCollection&&j.response.GeoObjectCollection.featureMember)||[]).map(m=>{
   const g=m.GeoObject,md=g.metaDataProperty.GeocoderMetaData;
   const p=g.Point.pos.split(' ');
   return{name:md.text.replace(/^Армения, /,'')+(md.precision==='exact'?'':' 📍'),lat:+p[1],lon:+p[0],exact:md.precision==='exact'};
  });
 }catch(e){return errArr(navigator.onLine?'net':'off')}
}

async function sugList(q){
 window._sugSrc='';
 if(SUG_KEY==='PASTE_SUGGEST_KEY'){window._sugSrc='нет ключа Геосаджеста';return []}
 try{
  const r=await fetch('https://suggest-maps.yandex.ru/v1/suggest?apikey='+SUG_KEY+'&lang=ru_RU&results=6&bbox=43.4,38.8~46.7,41.3&strict_bounds=1&text='+encodeURIComponent(q),{signal:AbortSignal.timeout(9000)});
  if(!r.ok){window._sugSrc='Геосаджест: ошибка '+r.status;return []}
  const j=await r.json();
  window._sugSrc='Геосаджест';
  const items=(j.results||[]).map(x=>{
   const t=(x.title&&x.title.text)||'',st=(x.subtitle&&x.subtitle.text)||'';
   const full=st?t+', '+st:t;
   return{name:full.replace(/^Армения, /,'')+' 🔎',text:full,lat:null,lon:null,exact:false};
  });
  const key=x=>x.text.replace(/\s*[\u{1F4CD}\u{1F50E}]/gu,'').trim();
  const cnt={};
  items.forEach(it=>{const k=key(it);cnt[k]=(cnt[k]||0)+1});
  return items.filter(it=>cnt[key(it)]===1);
 }catch(e){window._sugSrc='Геосаджест: нет связи';return []}
}
function showList(list,msg){
 let b=document.getElementById('sg');
 if(!b){b=document.createElement('div');b.id='sg';const ia=document.getElementById('a'),w=ia.closest('.inp-w');(w||ia).after(b)}
 b.innerHTML=list.length&&msg?'<div style="margin-top:8px;font-size:13px">'+msg+'</div>':'';
 list.forEach(it=>{
  const x=document.createElement('button');
  x.textContent=it.name;
  x.style.cssText='margin-top:4px;padding:10px;font-size:14px;text-align:left;background:#fc0;color:#000';
  x.onclick=()=>choose(it);
  b.appendChild(x);
 });
}
let _pick=null;
function choose(it){
 const a=document.getElementById('a');
 a.value=it.name.replace(/\s*[\u{1F50E}\u{1F4CD}]$/u,'');
 _pick={label:a.value,name:it.name,text:it.text,lat:it.lat,lon:it.lon,exact:it.exact};
 showList([]);
 document.getElementById('s').textContent='';
 a.focus();
}
// Добавление выбранного адреса (вызывается только по Enter или кнопке)
async function addPick(it){
 const clean=t=>String(t||'').replace(/[\s]*[\u{1F50E}\u{1F4CD}]\s*$/u,'').trim();
 let lat=it.lat,lon=it.lon,name=clean(it.name),exact=it.exact;
 if(lat==null||lon==null){const hit=ADR_CACHE.find(x=>x.name===clean(it.text||it.name)&&x.lat!=null);if(hit){lat=hit.lat;lon=hit.lon;name=hit.name}}
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
 saveAdrCache({name:name,lat:lat,lon:lon});
 if(it.text)saveAdrCache({name:clean(it.text),lat:lat,lon:lon});
 P.push({name:name,lat:lat,lon:lon});
 document.getElementById('a').value='';
 _pick=null;
 showList([]);
 document.getElementById('s').textContent='';
 window.toast&&toast('Адрес добавлен');
 save();
}
window.add=async function(){
 const s=document.getElementById('s');
 const q=document.getElementById('a').value.trim();
 if(!q)return;
 if(_pick&&q===_pick.label){addPick(_pick);return}
 s.textContent='Ищу адрес в Яндексе...';
 const l=await yan(q);
 if(!l.length){const E=l.err,m=E==='off'?'Нет интернета. Проверьте сеть и повторите':E==='net'?'Не удалось связаться с Яндексом. Проверьте сеть':E==='limit'?'Яндекс отклонил запрос (лимит или ключ API)':E==='srv'?'Яндекс временно не отвечает. Попробуйте позже':'Адрес не найден. Попробуйте написать иначе или добавьте город';s.textContent=m;window.toast&&toast(m,'err');return}
 if(l.length===1&&l[0].exact){addPick(l[0]);return}
 s.textContent='';
 window.toast&&toast('Выберите адрес из списка, чтобы добавить','err');showList(l,'Выберите нужный вариант:');
};

let _liveSearch;
document.getElementById("a").addEventListener("input", function(){
 _pick=null;
 clearTimeout(_liveSearch);
 const q = this.value.trim();
 if(q.length < 2){ showList(new Array()); return; }
 _liveSearch = setTimeout(async function(){
  const l = await sugList(q);
  if(document.getElementById("a").value.trim() === q){
   showList(l, l.length ? "Выберите нужный вариант · источник: "+(window._sugSrc||"?")+":" : "");
  }
 }, 400);
});
