// ONLINE: счётчик присутствия через Firebase Realtime Database
(function(){
  const g = id => document.getElementById(id);
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCR8uHLrEMGDd-sbMidapnuaRdFK3fNdng",
    databaseURL: "https://eurobaza-c5aa5-default-rtdb.europe-west1.firebasedatabase.app"
  };

  function uid(){
    let u = null;
    try { u = localStorage.getItem('ONLINE_UID'); } catch(e){}
    if (!u){ u = 'u' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); try { localStorage.setItem('ONLINE_UID', u); } catch(e){} }
    return u;
  }
  const MY_ID = uid();

  function loadSDK(){
    return new Promise((res, rej) => {
      if (window.firebase && window.firebase.database) return res();
      const s1 = document.createElement('script');
      s1.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js';
        s2.onload = () => res();
        s2.onerror = () => rej(new Error('db sdk'));
        document.head.appendChild(s2);
      };
      s1.onerror = () => rej(new Error('app sdk'));
      document.head.appendChild(s1);
    });
  }

  function ensureBadge(){
    let b = g('onlineBadge');
    if (b) return b;
    b = document.createElement('span');
    b.id = 'onlineBadge';
    b.className = 'online-badge';
    b.title = 'Сейчас в приложении';
    b.innerHTML = '<i class="on-dot"></i><b id="onCnt">-</b>';
    const h = document.querySelector('h2 .badge');
    if (h) h.after(b);
    else document.querySelector('h2')?.appendChild(b);
    return b;
  }

  function setCount(n){
    const b = ensureBadge();
    const connState = window._firebaseConnected !== false && navigator.onLine;
    const dotClass = !navigator.onLine ? "on-dot off" : (window._firebaseConnected === false ? "on-dot connecting" : "on-dot");
    b.innerHTML = '<i class="' + dotClass + '"></i><b id="onCnt">' + n + '</b>';
    b.dataset.n = n;
  }

  let db = null, ref = null, hbTimer = null, renderTimer = null;
  const TTL = 60 * 1000, HB = 20 * 1000;
  let last = {};

  function syncConnStatus(connected){
    window._firebaseConnected = connected;
    const b = g('onlineBadge');
    if (!b) return;
    const dot = b.querySelector('.on-dot');
    if (!dot) return;
    if (!navigator.onLine){
      dot.className = 'on-dot off';
      b.title = 'Офлайн (нет интернета)';
    } else if (!connected){
      dot.className = 'on-dot connecting';
      b.title = 'Подключение к серверу...';
    } else {
      dot.className = 'on-dot';
      b.title = 'Сейчас в приложении: ' + (b.dataset.n || '1');
    }
  }

  function start(){
    if (!window.firebase) return;
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e){ }
    db = firebase.database();
    ref = db.ref('online');
    ref.on('value', snap => { last = snap.val() || {}; render(); });

    db.ref('.info/connected').on('value', snap => {
      syncConnStatus(!!snap.val());
    });
    window.addEventListener('online', () => syncConnStatus(true));
    window.addEventListener('offline', () => syncConnStatus(false));

    const beat = () => {
      if (document.hidden) return;
      let u = "", aid = ""; try { u = localStorage.getItem("USER_NAME") || ""; aid = localStorage.getItem("ADM_UID") || ""; } catch(e){}
      if (!u || !aid) return;
      ref.child(aid).set({ t: Date.now() }).catch(()=>{});
    };
    window._onlineBeatNow = beat;
    beat();
    hbTimer = setInterval(beat, HB);
    renderTimer = setInterval(render, 5000);

    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
  }

  function render(){
    const now = Date.now();
    let n = 0;
    for (const k in last){
      const t = last[k] && last[k].t;
      if (typeof t === 'number' && now - t < TTL) n++;
    }
    setCount(n);
  }

  window.addEventListener('pagehide', () => { try { const aid = localStorage.getItem('ADM_UID'); if (ref && aid) ref.child(aid).set({ t: 0 }).catch(() => {}); } catch(e){} });

  let _sdkStarted = false;
  function tryBootOnline(){
    if (_sdkStarted) return;
    ensureBadge();
    loadSDK().then(() => { _sdkStarted = true; start(); }).catch(() => {
      ensureBadge();
      syncConnStatus(false);
    });
  }
  function boot(){
    tryBootOnline();
    window.addEventListener('online', () => { if (!_sdkStarted) tryBootOnline(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

// ADMIN-SYNC: данные для административной панели (users/<id>) и команда обновления (config/forceUpdate)
(function(){
  const ls = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  // Отдельный закрытый идентификатор: не совпадает с публичным ONLINE_UID
  let AID = ls('ADM_UID') || '';
  let DEV_ID = ls('DEV_ID');
  if (!DEV_ID){ DEV_ID = 'd' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36); lsSet('DEV_ID', DEV_ID); }
  if (!ls('ADM_FIRST')) lsSet('ADM_FIRST', String(Date.now()));

  function curSummary(){
    let rows = [];
    try { rows = JSON.parse(ls('BON') || '[]'); } catch(e){}
    if (!Array.isArray(rows)) rows = [];
    let sum = 0, qty = 0;
    const cats = [];
    rows.forEach(c => {
      if (!c || !Array.isArray(c.subs)) return;
      let cs = 0, cq = 0;
      c.subs.forEach(s => {
        const q1 = +s.qty || 0, q2 = +s.qty2 || 0;
        cs += q1 * (+s.price || 0) + q2 * (+s.price2 || 0);
        cq += q1 + q2;
      });
      if (cq > 0) cats.push({ n: c.name, q: cq, s: cs });
      sum += cs; qty += cq;
    });
    return { sum: sum, qty: qty, cats: cats };
  }

  function payload(){
    const uname = ls('USER_NAME') || '';
    const ukey = ls('USER_KEY') || '';
    const rawBon = ls('BON');
    const specPts = ls('SPEC') || '';
    let addr = 0;
    try { addr = typeof P !== 'undefined' && Array.isArray(P) ? P.length : 0; } catch(e){}
    const out = {
      t: Date.now(),
      v: ls('APP_V') || '',
      lang: ls('LANG') || 'ru',
      ua: (navigator.userAgent || '').slice(0, 160),
      scr: screen.width + 'x' + screen.height,
      first: +ls('ADM_FIRST') || Date.now(),
      addr: addr,
      devId: DEV_ID,
      uname: uname,
      ukey: ukey,
      specPts: specPts,
      hist: ls('BON_HIST') || '{}'
    };
    if (rawBon !== null) {
      out.bonRaw = rawBon;
      out.cur = JSON.stringify(curSummary());
    }
    return out;
  }

  let dbRef = null, lastSig = '', lastUid = '';
  function push(){
    const curUid = ls("ADM_UID") || "";
    if (!dbRef || !curUid || !ls("USER_NAME") || !ls("USER_KEY")) return;
    const ref = dbRef.ref("users/" + curUid);
    if (curUid !== lastUid){ lastUid = curUid; lastSig = ""; }
    const p = payload();
    const sig = [p.devId, p.uname, p.ukey, p.cur, p.hist, p.specPts, p.v, p.lang, p.addr].join('|');
    if (sig === lastSig){ ref.child('t').set(Date.now()).catch(() => {}); return; }
    lastSig = sig;
    ref.update(p).catch(() => { lastSig = ''; });
  }

  // Принудительное обновление: применяется, когда в приложении ничего не заполняется
  let pendingFU = 0;
  function busy(){
    if (window._ocrScanning) return true;
    const g = id => document.getElementById(id);
    const open = id => g(id) && g(id).classList.contains('open');
    return !!((g('a') && g('a').value.trim()) || (g('pn') && g('pn').value.trim()) ||
      ['ptMdl','ptAddMdl','cm','mapM','bnMdl','chatMdl','dmMdl','setMdl','authMdl','profMdl','lgM','tvMdl','ocrBonMdl','ocrCatMdl','ocrSrcMdl','kzMdl'].some(open) || !!g('ocrLiveCam'));
  }
  async function applyFU(){
    lsSet('FU_SEEN', String(pendingFU));
    pendingFU = 0;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map(r => r.update().catch(() => {})));
      }
    } catch(e){}
    location.reload();
  }
  function tryFU(){
    if (pendingFU && !document.hidden && !busy()) applyFU();
  }

  function init(){
    const db = firebase.database();
    dbRef = db;

    let _watchedCarUid = "", _carRefW = null, _carFnW = null;
    const watchCar = () => {
      const uid = ls("ADM_UID") || "";
      if (!uid || uid === _watchedCarUid) return;
      if (_carRefW && _carFnW) { try { _carRefW.off("value", _carFnW); } catch(e){} }
      _watchedCarUid = uid;
      _carRefW = db.ref("users/" + uid + "/car");
      _carFnW = _carRefW.on("value", snap => {
        const c = String(snap.val() || "").trim().toUpperCase();
        lsSet("USER_CAR", c);
        if (window._setDriverCar) window._setDriverCar(c);
      }, () => {});
    };

    const normKey = s => String(s || "").trim().toLowerCase().replace(/[.#$\[\]\/]+/g, "_").replace(/\s+/g, " ");
    const applySrvName = val => {
      const srv = String(val || "").trim();
      if (!srv || srv === ls("USER_NAME")) return;
      lsSet("USER_NAME", srv);
      lsSet("USER_KEY", normKey(srv));
      lastSig = "";
      if (window._renderUserBtn) window._renderUserBtn();
      const pm = document.getElementById("profMdl");
      if (pm) {
        const sn = pm.querySelector(".sh-name");
        if (sn) sn.textContent = srv;
        const av = document.getElementById("pmAvBox");
        if (av && !av.querySelector("img")) av.textContent = srv.slice(0, 2).toUpperCase();
      }
    };
    let _watchedNameUid = "", _nameRefW = null, _nameFnW = null;
    const watchName = () => {
      const uid = ls("ADM_UID") || "";
      if (!uid || uid === _watchedNameUid) return;
      if (_nameRefW && _nameFnW) { try { _nameRefW.off("value", _nameFnW); } catch(e){} }
      _watchedNameUid = uid;
      _nameRefW = db.ref("users/" + uid + "/uname");
      _nameFnW = _nameRefW.on("value", snap => {
        applySrvName(snap.val());
      }, () => {});
    };

    watchCar();
    watchName();
    setInterval(() => { watchCar(); watchName(); }, 3000);

    window._admPushNow = push;
    const initUid = ls("ADM_UID") || "";
    if (initUid) {
      db.ref("users/" + initUid + "/uname").once("value").then(snap => {
        applySrvName(snap.val());
        push();
      }).catch(() => push());
    } else {
      push();
    }
    setInterval(() => { if (!document.hidden) push(); }, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden){ push(); tryFU(); } });
    db.ref('config/forceUpdate').on('value', snap => {
      const v = +snap.val() || 0;
      const seen = ls('FU_SEEN');
      if (seen === null){ lsSet('FU_SEEN', String(v)); return; }  // новое устройство: не перезагружаем
      if (v > (+seen || 0)){ pendingFU = v; tryFU(); }
    }, () => {});
    setInterval(tryFU, 10000);
  }

  let tries = 0;
  const wait = setInterval(() => {
    tries++;
    if (window.firebase && firebase.apps && firebase.apps.length && firebase.database){
      clearInterval(wait);
      init();
    } else if (tries > 60) clearInterval(wait);
  }, 500);
})();

