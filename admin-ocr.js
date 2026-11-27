// EuroBaza Admin · OCR: словарь накладных, заявки водителей и модалка правил
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
 const _ocrPrunedPend=new Set();
 function isStaleOcrPending(k,p){
  if(!p||!p.code||!OCR_CAT_NAMES[p.code])return true;
  if(p.from&&p.from===p.code)return true;
  if(S.OCR_MAP[k]&&S.OCR_MAP[k]===p.code)return true;
  return false;
 }
 function getOcrPending(){
  const list=[];
  Object.keys(S.USERS).forEach(uid=>{
   const op=S.USERS[uid]&&S.USERS[uid].ocrPending;
   if(op&&typeof op==='object'){
    Object.keys(op).forEach(k=>{
     const p=op[k];
     if(!p||!p.code||isStaleOcrPending(k,p))return;
     list.push({uid,k,p});
    });
   }
  });
  return list;
 }
 function pruneStaleOcrPending(){
  if(!auth||!auth.currentUser||isSubAdm())return;
  Object.keys(S.USERS).forEach(uid=>{
   const op=S.USERS[uid]&&S.USERS[uid].ocrPending;
   if(!op||typeof op!=='object')return;
   const patch={},added=[];
   Object.keys(op).forEach(k=>{
    const p=op[k];
    if(!p||!isStaleOcrPending(k,p))return;
    const pk=uid+'/'+k;
    if(_ocrPrunedPend.has(pk))return;
    _ocrPrunedPend.add(pk);
    patch[k]=null;
    added.push(pk);
   });
   if(added.length){
    db.ref('users/'+uid+'/ocrPending').update(patch).catch(()=>{added.forEach(pk=>_ocrPrunedPend.delete(pk))});
   }
  });
 }
 function updOcrTabBdg(){
  const b=g('ocrTabBdg');if(!b)return;
  const n=getOcrPending().length;
  b.textContent=n>99?'99+':String(n);
  b.hidden=n===0;
 }
 const ocrNorm=s=>String(s||'').toLowerCase().replace(/և|եւ/g,'եվ').replace(/ё/g,'е').replace(/[–—−]/g,'-').replace(/[,]/g,'.').replace(/[_\/]+/g,' ').replace(/\s+/g,' ').trim();
 const OCR_HY_KW=EB_CAT.OCR_HY_KW||{};
 function drawOcr(){
  pruneStaleOcrPending();
  const pendList=getOcrPending();
  const allKeys=Object.keys(S.OCR_MAP).filter(k=>S.OCR_MAP[k]&&OCR_CAT_NAMES[S.OCR_MAP[k]]).sort();
  const recalcBtn=!isSubAdm()?'<button type="button" data-act="ocr-recalc" style="height:40px;padding:0 12px;border-radius:12px;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.42);color:#7dd3fc;font-size:13px;font-weight:700;white-space:nowrap">🔄 Пересчитать</button>':'';
  let h='<div class="sum-dash"><div class="sum-top" style="flex-wrap:wrap;gap:8px"><div><div class="sum-lbl">Общий словарь накладных</div><div class="sum-val">'+allKeys.length+' <span>правил</span></div></div><div style="display:flex;gap:6px;flex-wrap:wrap">'+recalcBtn+'<button type="button" data-act="ocr-add" style="height:40px;padding:0 14px;border-radius:12px;background:rgba(16,185,129,.22);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:13.5px;font-weight:700;white-space:nowrap">➕ Добавить</button></div></div></div>';
  if(pendList.length){
   h+='<div class="sec" style="color:#fde047">🧾 Ожидают подтверждения ('+pendList.length+')</div>';
   h+=pendList.map(({uid,k,p})=>{
    const prevCd=(p.from&&p.from!==p.code)?p.from:((S.OCR_MAP[k]&&S.OCR_MAP[k]!==p.code)?S.OCR_MAP[k]:'');
    const byHtml=p.by?'<span data-no-i18n="1">'+esc(p.by)+'</span>':'<span>Водитель</span>';
    const diffHtml=prevCd
     ?'<div class="rs" style="margin-top:4px;line-height:1.45"><span>Было:</span> <span style="color:#fca5a5">'+esc(OCR_CAT_NAMES[prevCd]||prevCd)+'</span><br><span>Стало:</span> <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[p.code]||p.code)+'</b> · <span>от</span> '+byHtml+'</div>'
     :'<div class="rs" style="margin-top:4px;line-height:1.45"><span style="display:inline-block;padding:1px 7px;border-radius:6px;background:rgba(56,189,248,.16);border:1px solid rgba(56,189,248,.38);color:#7dd3fc;font-size:11px;font-weight:700;margin-right:5px">🆕 Новый товар</span><span>Добавить в:</span> <b style="color:#6ee7b7">'+esc(OCR_CAT_NAMES[p.code]||p.code)+'</b> · <span>от</span> '+byHtml+'</div>';
    return '<div class="mr col" style="cursor:default;border-color:rgba(250,204,21,.4);background:linear-gradient(180deg,rgba(36,30,14,.92) 0%,rgba(16,18,28,.96) 100%)">'
     +'<div class="rm"><div class="rt" style="font-size:14px">📄 <span data-no-i18n="1">'+esc(p.raw||k)+'</span></div>'+diffHtml+'</div>'
     +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">'
     +'<button type="button" data-act="ocr-ok" data-uid="'+esc(uid)+'" data-k="'+esc(k)+'" data-code="'+esc(p.code)+'" style="height:36px;border-radius:10px;background:rgba(16,185,129,.22);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:13px;font-weight:700">✓ Одобрить для всех</button>'
     +'<button type="button" data-act="ocr-no" data-uid="'+esc(uid)+'" data-k="'+esc(k)+'" style="height:36px;border-radius:10px;background:rgba(239,68,68,.16);border:1px solid rgba(239,68,68,.38);color:#fca5a5;font-size:13px;font-weight:700">✕ Отклонить</button>'
     +'</div></div>';
   }).join('');
  }
  h+='<div class="sec">Все правила ('+allKeys.length+')</div>';
  h+='<input id="ocrSrchInp" class="sum-srch" type="search" value="'+esc(S.OCR_Q)+'" placeholder="Поиск по названию или категории..." style="margin-bottom:10px!important"><div id="ocrRulesList"></div>';
  const curInp=g('ocrSrchInp'),wasFocused=curInp&&document.activeElement===curInp;
  const renderList=()=>{
   const box=g('ocrRulesList');if(!box)return;
   const tokens=ocrNorm(S.OCR_Q).split(' ').filter(Boolean);
   const keys=tokens.length?allKeys.filter(k=>{
    const cd=S.OCR_MAP[k],grp=(cd||'').split('_')[0];
    const hay=ocrNorm(k+' '+k.replace(/_/g,'.')+' '+(OCR_CAT_NAMES[cd]||'')+' '+(OCR_HY_KW[grp]||''));
    return tokens.every(t=>hay.includes(t));
   }):allKeys;
   if(!keys.length){box.innerHTML='<div class="mut box">'+(allKeys.length?'Ничего не найдено по запросу.':'Словарь пуст. Правила появятся после сканирования накладных или добавления вручную.')+'</div>';return;}
   box.innerHTML=keys.map(k=>{
    const cd=S.OCR_MAP[k];
    return '<div class="row" data-act="ocr-edit" data-k="'+esc(k)+'" style="padding:11px 12px">'
     +'<div class="rm"><div class="rt" style="font-size:14px">📄 <span data-no-i18n="1">'+esc(k)+'</span></div>'
     +'<div class="rs" style="color:#6ee7b7;font-weight:600">'+esc(OCR_CAT_NAMES[cd]||cd)+'</div></div>'
     +'<button type="button" class="xb" data-act="ocr-del" data-k="'+esc(k)+'" aria-label="Удалить">✕</button></div>';
   }).join('');
  };
  if(wasFocused&&g('ocrRulesList')){renderList();return;}
  g('view').innerHTML=h;
  renderList();
  const inp=g('ocrSrchInp');
  if(inp)inp.oninput=e=>{S.OCR_Q=e.target.value;renderList()};
 }
 // ===== Табель пропусков (по экипажам + ручные сотрудники без приложения) =====
