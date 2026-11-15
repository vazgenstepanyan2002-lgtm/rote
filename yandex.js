let ADR_CACHE = JSON.parse(localStorage.getItem("ADR_CACHE") || "null") || new Array();
function saveAdrCache(it){
 if(!it || !it.name) return;
 const idx = ADR_CACHE.findIndex(x => x.name === it.name);
 if(idx >= 0) ADR_CACHE.splice(idx, 1);
 ADR_CACHE.unshift({name: it.name, lat: it.lat, lon: it.lon});
 if(ADR_CACHE.length > 500) ADR_CACHE.pop();
 localStorage.setItem("ADR_CACHE", JSON.stringify(ADR_CACHE));
}
const YKEY='a197b5c2-1e4f-480d-abab-9ab7bd63b447';
async function yan(q){
 try{
  const r=await fetch('https://geocode-maps.yandex.ru/1.x/?format=json&results=5&lang=ru_RU&rspn=1&bbox=43.4,38.8~46.7,41.3&apikey='+YKEY+'&geocode='+encodeURIComponent(q));
  if(!r.ok){const a=new Array();a.err=(r.status===403||r.status===429)?'limit':'srv';return a}
  const j=await r.json();
  return j.response.GeoObjectCollection.featureMember.map(m=>{
   const g=m.GeoObject,md=g.metaDataProperty.GeocoderMetaData;
   const p=g.Point.pos.split(' ');
   return{name:md.text.replace(/^Армения, /,'')+(md.precision==='exact'?'':' 📍'),lat:+p[1],lon:+p[0],exact:md.precision==='exact'};
  });
 }catch(e){const a=new Array();a.err=navigator.onLine===false?'off':'net';return a}
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
function choose(it){
 saveAdrCache(it);window.toast&&toast('Адрес добавлен');
 P.push({name:it.name,lat:it.lat,lon:it.lon});
 document.getElementById('a').value='';
 showList([]);
 document.getElementById('s').textContent='';
 save();
}
window.add=async function(){
 const s=document.getElementById('s');
 const q=document.getElementById('a').value.trim();
 if(!q)return;
 s.textContent='Ищу адрес в Яндексе...';
 const l=await yan(q);
 if(!l.length){const E=l.err,m=E==='off'?'Нет интернета. Проверьте сеть и повторите':E==='net'?'Не удалось связаться с Яндексом. Проверьте сеть':E==='limit'?'Яндекс отклонил запрос (лимит или ключ API)':E==='srv'?'Яндекс временно не отвечает. Попробуйте позже':'Адрес не найден. Попробуйте написать иначе или добавьте город';s.textContent=m;window.toast&&toast(m,'err');return}
 if(l.length===1&&l[0].exact){choose(l[0]);return}
 s.textContent='';
 showList(l,'Выберите нужный вариант:');
};

let _liveSearch;
document.getElementById("a").addEventListener("input", function(){
 clearTimeout(_liveSearch);
 const q = this.value.trim();
 if(q.length < 2){ showList(new Array()); return; }
 _liveSearch = setTimeout(async function(){
  const ql = q.toLowerCase();
  const cached = ADR_CACHE.filter(x => x.name.toLowerCase().includes(ql));
  if(cached.length > 0 && document.getElementById("a").value.trim() === q){
   showList(cached.slice(0, 5), "Из сохранённых адресов:");
  }
  if(cached.length >= 3) return;
  const l = await yan(q);
  const merged = cached.concat(l.filter(x => !cached.some(c => c.name === x.name))).slice(0, 5);
  if(document.getElementById("a").value.trim() === q){
   showList(merged, merged.length ? "Выберите нужный вариант:" : "");
  }
 }, 400);
});
