// AUTH-LIGHT: лёгкий вход по имени и 4-значному ПИН-коду
(function(){
  const g = id => document.getElementById(id);
  const ls = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const lsDel = k => { try { localStorage.removeItem(k); } catch(e){} };

  const normKey = s => String(s || "").trim().toLowerCase().replace(/[.#$\[\]\/]+/g, "_").replace(/\s+/g, " ");

  function ensureModal(){
    let m = g("authMdl");
    if (m) return m;
    m = document.createElement("div");
    m.id = "authMdl";
    m.className = "cm open";
    m.innerHTML = '<div class="cm-b auth-box">'
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

    async function submit(){
      err.textContent = "";
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
        const accRef = db.ref("accounts/" + key);
        const snap = await accRef.once("value");
        const acc = snap.val();

        if (acc){
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
          if (uData){
            if (typeof uData.hist === "string" && uData.hist.length > 2) lsSet("BON_HIST", uData.hist);
            if (typeof uData.bonRaw === "string" && uData.bonRaw.length > 2) lsSet("BON", uData.bonRaw);
          }
          m.remove();
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

  function renderUserBtn(){
    const ft = g("ft");
    const uname = ls("USER_NAME");
    if (!ft || !uname) return;
    let b = g("usrBtn");
    if (!b){ b = document.createElement("button"); b.id = "usrBtn"; ft.appendChild(b); }
    b.textContent = "👤 " + uname;
    b.onclick = async () => {
      if (typeof askC === "function"){
        const ok = await askC("Выйти из профиля «" + uname + "» на этом телефоне? Данные останутся в облаке.", "Выйти", "👤");
        if (!ok) return;
      }
      lsDel("USER_NAME"); lsDel("USER_KEY"); lsDel("ADM_UID"); lsDel("BON"); lsDel("BON_HIST");
      location.reload();
    };
  }

  function boot(){
    renderUserBtn();
    if (!ls("USER_NAME")) ensureModal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
