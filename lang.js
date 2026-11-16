// lang.js — независимое переключение языка.
(function(){
  'use strict';
  const LANGS = { ru:'Русский', hy:'Հայերեն', en:'English' };
  function curLang(){ try{ return localStorage.getItem('LANG') || 'ru'; }catch(e){ return 'ru'; } }
  
  function applyLang(l){
    if(!LANGS[l]) return;
    try{ localStorage.setItem('LANG', l); }catch(e){}
    document.documentElement.lang = l;
    if(typeof window.setLang === 'function'){
      try{ window.setLang(l); return; }catch(e){}
    }
    setTimeout(()=>location.reload(), 30);
  }

  function ensureDialog(){
    let m = document.getElementById('lgM');
    if(m) return m;
    m = document.createElement('div');
    m.id = 'lgM'; m.className = 'cm';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;padding:20px;';
    const html = Object.keys(LANGS).map(k => '<button data-l="'+k+'" style="width:100%;margin:0 0 8px;padding:14px;font-size:16px;border-radius:14px;border:1px solid rgba(255,255,255,.25);background:rgba(28,38,52,.95);color:#fff;font-weight:600;cursor:pointer;">'+LANGS[k]+'</button>').join('');
    m.innerHTML = '<div style="width:100%;max-width:340px;background:#121924;border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:22px 20px;box-shadow:0 14px 40px rgba(0,0,0,.65);"><div style="text-align:center;font-size:34px;margin-bottom:8px;">🌐</div><div style="text-align:center;font-size:17px;font-weight:600;margin-bottom:18px;color:#f8fafc;">Язык / Լեզու / Language</div>' + html + '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function(e){
      if(e.target === m){ m.style.display='none'; return; }
      const b = e.target.closest('button[data-l]');
      if(!b) return;
      m.style.display='none';
      applyLang(b.dataset.l);
    });
    return m;
  }

  window.openLang = function(){
    const m = ensureDialog();
    const cur = curLang();
    m.querySelectorAll('button[data-l]').forEach(b=>{
      const on = b.dataset.l === cur;
      b.style.background = on ? 'rgba(16,185,129,.22)' : 'rgba(28,38,52,.95)';
      b.style.borderColor = on ? '#10b981' : 'rgba(255,255,255,.25)';
      b.style.color = on ? '#34d399' : '#fff';
    });
    m.style.display = 'flex';
  };

  function bindBtn(){
    const b = document.getElementById('lgBtn');
    if(!b) return;
    b.onclick = function(e){ e.preventDefault(); window.openLang(); };
    const l = curLang();
    b.textContent = '🌐 ' + (LANGS[l]||'Язык');
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindBtn);
  else bindBtn();
  setTimeout(bindBtn, 500); // На случай, если ui.js перерисует футер
})();
