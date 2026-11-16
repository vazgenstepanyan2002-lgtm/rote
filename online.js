// ONLINE: счётчик присутствия через Firebase Realtime Database
(function(){
  const g = id => document.getElementById(id);
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCR8uHLrEMGDd-sbMIdaphuaRdFK3fNdng",
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
    b.textContent = '🟢 –';
    const h = document.querySelector('h2 .badge');
    if (h) h.after(b);
    else document.querySelector('h2')?.appendChild(b);
    return b;
  }

  function setCount(n){
    const b = ensureBadge();
    b.textContent = '🟢 ' + n;
    b.dataset.n = n;
  }

  let db = null, ref = null, hbTimer = null, renderTimer = null;
  const TTL = 60 * 1000, HB = 20 * 1000;
  let last = {};

  function start(){
    if (!window.firebase) return;
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e){ }
    db = firebase.database();
    ref = db.ref('online');
    ref.on('value', snap => { last = snap.val() || {}; render(); });

    const beat = () => {
      if (document.hidden) return;
      ref.child(MY_ID).set({ t: Date.now() }).catch(()=>{});
    };
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

  window.addEventListener('pagehide', () => { try { ref && ref.child(MY_ID).remove(); } catch(e){} });

  function boot(){
    ensureBadge();
    loadSDK().then(start).catch(() => {
      const b = ensureBadge();
      b.textContent = '🔴 –';
      b.title = 'Онлайн недоступен';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
