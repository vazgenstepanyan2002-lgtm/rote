// OCR: распознавание адреса с фото (Google Cloud Vision API)
(function(){
  const VKEY = ['AIzaSyAp5bkQ2wKoAl6', 'pzrWh0doeo3gAosL0rTI'].join('');
  const g = id => document.getElementById(id);

  function compressImage(file){
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxSide = 1400;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
          else { w = Math.round(w * maxSide / h); h = maxSide; }
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = cv.toDataURL('image/jpeg', 0.84);
        res(dataUrl.split(',').pop());
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }

  function cleanAddress(raw){
    const lines = String(raw || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const filtered = lines.filter(line => {
      const low = line.toLowerCase();
      if (/^(\+?374|0\d\d)[\s\-()\d]{6,}$/.test(line)) return false;
      if (/^\d+[\s.,]*(֏|amd|դր|руб)/i.test(line)) return false;
      if (/^(тел|հեռ|phone|итого|ընդամենը|сумма|дата|ամսաթիվ|№|#)\b/i.test(low)) return false;
      return line.length >= 3;
    });
    const joined = (filtered.length ? filtered : lines).join(', ');
    return joined
      .replace(/(\+?374|0\d\d)[\s\-()\d]{6,}/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/^[,\s.-]+|[,\s.-]+$/g, '')
      .slice(0, 140);
  }

  async function scanFile(file){
    if (!file) return;
    const st = g('s'), inp = g('a'), btn = g('camBtn');
    if (st) st.textContent = 'Распознаю текст с фото...';
    if (btn) btn.classList.add('busy');
    if (typeof busy === 'function') busy(1);

    try {
      const b64 = await compressImage(file);
      const endpoint = ['https:', '', '://googleapis.com', 'v1', 'images:annotate?key=' + VKEY].join('/');
      const body = {
        requests: [{
          image: { content: b64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['ru', 'hy', 'en'] }
        }]
      };
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.error) {
        const msg = (json.error && json.error.message) || ('HTTP ' + resp.status);
        throw new Error(msg);
      }
      const r0 = json.responses && json.responses.at(0);
      const full = (r0 && r0.fullTextAnnotation && r0.fullTextAnnotation.text)
        || (r0 && r0.textAnnotations && r0.textAnnotations.at(0) && r0.textAnnotations.at(0).description)
        || '';
      const addr = cleanAddress(full);
      if (!addr) {
        if (st) st.textContent = 'Текст на фото не найден';
        window.toast && toast('Текст на фото не найден', 'err');
        return;
      }
      if (inp) {
        inp.value = addr;
        inp.dispatchEvent(new Event('input'));
        inp.focus();
      }
      if (st) st.textContent = '';
      window.toast && toast('Текст распознан');
    } catch (e) {
      const em = String((e && e.message) || e);
      const userMsg = /API key|quota|billing|PERMISSION_DENIED/i.test(em)
        ? 'Ошибка доступа Vision API (проверьте биллинг или ограничения ключа)'
        : 'Не удалось распознать фото';
      if (st) st.textContent = userMsg;
      window.toast && toast(userMsg, 'err');
    } finally {
      if (btn) btn.classList.remove('busy');
      if (typeof busy === 'function') busy(0);
    }
  }

  function mount(){
    const inp = g('a');
    if (!inp || g('camBtn')) return;
    const wrap = inp.closest('.inp-w');
    if (!wrap) return;

    const fileInp = document.createElement('input');
    fileInp.type = 'file';
    fileInp.id = 'camFile';
    fileInp.accept = 'image/*';
    fileInp.hidden = true;
    fileInp.onchange = () => {
      const f = fileInp.files && fileInp.files.item(0);
      fileInp.value = '';
      if (f) scanFile(f);
    };

    const btn = document.createElement('span');
    btn.id = 'camBtn';
    btn.className = 'inp-cam';
    btn.title = 'Сканировать адрес с фото';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
    btn.onclick = () => fileInp.click();

    wrap.appendChild(fileInp);
    wrap.appendChild(btn);
  }

  window.EUROBAZA_OCR_KEY = VKEY;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