function openOcrRuleModal(ruleKey, curCode, isNew = false){
  const CAT_ICO = CAT_ICO_MAP;
  const allItems = Object.keys(OCR_CAT_NAMES).map(cd => {
   const parts = OCR_CAT_NAMES[cd].split(' · ');
   return { cd, cat: parts[0] || 'Другое', name: parts[1] || OCR_CAT_NAMES[cd] };
  });
  const catsList = Array.from(new Set(allItems.map(x => x.cat)));
  const curObj = allItems.find(x => x.cd === curCode);
  let selCat = curObj ? curObj.cat : 'all', q = '', selectedCd = curCode || '';

  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.style.zIndex = '99999';

  ov.innerHTML = '<div class="dlg aop-box" style="max-width:440px;height:min(88dvh,620px)">'
   + '<div class="aop-hd"><div><b>' + (isNew ? '➕ Новое правило OCR' : '✏️ Настройка правила') + '</b>' + (isNew ? '<small>Сопоставление товара из накладной с каталогом</small>' : '<small data-no-i18n="1">' + esc(ruleKey) + '</small>') + '</div><button type="button" class="sel-x">✕</button></div>'
   + (isNew ? '<div style="padding:10px 14px 6px;flex-shrink:0"><label style="display:block;font-size:11.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Текст из накладной (как написано в чеке):</label><input id="aopRuleKeyInp" type="text" value="' + esc(ruleKey || '') + '" placeholder="Например: Ննջասենյակ կ. Մոնա Լիզա" style="width:100%;height:38px;padding:0 12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#f8fafc;font-size:13px;outline:none;box-sizing:border-box"></div>' : '')
   + '<div style="padding:4px 14px 0;flex-shrink:0"><label style="display:block;font-size:11.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Выберите категорию и модель для начисления бонуса:</label></div>'
   + '<div class="aop-srch"><input id="aopInp" type="search" placeholder="🔍 Быстрый поиск мебели..."></div>'
   + '<div class="aop-chips" id="aopChips"><button type="button" data-c="all" class="' + (selCat === 'all' ? 'on' : '') + '">Все</button>'
   + catsList.map(c => '<button type="button" data-c="' + esc(c) + '" class="' + (selCat === c ? 'on' : '') + '">' + (CAT_ICO[c] || '📦') + ' ' + esc(c) + '</button>').join('')
   + '</div><div class="aop-list" id="aopList"></div>'
   + '<div style="padding:10px 14px;background:rgba(0,0,0,.2);border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;flex-shrink:0">'
   + '<button type="button" id="aopCancelBtn" style="flex:1;height:40px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#94a3b8;font-size:13px;font-weight:700;cursor:pointer">Отмена</button>'
   + '<button type="button" id="aopSaveBtn" style="flex:1.4;height:40px;border-radius:11px;background:linear-gradient(135deg,#10b981,#059669);border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,.35)">✓ Сохранить правило</button>'
   + '</div></div>';
  document.body.appendChild(ov);

  const close = () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 180); };
  ov.querySelector('.sel-x').onclick = close;
  ov.querySelector('#aopCancelBtn').onclick = close;
  ov.onclick = e => { if (e.target === ov) close(); };

  const drawItems = () => {
   const box = g('aopList');
   const qTokens = ocrNorm(q).split(' ').filter(Boolean);
   const list = allItems.filter(it => {
    if (selCat !== 'all' && it.cat !== selCat) return false;
    if (!qTokens.length) return true;
    const grp = (it.cd || '').split('_')[0];
    const hay = ocrNorm(it.name + ' ' + it.cat + ' ' + (OCR_HY_KW[grp] || ''));
    return qTokens.every(t => hay.includes(t));
   });
   if (!list.length) { box.innerHTML = '<div class="mut" style="text-align:center;padding:20px">Ничего не найдено</div>'; return; }
   box.innerHTML = list.map(it => {
    const on = it.cd === selectedCd;
    return '<button type="button" class="aop-it' + (on ? ' on' : '') + '" data-cd="' + it.cd + '"><span>' + (CAT_ICO[it.cat] || '📦') + '</span><span class="aop-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.cat) + '</small></span><span class="sel-chk">' + (on ? '✓' : '') + '</span></button>';
   }).join('');
  };

  g('aopChips').onclick = e => {
   const b = e.target.closest('button[data-c]'); if (!b) return;
   selCat = b.dataset.c;
   g('aopChips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
   drawItems();
  };
  g('aopInp').oninput = e => { q = e.target.value.trim().toLowerCase(); drawItems(); };
  g('aopList').onclick = e => {
   const it = e.target.closest('button[data-cd]'); if (!it) return;
   selectedCd = it.dataset.cd;
   drawItems();
  };

  g('aopSaveBtn').onclick = async () => {
   const finalKey = isNew ? (g('aopRuleKeyInp') ? g('aopRuleKeyInp').value : '') : ruleKey;
   const fixedKey = (isNew && typeof window.ocrFixName === 'function') ? window.ocrFixName(finalKey) : finalKey;
   const cleanKey = isNew ? Adm.admFbKey(fixedKey) : String(ruleKey || '');
   if (!cleanKey) { toast('Введите название товара из накладной', true); return; }
   if (!selectedCd) { toast('Выберите категорию мебели из списка', true); return; }
   close();
   try {
    await db.ref('config/ocrMap/' + cleanKey).set(selectedCd);
    logSubAct('ocr', isNew ? 'ocr_add' : 'ocr_edit', isNew ? 'Добавлено правило OCR' : 'Изменено правило OCR', cleanKey + ' → ' + (OCR_CAT_NAMES[selectedCd] || selectedCd), { target: cleanKey });
    toast('Правило успешно сохранено');
    if (typeof drawOcr === 'function') drawOcr();
    if (!isSubAdm()) {
     const plan = Adm.findAffectedDocsByRule(cleanKey, selectedCd);
     if (plan.length) Adm.openRecalcModal(plan, 'Найдены накладные с этим товаром');
    }
   } catch (err) {
    toast('Ошибка сохранения: ' + err.message, true);
   }
  };

  drawItems();
  requestAnimationFrame(() => ov.classList.add('show'));
 }
 

 Object.assign(Adm, { pruneStaleOcrPending, updOcrTabBdg, drawOcr, openOcrRuleModal, ocrNorm, OCR_HY_KW });
})(window.Adm);
