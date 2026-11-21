// AUTH-LIGHT: лёгкий вход по имени и 4-значному ПИН-коду
(function(){
  const g = id => document.getElementById(id);
  const ls = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };

  const normKey = s => String(s || "").trim().toLowerCase().replace(/[.#$\[\]\/]+/g, "_").replace(/\s+/g, " ");
  function getDevId(){ let d = ls("DEV_ID"); if (!d){ d = "d" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); lsSet("DEV_ID", d); } return d; }
  let _devBlocked = false;

  function ensureModal(){
    let m = g("authMdl");
    if (m) return m;
    m = document.createElement("div");
    m.id = "authMdl";
    m.className = "cm open";
    m.innerHTML = '<div class="cm-b auth-box">'
      + '<div class="au-langs"><button type="button" data-al="ru">RU</button><button type="button" data-al="hy">ՀԱՅ</button><button type="button" data-al="en">EN</button></div>'
      + '<div class="au-ring"><div class="au-in"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div></div>'
      + '<div class="au-pill"><i></i>Driver Access</div>'
      + '<div class="au-title">EuroBaza</div>'
      + '<div class="auth-sub">Введите имя и 4-значный код.<br>Новый профиль создастся автоматически.</div>'
      + '<div class="au-fld"><svg class="au-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><input id="auName" maxlength="32" autocomplete="name" placeholder="Ваше имя (например: Артак)"></div>'
      + '<div class="au-fld"><svg class="au-ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><input id="auPin" class="au-pin" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="4-значный ПИН-код"></div>'
      + '<div id="auErr" class="auth-err"></div>'
      + '<div id="auInst" class="au-inst" hidden><div class="au-inst-l"><span class="au-inst-ic">📲</span><span id="auInstTxt"></span></div><button type="button" id="auInstBtn" class="au-inst-btn" hidden>Установить</button></div>'
      + '<button id="auGo" class="auth-ok"><span>Продолжить</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg></button>'
      + '</div>';
    document.body.appendChild(m);

    const nm = g("auName"), pn = g("auPin"), btn = g("auGo"), err = g("auErr");
    pn.addEventListener("input", () => { pn.value = pn.value.replace(/\D/g, "").slice(0, 4); });
    nm.addEventListener("keydown", e => { if (e.key === "Enter") pn.focus(); });
    pn.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
    btn.onclick = submit;
    const updLangBtns = () => {
      const cur = (window.getLang && window.getLang()) || ls("LANG") || "ru";
      m.querySelectorAll("[data-al]").forEach(b => b.classList.toggle("on", b.dataset.al === cur));
    };
    const syncAuthInst = () => {
      const box = g("auInst"), txt = g("auInstTxt"), ib = g("auInstBtn");
      if (!box || !txt || !ib) return;
      const isSt = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
      if (isSt){ box.hidden = true; return; }
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (window._pwaPrompt){
        txt.textContent = "Установите приложение на экран для быстрого входа";
        ib.hidden = false;
        box.hidden = false;
        ib.onclick = async () => {
          const p = window._pwaPrompt;
          if (!p) return;
          p.prompt();
          const r = await p.userChoice.catch(() => ({}));
          if (r && r.outcome === "accepted"){ window._pwaPrompt = null; box.hidden = true; }
        };
      } else if (isIOS){
        txt.innerHTML = 'Для установки: нажмите <b>Поделиться</b> (□↑) → <b>На экран «Домой»</b>';
        ib.hidden = true;
        box.hidden = false;
      } else {
        txt.innerHTML = 'Для установки: откройте в <b>Chrome</b> → меню <b>⋮</b> → <b>На главный экран</b>';
        ib.hidden = true;
        box.hidden = false;
      }
    };
    window._updAuthInst = syncAuthInst;
    m.querySelectorAll("[data-al]").forEach(b => {
      b.onclick = () => {
        if (window.setAppLang) window.setAppLang(b.dataset.al);
        updLangBtns();
        syncAuthInst();
      };
    });
    updLangBtns();
    syncAuthInst();

    async function submit(){
      err.textContent = "";
      if (_devBlocked){ err.textContent = "Это устройство заблокировано администратором"; return; }
      const rawName = nm.value.trim();
      const key = normKey(rawName);
      const pin = pn.value.trim();
      if (rawName.length < 2){ err.textContent = "Введите имя (минимум 2 буквы)"; nm.focus(); return; }
      if (!/^\d{4}$/.test(pin)){ err.textContent = "Введите ровно 4 цифры кода"; pn.focus(); return; }
      if (!window.firebase || !firebase.apps || !firebase.apps.length){
        err.textContent = "Нет связи с сервером. Проверьте интернет";
        return;
      }

      btn.disabled = true;
      btn.textContent = "Проверка...";
      try {
        const db = firebase.database();
        try {
          const devSnap = await db.ref("accounts/__dev_" + getDevId() + "/blocked").once("value");
          if (devSnap.val()){
            _devBlocked = true;
            err.textContent = "Это устройство заблокировано администратором";
            btn.disabled = true;
            return;
          }
        } catch(e){}
        const accRef = db.ref("accounts/" + key);
        const snap = await accRef.once("value");
        const acc = snap.val();

        if (acc){
          if (acc.blocked){
            err.textContent = "Ваш профиль заблокирован администратором";
            btn.disabled = false;
            btn.innerHTML = '<span>Продолжить</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
            return;
          }
          if (String(acc.pin) !== pin){
            err.textContent = "Неверный 4-значный код для имени «" + (acc.name || rawName) + "»";
            btn.disabled = false;
            btn.innerHTML = '<span>Продолжить</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
            pn.focus();
            pn.select();
            return;
          }
          lsSet("ADM_UID", acc.uid);
          lsSet("USER_NAME", acc.name || rawName);
          lsSet("USER_KEY", key);

          const uSnap = await db.ref("users/" + acc.uid).once("value");
          const uData = uSnap.val();
          if (uData && uData.blocked){
            err.textContent = "Ваш профиль заблокирован администратором";
            btn.disabled = false;
            btn.innerHTML = '<span>Продолжить</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
            return;
          }
          if (uData){
            if (typeof uData.hist === "string" && uData.hist.length > 2) lsSet("BON_HIST", uData.hist);
            if (typeof uData.bonRaw === "string" && uData.bonRaw.length > 2) lsSet("BON", uData.bonRaw);
            if (typeof uData.specPts === "string" && uData.specPts.length > 1) lsSet("SPEC", uData.specPts);
            if (uData.car) lsSet("USER_CAR", String(uData.car).toUpperCase()); else lsDel("USER_CAR");
            if (uData.chatSeen) lsSet("CHAT_SEEN", String(uData.chatSeen));
            if (uData.dmSeenAdm) lsSet("DM_SEEN_ADM", String(uData.dmSeenAdm));
            if (uData.dmSeenDlv) lsSet("DM_SEEN_DLV", String(uData.dmSeenDlv));
            if (!uData.dmSeenAdm && !uData.dmSeenDlv && uData.dmSeen){
              lsSet("DM_SEEN_ADM", String(uData.dmSeen));
              lsSet("DM_SEEN_DLV", String(uData.dmSeen));
            }
          }
          m.remove();
          if (window._onlineBeatNow) window._onlineBeatNow();
          bindDm(); if (window._admPushNow) window._admPushNow();
          reqNotifyPerm();
          window.toast && toast("С возвращением, " + (acc.name || rawName) + "!");
          setTimeout(() => location.reload(), 350);
        } else {
          let uid = ls("ADM_UID");
          if (!uid){
            uid = "a" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
            lsSet("ADM_UID", uid);
          }
          await accRef.set({ uid: uid, name: rawName, pin: pin, created: Date.now() });
          lsSet("USER_NAME", rawName);
          lsSet("USER_KEY", key);
          m.remove();
          renderUserBtn();
          reqNotifyPerm();
          window.toast && toast("Профиль создан: " + rawName);
          if (window._admPushNow) window._admPushNow();
        }
      } catch(e) {
        err.textContent = "Ошибка соединения. Попробуйте ещё раз";
        btn.disabled = false;
        btn.innerHTML = '<span>Продолжить</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>';
      }
    }
    setTimeout(() => nm.focus(), 100);
    return m;
  }

  let _chatList = [], _chatOpen = false, _chatBound = false;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = ms => ms ? String(new Date(ms).getHours()).padStart(2, "0") + ":" + String(new Date(ms).getMinutes()).padStart(2, "0") : "";

  function unreadCount(){
    const seen = +(ls("CHAT_SEEN") || 0), myUid = ls("ADM_UID") || "";
    return _chatList.filter(m => (m.t || 0) > seen && m.uid !== myUid).length;
  }
  function markChatSeen(){
    if (!_chatList.length) return;
    const maxT = Math.max.apply(null, _chatList.map(m => +m.t || 0));
    if (maxT > 0){
      lsSet("CHAT_SEEN", String(maxT));
      const uid = ls("ADM_UID");
      if (uid && window.firebase && firebase.apps && firebase.apps.length){
        try { firebase.database().ref("users/" + uid + "/chatSeen").set(maxT); } catch(e){}
      }
    }
    updBadges();
  }
  function updBadges(){
    const cN = unreadCount(), dN = dmUnreadCount(), tot = cN + dN;
    const nAdm = dmUnreadAdm(), nDlv = dmUnreadDlv();
    const setB = (id, v) => { const el = g(id); if (el){ el.textContent = v > 99 ? "99+" : String(v); el.hidden = v === 0; } };
    setB("usrBadge", tot);
    setB("pmDmBadge", dN);
    setB("dockChatBdg", cN);
    setB("dmTabAdmBdg", nAdm);
    setB("dmTabDlvBdg", nDlv);
  }
  function dayLabel(ms){
    if(!ms)return"";const d=new Date(ms),n=new Date();
    const sd=(x,y)=>x.getFullYear()===y.getFullYear()&&x.getMonth()===y.getMonth()&&x.getDate()===y.getDate();
    if(sd(d,n))return"Сегодня";const y=new Date(n);y.setDate(n.getDate()-1);if(sd(d,y))return"Вчера";
    const lg=(window.getLang&&window.getLang())||ls("LANG")||"ru";const loc=lg==="hy"?"hy-AM":(lg==="en"?"en-US":"ru-RU");return d.toLocaleDateString(loc,{day:"numeric",month:"long"});
  }
  function avColor(s){
    const c=["#2563eb","#0891b2","#059669","#7c3aed","#db2777","#d97706","#4f46e5"];let h=0;
    for(let i=0;i<String(s).length;i++)h=(h*31+String(s).charCodeAt(i))|0;
    return c[Math.abs(h)%c.length];
  }
  function renderChatRows(){
    const box=g("chatMsgs");if(!box)return;const my=ls("ADM_UID")||"";
    if(!_chatList.length){box.innerHTML='<div class="ch-empty">Сообщений пока нет</div>';return}
    let ld="",h="";
    _chatList.forEach(m=>{
      const dl=dayLabel(m.t);if(dl&&dl!==ld){ld=dl;h+='<div class="ch-day">'+esc(dl)+'</div>'}
      const mine=m.uid&&m.uid===my,adm=!!m.adm,dlv=adm&&(m.role==="delivery"||m.name==="Доставка");
      const rn=adm?(dlv?"Доставка":"Админ"):(m.name||"Водитель");
      const av=!mine?'<div class="ch-av" style="background:'+(adm?(dlv?"#0284c7":"#ca8a04"):avColor(rn))+'">'+esc(rn.trim().slice(0,2).toUpperCase())+'</div>':'';
      const au=adm?('<div class="ch-au">'+(dlv?'Доставка':'Администратор')+'</div>'):(!mine?'<div class="ch-au">'+esc(rn)+'</div>':'');
      h+='<div class="ch-row'+(mine?" mine":"")+'">'+av+'<div class="ch-msg'+(mine?" mine":"")+(adm?(dlv?" dlv":" adm"):"")+'">'+au+'<div class="ch-body"><span class="ch-txt">'+esc(m.txt||"")+'</span><span class="ch-tm">'+fmtTime(m.t)+'</span></div></div></div>';
    });
    box.innerHTML=h;box.scrollTop=box.scrollHeight;
  }
  function openChat(){
    reqNotifyPerm();
    _chatOpen = true; markChatSeen();
    let m = g("chatMdl");
    if (!m){
      m = document.createElement("div"); m.id = "chatMdl"; m.className = "mdl";
      m.innerHTML = '<div class="mdl-b ch-box"><div class="ch-hd"><div class="ch-hd-l"><div class="ch-hd-ic">💬</div><div><div class="ch-hd-t">Общий чат</div><div class="ch-hd-s">Канал водителей EuroBaza</div></div></div><button type="button" class="ch-x" id="chClose" aria-label="Закрыть">✕</button></div><div id="chatMsgs" class="ch-list"></div><div class="ch-bar"><input id="chInp" maxlength="300" placeholder="Сообщение..."><button type="button" id="chSend" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button></div></div>';
      document.body.appendChild(m);
      const close = () => { _chatOpen = false; m.classList.remove("open"); };
      g("chClose").onclick = close;
      m.onclick = e => { if (e.target === m) close(); };
      const inp = g("chInp"), snd = g("chSend");
      const sendMsg = async () => {
        const txt = inp.value.trim(); if (!txt) return;
        if (!window.firebase || !firebase.apps || !firebase.apps.length){ window.toast && toast("Нет соединения с сервером", "err"); return; }
        inp.value = ""; snd.disabled = true;
        try {
          const ref = firebase.database().ref("chat");
          await ref.push({ uid: ls("ADM_UID") || "", name: ls("USER_NAME") || "Водитель", txt: txt, t: firebase.database.ServerValue.TIMESTAMP });
        } catch(e){ inp.value = txt; window.toast && toast("Не удалось отправить сообщение", "err"); }
        snd.disabled = false; inp.blur();
      };
      snd.onclick = sendMsg;
      inp.onkeydown = e => { if (e.key === "Enter"){ e.preventDefault(); sendMsg(); } };
    }
    m.classList.add("open"); renderChatRows();
    
  }
  window.openChat = openChat;
  let _dmList = [], _dmDlvList = [], _dmOpen = false, _dmActiveCh = "adm", _dmBound = false, _dmInit = false, _dmLastNotifT = +(ls("DM_NOTIF_T") || 0);
  function dmUnreadAdm(){
    const seen = +(ls("DM_SEEN_ADM") || ls("DM_SEEN") || 0);
    return _dmList.filter(m => (+m.t || 0) > seen && !!m.adm).length;
  }
  function dmUnreadDlv(){
    const seen = +(ls("DM_SEEN_DLV") || ls("DM_SEEN") || 0);
    return _dmDlvList.filter(m => (+m.t || 0) > seen && !!m.adm).length;
  }
  function dmUnreadCount(){
    return dmUnreadAdm() + dmUnreadDlv();
  }
  function markDmSeen(ch){
    const target = ch || _dmActiveCh;
    const curList = target === "dlv" ? _dmDlvList : _dmList;
    const maxT = curList.length ? Math.max.apply(null, curList.map(m => +m.t || 0)) : 0;
    if (maxT > 0){
      if (target === "dlv"){
        lsSet("DM_SEEN_DLV", String(maxT));
      } else {
        lsSet("DM_SEEN_ADM", String(maxT));
      }
      lsSet("DM_SEEN", String(Math.max(+(ls("DM_SEEN_ADM") || 0), +(ls("DM_SEEN_DLV") || 0))));
      const uid = ls("ADM_UID");
      if (uid && window.firebase && firebase.apps && firebase.apps.length){
        try {
          const field = target === "dlv" ? "dmSeenDlv" : "dmSeenAdm";
          firebase.database().ref("users/" + uid + "/" + field).set(maxT);
        } catch(e){}
      }
    }
    updBadges();
  }
  function renderDmRows(){
    const box=g("dmMsgs");if(!box)return;
    const curList = _dmActiveCh === "dlv" ? _dmDlvList : _dmList;
    if(!curList.length){
      box.innerHTML='<div class="ch-empty">'+(_dmActiveCh === "dlv" ? "Сообщений от доставки пока нет" : "Сообщений от админа пока нет")+'</div>';
      return;
    }
    let ld="",h="";
    curList.forEach(m=>{
      const dl=dayLabel(m.t);if(dl&&dl!==ld){ld=dl;h+='<div class="ch-day">'+esc(dl)+'</div>'}
      const adm=!!m.adm;
      const isDeliv=adm&&(m.role==="delivery"||m.name==="Доставка"||_dmActiveCh==="dlv");
      const au=adm?(isDeliv?'<div class="ch-au" style="color:#7dd3fc">👩‍💼 Доставка</div>':'<div class="ch-au" style="color:#fde047">👑 Администратор</div>'):'';
      h+='<div class="ch-row'+(!adm?" mine":"")+'"><div class="ch-msg'+(!adm?" mine":(isDeliv?" dlv":" adm"))+'">'+au+'<div class="ch-body"><span class="ch-txt">'+esc(m.txt||"")+'</span><span class="ch-tm">'+fmtTime(m.t)+'</span></div></div></div>';
    });
    box.innerHTML=h;box.scrollTop=box.scrollHeight;
  }
  function openDmChat(targetCh){
    reqNotifyPerm();
    if(targetCh === "dlv" || targetCh === "adm") {
      _dmActiveCh = targetCh;
    } else {
      const uAdm = dmUnreadAdm(), uDlv = dmUnreadDlv();
      if(uAdm > 0) _dmActiveCh = "adm";
      else if(uDlv > 0) _dmActiveCh = "dlv";
      else _dmActiveCh = "adm";
    }
    _dmOpen = true;
    let m = g("dmMdl");
    if (m) m.remove();
    m = document.createElement("div"); m.id = "dmMdl"; m.className = "mdl";
    
    const isDlv = _dmActiveCh === "dlv";
    m.innerHTML = '<div class="mdl-b ch-box">'
      + '<div class="ch-hd">'
      + '  <div class="ch-hd-l"><div class="ch-hd-ic">✉️</div><div><div class="ch-hd-t" id="dmHdTitle">'+(isDlv?'Личный чат с Отделом доставки':'Личный чат с Админом')+'</div><div class="ch-hd-s">Прямой защищённый канал связи</div></div></div>'
      + '  <button type="button" class="ch-x" id="dmClose" aria-label="Закрыть">✕</button>'
      + '</div>'
      + '<div style="display:flex;gap:6px;padding:6px 14px 2px;background:rgba(15,23,36,.9);border-bottom:1px solid rgba(255,255,255,.08)">'
      + '  <button type="button" id="dmTabAdm" style="display:inline-flex;align-items:center;justify-content:center;flex:1;padding:7px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid '+(isDlv?'transparent':'rgba(250,204,21,.5)')+';background:'+(isDlv?'transparent':'rgba(250,204,21,.18)')+';color:'+(isDlv?'#94a3b8':'#fde047')+';cursor:pointer"><span>👑 Чат с Админом</span><span id="dmTabAdmBdg" class="dm-tab-bdg" hidden>0</span></button>'
      + '  <button type="button" id="dmTabDlv" style="display:inline-flex;align-items:center;justify-content:center;flex:1;padding:7px;border-radius:10px;font-size:12px;font-weight:700;border:1px solid '+(isDlv?'rgba(56,189,248,.5)':'transparent')+';background:'+(isDlv?'rgba(56,189,248,.18)':'transparent')+';color:'+(isDlv?'#7dd3fc':'#94a3b8')+';cursor:pointer"><span>🚚 Чат с Доставкой</span><span id="dmTabDlvBdg" class="dm-tab-bdg" hidden>0</span></button>'
      + '</div>'
      + '<div id="dmMsgs" class="ch-list"></div>'
      + '<div class="ch-bar">'
      + '  <input id="dmInp" maxlength="300" placeholder="'+(isDlv?'Сообщение в отдел доставки...':'Сообщение админу...')+'">'
      + '  <button type="button" id="dmSend" aria-label="Отправить"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(m);

    const close = () => { _dmOpen = false; m.classList.remove("open"); };
    g("dmClose").onclick = close;
    m.onclick = e => { if (e.target === m) close(); };

    const tabAdm = g("dmTabAdm"), tabDlv = g("dmTabDlv"), titleEl = g("dmHdTitle"), inp = g("dmInp"), snd = g("dmSend");
    tabAdm.onclick = () => {
      _dmActiveCh = "adm";
      tabAdm.style.borderColor = 'rgba(250,204,21,.5)'; tabAdm.style.background = 'rgba(250,204,21,.18)'; tabAdm.style.color = '#fde047';
      tabDlv.style.borderColor = 'transparent'; tabDlv.style.background = 'transparent'; tabDlv.style.color = '#94a3b8';
      titleEl.textContent = 'Личный чат с Админом';
      inp.placeholder = 'Сообщение админу...';
      markDmSeen("adm");
      renderDmRows();
    };
    tabDlv.onclick = () => {
      _dmActiveCh = "dlv";
      tabDlv.style.borderColor = 'rgba(56,189,248,.5)'; tabDlv.style.background = 'rgba(56,189,248,.18)'; tabDlv.style.color = '#7dd3fc';
      tabAdm.style.borderColor = 'transparent'; tabAdm.style.background = 'transparent'; tabAdm.style.color = '#94a3b8';
      titleEl.textContent = 'Личный чат с Отделом доставки';
      inp.placeholder = 'Сообщение в отдел доставки...';
      markDmSeen("dlv");
      renderDmRows();
    };

    const sendMsg = async () => {
      const txt = inp.value.trim(); if (!txt) return;
      const myUid = ls("ADM_UID") || "";
      if (!myUid || !window.firebase || !firebase.apps || !firebase.apps.length){ window.toast && toast("Нет соединения с сервером", "err"); return; }
      inp.value = ""; snd.disabled = true;
      try {
        const path = "dm/" + myUid + (_dmActiveCh === "dlv" ? "/dlv" : "/adm");
        const ref = firebase.database().ref(path);
        await ref.push({ uid: myUid, name: ls("USER_NAME") || "Водитель", adm: false, txt: txt, t: firebase.database.ServerValue.TIMESTAMP });
      } catch(e){ inp.value = txt; window.toast && toast("Не удалось отправить сообщение", "err"); }
      snd.disabled = false; inp.blur();
    };
    snd.onclick = sendMsg;
    inp.onkeydown = e => { if (e.key === "Enter"){ e.preventDefault(); sendMsg(); } };

    m.classList.add("open");
    renderDmRows();
    markDmSeen(_dmActiveCh);
  }
  window.openDmChat = openDmChat;
  function bindDm(){
    const myUid = ls("ADM_UID") || "";
    if (_dmBound || !myUid || !window.firebase || !firebase.apps || !firebase.apps.length) return;
    _dmBound = true;
    firebase.database().ref("dm/" + myUid).on("value", snap => {
      const val = snap.val() || {};
      const parseList = data => {
        if (!data || typeof data !== "object") return [];
        return Object.keys(data).map(k => Object.assign({ k: k }, data[k])).sort((a, b) => (+a.t || 0) - (+b.t || 0)).slice(-50);
      };
      let nextAdm = [], nextDlv = [];
      if (val.dlv && typeof val.dlv === "object") {
        nextDlv = parseList(val.dlv);
        const admRaw = (val.adm && typeof val.adm === "object") ? val.adm : (Array.isArray(val) ? {} : val);
        nextAdm = parseList(admRaw);
      } else if (val.adm && typeof val.adm === "object") {
        nextAdm = parseList(val.adm);
      } else {
        nextAdm = parseList(val);
      }
      const combined = [...nextAdm, ...nextDlv];
      if (_dmInit) {
        const fresh = combined.filter(m => (+m.t || 0) > _dmLastNotifT && !!m.adm);
        if (fresh.length) {
          const lastMsg = fresh[fresh.length - 1];
          _dmLastNotifT = +lastMsg.t || Date.now();
          lsSet("DM_NOTIF_T", String(_dmLastNotifT));
          if (!_dmOpen || document.hidden) {
            const isDlv = lastMsg.role === "delivery" || lastMsg.name === "Доставка";
            pushSysNotify(isDlv ? "👩‍💼 Отдел доставки" : "👑 Админ (лично)", String(lastMsg.txt || "").slice(0, 140), { tag: "eurobaza-dm", action: "OPEN_DM" });
          }
        }
      } else if (combined.length) {
        const mx = Math.max.apply(null, combined.map(m => +m.t || 0));
        if (mx > _dmLastNotifT){ _dmLastNotifT = mx; lsSet("DM_NOTIF_T", String(_dmLastNotifT)); }
      }
      _dmInit = true;
      _dmList = nextAdm;
      _dmDlvList = nextDlv;
      if (_dmOpen && !document.hidden){ markDmSeen(_dmActiveCh); renderDmRows(); } else updBadges();
    }, () => {});
  }
  function openUserSettings(){
    let m = g("setMdl");
    if (m) m.remove();
    const curNav = ls("NAV") === "ya" ? "ya" : "sys";
    const curShift = ls("SHIFT_MODE") === "night" ? "night" : "day";
    const curLang = (window.getLang && window.getLang()) || ls("LANG") || "ru";
    const vibOn = ls("NO_VIB") !== "1";

    m = document.createElement("div");
    m.id = "setMdl";
    m.className = "cm open";
    m.innerHTML = '<div class="ios-set">'
      + '<div class="sheet-grab"></div>'
      + '<div class="ios-set-hd"><b>Настройки</b><button type="button" class="ios-set-x" id="stX" aria-label="Закрыть">✕</button></div>'
      + '<div class="ios-set-body">'
      + '<div class="ios-sec-t">Маршрут и навигация</div>'
      + '<div class="ios-grp">'
      + '  <div class="ios-row"><div><div class="ios-row-t">Навигатор</div><div class="ios-row-s">Приложение для ведения</div></div><div class="ios-seg" id="stNav"><button type="button" data-v="sys" class="'+(curNav==="sys"?"on":"")+'">Системный</button><button type="button" data-v="ya" class="'+(curNav==="ya"?"on":"")+'">Яндекс</button></div></div>'
      + '  <div class="ios-row"><div><div class="ios-row-t">Смена</div><div class="ios-row-s">Объезд Покр Кентрона днём</div></div><div class="ios-seg" id="stShift"><button type="button" data-v="day" class="'+(curShift==="day"?"on":"")+'">День</button><button type="button" data-v="night" class="'+(curShift==="night"?"on":"")+'">Ночь</button></div></div>'
      + '</div>'
      + '<div class="ios-sec-t">Интерфейс</div>'
      + '<div class="ios-grp">'
      + '  <div class="ios-lang-seg" id="stLang"><button type="button" data-v="ru" class="'+(curLang==="ru"?"on":"")+'">Русский</button><button type="button" data-v="hy" class="'+(curLang==="hy"?"on":"")+'">Հայերեն</button><button type="button" data-v="en" class="'+(curLang==="en"?"on":"")+'">English</button></div>'
      + '  <div class="ios-row"><div><div class="ios-row-t">Тактильный отклик</div><div class="ios-row-s">Вибрация при нажатиях</div></div><div id="stVib" class="ios-sw '+(vibOn?"on":"")+'" role="switch"></div></div>'
      + '</div>'
      + '<div class="ios-sec-t">Безопасность</div>'
      + '<div class="ios-grp"><div class="ios-pin-box"><input id="stOldPin" type="tel" inputmode="numeric" maxlength="4" placeholder="Старый ПИН"><input id="stNewPin" type="tel" inputmode="numeric" maxlength="4" placeholder="Новый ПИН"><button type="button" id="stSavePin">Изменить</button></div></div>'
      + '<div class="ios-grp" style="margin-bottom:0"><button type="button" class="ios-act-btn" id="stUpdBtn">Обновить версию приложения</button></div>'
      + '</div></div>';
    document.body.appendChild(m);

    const close = () => m.remove();
    m.addEventListener("touchmove", ev => { if (!ev.target.closest(".ios-set-body")) ev.preventDefault(); }, { passive: false });
    g("stX").onclick = close;
    m.onclick = ev => { if (ev.target === m) close(); };

    m.querySelectorAll("#stNav button").forEach(b => b.onclick = () => {
      lsSet("NAV", b.dataset.v);
      m.querySelectorAll("#stNav button").forEach(x => x.classList.toggle("on", x === b));
      if (window.mountNavSwitch) window.mountNavSwitch();
      window.toast && toast(b.dataset.v === "ya" ? "Откроется Яндекс Навигатор" : "Откроется навигатор по умолчанию");
    });

    m.querySelectorAll("#stShift button").forEach(b => b.onclick = () => {
      if (window.setShift) window.setShift(b.dataset.v);
      else lsSet("SHIFT_MODE", b.dataset.v);
      m.querySelectorAll("#stShift button").forEach(x => x.classList.toggle("on", x === b));
    });

    m.querySelectorAll("#stLang button").forEach(b => b.onclick = () => {
      if (window.setAppLang) window.setAppLang(b.dataset.v);
      m.querySelectorAll("#stLang button").forEach(x => x.classList.toggle("on", x === b));
    });

    const sw = g("stVib");
    sw.onclick = () => {
      const next = !sw.classList.contains("on");
      sw.classList.toggle("on", next);
      if (next) lsDel("NO_VIB"); else lsSet("NO_VIB", "1");
      if (next && window.vib) window.vib(40);
    };

    const p1 = g("stOldPin"), p2 = g("stNewPin");
    [p1, p2].forEach(el => el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, "").slice(0, 4); }));
    g("stSavePin").onclick = async () => {
      const key = ls("USER_KEY"), oldV = p1.value.trim(), newV = p2.value.trim();
      if (!key) return;
      if (!/^\d{4}$/.test(oldV) || !/^\d{4}$/.test(newV)) { window.toast && toast("Введите 4 цифры старого и нового ПИН-кода", "err"); return; }
      if (!window.firebase || !firebase.apps || !firebase.apps.length) { window.toast && toast("Нет соединения с сервером", "err"); return; }
      try {
        const ref = firebase.database().ref("accounts/" + key + "/pin");
        const snap = await ref.once("value");
        if (String(snap.val() || "") !== oldV) { window.toast && toast("Неверный старый ПИН-код", "err"); p1.focus(); return; }
        await ref.set(newV);
        p1.value = ""; p2.value = "";
        window.toast && toast("ПИН-код успешно изменён");
      } catch(err) { window.toast && toast("Ошибка сохранения", "err"); }
    };

    g("stUpdBtn").onclick = async () => {
      try {
        if ("caches" in window) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); }
        if ("serviceWorker" in navigator) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.update().catch(()=>{}))); }
      } catch(err) {}
      location.reload();
    };
  }
  function pickLocalAvatar(){
  return new Promise(res=>{
    const i=document.createElement("input");i.type="file";i.accept="image/*";
    i.onchange=()=>{
      const f=i.files&&i.files.item(0);if(!f)return res(null);
      const u=URL.createObjectURL(f),img=new Image();
      img.onload=()=>{
        URL.revokeObjectURL(u);
        const sz=140,c=document.createElement("canvas");c.width=sz;c.height=sz;
        const m=Math.min(img.width,img.height);
        c.getContext("2d").drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,sz,sz);
        res(c.toDataURL("image/jpeg",0.72));
      };
      img.onerror=()=>{URL.revokeObjectURL(u);res(null)};img.src=u;
    };i.click();
  });
}
function openProfileMenu(){
  reqNotifyPerm();
  let m=g("profMdl");if(m)m.remove();
  const nm=ls("USER_NAME")||"Водитель",car=(ls("USER_CAR")||"").toUpperCase(),av=ls("USER_AVATAR")||"";
  m=document.createElement("div");m.id="profMdl";m.className="cm sheet-ov open";
  m.innerHTML='<div class="sheet-b"><div class="sheet-grab"></div><button type="button" class="sheet-x" id="pmX">✕</button>'
    +'<div class="sh-head"><div class="sh-av-wrap" id="pmAvBtn"><div class="sh-av" id="pmAvBox">'+(av?'<img src="'+av+'">':esc(nm.trim().slice(0,2).toUpperCase()))+'</div><span class="sh-cam">📷</span></div>'
    +'<div class="sh-name">'+esc(nm)+'</div>'
    +'<div class="sh-meta"><span class="sh-dot"></span><span>В сети</span>'+(car&&car!=="ADMIN"?' · <b style="color:#6ee7b7">Экипаж '+esc(car)+'</b>':'')+'</div></div>'
    +'<div class="sh-group">'
    +'<button type="button" class="sh-row" id="pmDm"><span class="sh-ico" style="background:rgba(56,189,248,.16);color:#38bdf8">✉️</span><span class="sh-lbl">Личные сообщения</span><span id="pmDmBadge" class="pm-bdg" hidden>0</span><span class="sh-chev">›</span></button>'
    +'<button type="button" class="sh-row" id="pmSet"><span class="sh-ico" style="background:rgba(148,163,184,.16);color:#e2e8f0">⚙️</span><span class="sh-lbl">Настройки</span><span class="sh-chev">›</span></button>'
    +'<button type="button" class="sh-row" id="pmAdm"><span class="sh-ico" style="background:rgba(250,204,21,.15);color:#fde047">🛡️</span><span class="sh-lbl">Админ-панель</span><span class="sh-chev">›</span></button>'
    +'</div><div class="sh-group" style="margin-top:10px">'
    +'<button type="button" class="sh-row sh-danger" id="pmOut"><span class="sh-ico" style="background:rgba(239,68,68,.15);color:#f87171">🚪</span><span class="sh-lbl">Выйти из аккаунта</span></button>'
    +'</div><div id="pmVer" class="sh-ver"></div></div>';
  document.body.appendChild(m);
  const close=()=>m.remove();
  m.onclick=ev=>{if(ev.target===m)close()};g("pmX").onclick=close;
  g("pmAvBtn").onclick=async()=>{const d=await pickLocalAvatar();if(!d)return;lsSet("USER_AVATAR",d);const b=g("pmAvBox");if(b)b.innerHTML='<img src="'+d+'">';window.toast&&toast("Фото сохранено")};
  g("pmDm").onclick=()=>{close();openDmChat()};
  g("pmSet").onclick=()=>{close();openUserSettings()};
  g("pmAdm").onclick=()=>{close();location.href="admin.html"};
  if(window.getVerText)window.getVerText(v=>{const ve=g("pmVer");if(ve)ve.textContent=v});
  g("pmOut").onclick=async()=>{close();if(typeof askC==="function"&&!(await askC("Выйти из профиля «"+nm+"» на этом телефоне? Данные останутся в облаке.","Выйти","👤")))return;lsDel("USER_NAME");lsDel("USER_KEY");lsDel("ADM_UID");lsDel("USER_CAR");lsDel("BON");lsDel("BON_HIST");lsDel("SPEC");lsDel("USER_AVATAR");location.replace(location.pathname)};
  updBadges();
}
let _blkBound = false;
  function bindBlockWatch(){
    if (_blkBound || !window.firebase || !firebase.apps || !firebase.apps.length) return;
    _blkBound = true;
    const db = firebase.database();
    const uid = ls("ADM_UID"), key = ls("USER_KEY"), devId = getDevId();
    const kick = (byDev) => {
      if (byDev) _devBlocked = true;
      try { if (uid) db.ref("online/" + uid).remove(); } catch(e){}
      lsDel("USER_NAME"); lsDel("USER_KEY"); lsDel("ADM_UID"); lsDel("USER_CAR"); lsDel("BON"); lsDel("BON_HIST"); lsDel("SPEC");
      ensureModal();
      const err = g("auErr"), btn = g("auGo");
      if (err) err.textContent = byDev ? "Это устройство заблокировано администратором" : "Ваш профиль заблокирован администратором";
      if (btn && byDev) btn.disabled = true;
      const ub = g("usrBtn"); if (ub) ub.remove();
    };
    db.ref("accounts/__dev_" + devId + "/blocked").on("value", s => {
      if (s.val()) kick(true);
      else if (_devBlocked){ _devBlocked = false; const err = g("auErr"), btn = g("auGo"); if (err) err.textContent = ""; if (btn) btn.disabled = false; }
    }, () => {});
    if (uid) db.ref("users/" + uid + "/blocked").on("value", s => { if (s.val()) kick(false); }, () => {});
    if (key) db.ref("accounts/" + key + "/blocked").on("value", s => { if (s.val()) kick(false); }, () => {});
  }
  let _chatInit = false, _lastNotifiedT = +(ls("CHAT_NOTIF_T") || 0);
  function reqNotifyPerm(){
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    } catch(e){}
  }
  function pushSysNotify(title, body, opts){
    opts = opts || {};
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "NOTIFY",
          title: title,
          body: body,
          tag: opts.tag || "eurobaza-chat",
          action: opts.action || "OPEN_CHAT",
          uid: opts.uid || "",
          url: "./"
        });
        return;
      }
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(reg => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, {
              body: body,
              icon: "icon-192.png",
              badge: "icon-192.png",
              tag: opts.tag || "eurobaza-chat",
              renotify: true,
              vibrate: new Array(180, 90, 180)
            });
          }
        }).catch(() => {});
        return;
      }
      new Notification(title, { body: body, icon: "icon-192.png", tag: opts.tag || "eurobaza-chat" });
    } catch(e){}
  }
  function bindChat(){
    if (_chatBound || !window.firebase || !firebase.apps || !firebase.apps.length) return;
    _chatBound = true;
    firebase.database().ref("chat").limitToLast(50).on("value", snap => {
      const val = snap.val() || {};
      const nextList = Object.keys(val).map(k => Object.assign({ k: k }, val[k])).sort((a, b) => (+a.t || 0) - (+b.t || 0));
      const myUid = ls("ADM_UID") || "";
      if (_chatInit && myUid) {
        const fresh = nextList.filter(m => (+m.t || 0) > _lastNotifiedT && m.uid !== myUid);
        if (fresh.length) {
          const lastMsg = fresh[fresh.length - 1];
          _lastNotifiedT = +lastMsg.t || Date.now();
          lsSet("CHAT_NOTIF_T", String(_lastNotifiedT));
          if (!_chatOpen || document.hidden) {
            const sender = lastMsg.adm ? ((lastMsg.role === "delivery" || lastMsg.name === "Доставка") ? "👩‍💼 Доставка" : "👑 Админ") : (lastMsg.name || "Водитель");
            pushSysNotify(sender, String(lastMsg.txt || "").slice(0, 140));
          }
        }
      } else if (nextList.length) {
        const mx = Math.max.apply(null, nextList.map(m => +m.t || 0));
        if (mx > _lastNotifiedT) {
          _lastNotifiedT = mx;
          lsSet("CHAT_NOTIF_T", String(_lastNotifiedT));
        }
      }
      _chatInit = true;
      _chatList = nextList;
      if (_chatOpen && !document.hidden){ markChatSeen(); renderChatRows(); } else updBadges();
    }, () => {});
  }
  function renderUserBtn(){
    const hdr = document.querySelector("h2"), uname = ls("USER_NAME");
    if (!hdr || !uname) return;
    let left = g("hdrLeft");
    if (!left){
      const titleSpan = hdr.querySelector("span");
      if (!titleSpan) return;
      left = document.createElement("div");
      left.id = "hdrLeft";
      left.className = "hdr-l";
      titleSpan.before(left);
      left.appendChild(titleSpan);
    }
    let b = g("usrBtn");
    if (!b){
      b = document.createElement("button");
      b.id = "usrBtn";
      b.type = "button";
      b.className = "hdr-usr";
      left.appendChild(b);
    }
    b.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>' + esc(uname) + '</span><span id="usrBadge" class="usr-bdg" hidden>0</span>';
    b.onclick = openProfileMenu; updBadges();
  }
  function boot(){
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", e => {
        if (e.data && ls("USER_NAME")) { if (e.data.type === "OPEN_DM") openDmChat(); else if (e.data.type === "OPEN_CHAT") openChat(); }
      });
    }

    renderUserBtn();
    const lockBack = () => {
      if (ls("USER_NAME")) return;
      ensureModal();
      try {
        history.pushState({ authLock: 1 }, "", location.href);
        history.pushState({ authLock: 2 }, "", location.href);
      } catch(e){}
    };
    if (!ls("USER_NAME")) lockBack();
    window.addEventListener("popstate", () => {
      if (!ls("USER_NAME")){
        ensureModal();
        try { history.pushState({ authLock: 1 }, "", location.href); } catch(e){}
      }
    });
    window.addEventListener("pageshow", () => { if (!ls("USER_NAME")) lockBack(); });
    let tries = 0; const w = setInterval(() => { if (++tries > 60) clearInterval(w); else if (window.firebase && firebase.apps && firebase.apps.length){ clearInterval(w); bindChat(); bindDm(); bindBlockWatch(); } }, 500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
