// OCR: распознавание адресов с накладных EuroBaza (Google AI Studio / Gemini 2.5 Flash)
(function(){
  const GKEY = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('');
  const g = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

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
        const dataUrl = cv.toDataURL('image/jpeg', 0.85);
        res(dataUrl.split(',').pop());
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Не удалось прочитать файл изображения')); };
      img.src = url;
    });
  }

  async function askGemini(b64){
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const url = 'https' + '://' + host + '/v1beta/models/gemini-3.1-flash-lite:generateContent?key=' + encodeURIComponent(GKEY);
    const prompt = [
      'Ты помощник водителя доставки EuroBaza в Армении.',
      'Найди на фото накладной, чека или экрана все адреса доставки (особенно в колонках "Տեղափոխման հասցե", "հասցե", "Адрес" или в тексте).',
      'Игнорируй названия товаров, артикулы, цены, суммы, имена получателей и номера телефонов.',
      'Переведи и нормализуй каждый найденный адрес на русский язык в понятный для Яндекс Карт вид (например: "Ереван, ул. Комитаса 45" или "Масис, ул. Центральная 12").',
      'Верни СТРОГО валидный JSON-массив строк без markdown и пояснений. Если адресов на фото нет, верни [].'
    ].join(' ');

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: b64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!r.ok) {
      if (r.status === 429) throw new Error('Лимит запросов Gemini, подождите минуту');
      throw new Error('Ошибка Gemini API: HTTP ' + r.status);
    }

    const j = await r.json();
    const cand = j && Array.isArray(j.candidates) ? j.candidates.at(0) : null;
    const parts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
    const raw = (parts.at(0) && parts.at(0).text) || '[]';
    const clean = raw.replace(/```json|```/gi, '').trim();
    const arr = JSON.parse(clean);
    return Array.isArray(arr) ? arr.map(x => String(x || '').trim()).filter(Boolean) : [];
  }

  function showMultiPicker(addrs){
    let m = g('ocrMdl');
    if (m) m.remove();
    m = document.createElement('div');
    m.id = 'ocrMdl';
    m.className = 'mdl open';
    m.innerHTML = '<div class="mdl-b pt-box">'
      + '<div class="pt-hd"><div class="pt-hd-l"><div class="pt-hd-ic">📷</div><div><div class="pt-hd-t">Найдено адресов: ' + addrs.length + '</div><div class="pt-hd-s">Отметьте нужные для маршрута</div></div></div><button type="button" class="pt-x" id="ocrX">✕</button></div>'
      + '<div class="pt-list">' + addrs.map((ad, i) => '<label style="display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#f8fafc;font-size:14px;font-weight:600;cursor:pointer"><input type="checkbox" checked data-idx="' + i + '" style="width:19px;height:19px;accent-color:#10b981;flex-shrink:0"><span>' + esc(ad) + '</span></label>').join('') + '</div>'
      + '<div class="pt-ft"><button type="button" class="pt-add" id="ocrAddAll"><span>Добавить выбранные</span></button></div>'
      + '</div>';
    document.body.appendChild(m);

    const close = () => m.remove();
    g('ocrX').onclick = close;
    m.onclick = e => { if (e.target === m) close(); };
    g('ocrAddAll').onclick = async () => {
      const checked = Array.from(m.querySelectorAll('input:checked')).map(cb => addrs.at(+cb.dataset.idx));
      close();
      if (!checked.length) return;
      const st = g('s');
      let added = 0;
      if (typeof busy === 'function') busy(1);
      try {
        for (const q of checked) {
          if (st) st.textContent = 'Ищу адрес в Яндексе...';
          const list = await yan(q);
          if (list && list.length) {
            const best = list.at(0);
            const cleanName = best.name.replace(/\s*[\u{1F50E}\u{1F4CD}]\s*$/u, '').trim();
            if (typeof saveAdrCache === 'function') saveAdrCache({ name: cleanName, lat: best.lat, lon: best.lon });
            P.push({ name: cleanName, lat: best.lat, lon: best.lon });
            added++;
          }
        }
      } finally {
        if (typeof busy === 'function') busy(0);
      }
      if (st) st.textContent = '';
      if (added) {
        save();
        window.toast && toast('Адрес добавлен');
      } else {
        window.toast && toast('Не удалось найти координаты', 'err');
      }
    };
  }

  async function scanFile(file){
    const btn = g('camBtn');
    const st = g('s');
    const inp = g('a');
    if (btn) btn.classList.add('busy');
    if (st) st.textContent = 'Распознаю текст с фото...';
    if (typeof busy === 'function') busy(1);
    try {
      const b64 = await compressImage(file);
      const addrs = await askGemini(b64);
      if (!addrs.length) {
        if (st) st.textContent = 'Текст на фото не найден';
        window.toast && toast('Текст на фото не найден', 'err');
        return;
      }
      if (addrs.length === 1) {
        if (st) st.textContent = '';
        if (inp) {
          inp.value = addrs.at(0);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
        window.toast && toast('Текст распознан', 'ok');
        if (typeof window.add === 'function') await window.add();
      } else {
        if (st) st.textContent = '';
        showMultiPicker(addrs);
      }
    } catch (e) {
      const msg = (e && e.message) || 'Не удалось распознать фото';
      if (st) st.textContent = msg;
      window.toast && toast('Не удалось распознать фото', 'err');
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

  window.EUROBAZA_OCR_KEY = GKEY;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
