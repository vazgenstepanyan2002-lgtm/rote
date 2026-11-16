(function(){
  const g = id => document.getElementById(id);
  // Используем тот же конфиг, что и в online.js
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCR8uHLrEMGDd-sbMIdaphuaRdFK3fNdng",
    databaseURL: "https://eurobaza-c5aa5-default-rtdb.europe-west1.firebasedatabase.app"
  };

  let db = null, chatRef = null, chatPush = null;
  let chatOpen = false;
  let userName = localStorage.getItem('CHAT_NAME') || 'Курьер';

  // --- UI ---
  function ensureUI(){
    if (g('chatFab')) return;
    
    // Кнопка
    const fab = document.createElement('button');
    fab.id = 'chatFab';
    fab.className = 'fab fab-c';
    fab.textContent = '💬';
    fab.onclick = openChat;
    document.body.appendChild(fab);

    // Окно
    const mdl = document.createElement('div');
    mdl.id = 'chatMdl';
    mdl.className = 'mdl chat-mdl';
    mdl.innerHTML = `
      <div class="mdl-b chat-b">
        <div class="mdl-h"><span>💬 Общий чат</span><button class="mdl-x" id="chatX">✕</button></div>
        <div id="chatMsgList"></div>
        <div class="chat-input-w">
          <input id="chatInp" placeholder="Сообщение..." autocomplete="off">
          <button id="chatSend">➤</button>
        </div>
      </div>
    `;
    document.body.appendChild(mdl);

    g('chatX').onclick = closeChat;
    g('chatSend').onclick = sendMsg;
    g('chatInp').onkeydown = e => { if(e.key === 'Enter') sendMsg(); };
    
    // Закрытие по клику вне окна
    mdl.onclick = e => { if(e.target === mdl) closeChat(); };

    // Кнопка "Назад" для закрытия чата
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

  function openChat(){
    ensureUI();
    g('chatMdl').classList.add('open');
    document.documentElement.classList.add('lock');
    document.body.classList.add('lock');
    // прокрутка вниз
    setTimeout(() => {
      const list = g('chatMsgList');
      if (list) list.scrollTop = list.scrollHeight;
    }, 100);
    g('chatInp').focus();
  }

  function closeChat(src){
    const mdl = g('chatMdl');
    if (!mdl || !mdl.classList.contains('open')) return;
    mdl.classList.remove('open');
    document.documentElement.classList.remove('lock');
    document.body.classList.remove('lock');
    g('chatInp').blur();
    if (src !== 'pop') {
      try { if(history.state && history.state.chat) setTimeout(()=>history.back(),0); } catch(e){}
    }
  }

  // --- Логика ---
  function initDB(){
    if (!window.firebase) return;
    try { firebase.initializeApp(FIREBASE_CONFIG); } catch(e){}
    db = firebase.database();
    chatRef = db.ref('chat').limitToLast(50);
    chatPush = db.ref('chat');
    
    // Слушаем изменения
    chatRef.on('child_added', snap => {
      const msg = snap.val();
      if (!msg) return;
      renderMsg(msg, snap.key);
    });
  }

  function renderMsg(msg, key){
    const list = g('chatMsgList');
    if (!list) return;
    
    // Проверка на дубликат
    if (g('msg_' + key)) return;

    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.id = 'msg_' + key;
    
    const time = new Date(msg.t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    div.innerHTML = `
      <div class="chat-meta">
        <span class="chat-author">${esc(msg.name || 'Курьер')}</span>
        <span class="chat-time">${time}</span>
      </div>
      <div class="chat-text">${esc(msg.text)}</div>
    `;
    
    list.appendChild(div);
    // Автоскролл, если мы внизу
    const isBottom = list.scrollHeight - list.scrollTop <= list.clientHeight + 50;
    if (isBottom) list.scrollTop = list.scrollHeight;
  }

  function sendMsg(){
    const inp = g('chatInp');
    const text = inp.value.trim();
    if (!text) return;
    
    if (!db) {
      if (window.toast) toast('Нет соединения с сервером', 'err');
      return;
    }

    chatPush.push({
      name: userName,
      text: text,
      t: Date.now()
    }).then(() => {
      inp.value = '';
      inp.focus();
    }).catch(err => {
      console.error('Ошибка Firebase:', err);
      if (window.toast) toast('Ошибка: ' + err.message, 'err');
    });
  }

  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // --- Загрузка SDK Firebase ---
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

  // --- Инициализация ---
  function boot(){
    ensureUI();
    loadSDK().then(initDB).catch(() => {
      console.log('Ошибка загрузки Firebase SDK для чата');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
