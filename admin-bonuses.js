// EuroBaza Admin · Bonuses: расчёты по экипажам, редактор накладных OCR, пересчёт и сводка
(function(Adm){
 'use strict';
 if (!Adm || !Adm.auth) return;
  const {
    S, g, esc, CUR, TTL, admLoc, trAdm, fm, money, MN, EB_CAT, RU, nm, CAT_ICO_MAP,
    monthName, verFmt, ago, devName, devInfo, auth, db,
    DEFAULT_CREWS, CREW_OFF, CREW_OFF_LBL, WD_SHORT,
    isValidCrewCode, syncCrewsFromLabels, getCrewsConfigList, saveCrewsConfig,
    getCrewDefOff, getCrewOff, getCrewOffLbl, getCarsList,
    SUB_LOG_SEEN_KEY, subLogSeen, subLogUnread, updSubLogBdg, markSubLogSeen, logSubAct,
    OCR_CAT_NAMES, SUB_EMAIL, isSubAdm, admRawName, admTag,
    admVib, toast, showErr, denied,
    parseDev, accByUid, profName, dispName, dispHtml, devs, aggMonths,
    downloadCsv, exportCrewMonthCsv, exportCarDetailCsv, copyReport, detail,
    openDialog, ask, askInput
  } = Adm;
const CAR_CATALOG=EB_CAT.CAR_CATALOG||[];
function parseCar(code){
 const raw=(S.CARS&&S.CARS[code])||{},qmap=raw.qty||{},hist=raw.hist||{};let sum=0,qty=0;const rows=[];
 CAR_CATALOG.forEach(c=>{const items=[];let cs=0;c.subs.forEach(x=>{const k1=c.pk+"_"+x.sk,k2=k1+"_2",q1=+qmap[k1]||0,q2=x.one?0:(+qmap[k2]||0),parts=[];if(q1>0)parts.push({l:x.one?"":"Город",n:q1,p:x.p1,v:q1*x.p1});if(q2>0)parts.push({l:"Район",n:q2,p:x.p2,v:q2*x.p2});if(parts.length){items.push({name:x.name,parts});parts.forEach(z=>{cs+=z.v;qty+=z.n})}});if(items.length){rows.push({name:c.name,sum:cs,items});sum+=cs}});
 const crew=devs().filter(d=>String(d.u.car||"").toUpperCase()===code).map(d=>dispName(d));
 return{code,sum,qty,rows,hist,crew,t:+raw.t||0};
}
const allCars=()=>getCarsList().map(parseCar);
function aggCarMonths(list){
 const map={};list.forEach(c=>Object.keys(c.hist).forEach(k=>{const h=c.hist[k];if(!h)return;const m=h.m||"",x=map[m]||(map[m]={m,sum:0,qty:0,byCar:{}});const sv=+h.sum||0,qv=+h.qty||0;x.sum+=sv;x.qty+=qv;const bc=x.byCar[c.code]||(x.byCar[c.code]={code:c.code,name:"Экипаж "+c.code,crew:c.crew,sum:0,qty:0});bc.sum+=sv;bc.qty+=qv}));
 return Object.keys(map).map(k=>{const x=map[k];x.cars=Object.keys(x.byCar).map(id=>x.byCar[id]).sort((a,b)=>b.sum-a.sum);return x}).sort((a,b)=>a.m<b.m?1:a.m>b.m?-1:0);
}

const ADM_COLOR_STOP_RX=/(?:^|[\s_\/-]+)(?:դուբ|կրաֆտ|սանոմա|սոնոմա|վենգե|սպիտակ|սեվ|սև|գրաֆիտ|մոխրագույն|շագանակագույն|բեժ|կրեմ|կրեմագույն|շիմո|լայթ|դարկ|գոլդ|ոսկեգույն|անտրացիտ|կաշմիր|կապուչինո|բետոն|մարմար|փայլուն|մատ|գլյանց|սիլվեր|արծաթագույն|պողպատե|կաղնի|ընկույզ|օրեխ|յասեն|բալ|վարդագույն|կապույտ|կանաչ|դեղին|կարմիր|բորդո|մետաքս|շոկոլադ|լոֆթ|дуб|крафт|сонома|венге|белый|бел|черный|графит|серый|беж|крем|шимо|лайт|дарк|голд|антрацит|кашмир|капучино|бетон|мрамор|глянец|мат|орех|ясень|шоколад)(?=$|[\s_\/-]+)/gi;
const admNormText=s=>String(s||'').toLowerCase().replace(/և|եւ/g,'եվ').replace(/ё/g,'е').replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim();
const admNormModel=s=>admNormText(s).replace(/[\"'«»().,]/g,' ').replace(/\s+/g,' ').trim();
const admFbKey=k=>admNormModel(k).replace(/[.#$\[\]\/]+/g,'_').slice(0,120);
const admStripColors=s=>admNormModel(s).replace(ADM_COLOR_STOP_RX,' ').replace(/\s+/g,' ').trim();
const admOcrFold=s=>admNormModel(s).replace(/ռ/g,'ր').replace(/թ/g,'տ').replace(/փ/g,'պ').replace(/ք/g,'կ').replace(/օ/g,'ո').replace(/է/g,'ե').replace(/[ձծ]/g,'ց').replace(/ղ/g,'դ');
function admNormDocItems(v){
 const arr=Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
 return arr.filter(x=>x&&typeof x==='object'&&x.c&&(+x.q||0)>0).map(x=>({n:String(x.n||'').trim().slice(0,120),c:String(x.c),q:Math.max(1,Math.round(+x.q||1))}));
}
function admFindCatSub(baseCode){
 const idx=String(baseCode||'').indexOf('_');if(idx<0)return null;
 const pk=baseCode.slice(0,idx),sk=baseCode.slice(idx+1);
 const c=CAR_CATALOG.find(x=>x.pk===pk),s=c&&c.subs.find(x=>x.sk===sk);
 return (c&&s)?{c,s}:null;
}
function admDocItemKey(baseCode,z){
 const f=admFindCatSub(baseCode);
 if(!f)return String(baseCode||'');
 return (!f.s.one&&z===2)?(baseCode+'_2'):baseCode;
}
function admCalcDoc(items,z){
 const p={},clean=[];let sum=0,qty=0;
 (items||[]).forEach(it=>{
  const f=admFindCatSub(it.c),q=Math.max(0,Math.round(+it.q||0));
  if(!f||q<1)return;
  const k=(!f.s.one&&z===2)?(it.c+'_2'):it.c;
  const pr=f.s.one?(+f.s.p1||0):(z===2?(+f.s.p2||0):(+f.s.p1||0));
  p[k]=(p[k]||0)+q;
  sum+=pr*q;qty+=q;
  clean.push({n:String(it.n||'').trim().slice(0,120),c:it.c,q});
 });
 return{p,sum,qty,items:clean};
}
function admLookupRuleCode(itemName,mapObj){
 const fk=admFbKey(itemName);
 if(!fk||!mapObj||typeof mapObj!=='object')return'';
 if(mapObj[fk]&&admFindCatSub(mapObj[fk]))return mapObj[fk];
 const sc=admStripColors(itemName),fc=sc?admOcrFold(sc):'';
 let foldHit='';
 for(const k in mapObj){
  const cd=mapObj[k];if(!cd||!admFindCatSub(cd))continue;
  if(admFbKey(k.replace(/_/g,' '))===fk)return cd;
  if(sc.length>=4){
   const ksc=admStripColors(k.replace(/_/g,' '));
   if(ksc.length>=4){
    if(ksc===sc)return cd;
    if(!foldHit&&admOcrFold(ksc)===fc)foldHit=cd;
   }
  }
 }
 return foldHit;
}
function admDocKeyInfo(k){
 const is2=String(k||'').endsWith('_2'),base=is2?String(k).slice(0,-2):String(k||'');
 const f=admFindCatSub(base);
 if(!f)return{label:k,price:0};
 const zn=f.s.one?'':(is2?' (Район)':' (Город)');
 return{label:nm(f.c.name)+' · '+nm(f.s.name)+zn,price:is2?(+f.s.p2||0):(+f.s.p1||0)};
}
function admPickCategory(curCode,subtitle,noI18n){
 return new Promise(resolve=>{
  const CAT_ICO=CAT_ICO_MAP;
  const allItems=Object.keys(OCR_CAT_NAMES).map(cd=>{
   const parts=OCR_CAT_NAMES[cd].split(' · ');
   return{cd,cat:parts[0]||'Другое',name:parts[1]||OCR_CAT_NAMES[cd]};
  });
  const catsList=Array.from(new Set(allItems.map(x=>x.cat)));
  const curObj=allItems.find(x=>x.cd===curCode);
  let selCat=curObj?curObj.cat:'all',q='',done=false;
  const ov=document.createElement('div');
  ov.className='ov';ov.style.zIndex='100002';
  ov.innerHTML='<div class="dlg aop-box" style="max-width:430px;height:min(85dvh,580px)">'
   +'<div class="aop-hd"><div><b>Выберите категорию</b>'+(subtitle?'<small'+(noI18n?' data-no-i18n="1"':'')+'>'+esc(subtitle)+'</small>':'')+'</div><button type="button" class="sel-x">✕</button></div>'
   +'<div class="aop-srch"><input id="adpInp" type="search" placeholder="🔍 Быстрый поиск мебели..."></div>'
   +'<div class="aop-chips" id="adpChips"><button type="button" data-c="all" class="'+(selCat==='all'?'on':'')+'">Все</button>'
   +catsList.map(c=>'<button type="button" data-c="'+esc(c)+'" class="'+(selCat===c?'on':'')+'">'+(CAT_ICO[c]||'📦')+' '+esc(c)+'</button>').join('')
   +'</div><div class="aop-list" id="adpList"></div></div>';
  document.body.appendChild(ov);
  const finish=val=>{if(done)return;done=true;ov.classList.remove('show');setTimeout(()=>ov.remove(),180);resolve(val)};
  ov.querySelector('.sel-x').onclick=()=>finish(null);
  ov.onclick=e=>{if(e.target===ov)finish(null)};
  const drawItems=()=>{
   const box=ov.querySelector('#adpList');
   const qTokens=Adm.ocrNorm(q).split(' ').filter(Boolean);
   const list=allItems.filter(it=>{
    if(selCat!=='all'&&it.cat!==selCat)return false;
    if(!qTokens.length)return true;
    const grp=(it.cd||'').split('_')[0];
    const hay=Adm.ocrNorm(it.name+' '+it.cat+' '+(Adm.OCR_HY_KW[grp]||''));
    return qTokens.every(t=>hay.includes(t));
   });
   if(!list.length){box.innerHTML='<div class="mut" style="text-align:center;padding:20px">Ничего не найдено</div>';return}
   box.innerHTML=list.map(it=>{
    const on=it.cd===curCode;
    return '<button type="button" class="aop-it'+(on?' on':'')+'" data-cd="'+it.cd+'"><span>'+(CAT_ICO[it.cat]||'📦')+'</span><span class="aop-tx"><b>'+esc(it.name)+'</b><small>'+esc(it.cat)+'</small></span><span class="sel-chk">'+(on?'✓':'')+'</span></button>';
   }).join('');
  };
  ov.querySelector('#adpChips').onclick=e=>{
   const b=e.target.closest('button[data-c]');if(!b)return;
   selCat=b.dataset.c;
   ov.querySelectorAll('#adpChips button').forEach(x=>x.classList.toggle('on',x===b));
   drawItems();
  };
  ov.querySelector('#adpInp').oninput=e=>{q=e.target.value.trim().toLowerCase();drawItems()};
  ov.querySelector('#adpList').onclick=e=>{
   const it=e.target.closest('button[data-cd]');if(!it)return;
   finish(it.dataset.cd);
  };
  drawItems();
  requestAnimationFrame(()=>ov.classList.add('show'));
 });
}
async function openAdmDocEditModal(code,dk){
 if(isSubAdm()){toast('Редактирование доступно только главному админу',true);return}
 const orig=S.CARS[code]&&S.CARS[code].docs&&S.CARS[code].docs[dk];
 if(!orig){toast('Запись уже удалена',true);return}
 if(orig.type==='manual'){toast('Ручные правки можно только отменить',true);return}
 const origIt=admNormDocItems(orig.it),hadItems=origIt.length>0;
 let curZ=(orig.z===1||orig.z===2)?orig.z:(orig.p&&Object.keys(orig.p).some(k=>k.endsWith('_2'))?2:1);
 const rows=hadItems
  ?origIt.map(it=>({n:it.n,c:it.c,q:it.q,origC:it.c}))
  :Object.keys(orig.p||{}).filter(k=>(+orig.p[k]||0)>0).map(k=>{
   const base=k.endsWith('_2')?k.slice(0,-2):k;
   return{n:'',c:base,q:Math.max(1,Math.round(+orig.p[k]||1)),origC:base};
  });
 const origSum=+orig.sum||0,origQty=+orig.qty||0;
 let saveToOcr=true;
 const ov=document.createElement('div');
 ov.className='ov';ov.style.zIndex='100000';
 ov.innerHTML='<div class="dlg aop-box" style="max-width:450px;height:min(90dvh,650px)">'
  +'<div class="aop-hd"><div><b>✏️ Редактирование накладной</b><small>№ <span data-no-i18n="1">'+esc(orig.doc||'\u2014')+'</span> · <span data-no-i18n="1">'+esc(code)+'</span> · '+(orig.by?'<span data-no-i18n="1">'+esc(orig.by)+'</span>':'<span>Водитель</span>')+'</small></div><button type="button" class="sel-x">✕</button></div>'
  +'<div class="ade-zone"><button type="button" class="ade-zbtn" data-z="1">🏙️ Город</button><button type="button" class="ade-zbtn" data-z="2">🗺️ Район</button></div>'
  +'<div class="ade-list" id="adeList"></div>'
  +'<label class="ade-chk" id="adeOcrWrap" hidden><input type="checkbox" id="adeOcrChk" checked><span>Сохранить изменения в словарь OCR для будущих накладных</span></label>'
  +'<div class="ade-sum" id="adeSum"></div>'
  +'<div class="ade-ft"><button type="button" id="adeCancel" style="flex:1;height:40px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer">Отмена</button><button type="button" id="adeSave" style="flex:1.4;height:40px;border-radius:11px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.35)">✓ Сохранить</button></div></div>';
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
 ov.querySelector('.sel-x').onclick=close;
 ov.querySelector('#adeCancel').onclick=close;
 ov.onclick=e=>{if(e.target===ov)close()};
 const render=()=>{
  ov.querySelectorAll('.ade-zbtn').forEach(b=>b.classList.toggle('on',+b.dataset.z===curZ));
  const box=ov.querySelector('#adeList');
  const html=rows.map((r,idx)=>{
   const k=admDocItemKey(r.c,curZ),inf=admDocKeyInfo(k),lineSum=inf.price*r.q;
   const chg=r.origC&&r.c!==r.origC;
   const nmEl=r.n?'<div class="ade-rnm" data-no-i18n="1">'+esc(r.n)+'</div>':'<div class="ade-rnm mut">Позиция без названия</div>';
   return '<div class="ade-row'+(chg?' chg':'')+'">'
    +'<div class="ade-rtop">'+nmEl+'<button type="button" class="ade-rdel" data-del="'+idx+'" title="Удалить позицию">✕</button></div>'
    +'<button type="button" class="ade-cat" data-cat="'+idx+'"><span>'+esc(OCR_CAT_NAMES[r.c]||inf.label)+'</span><span>▾</span></button>'
    +'<div class="ade-rbot"><div class="ade-qty"><button type="button" class="ade-qb" data-dec="'+idx+'">−</button><span class="ade-qv">'+r.q+'</span><button type="button" class="ade-qb" data-inc="'+idx+'">+</button></div><span class="ade-rsum">'+fm(lineSum)+' '+CUR+'</span></div></div>';
  }).join('');
  box.innerHTML=html+'<button type="button" class="ade-add" id="adeAdd">+ Добавить позицию</button>';
  const hasOcrDiff=rows.some(r=>r.n&&r.c&&r.origC&&r.c!==r.origC);
  const ow=ov.querySelector('#adeOcrWrap');if(ow)ow.hidden=!hasOcrDiff;
  const calc=admCalcDoc(rows,curZ),diff=calc.sum-origSum;
  const diffTxt=diff===0?'<span style="color:#94a3b8">без изменений</span>':('<b style="color:'+(diff>0?'#6ee7b7':'#fca5a5')+'">'+(diff>0?'+':'')+fm(diff)+' '+CUR+'</b>');
  ov.querySelector('#adeSum').innerHTML='<span><span>Было</span>: <b>'+fm(origQty)+' шт · '+fm(origSum)+' '+CUR+'</b></span><span><span>Станет</span>: <b>'+fm(calc.qty)+' шт · '+fm(calc.sum)+' '+CUR+'</b> ('+diffTxt+')</span>';
 };
 ov.querySelector('.ade-zone').onclick=e=>{
  const b=e.target.closest('.ade-zbtn');if(!b)return;
  curZ=+b.dataset.z===2?2:1;render();
 };
 ov.querySelector('#adeOcrChk').onchange=e=>{saveToOcr=!!e.target.checked};
 ov.querySelector('#adeList').onclick=async e=>{
  const addB=e.target.closest('#adeAdd');
  if(addB){
   const picked=await admPickCategory('','Новая позиция',false);
   if(picked){rows.push({n:'',c:picked,q:1,origC:''});render()}
   return;
  }
  const catB=e.target.closest('[data-cat]');
  if(catB){
   const i=+catB.dataset.cat,r=rows[i];if(!r)return;
   const picked=await admPickCategory(r.c,r.n||'',true);
   if(picked){r.c=picked;render()}
   return;
  }
  const incB=e.target.closest('[data-inc]');
  if(incB){const r=rows[+incB.dataset.inc];if(r){r.q=Math.min(999,r.q+1);render()}return}
  const decB=e.target.closest('[data-dec]');
  if(decB){const r=rows[+decB.dataset.dec];if(r&&r.q>1){r.q--;render()}return}
  const delB=e.target.closest('[data-del]');
  if(delB){rows.splice(+delB.dataset.del,1);render();return}
 };
 ov.querySelector('#adeSave').onclick=async()=>{
  if(isSubAdm())return;
  const calc=admCalcDoc(rows,curZ);
  if(!calc.items.length){toast('Добавьте хотя бы одну позицию или отмените накладную',true);return}
  const btn=ov.querySelector('#adeSave');btn.disabled=true;
  try{
   const docRef=db.ref('cars/'+code+'/docs/'+dk);
   const pre=(await docRef.once('value')).val();
   if(!pre||pre.type==='manual'){close();toast('Запись уже удалена',true);return}
   let prevP=null,nextDoc=null;
   const tr=await docRef.transaction(fresh=>{
    if(!fresh||fresh.type==='manual')return;
    prevP=(fresh.p&&typeof fresh.p==='object')?Object.assign({},fresh.p):{};
    nextDoc={doc:fresh.doc||'\u2014',by:fresh.by||'Водитель',t:fresh.t||Date.now(),sum:calc.sum,qty:calc.qty,z:curZ,p:calc.p,ed:Date.now()};
    if(fresh.rep)nextDoc.rep=fresh.rep;
    if(hadItems||calc.items.some(it=>it.n))nextDoc.it=calc.items;
    return nextDoc;
   });
   if(!tr.committed||!nextDoc){close();toast('Запись уже удалена',true);return}
   const oldP=prevP||{};
   const delta={};
   const allK=new Set([...Object.keys(oldP),...Object.keys(calc.p)]);
   let hasDelta=false;
   allK.forEach(k=>{const d=(+calc.p[k]||0)-(+oldP[k]||0);if(d!==0){delta[k]=d;hasDelta=true}});
   let qtyTr=null;
   if(hasDelta){
    qtyTr=await db.ref('cars/'+code+'/qty').transaction(cur=>{
     const next=(cur&&typeof cur==='object')?Object.assign({},cur):{};
     Object.keys(delta).forEach(k=>{
      const nv=Math.max(0,(+next[k]||0)+delta[k]);
      if(nv>0)next[k]=nv;else delete next[k];
     });
     return next;
    });
   }
   await db.ref('cars/'+code+'/t').set(Date.now());
   if(S.CARS[code]){
    if(!S.CARS[code].docs)S.CARS[code].docs={};
    S.CARS[code].docs[dk]=nextDoc;
    if(qtyTr&&qtyTr.snapshot)S.CARS[code].qty=qtyTr.snapshot.val()||{};
   }
   const savedRules=[];
   if(saveToOcr){
    const seenFk=new Set();
    for(const r of rows){
     if(r.n&&r.c&&r.origC&&r.c!==r.origC){
      const fk=admFbKey(r.n);
      if(fk&&!seenFk.has(fk)){
       seenFk.add(fk);
       await db.ref('config/ocrMap/'+fk).set(r.c);
       savedRules.push({key:fk,code:r.c});
      }
     }
    }
   }
   close();
   const sumOv=g('admSumOv');if(sumOv&&sumOv._refresh)sumOv._refresh();
   toast(savedRules.length?'Накладная обновлена · словарь OCR обновлён':'Накладная обновлена');
   if(savedRules.length){
    const rMap={};savedRules.forEach(x=>{rMap[x.key]=x.code});
    const plan=findAffectedDocsByRuleMap(rMap);
    if(plan.length)openRecalcModal(plan,'Найдены другие накладные с этим товаром');
   }
  }catch(err){btn.disabled=false;toast('Ошибка сохранения накладной',true)}
 };
 render();
 requestAnimationFrame(()=>ov.classList.add('show'));
}
function findAffectedDocsByRuleMap(ruleMapObj,useCodeFallback){
 if(isSubAdm())return[];
 const hasMap=ruleMapObj&&typeof ruleMapObj==='object';
 if(!hasMap&&!useCodeFallback)return[];
 const plan=[];
 getCarsList().forEach(carCode=>{
  const docs=(S.CARS[carCode]&&S.CARS[carCode].docs)||{};
  Object.keys(docs).forEach(dk=>{
   const x=docs[dk];if(!x||x.type==='manual')return;
   const items=admNormDocItems(x.it);if(!items.length)return;
   const z=(x.z===1||x.z===2)?x.z:1;
   const edits=[],newItems=[];
   items.forEach((it,idx)=>{
    const fbCode=(hasMap&&it.n)?admLookupRuleCode(it.n,ruleMapObj):'';
    let mapped=fbCode,src=fbCode?'firebase':'';
    if(!mapped&&useCodeFallback&&it.n&&typeof window.ocrClassifyByCode==='function'){
     const r=window.ocrClassifyByCode(it.n);
     if(r&&!r.ignore&&r.code&&admFindCatSub(r.code)){mapped=r.code;src='code'}
    }
    if(mapped&&mapped!==it.c){
     edits.push({idx,n:it.n,q:it.q,from:it.c,to:mapped,src});
     newItems.push({n:it.n,c:mapped,q:it.q});
    }else newItems.push(it);
   });
   if(!edits.length)return;
   const calc=admCalcDoc(newItems,z),oldSum=+x.sum||0;
   plan.push({carCode,dk,doc:x.doc||'\u2014',by:x.by||'Водитель',t:+x.t||0,z,edits,oldSum,newSum:calc.sum,diffSum:calc.sum-oldSum});
  });
 });
 return plan.sort((a,b)=>b.t-a.t);
}
function findAffectedDocsByRule(ruleKey,newCode){
 if(isSubAdm()||!ruleKey||!newCode||!admFindCatSub(newCode))return[];
 const m={};m[ruleKey]=newCode;
 return findAffectedDocsByRuleMap(m,false);
}
function findAffectedDocsByAllRules(){
 if(isSubAdm())return[];
 return findAffectedDocsByRuleMap(S.OCR_MAP,true);
}
async function applyBatchRecalc(plan){
 if(isSubAdm()||!plan||!plan.length)return 0;
 const byCar={};
 plan.forEach(p=>{(byCar[p.carCode]||(byCar[p.carCode]=[])).push(p)});
 let updatedCount=0;
 for(const carCode of Object.keys(byCar)){
  const carDelta={},docUpdates={};
  for(const item of byCar[carCode]){
   const docRef=db.ref('cars/'+carCode+'/docs/'+item.dk);
   const pre=(await docRef.once('value')).val();
   if(!pre||pre.type==='manual')continue;
   let prevP=null,nextDoc=null,newP=null;
   const tr=await docRef.transaction(fresh=>{
    if(!fresh||fresh.type==='manual')return;
    const curItems=admNormDocItems(fresh.it);if(!curItems.length)return;
    const z=(fresh.z===1||fresh.z===2)?fresh.z:1;
    let changed=false;
    const nextItems=curItems.map(it=>{
     const hit=item.edits.find(e=>e.n===it.n&&e.from===it.c);
     if(hit){changed=true;return{n:it.n,c:hit.to,q:it.q}}
     return it;
    });
    if(!changed)return;
    const calc=admCalcDoc(nextItems,z);
    prevP=(fresh.p&&typeof fresh.p==='object')?Object.assign({},fresh.p):{};
    newP=calc.p;
    nextDoc={doc:fresh.doc||'\u2014',by:fresh.by||'Водитель',t:fresh.t||Date.now(),sum:calc.sum,qty:calc.qty,z,p:calc.p,it:calc.items,ed:Date.now()};
    if(fresh.rep)nextDoc.rep=fresh.rep;
    return nextDoc;
   });
   if(!tr.committed||!nextDoc)continue;
   const oldP=prevP||{};
   const allK=new Set([...Object.keys(oldP),...Object.keys(newP||{})]);
   allK.forEach(k=>{const d=(+(newP&&newP[k])||0)-(+oldP[k]||0);if(d!==0)carDelta[k]=(carDelta[k]||0)+d});
   docUpdates[item.dk]=nextDoc;
   updatedCount++;
  }
  const dkList=Object.keys(docUpdates);
  if(!dkList.length)continue;
  const hasDelta=Object.keys(carDelta).some(k=>carDelta[k]!==0);
  let qtyTr=null;
  if(hasDelta){
   qtyTr=await db.ref('cars/'+carCode+'/qty').transaction(cur=>{
    const next=(cur&&typeof cur==='object')?Object.assign({},cur):{};
    Object.keys(carDelta).forEach(k=>{
     if(!carDelta[k])return;
     const nv=Math.max(0,(+next[k]||0)+carDelta[k]);
     if(nv>0)next[k]=nv;else delete next[k];
    });
    return next;
   });
  }
  await db.ref('cars/'+carCode+'/t').set(Date.now());
  if(S.CARS[carCode]){
   if(!S.CARS[carCode].docs)S.CARS[carCode].docs={};
   dkList.forEach(dk=>{S.CARS[carCode].docs[dk]=docUpdates[dk]});
   if(qtyTr&&qtyTr.snapshot)S.CARS[carCode].qty=qtyTr.snapshot.val()||{};
  }
 }
 const sumOv=g('admSumOv');if(sumOv&&sumOv._refresh)sumOv._refresh();
 return updatedCount;
}
function openRecalcModal(plan,subtitle){
 if(isSubAdm()||!plan||!plan.length)return;
 const picked=plan.map(()=>true);
 const ov=document.createElement('div');
 ov.className='ov';ov.style.zIndex='100001';
 const listHtml=plan.map((p,i)=>{
  const dCol=p.diffSum>0?'#6ee7b7':(p.diffSum<0?'#fca5a5':'#94a3b8');
  const dTxt=(p.diffSum>0?'+':'')+fm(p.diffSum)+' '+CUR;
  const lns=p.edits.map(e=>{
   const bdg=e.src==='code'?'<span class="arc-src cd">⚙️ <span>Код</span></span>':(e.src==='firebase'?'<span class="arc-src fb">☁️ <span>Словарь</span></span>':'');
   return '<div class="arc-ln"><div style="color:#f8fafc;font-weight:600"><span data-no-i18n="1">'+esc(e.n)+' ×'+e.q+'</span>'+bdg+'</div><div><span style="color:#fca5a5">'+esc(OCR_CAT_NAMES[e.from]||e.from)+'</span> → <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[e.to]||e.to)+'</b></div></div>';
  }).join('');
  return '<div class="arc-it" data-arc-card="'+i+'"><div class="arc-hd"><label class="arc-lbl"><input type="checkbox" data-arc-idx="'+i+'" checked><span class="arc-car" data-no-i18n="1">'+esc(p.carCode)+'</span><span>🧾 № <span data-no-i18n="1">'+esc(p.doc)+'</span></span></label><b style="color:'+dCol+'">'+dTxt+'</b></div>'+lns+'</div>';
 }).join('');
 ov.innerHTML='<div class="dlg aop-box" style="max-width:460px;height:min(86dvh,620px)">'
  +'<div class="aop-hd"><div><b>🔄 <span>Пересчёт накладных</span> (<span id="arcHdCnt" data-no-i18n="1">'+plan.length+'</span>)</b><small>'+esc(subtitle||'Обновление уже сохранённых накладных текущего месяца')+'</small></div><button type="button" class="sel-x">✕</button></div>'
  +'<div class="ade-list" id="arcList">'+listHtml+'</div>'
  +'<div class="ade-sum" id="arcSum"></div>'
  +'<div class="ade-ft"><button type="button" id="arcNo" style="flex:1;height:40px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer">Не менять</button><button type="button" id="arcGo" style="flex:1.4;height:40px;border-radius:11px;background:linear-gradient(135deg,#0ea5e9,#0284c7);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(14,165,233,.35)">🔄 <span>Пересчитать</span> (<span id="arcBtnCnt" data-no-i18n="1">'+plan.length+'</span>)</button></div></div>';
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove('show');setTimeout(()=>ov.remove(),180)};
 const syncSum=()=>{
  const sel=plan.filter((_,i)=>picked[i]);
  const totDiff=sel.reduce((a,x)=>a+x.diffSum,0);
  const totCol=totDiff>0?'#6ee7b7':(totDiff<0?'#fca5a5':'#94a3b8');
  ov.querySelector('#arcSum').innerHTML='<span><span>Накладных</span>: <b data-no-i18n="1">'+sel.length+' / '+plan.length+'</b></span><span><span>Итого разница</span>: <b style="color:'+totCol+'">'+(totDiff>0?'+':'')+fm(totDiff)+' '+CUR+'</b></span>';
  const bc=ov.querySelector('#arcBtnCnt');if(bc)bc.textContent=String(sel.length);
  const btn=ov.querySelector('#arcGo');if(btn)btn.disabled=sel.length===0;
 };
 ov.querySelector('#arcList').onchange=e=>{
  const cb=e.target.closest('[data-arc-idx]');if(!cb)return;
  const i=+cb.dataset.arcIdx;picked[i]=!!cb.checked;
  const card=ov.querySelector('[data-arc-card="'+i+'"]');if(card)card.classList.toggle('off',!picked[i]);
  syncSum();
 };
 ov.querySelector('.sel-x').onclick=close;
 ov.querySelector('#arcNo').onclick=close;
 ov.onclick=e=>{if(e.target===ov)close()};
 ov.querySelector('#arcGo').onclick=async()=>{
  const sel=plan.filter((_,i)=>picked[i]);
  if(!sel.length){toast('Выберите хотя бы одну накладную',true);return}
  const btn=ov.querySelector('#arcGo');btn.disabled=true;
  try{
   const cnt=await applyBatchRecalc(sel);
   close();
   toast('Пересчитано накладных: '+cnt);
  }catch(err){btn.disabled=false;toast('Ошибка пересчёта накладных',true)}
 };
 syncSum();
 requestAnimationFrame(()=>ov.classList.add('show'));
}
async function cancelAdmDoc(code,dk,btn){
 if(isSubAdm()){toast('Удаление доступно только главному админу',true);return}
 const x=S.CARS[code]&&S.CARS[code].docs&&S.CARS[code].docs[dk];
 if(!x){toast('Запись уже удалена',true);return}
 const isMan=x.type==='manual';
 const hp=x.p&&typeof x.p==='object'&&Object.keys(x.p).length>0;
 const lbl=isMan?('ручное изменение от «'+(x.by||'Водитель')+'»'):('накладную № '+(x.doc||'\u2014'));
 const m=hp?('Отменить '+lbl+' ('+fm(+x.qty||0)+' шт · '+fm(+x.sum||0)+' '+CUR+')?\n\nПозиции будут откачены в итогах экипажа '+code+'.'):('Удалить запись ('+lbl+') из истории?\n\nДля старой записи состав не сохранён — удалится только запись.');
 if(!(await ask(m,{title:isMan?'Отмена изменения':'Отмена накладной',okText:'Отменить',danger:true})))return;
 if(btn)btn.disabled=true;
 try{
  const docRef=db.ref('cars/'+code+'/docs/'+dk);
  const pre=(await docRef.once('value')).val();
  if(!pre){toast('Запись уже удалена',true);return}
  let removedP=null;
  const tr=await docRef.transaction(cur=>{
   if(!cur)return;
   removedP=(cur.p&&typeof cur.p==='object')?Object.assign({},cur.p):null;
   return null;
  });
  if(!tr.committed){toast('Запись уже удалена',true);return}
  const pToSub=removedP||(hp?x.p:null);
  if(pToSub&&Object.keys(pToSub).length){
   const qtyTr=await db.ref('cars/'+code+'/qty').transaction(cur=>{
    const next=(cur&&typeof cur==='object')?Object.assign({},cur):{};
    Object.keys(pToSub).forEach(k=>{
     const nv=Math.max(0,(+next[k]||0)-(+pToSub[k]||0));
     if(nv>0)next[k]=nv;else delete next[k];
    });
    return next;
   });
   if(S.CARS[code]&&qtyTr&&qtyTr.snapshot)S.CARS[code].qty=qtyTr.snapshot.val()||{};
  }
  if(S.CARS[code]&&S.CARS[code].docs)delete S.CARS[code].docs[dk];
  await db.ref('cars/'+code+'/t').set(Date.now());
  const ov=g('admSumOv');if(ov&&ov._refresh)ov._refresh();else openAdmSumModal(code,'cur',true);toast(isMan?'Изменение отменено':'Накладная отменена');
 }catch(e){if(btn)btn.disabled=false;toast('Ошибка отмены',true)}
}
function openAdmSumModal(code,subKey,openDocs){
 if(!getCarsList().includes(code))return;const old=g("admSumOv");if(old)old.remove();
 const c=parseCar(code),isCur=subKey==="cur",rec=isCur?null:c.hist[subKey];if(!isCur&&!rec)return;
 const title=isCur?"Текущий месяц":monthName(rec.m||subKey),sub=isCur?"не сохранён":("сохранено "+ago(rec.t));
 let docQ="";
 const build=(op)=>{
  const c=parseCar(code);
   const rows=isCur?c.rows:(rec.rows||[]),totS=isCur?c.sum:(+rec.sum||0),totQ=isCur?c.qty:(+rec.qty||0);
 const dObj=(S.CARS[code]&&S.CARS[code].docs)||{},dList=isCur?Object.keys(dObj).map(k=>dObj[k]?Object.assign({_k:k},dObj[k]):null).filter(Boolean).sort((a,b)=>(+b.t||0)-(+a.t||0)):[];
 const dTotS=dList.reduce((a,x)=>a+(+x.sum||0),0),dTotQ=dList.reduce((a,x)=>a+(+x.qty||0),0);
 const canDel=!isSubAdm();
 const docsHtml=(isCur&&dList.length)?'<div class="sum-cat'+(op?' open':'')+'" data-docs-cat="1"><div class="sum-cat-h" data-atog="1"><div class="sum-cat-l"><span class="sum-chv">'+(op?'▾':'\u25b8')+'</span><div><div class="sum-cat-n">📜 История изменений</div><div class="sum-cat-s">Записей: '+dList.length+(dTotQ?' · '+fm(dTotQ)+' шт':'')+'</div></div></div><div class="sum-cat-r">'+(dTotS?fm(dTotS)+' '+CUR:dList.length+' шт')+'</div></div><div class="sum-cat-b">'
  +(dList.length>2?'<input class="sum-srch" data-docsrch="1" type="search" value="'+esc(docQ)+'" placeholder="🔍 Поиск по номеру, водителю или товару..." style="margin:6px 0 8px!important">':'')
  +dList.map(x=>{
  const isMan=x.type==='manual';
  const dd=x.t?new Date(x.t):null,tm=dd?(dd.toLocaleDateString(admLoc(),{day:'2-digit',month:'2-digit'})+' '+String(dd.getHours()).padStart(2,'0')+':'+String(dd.getMinutes()).padStart(2,'0')):'';
  const zn=!isMan?(x.z===1?'Город':(x.z===2?'Район':'')):'';
  const rp=(!isMan&&x.rep>1)?' <span class="sum-doc-rep">\u{1f501} Повтор'+(x.rep>2?' \u00d7'+x.rep:'')+'</span>':'';
  const edBdg=(!isMan&&x.ed)?' <span class="sum-doc-ed">✏️ <span>Испр.</span></span>':'';
  const qv=+x.qty||0,sv=+x.sum||0;
  const rSum=(sv||qv)?'<span class="sum-v" style="'+(sv<0?'color:#fca5a5':'')+'">'+(isMan&&sv>0?'+':'')+fm(sv)+' '+CUR+'</span>':'';
  const hdTitle=isMan?'✏️ Вручную':('🧾 № <span data-no-i18n="1">'+esc(x.doc||'\u2014')+'</span>');
  const rawIt=!isMan?admNormDocItems(x.it):[];
  let itsHtml='',hayParts=[x.doc||'',x.by||''];
  if(rawIt.length){
   itsHtml='<div class="sum-doc-its">'+rawIt.map(it=>{
    const k=admDocItemKey(it.c,x.z),inf=admDocKeyInfo(k),dv=it.q*inf.price;
    hayParts.push(it.n,inf.label);
    return '<div class="sum-doc-it"><div class="sum-doc-it-l">'+(it.n?'<div class="sum-doc-it-nm" data-no-i18n="1">'+esc(it.n)+'</div>':'')+'<div class="sum-doc-it-ct">'+esc(inf.label)+'</div></div><b style="color:#6ee7b7">+'+fm(it.q)+' шт'+(dv?' ('+fm(dv)+' '+CUR+')':'')+'</b></div>';
   }).join('')+'</div>';
  }else if(x.p&&typeof x.p==='object'&&Object.keys(x.p).length){
   itsHtml='<div class="sum-doc-its">'+Object.keys(x.p).map(k=>{
    const dn=+x.p[k]||0,inf=admDocKeyInfo(k),dv=dn*inf.price;
    const col=dn<0?'#fca5a5':'#6ee7b7';
    hayParts.push(inf.label);
    return '<div class="sum-doc-it"><span>'+esc(inf.label)+'</span><b style="color:'+col+'">'+(dn>0?'+':'')+fm(dn)+' шт'+(dv?' ('+fm(dv)+' '+CUR+')':'')+'</b></div>';
   }).join('')+'</div>';
  }
  const canEdit=canDel&&!isMan&&(rawIt.length>0||(x.p&&Object.keys(x.p).length>0));
  const editBtnHtml=canEdit?'<button type="button" class="sum-doc-edit" data-doc-edit="'+esc(x._k)+'" title="Изменить накладную"><span style="font-size:12px">✏️</span> Изменить</button>':'';
  const delBtnHtml=canDel?'<button type="button" class="sum-doc-del" data-doc-del="'+esc(x._k)+'" title="Отменить запись"><span style="font-size:12px">🗑️</span> Отменить</button>':'';
  const btnsHtml=(editBtnHtml||delBtnHtml)?'<div class="sum-doc-btns">'+editBtnHtml+delBtnHtml+'</div>':'';
  const hay=esc(hayParts.join(' ').toLowerCase());
  return '<div class="sum-it sum-doc-card" data-doc-hay="'+hay+'"><div class="sum-doc-hd"><div class="sum-it-t" style="margin:0">'+hdTitle+(zn?' <span class="sum-doc-z">'+zn+'</span>':'')+rp+edBdg+'</div>'+rSum+'</div>'+itsHtml+'<div class="sum-doc-ft"><span class="sum-f">'+(x.by?'<span data-no-i18n="1">'+esc(x.by)+'</span>':'<span>Водитель</span>')+(tm?' · <span data-no-i18n="1">'+tm+'</span>':'')+(qv?' · <span>'+(isMan&&qv>0?'+':'')+fm(qv)+' шт</span>':'')+'</span>'+btnsHtml+'</div></div>';
 }).join('')+'<div class="mut" data-doc-empty="1" style="display:none;text-align:center;padding:12px">Ничего не найдено</div></div></div>':'';
 const headLbl=isCur?'<span>Текущий месяц</span> · <span>не сохранён</span>':('<span>'+esc(title)+'</span> · <span>сохранено</span> <span>'+esc(ago(rec.t))+'</span>');
 const head="<div class=\"sum-dash\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">"+headLbl+"</div><div class=\"sum-val\" id=\"admTotVal\">"+fm(totS)+" <span>"+CUR+"</span></div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b id=\"admTotQty\">"+fm(totQ)+"</b><span>штук</span></div><div class=\"sum-kpi\"><b id=\"admTotCat\">"+rows.length+"</b><span>катег.</span></div></div></div></div>";
  return head+docsHtml+detail(rows);
 };
 const subHdHtml=c.crew.length?('<span>Экипаж</span>: <span data-no-i18n="1">'+esc(c.crew.join(", "))+'</span>'):'<span>Экипаж не назначен</span>';
 const ov=document.createElement("div");ov.id="admSumOv";ov.className="ov";
 const delH=(!isCur&&!isSubAdm())?"<button type=\"button\" id=\"admSumDel\" class=\"ach-clr\" style=\"margin-right:6px\">🗑️ Удалить</button>":"";
 const expH="<button type=\"button\" id=\"admSumCsv\" class=\"ach-clr\" style=\"background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.4);color:#6ee7b7;margin-right:6px\">📥 Excel</button>";
 ov.innerHTML="<div class=\"dlg ach-box\" style=\"max-width:440px;height:88vh\"><div class=\"ach-hd\"><div class=\"ach-hd-l\"><div class=\"ach-hd-ic\">🚚</div><div><b>Экипаж <span data-no-i18n=\"1\">"+esc(code)+"</span></b><small>"+subHdHtml+"</small></div></div><div class=\"ach-acts\">"+expH+delH+"<button type=\"button\" id=\"admSumX\" class=\"ach-x\">✕</button></div></div><div id=\"admSumB\" class=\"ach-list\" style=\"background-image:none;padding:12px;display:block\">"+build(openDocs)+"</div></div>";
 document.body.appendChild(ov);
 const close=()=>{ov.classList.remove("show");setTimeout(()=>ov.remove(),180)};
 if(g("admSumCsv"))g("admSumCsv").onclick=()=>{
  const cNow=parseCar(code),rowsNow=isCur?cNow.rows:(rec.rows||[]),totSNow=isCur?cNow.sum:(+rec.sum||0),totQNow=isCur?cNow.qty:(+rec.qty||0);
  exportCarDetailCsv(code,title,rowsNow,totQNow,totSNow);
 };
 if(g("admSumDel"))g("admSumDel").onclick=async()=>{if(!await ask("Удалить сохранённый итог за «"+title+"» у экипажа "+code+"?",{title:"Удаление итога",okText:"Удалить",danger:true}))return;try{await db.ref("cars/"+code+"/hist/"+subKey).remove();close();toast("Итог удалён")}catch(e){toast("Ошибка удаления",true)}};
 g("admSumX").onclick=close;ov.onclick=e=>{if(e.target===ov)close()};
 const root=g("admSumB");let flt="all",q="";
 const applyDocFilter=()=>{
  const ql=docQ.trim().toLowerCase();
  let vis=0;
  root.querySelectorAll(".sum-doc-card").forEach(el=>{
   const ok=!ql||(el.dataset.docHay||"").includes(ql);
   el.style.display=ok?"":"none";
   if(ok)vis++;
  });
  const emp=root.querySelector("[data-doc-empty]");
  if(emp)emp.style.display=(ql&&vis===0)?"":"none";
 };
 const apply=()=>{
  let gS=0,gQ=0,gC=0;
  const catStats=[];
  root.querySelectorAll(".adm-sum .sum-cat").forEach(cat=>{
   let cS=0,cQ=0,vc=0;
   cat.querySelectorAll(".sum-it").forEach(it=>{
    const mn=!q||(it.dataset.name||"").includes(q);
    let vr=0;
    it.querySelectorAll(".sum-r").forEach(r=>{
     const ok=mn&&(flt==="all"||r.dataset.zone===flt);
     r.style.display=ok?"":"none";
     if(ok){
      vr++;
      cQ+=parseFloat(r.dataset.q)||0;
      cS+=parseFloat(r.dataset.v)||0;
     }
    });
    it.style.display=vr?"":"none";
    if(vr)vc++;
   });
   cat.style.display=vc?"":"none";
   if(vc){gS+=cS;gQ+=cQ;gC++;catStats.push({cat,cS,cQ})}
  });
  catStats.forEach(({cat,cS,cQ})=>{
   const rEl=cat.querySelector(".sum-cat-r");
   const sEl=cat.querySelector(".sum-cat-s");
   const pct=gS?Math.round(cS*100/gS):0;
   if(rEl)rEl.textContent=money(cS);
   if(sEl)sEl.textContent=fm(cQ)+" шт · "+pct+"% от суммы";
  });
  const vEl=g("admTotVal"),qEl=g("admTotQty"),cEl=g("admTotCat");
  if(vEl)vEl.innerHTML=fm(gS)+" <span>"+CUR+"</span>";
  if(qEl)qEl.textContent=fm(gQ);
  if(cEl)cEl.textContent=fm(gC);
 };
 root.addEventListener("click",e=>{const ed=e.target.closest("[data-doc-edit]");if(ed){openAdmDocEditModal(code,ed.dataset.docEdit);return}const dl=e.target.closest("[data-doc-del]");if(dl){cancelAdmDoc(code,dl.dataset.docDel,dl);return}const fb=e.target.closest("[data-aseg] button");if(fb){flt=fb.dataset.f;root.querySelectorAll("[data-aseg] button").forEach(b=>b.classList.toggle("on",b===fb));apply();return}const tg=e.target.closest("[data-atog]");if(tg){const card=tg.closest(".sum-cat");if(card){card.classList.toggle("open");const ch=card.querySelector(".sum-chv");if(ch)ch.textContent=card.classList.contains("open")?"▾":"▸"}}});
 root.addEventListener("input",e=>{if(e.target&&e.target.matches("[data-docsrch]")){docQ=e.target.value;applyDocFilter();return}if(e.target&&e.target.matches("[data-asrch]")){q=e.target.value.trim().toLowerCase();apply()}});
 ov._refresh=()=>{const st=root.scrollTop;root.innerHTML=build(true);
  if(flt!=="all")root.querySelectorAll("[data-aseg] button").forEach(b=>b.classList.toggle("on",b.dataset.f===flt));
  const si=root.querySelector("[data-asrch]");if(si&&q)si.value=q;
  if(flt!=="all"||q)apply();
  if(docQ)applyDocFilter();
  root.scrollTop=st};
 if(openDocs)ov.classList.add("show");else requestAnimationFrame(()=>ov.classList.add("show"));
}
function drawTotals(){
 const CL=allCars(),carList=getCarsList();if(S.SEL!=="all"&&!carList.includes(S.SEL))S.SEL="all";
 const curSelLabel=S.SEL==="all"?"Все экипажи":(S.SEL==="ADMIN"?"Админ":"Экипаж "+S.SEL);
 const customTarCnt=typeof EB_CAT.getCustomTariffsCount==="function"?EB_CAT.getCustomTariffsCount():0;
 const tarBtnHtml=!isSubAdm()?"<button type=\"button\" class=\"tar-open-btn\" data-act=\"open-tariffs\" title=\"Редактор тарифов бонусов\"><span>💰</span><span>Тарифы</span>"+(customTarCnt?"<span class=\"tar-cnt-bdg\" data-no-i18n=\"1\">"+customTarCnt+"</span>":"")+"</button>":"";
 let h="<div class=\"tot-top-bar\"><button type=\"button\" class=\"sel-btn\" style=\"margin-bottom:0;flex:1;min-width:0\" data-act=\"opensel\"><span class=\"sel-btn-l\"><span class=\"sel-ic\">🚚</span><span class=\"sel-btn-t\">"+esc(curSelLabel)+"</span></span><svg class=\"sel-chev\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.3\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m6 9 6 6 6-6\"/></svg></button>"+tarBtnHtml+"</div>";
 const badge=cd=>cd==="ADMIN"?"<span style=\"min-width:36px;height:34px;padding:0 6px;border-radius:11px;background:linear-gradient(135deg,rgba(167,139,250,.24),rgba(124,58,237,.12));border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0\">🛡️</span>":"<span data-no-i18n=\"1\" style=\"min-width:36px;height:34px;padding:0 6px;border-radius:11px;background:rgba(16,185,129,.16);border:1px solid rgba(52,211,153,.35);color:#6ee7b7;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0\">"+esc(cd)+"</span>";
 if(S.SEL==="all"){
  const curList=CL.filter(c=>c.qty>0||c.sum>0||c.crew.length>0).sort((a,b)=>b.sum-a.sum);
  const sum=curList.reduce((a,x)=>a+x.sum,0),qty=curList.reduce((a,x)=>a+x.qty,0);
  h+="<div class=\"sum-dash\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">Текущий месяц · по экипажам</div><div class=\"sum-val\">"+fm(sum)+" <span>"+CUR+"</span></div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b>"+fm(qty)+"</b><span>штук</span></div><div class=\"sum-kpi\"><b>"+curList.length+"</b><span>экипажей</span></div></div></div>"+(curList.length?"<button type=\"button\" class=\"cp-btn\" style=\"margin-top:12px;background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csvcur\">📥 Скачать Excel по экипажам</button>":"")+"</div>";
  if(curList.length){h+="<div class=\"sec\">Экипажи в текущем месяце ("+curList.length+")</div>"+curList.map(x=>{const dc=Object.keys((S.CARS[x.code]&&S.CARS[x.code].docs)||{}).length;return"<div class=\"st-row\" data-act=\"open-car-sum\" data-id=\""+esc(x.code)+"\" data-sub=\"cur\"><div style=\"display:flex;align-items:center;gap:10px;min-width:0\">"+badge(x.code)+"<div style=\"min-width:0\"><div class=\"st-nm\"><span>Экипаж</span> <span data-no-i18n=\"1\">"+esc(x.code)+"</span></div><div class=\"st-qt\"><span>"+fm(x.qty)+" шт</span>"+(dc?" · 📜 "+dc:"")+(x.crew.length?" · <span data-no-i18n=\"1\">"+esc(x.crew.join(", "))+"</span>":"")+"</div></div></div><div class=\"rv\" style=\"font-size:13.5px\">"+money(x.sum)+" ›</div></div>"}).join("")}
  const ms=aggCarMonths(CL);h+="<div class=\"sec\">Архив сохранённых месяцев ("+ms.length+")</div>";
  if(!ms.length)h+="<div class=\"mut box\">Сохранённых итогов по экипажам пока нет.</div>";
  h+=ms.map(x=>{const key="all|"+x.m,op=!!S.OPEN[key];return"<div class=\"mr col\" data-act=\"month\" data-key=\""+esc(key)+"\"><div class=\"mrt\"><div class=\"rm\"><div class=\"rt\">📅 "+esc(monthName(x.m))+"</div><div class=\"rs\"><span>"+fm(x.qty)+" шт</span> · <span>машин: "+x.cars.length+"</span></div></div><div class=\"rv\">"+money(x.sum)+"</div><span class=\"ar\">"+(op?"▾":"▸")+"</span></div>"+(op?"<div class=\"dt\" onclick=\"event.stopPropagation()\">"+x.cars.map(cv=>"<div class=\"st-row\" data-act=\"open-car-month\" data-id=\""+esc(cv.code)+"\" data-m=\""+esc(x.m)+"\"><div style=\"display:flex;align-items:center;gap:10px;min-width:0\">"+badge(cv.code)+"<div style=\"min-width:0\"><div class=\"st-nm\"><span>Экипаж</span> <span data-no-i18n=\"1\">"+esc(cv.code)+"</span></div><div class=\"st-qt\"><span>"+fm(cv.qty)+" шт</span>"+(cv.crew&&cv.crew.length?" · <span data-no-i18n=\"1\">"+esc(cv.crew.join(", "))+"</span>":"")+"</div></div></div><div class=\"rv\" style=\"font-size:13.5px\">"+money(cv.sum)+" ›</div></div>").join("")+"<button type=\"button\" class=\"cp-btn\" style=\"background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csvmonth\" data-m=\""+esc(x.m)+"\">📥 Скачать Excel за "+esc(monthName(x.m))+"</button></div>":"")+"</div>"}).join("");
 }else{
  const c=parseCar(S.SEL);
  const curDocsCount=Object.keys((S.CARS[S.SEL]&&S.CARS[S.SEL].docs)||{}).length;
  h+="<div class=\"sum-dash sum-dash-btn\" data-act=\"subopen\" data-sub=\"cur\"><div class=\"sum-top\"><div><div class=\"sum-lbl\">Текущий месяц · открыть ›</div><div class=\"sum-val\">"+fm(c.sum)+" <span>"+CUR+"</span></div><div style=\"font-size:12px;color:#8b9bb4;margin-top:4px\">"+(c.crew.length?"<span>Экипаж</span>: <span data-no-i18n=\"1\">"+esc(c.crew.join(", "))+"</span>":"<span>Экипаж не назначен</span>")+"</div></div><div class=\"sum-kpis\"><div class=\"sum-kpi\"><b>"+fm(c.qty)+"</b><span>штук</span></div>"+(curDocsCount?"<div class=\"sum-kpi\"><b style=\"color:#fde047\">"+curDocsCount+"</b><span>записей</span></div>":"")+"</div></div>"+(c.qty>0||c.sum>0||curDocsCount>0?"<button type=\"button\" class=\"cp-btn\" style=\"margin-top:12px;background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.4);color:#7dd3fc\" data-act=\"csv-single-cur\" data-car=\""+esc(S.SEL)+"\">📊 Открыть таблицу / Excel</button>":"")+"</div><div class=\"sec\">Сохранённые итоги</div>";
  const ks=Object.keys(c.hist).filter(k=>c.hist[k]).sort((a,b)=>{const x=c.hist[a],y=c.hist[b];return(y.m||"")<(x.m||"")?-1:(y.m||"")>(x.m||"")?1:(y.t||0)-(x.t||0)});
  if(!ks.length)h+="<div class=\"mut box\">У экипажа "+esc(S.SEL)+" нет сохранённых итогов.</div>";
  h+=ks.map(k=>{const x=c.hist[k];const dBtn=!isSubAdm()?"<button type=\"button\" class=\"xb\" data-act=\"del-car-hist\" data-car=\""+esc(S.SEL)+"\" data-hk=\""+esc(k)+"\" aria-label=\"Удалить\">✕</button>":"";return"<div class=\"mr\" style=\"cursor:pointer\" data-act=\"subopen\" data-sub=\""+esc(k)+"\"><div class=\"rm\"><div class=\"rt\">"+esc(monthName(x.m))+"</div><div class=\"rs\"><span>"+fm(x.qty)+" шт</span> · <span>сохранено</span> <span>"+esc(ago(x.t))+"</span></div></div><div class=\"rv\">"+money(x.sum)+"</div>"+dBtn+"<span class=\"ar\">›</span></div>"}).join("");
 }
 g("view").innerHTML=h;
}
 
 async function migrateDevToCar(uid, carCode){
  if(isSubAdm() || !uid || !carCode || !S.USERS[uid]) return false;
  const u = S.USERS[uid];
  let raw = [];
  try { raw = JSON.parse(u.bonRaw || "[]"); } catch(e){}
  const qtyDelta = {};
  if (Array.isArray(raw)) {
   raw.forEach(c => {
    if (!c || !Array.isArray(c.subs)) return;
    c.subs.forEach(sub => {
     const q1 = +sub.qty || 0, q2 = sub.one ? 0 : (+sub.qty2 || 0);
     const k1 = c.pk + "_" + sub.sk, k2 = k1 + "_2";
     if (q1 > 0) qtyDelta[k1] = (qtyDelta[k1] || 0) + q1;
     if (q2 > 0) qtyDelta[k2] = (qtyDelta[k2] || 0) + q2;
    });
   });
  }
  let histObj = {};
  try { histObj = JSON.parse(u.hist || "{}"); } catch(e){}
  const hasQty = Object.keys(qtyDelta).length > 0;
  const hasHist = histObj && typeof histObj === "object" && Object.keys(histObj).length > 0;
  if (!hasQty && !hasHist) return false;
  if (hasQty) {
   await db.ref("cars/" + carCode + "/qty").transaction(cur => {
    const next = (cur && typeof cur === "object") ? Object.assign({}, cur) : {};
    Object.keys(qtyDelta).forEach(k => { next[k] = (+next[k] || 0) + qtyDelta[k]; });
    return next;
   });
   await db.ref("cars/" + carCode + "/t").set(Date.now());
  }
  if (hasHist) {
   await db.ref("cars/" + carCode + "/hist").update(histObj);
  }
  await db.ref("users/" + uid).update({ bonRaw: "[]", cur: JSON.stringify({ sum: 0, qty: 0, cats: [] }), hist: "{}" });
  return true;
 }


 function openTariffsModal(){
  if(isSubAdm())return;
  const old=g("admTariffsOv");if(old){if(typeof old._close==="function")old._close();else old.remove()}
  const cats=EB_CAT.CATEGORIES||[];
  const defs=EB_CAT.DEFAULT_TARIFFS||{};
  const furnNm=EB_CAT.furnitureName||nm;
  const icoMap=EB_CAT.ICO||{};
  const draft={};
  const savedSnap={};
  cats.forEach(c=>{
   c.subs.forEach(s=>{
    const code=c.pk+"_"+s.sk;
    const def=defs[code]||{p1:s.p1,p2:s.one?s.p1:s.p2,one:!!s.one};
    const cur=typeof EB_CAT.getTariff==="function"?EB_CAT.getTariff(code):{p1:s.p1,p2:s.one?s.p1:s.p2,one:!!s.one};
    draft[code]={p1:cur.p1,p2:def.one?cur.p1:cur.p2,one:def.one,defP1:def.p1,defP2:def.p2,raw1:String(cur.p1),raw2:String(def.one?cur.p1:cur.p2)};
    savedSnap[code]={p1:cur.p1,p2:def.one?cur.p1:cur.p2};
   });
  });

  const ov=document.createElement("div");ov.id="admTariffsOv";ov.className="ov";
  ov.innerHTML="<div class=\"dlg ach-box tar-box\">"
   +"<div class=\"ach-hd\"><div class=\"ach-hd-l\"><div class=\"ach-hd-ic\" style=\"background:rgba(250,204,21,.16);border-color:rgba(250,204,21,.4);color:#fde047\">💰</div><div><b>Тарифы бонусов</b><small id=\"tarSub\"></small></div></div><div class=\"ach-acts\"><button type=\"button\" id=\"tarX\" class=\"ach-x\">✕</button></div></div>"
   +"<div class=\"tar-ctrl\">"
   +"<div class=\"tar-srch\"><span class=\"tar-srch-ic\">🔍</span><input id=\"tarQ\" type=\"search\" placeholder=\"Поиск категории или товара...\"><button type=\"button\" id=\"tarQClr\" class=\"tar-srch-clr\" hidden>✕</button></div>"
   +"<button type=\"button\" id=\"tarOnlyBtn\" class=\"tar-flt-btn\">Только изменённые</button>"
   +"</div>"
   +"<div id=\"tarList\" class=\"ach-list tar-list\"></div>"
   +"<div class=\"tar-foot\">"
   +"<div class=\"tar-note\">Применяется сразу для текущих расчётов и новых накладных. Сохранённые архивы не меняются.</div>"
   +"<div class=\"tar-foot-acts\">"
   +"<button type=\"button\" id=\"tarResetAll\" class=\"tar-rst-btn\">↺ Сбросить всё</button>"
   +"<button type=\"button\" id=\"tarSaveBtn\" class=\"tar-save-btn\">Сохранить тарифы</button>"
   +"</div></div></div>";
  document.body.appendChild(ov);

  let q="",onlyMod=false,closed=false;
  const parsePrice=v=>{
   const str=String(v==null?"":v).trim();
   if(!/^\d+$/.test(str))return null;
   const n=parseInt(str,10);
   return Number.isFinite(n)&&n>=0&&n<=1000000?n:null;
  };
  const isDiffFromDef=d=>d.p1!==d.defP1||(!d.one&&d.p2!==d.defP2);
  const getDirtyCodes=()=>Object.keys(draft).filter(cd=>{
   const d=draft[cd],sv=savedSnap[cd];
   const p1=parsePrice(d.raw1),p2=d.one?p1:parsePrice(d.raw2);
   if(p1===null||p2===null)return true;
   return p1!==sv.p1||(!d.one&&p2!==sv.p2);
  });
  const getInvalidCodes=()=>Object.keys(draft).filter(cd=>{
   const d=draft[cd];
   return parsePrice(d.raw1)===null||(!d.one&&parsePrice(d.raw2)===null);
  });

  const updHeader=()=>{
   const customCnt=Object.keys(draft).filter(cd=>isDiffFromDef(draft[cd])).length;
   const dirtyCnt=getDirtyCodes().length;
   const invCnt=getInvalidCodes().length;
   const sub=g("tarSub");
   if(sub)sub.textContent=customCnt?("Изменено от базовых: "+customCnt+" из "+Object.keys(draft).length):"Все позиции по базовому тарифу";
   const ob=g("tarOnlyBtn");
   if(ob){
    ob.classList.toggle("on",onlyMod);
    ob.textContent=customCnt?("Изменённые ("+customCnt+")"):"Только изменённые";
   }
   const sb=g("tarSaveBtn");
   if(sb){
    sb.disabled=invCnt>0||dirtyCnt===0;
    sb.textContent=invCnt>0?"Проверьте цены":(dirtyCnt>0?("Сохранить ("+dirtyCnt+")"):"Нет изменений");
   }
   const rb=g("tarResetAll");
   if(rb)rb.disabled=customCnt===0;
  };

  const renderList=()=>{
   const box=g("tarList");if(!box)return;
   const ql=q.trim().toLowerCase();
   let html="",shown=0;
   cats.forEach(c=>{
    const cLabel=furnNm(c.hy);
    const cMatch=!ql||cLabel.toLowerCase().includes(ql)||c.ru.toLowerCase().includes(ql)||c.hy.toLowerCase().includes(ql)||c.en.toLowerCase().includes(ql);
    const rowsHtml=[];
    c.subs.forEach(s=>{
     const code=c.pk+"_"+s.sk,d=draft[code];
     const sLabel=furnNm(s.hy);
     const mod=isDiffFromDef(d);
     if(onlyMod&&!mod)return;
     const sMatch=cMatch||sLabel.toLowerCase().includes(ql)||s.ru.toLowerCase().includes(ql)||s.hy.toLowerCase().includes(ql)||s.en.toLowerCase().includes(ql)||(s.ocrRu||"").toLowerCase().includes(ql);
     if(!sMatch)return;
     shown++;
     const bad1=parsePrice(d.raw1)===null;
     const bad2=!d.one&&parsePrice(d.raw2)===null;
     const defHint=mod?("<div class=\"tar-def\">База: <span data-no-i18n=\"1\">"+fm(d.defP1)+(d.one?"":(" / "+fm(d.defP2)))+" "+CUR+"</span></div>"):"";
     const rstBtn=mod?("<button type=\"button\" class=\"tar-row-rst\" data-rst=\""+esc(code)+"\" title=\"Вернуть базовый тариф\">↺</button>"):"";
     const inp2=d.one
      ?"<div class=\"tar-fix-tag\">Единый тариф</div>"
      :("<label class=\"tar-fld\"><span>Район</span><input type=\"number\" inputmode=\"numeric\" min=\"0\" max=\"1000000\" step=\"10\" class=\"tar-inp"+(bad2?" bad":"")+"\" data-cd=\""+esc(code)+"\" data-z=\"2\" value=\""+esc(d.raw2)+"\"></label>");
     rowsHtml.push("<div class=\"tar-row"+(mod?" mod":"")+"\" data-tar-row=\""+esc(code)+"\">"
      +"<div class=\"tar-row-top\"><div class=\"tar-row-nm\"><b>"+esc(sLabel)+"</b>"+(mod?"<span class=\"tar-mod-dot\">изм.</span>":"")+defHint+"</div>"+rstBtn+"</div>"
      +"<div class=\"tar-inputs\">"
      +"<label class=\"tar-fld\"><span>"+(d.one?"Тариф":"Город")+"</span><input type=\"number\" inputmode=\"numeric\" min=\"0\" max=\"1000000\" step=\"10\" class=\"tar-inp"+(bad1?" bad":"")+"\" data-cd=\""+esc(code)+"\" data-z=\"1\" value=\""+esc(d.raw1)+"\"></label>"
      +inp2+"</div></div>");
    });
    if(rowsHtml.length){
     html+="<div class=\"tar-cat\"><div class=\"tar-cat-hd\"><span>"+(icoMap[c.pk]||"📦")+" "+esc(cLabel)+"</span><span class=\"tar-cat-cnt\" data-no-i18n=\"1\">"+rowsHtml.length+"</span></div>"+rowsHtml.join("")+"</div>";
    }
   });
   if(!shown){
    box.innerHTML="<div class=\"mut\" style=\"text-align:center;padding:28px 12px\">"+(onlyMod?"Изменённых тарифов нет":"Ничего не найдено")+"</div>";
   }else{
    box.innerHTML=html;
   }
   updHeader();
  };

  const forceClose=()=>{if(closed)return;closed=true;ov.classList.remove("show");document.removeEventListener("keydown",onK);setTimeout(()=>ov.remove(),180)};
  const tryClose=async()=>{
   if(closed)return;
   if(getDirtyCodes().length){
    const ok=await ask("Есть несохранённые изменения тарифов. Закрыть без сохранения?",{title:"Несохранённые правки",okText:"Закрыть",danger:true});
    if(!ok)return;
   }
   forceClose();
  };
  ov._close=forceClose;
  const onK=e=>{if(e.key==="Escape"&&(!g("cOv")||g("cOv").hidden)){e.preventDefault();tryClose()}};
  g("tarX").onclick=tryClose;
  ov.onclick=e=>{if(e.target===ov)tryClose()};

  const qInp=g("tarQ"),qClr=g("tarQClr");
  qInp.oninput=e=>{q=e.target.value||"";qClr.hidden=!q;renderList()};
  qClr.onclick=()=>{q="";qInp.value="";qClr.hidden=true;renderList();qInp.focus()};
  g("tarOnlyBtn").onclick=()=>{onlyMod=!onlyMod;renderList()};

  g("tarList").addEventListener("input",e=>{
   const inp=e.target.closest(".tar-inp");if(!inp)return;
   const cd=inp.dataset.cd,z=inp.dataset.z,d=draft[cd];if(!d)return;
   const val=inp.value;
   if(z==="1")d.raw1=val;else d.raw2=val;
   const p1=parsePrice(d.raw1),p2=d.one?p1:parsePrice(d.raw2);
   if(p1!==null)d.p1=p1;
   if(p2!==null)d.p2=p2;
   inp.classList.toggle("bad",(z==="1"?p1:p2)===null);
   const row=inp.closest(".tar-row");
   if(row){
    const mod=isDiffFromDef(d);
    row.classList.toggle("mod",mod);
   }
   updHeader();
  });

  g("tarList").addEventListener("click",e=>{
   const rb=e.target.closest("[data-rst]");if(!rb)return;
   const cd=rb.dataset.rst,d=draft[cd];if(!d)return;
   d.p1=d.defP1;d.p2=d.defP2;d.raw1=String(d.defP1);d.raw2=String(d.defP2);
   renderList();
  });

  g("tarResetAll").onclick=async()=>{
   const ok=await ask("Сбросить все тарифы в редакторе к заводским значениям? После этого нажмите «Сохранить», чтобы применить для всех.",{title:"Сброс тарифов",okText:"Сбросить",danger:true});
   if(!ok)return;
   Object.keys(draft).forEach(cd=>{const d=draft[cd];d.p1=d.defP1;d.p2=d.defP2;d.raw1=String(d.defP1);d.raw2=String(d.defP2)});
   renderList();
  };

  g("tarSaveBtn").onclick=async()=>{
   const inv=getInvalidCodes();
   if(inv.length){toast("Введите корректные целые цены (от 0 до 1 000 000)",true);return}
   const dirty=getDirtyCodes();
   if(!dirty.length){toast("Изменений нет");return}
   const rawOut={};
   Object.keys(draft).forEach(cd=>{
    const d=draft[cd];
    const p1=parsePrice(d.raw1),p2=d.one?p1:parsePrice(d.raw2);
    if(d.one){if(p1!==d.defP1)rawOut[cd]={p1:p1}}
    else{if(p1!==d.defP1||p2!==d.defP2)rawOut[cd]={p1:p1,p2:p2}}
   });
   const cleanPayload=typeof EB_CAT.sanitizeTariffsMap==="function"?EB_CAT.sanitizeTariffsMap(rawOut):rawOut;
   const previewLines=dirty.slice(0,5).map(cd=>{
    const d=draft[cd],sv=savedSnap[cd];
    const label=(EB_CAT.OCR_CAT_NAMES&&EB_CAT.OCR_CAT_NAMES[cd])||cd;
    return "• "+label+": "+fm(sv.p1)+(d.one?"":("/"+fm(sv.p2)))+" → "+fm(d.p1)+(d.one?"":("/"+fm(d.p2)))+" "+CUR;
   });
   if(dirty.length>5)previewLines.push("... и ещё "+(dirty.length-5));
   const ok=await ask("Сохранить новые тарифы ("+dirty.length+" поз.) для всех устройств?\n\n"+previewLines.join("\n"),{title:"Сохранение тарифов",okText:"Сохранить",danger:false});
   if(!ok)return;
   const sb=g("tarSaveBtn");if(sb){sb.disabled=true;sb.textContent="Сохранение..."}
   try{
    if(Object.keys(cleanPayload).length)await db.ref("config/tariffs").set(cleanPayload);
    else await db.ref("config/tariffs").remove();
    S.TARIFFS=cleanPayload;
    if(typeof EB_CAT.applyTariffs==="function")EB_CAT.applyTariffs(cleanPayload);
    toast("Тарифы обновлены для всех устройств");
    forceClose();
    if(S.TAB==="online"||S.TAB==="totals")Adm.scheduleDraw(60);
   }catch(err){
    toast("Ошибка сохранения тарифов (проверьте правила Firebase)",true);
    updHeader();
   }
  };

  document.addEventListener("keydown",onK);
  renderList();
  requestAnimationFrame(()=>ov.classList.add("show"));
 }

 Object.assign(Adm, {
  CAR_CATALOG, parseCar, allCars, aggCarMonths, admFbKey,
  findAffectedDocsByRule, findAffectedDocsByAllRules,
  openRecalcModal, openAdmSumModal, openTariffsModal, drawTotals, migrateDevToCar
 });
})(window.Adm);

;(function(){
  const v = document.getElementById('view');
  if (!v) return;
  const apply = box => {
    const flt = box.dataset.flt || 'all';
    const q = (box.dataset.q || '').toLowerCase();
    box.querySelectorAll('.sum-cat').forEach(cat => {
      let vc = 0;
      cat.querySelectorAll('.sum-it').forEach(it => {
        const mn = !q || (it.dataset.name || '').includes(q);
        let vr = 0;
        it.querySelectorAll('.sum-r').forEach(r => {
          const ok = mn && (flt === 'all' || r.dataset.zone === flt);
          r.style.display = ok ? '' : 'none';
          if (ok) vr++;
        });
        it.style.display = vr ? '' : 'none';
        if (vr) vc++;
      });
      cat.style.display = vc ? '' : 'none';
    });
  };
  v.addEventListener('click', e => {
    const fb = e.target.closest('[data-aseg] button');
    if (fb) {
      e.stopPropagation();
      const box = fb.closest('.adm-sum');
      box.dataset.flt = fb.dataset.f;
      box.querySelectorAll('[data-aseg] button').forEach(b => b.classList.toggle('on', b === fb));
      apply(box);
      return;
    }
    const tg = e.target.closest('[data-atog]');
    if (tg) {
      e.stopPropagation();
      const card = tg.closest('.sum-cat');
      if (card) {
        card.classList.toggle('open');
        const ch = card.querySelector('.sum-chv');
        if (ch) ch.textContent = card.classList.contains('open') ? '▾' : '▸';
      }
    }
  });
  v.addEventListener('input', e => {
    if (e.target && e.target.matches('[data-asrch]')) {
      const box = e.target.closest('.adm-sum');
      box.dataset.q = e.target.value.trim();
      apply(box);
    }
  });
})();
