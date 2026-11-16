/* CHAT v5: Финальная версия */
(function(){
  const g = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCR8uHLrEMGDd-sbMIdaphuaRdFK3fNdng",
    databaseURL: "https://eurobaza-c5aa5-default-rtdb.europe-west1.firebasedatabase.app"
  };
  const LIMIT = 50;
  let db = null, chatRef = null, chatPush = null;
  let userName = localStorage.getItem('CHAT_NAME') || '';

  // Сброс застрявших имен
  if (userName === 'Курьер' || userName === 'null') { try { localStorage.removeItem('CHAT_NAME'); } catch(e){} userName = ''; }

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

  function ensureUI(){
    if (g('chatFab')) return;
    const fab = document.createElement('button');
    fab.id = 'chatFab'; fab.className = 'fab fab-c'; fab.textContent = '💬';
    fab.onclick = openChat;
    document.body.appendChild(fab);

    const mdl = document.createElement('div');
    mdl.id = 'chatMdl'; mdl.className = 'mdl chat-mdl';
    mdl.innerHTML = `
      <div class="mdl-b chat-b">
        <div class="mdl-h"><span>💬 Общий чат</span>
          <span style="display:flex;gap:6px;align-items:center">
            <button class="mdl-x" id="chatNameBtn" title="Сменить имя">✏️</button>
            <button class="mdl-x" id="chatX">✕</button>
          </span>
        </div>
        <div id="chatMsgList"></div>
        <div class="chat-input-w">
          <input id="chatInp" placeholder="Сообщение..." autocomplete="off">
          <button id="chatSend">➤</button>
        </div>
      </div>`;
    document.body.appendChild(mdl);

    g('chatX').onclick = () => closeChat();
    g('chatSend').onclick = sendMsg;
    g('chatInp').onkeydown = e => { if(e.key === 'Enter') sendMsg(); };
    g('chatNameBtn').onclick = askName;
    mdl.onclick = e => { if(e.target === mdl) closeChat(); };

    let wasOpen = false;
    new MutationObserver(() => {
      const now = mdl.classList.contains('open');
      if (now === wasOpen) return;
      wasOpen = now;
      if (now) { try { history.pushState({chat:1},''); } catch(e){} }
      else { try { if(history.state && history.state.chat) setTimeout(()=>history.back(),0); } catch(e){} }
    }).observe(mdl, {attributes:true, attributeFilter:['class']});
    window.addEventListener('popstate', () => {
      if (mdl.classList.contains('open')) closeChat('pop');
    });
  }

  function askName(){
    if (g('chatNameM') && g('chatNameM').classList.contains('open')) return;
    const m = document.createElement('div');
    m.id = 'chatNameM'; m.className = 'cm';
    m.innerHTML = `<div class="cm-b">
      <div class="cm-i">✏️</div>
      <div class="cm-t">Ваше имя</div>
      <div style="margin-bottom:14px"><input id="chatNameInp" maxlength="20" placeholder="Например: Артак" style="width:100%;height:44px;padding:0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(15,23,34,.82);color:#fff;font-size:16px;outline:none"></div>
      <div class="cm-r"><button id="chatNameNo">Отмена</button><button id="chatNameOk" class="cm-ok">Сохранить</button></div>
    </div>`;
    document.body.appendChild(m);
    g('chatNameInp').value = userName || '';
    const done = (save) => {
      if (save) {
        const v = g('chatNameInp').value.trim();
        if (!v) { if (window.toast) toast('Введите имя','err'); return; }
        userName = v;
        try { localStorage.setItem('CHAT_NAME', v); } catch(e){}
        if (window.toast) toast('Имя сохранено');
        if (window.vib) vib(40);
      }
      m.classList.remove('open');
    };
    g('chatNameOk').onclick = () => done(true);
    g('chatNameNo').onclick = () => done(false);
    m.onclick = e => { if (e.target === m) done(false); };
    m.classList.add('open');
    setTimeout(()=>g('chatNameInp').focus(), 50);
  }

  function openChat(){
    ensureUI();
    g('chatMdl').classList.add('open');
    document.documentElement.classList.add('lock');
    document.body.classList.add('lock');
    if (window.vib) vib(40);
    
    if (!userName) { setTimeout(askName, 100); }
    
    setTimeout(() => { const l = g('chatMsgList'); if (l) l.scrollTop = l.scrollHeight; }, 100);
    const inp = g('chatInp'); if (inp && userName) inp.focus();
  }

  function closeChat(src){
    const mdl = g('chatMdl');
    if (!mdl || !mdl.classList.contains('open')) return;
    mdl.classList.remove('open');
    document.documentElement.classList.remove('lock');
    document.body.classList.remove('lock');
    const inp = g('chatInp'); if (inp) inp.blur();
    if (src !== 'pop') { try { if(history.state && history.state.chat) setTimeout(()=>history.back(),0); } catch(e){} }
  }

  function initDB(){
    if (!window.firebase) return;
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    } catch(e){}
    db = firebase.database();
    chatRef = db.ref('chat').limitToLast(LIMIT);
    chatPush = db.ref('chat');
    chatRef.on('child_added', snap => {
      const msg = snap.val();
      if (!msg) return;
      renderMsg(msg, snap.key);
    });
  }

  function renderMsg(msg, key){
    const list = g('chatMsgList');
    if (!list) return;
    if (g('msg_' + key)) return;
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.id = 'msg_' + key;
    
    // Проверка на "моё" сообщение для стилизации
    const isMe = (msg.name === userName);
    if (isMe) div.classList.add('my-msg');

    const time = new Date(msg.t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    // ТУТ ПРОБЕЛ МЕЖДУ ИМЕНЕМ И ВРЕМЕНЕМ
    div.innerHTML = `<div class="chat-meta"><span class="chat-author">${esc(msg.name || 'Курьер')}</span> <span class="chat-time">${time}</span></div><div class="chat-text">${esc(msg.text)}</div>`;
    list.appendChild(div);
    const isBottom = list.scrollHeight - list.scrollTop <= list.clientHeight + 50;
    if (isBottom) list.scrollTop = list.scrollHeight;
  }

  function sendMsg(){
    const inp = g('chatInp');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    if (!userName) { askName(); return; }
    if (navigator.onLine === false) { if (window.toast) toast('Нет интернета','err'); return; }
    if (!db) { if (window.toast) toast('Нет соединения с сервером','err'); return; }
    if (window.vib) vib(40);
    
    // УБРАЛИ inp.focus() ОТСЮДА, ЧТОБЫ КЛАВИАТУРА НЕ ВЫСКАКИВАЛА
    chatPush.push({ name: userName, text: text, t: Date.now() })
      .then(() => { inp.value = ''; })
      .catch(err => { if (window.toast) toast('Ошибка: ' + err.message, 'err'); });
  }

  function boot(){
    ensureUI();
    loadSDK().then(initDB).catch(() => { if (window.toast) toast('Не удалось загрузить чат','err'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