// ADMIN-GEO: передача только текущего местоположения для карты админа
(function(){
  const ls = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  let lastGeo = 0;

  async function canLocate(){
    if(window.GeoService)return window.GeoService.hasPermission();
    if (!navigator.geolocation) return false;
    try {
      if (navigator.permissions && navigator.permissions.query){
        const st = await navigator.permissions.query({ name: "geolocation" });
        return st.state === "granted";
      }
    } catch(e){}
    return false;
  }

  async function sendGeo(){
    if (document.hidden || !ls("USER_NAME")) return;
    const now = Date.now();
    if (now - lastGeo < 25000) return;
    if (!(await canLocate())) return;
    const aid = ls("ADM_UID");
    if (!aid || !window.firebase || !firebase.apps || !firebase.apps.length) return;

    if (window.GeoService) {
      window.GeoService.getPosition({ timeout: 10000, maximumAge: 15000 }).then(g => {
        lastGeo = Date.now();
        firebase.database().ref("users/" + aid).update({
          lat: +g.lat.toFixed(6),
          lon: +g.lon.toFixed(6),
          spd: g.speed,
          gt: lastGeo
        }).catch(() => {});
      }).catch(() => {});
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
      lastGeo = Date.now();
      const lat = +pos.coords.latitude.toFixed(6);
      const lon = +pos.coords.longitude.toFixed(6);
      const spd = pos.coords.speed != null && isFinite(pos.coords.speed) ? Math.round(pos.coords.speed * 3.6) : null;
      firebase.database().ref("users/" + aid).update({
        lat: lat,
        lon: lon,
        spd: spd,
        gt: lastGeo
      }).catch(() => {});
    }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 });
  }

  setInterval(sendGeo, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(sendGeo, 1500); });
  setTimeout(sendGeo, 4000);
})();
