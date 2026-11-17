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
    m.querySelectorAll("[data-al]").forEach(b => {
      b.onclick = () => {
        if (window.setAppLang) window.setAppLang(b.dataset.al);
        updLangBtns();
      };
    });
    updLangBtns();

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
          }
          m.remove();
          if (window._onlineBeatNow) window._onlineBeatNow();
          if (window._onlineBeatNow) window._onlineBeatNow();
          if (window._admPushNow) window._admPushNow();
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
    if (maxT > 0) lsSet("CHAT_SEEN", String(maxT));
    updBadges();
  }
  function updBadges(){
    const n = unreadCount(), txt = n > 99 ? "99+" : String(n);
    ["usrBadge", "pmChatBadge"].forEach(id => { const el = g(id); if (el){ el.textContent = txt; el.hidden = n === 0; } });
  }
  function renderChatRows(){
    const box = g("chatMsgs"); if (!box) return;
    const myUid = ls("ADM_UID") || "";
    if (!_chatList.length){ box.innerHTML = '<div class="ch-empty">Сообщений пока нет. Напишите первым!</div>'; return; }
    box.innerHTML = _chatList.map(m => {
      const mine = m.uid && m.uid === myUid, isAdm = !!m.adm;
      const author = isAdm ? '<div class="ch-au">👑 Админ</div>' : (!mine ? '<div class="ch-au">' + esc(m.name || "Водитель") + '</div>' : '');
      return '<div class="ch-msg' + (mine ? " mine" : "") + (isAdm ? " adm" : "") + '">' + author + '<div class="ch-body"><span class="ch-txt">' + esc(m.txt || "") + '</span><span class="ch-tm">' + fmtTime(m.t) + '</span></div></div>';
    }).join("");
    box.scrollTop = box.scrollHeight;
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
          const s = await ref.once("value"), av = s.val() || {};
          const ks = Object.keys(av).sort((a, b) => (+av[a].t || 0) - (+av[b].t || 0));
          if (ks.length > 50) ks.slice(0, ks.length - 50).forEach(k => ref.child(k).remove().catch(() => {}));
        } catch(e){ inp.value = txt; window.toast && toast("Не удалось отправить сообщение", "err"); }
        snd.disabled = false; inp.blur();
      };
      snd.onclick = sendMsg;
      inp.onkeydown = e => { if (e.key === "Enter"){ e.preventDefault(); sendMsg(); } };
    }
    m.classList.add("open"); renderChatRows();
    
  }
  function openProfileMenu(){
    reqNotifyPerm();
    let m = g("profMdl");
    if (!m){
      m = document.createElement("div"); m.id = "profMdl"; m.className = "cm";
      m.innerHTML = '<div class="cm-b pm-box"><button type="button" class="pm-x" id="pmX" aria-label="Закрыть">✕</button><div class="pm-top"><div class="pm-ring"><div class="pm-av"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div></div><div class="pm-info"><div class="pm-pill"><i></i>Driver Profile</div><div class="pm-nm" id="pmTitle"></div><div class="pm-sb">Профиль водителя</div></div></div><div class="pm-acts"><button type="button" class="pm-btn pm-chat" id="pmChat"><span class="pm-btn-l"><span class="pm-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span><span class="pm-tx"><b>Общий чат</b><small>Канал водителей EuroBaza</small></span></span><span class="pm-btn-r"><span id="pmChatBadge" class="pm-bdg" hidden>0</span><span class="pm-arr">›</span></span></button><button type="button" class="pm-btn pm-out" id="pmOut"><span class="pm-btn-l"><span class="pm-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span><span class="pm-tx"><b>Выйти</b><small>Сменить водителя на телефоне</small></span></span><span class="pm-arr">›</span></button></div><button type="button" class="pm-cls" id="pmCls">Закрыть</button></div>';
      document.body.appendChild(m);
      const close = () => m.classList.remove("open");
      m.onclick = e => { if (e.target === m) close(); };
      g("pmCls").onclick = close; g("pmX").onclick = close;
      g("pmChat").onclick = () => { close(); openChat(); };
      g("pmOut").onclick = async () => {
        close(); const cur = ls("USER_NAME") || "";
        if (typeof askC === "function" && !(await askC("Выйти из профиля «" + cur + "» на этом телефоне? Данные останутся в облаке.", "Выйти", "👤"))) return;
        lsDel("USER_NAME"); lsDel("USER_KEY"); lsDel("ADM_UID"); lsDel("BON"); lsDel("BON_HIST"); lsDel("SPEC"); location.replace(location.pathname);
      };
    }
    g("pmTitle").textContent = ls("USER_NAME") || ""; updBadges(); m.classList.add("open");
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
      lsDel("USER_NAME"); lsDel("USER_KEY"); lsDel("ADM_UID"); lsDel("BON"); lsDel("BON_HIST"); lsDel("SPEC");
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
  function pushSysNotify(title, body){
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "NOTIFY",
          title: title,
          body: body,
          tag: "eurobaza-chat",
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
              tag: "eurobaza-chat",
              renotify: true,
              vibrate: new Array(180, 90, 180)
            });
          }
        }).catch(() => {});
        return;
      }
      new Notification(title, { body: body, icon: "icon-192.png", tag: "eurobaza-chat" });
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
            const sender = lastMsg.adm ? "👑 Админ" : (lastMsg.name || "Водитель");
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
    const ft = g("ft"), uname = ls("USER_NAME"); if (!ft || !uname) return;
    let b = g("usrBtn"); if (!b){ b = document.createElement("button"); b.id = "usrBtn"; ft.appendChild(b); }
    if (!g("ft-br")){ const br = document.createElement("div"); br.id = "ft-br"; ft.appendChild(br); }
    b.innerHTML = '<span>👤 ' + esc(uname) + '</span><span id="usrBadge" class="usr-bdg" hidden>0</span>';
    b.onclick = openProfileMenu; updBadges();
  }
  function boot(){
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", e => {
        if (e.data && e.data.type === "OPEN_CHAT" && ls("USER_NAME")) openChat();
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
    let tries = 0; const w = setInterval(() => { if (++tries > 60) clearInterval(w); else if (window.firebase && firebase.apps && firebase.apps.length){ clearInterval(w); bindChat(); bindBlockWatch(); } }, 500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
