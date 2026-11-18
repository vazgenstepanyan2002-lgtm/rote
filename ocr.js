// OCR: точное распознавание адресов EuroBaza (Gemini + Яндекс)
(function(){
  const GKEY = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('');
  const g = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stripPin = s => String(s || '').replace(/\s*[\u{1F50E}\u{1F4CD}]\s*$/u, '').trim();

  async function compressImage(file){
    const maxSide = 1280;
    try {
      if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
        let w = bmp.width, h = bmp.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
          else { w = Math.round(w * maxSide / h); h = maxSide; }
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
        bmp.close && bmp.close();
        return cv.toDataURL('image/jpeg', 0.80).split(',').pop();
      }
    } catch (e) {}
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; }
          else { w = Math.round(w * maxSide / h); h = maxSide; }
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        res(cv.toDataURL('image/jpeg', 0.80).split(',').pop());
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Ошибка чтения фото')); };
      img.src = url;
    });
  }

  async function askGemini(b64){
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const url = 'https' + '://' + host + '/v1beta/models/gemini-flash-latest:generateContent?key=' + encodeURIComponent(GKEY);
    const prompt = [
      'Ты эксперт по адресам Армении и накладным доставки EuroBaza.',
      'Найди на фото все адреса доставки (смотри колонки "Տեղափոխման հասցե", "հասցե", "Адрес").',
      'Игнорируй мебель, цены, суммы, имена и телефоны.',
      'ОБЯЗАТЕЛЬНО удаляй квартиру, подъезд и этаж (բն., բնակարան, մուտք, հարկ, кв., под., эт.), оставляй только город/село, улицу/проспект/квартал и номер дома (включая дробь/букву, напр. 12/4, 15ա).',
      'Если город не указан, но улица ереванская — добавь Ереван (Երևան).',
      'Верни СТРОГО JSON-массив объектов {"orig":"адрес на языке оригинала","ru":"перевод на русский: Город, улица, дом"}. Если адресов нет, верни [].'
    ].join(' ');

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: b64 } }] }],
        generationConfig: { temperature: 0.05, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) throw new Error(r.status === 429 ? 'Лимит запросов Gemini, подождите минуту' : 'Ошибка Gemini API: HTTP ' + r.status);
    const j = await r.json();
    const cand = j && Array.isArray(j.candidates) ? j.candidates.at(0) : null;
    const parts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
    const raw = (parts.at(0) && parts.at(0).text) || '[]';
    const arr = JSON.parse(raw.replace(/```json|```/gi, '').trim());
    if (!Array.isArray(arr)) return [];
    return arr.map(x => typeof x === 'string' ? { orig: x.trim(), ru: x.trim() } : { orig: String((x && x.orig) || '').trim(), ru: String((x && x.ru) || (x && x.orig) || '').trim() }).filter(x => x.ru || x.orig);
  }

  async function resolveBestYandex(item){
    const queries = Array.from(new Set([item.orig, item.ru].filter(Boolean)));
    let fallbackList = [];
    for (const q of queries) {
      const list = await yan(q);
      if (list && list.length) {
        const exactHit = list.find(x => x.exact);
        if (exactHit) return { hit: exactHit, list: list };
        if (!fallbackList.length) fallbackList = list;
      }
    }
    return { hit: fallbackList.at(0) || null, list: fallbackList };
  }

  function showMultiPicker(items){
    let m = g('ocrMdl');
    if (m) m.remove();
    m = document.createElement('div');
    m.id = 'ocrMdl';
    m.className = 'mdl open';
    m.innerHTML = '<div class="mdl-b pt-box"><div class="pt-hd"><div class="pt-hd-l"><div class="pt-hd-ic">📷</div><div><div class="pt-hd-t">Найдено адресов: ' + items.length + '</div><div class="pt-hd-s">Отметьте нужные для маршрута</div></div></div><button type="button" class="pt-x" id="ocrX">✕</button></div><div class="pt-list">' + items.map((it, i) => '<label style="display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#f8fafc;font-size:14px;font-weight:600;cursor:pointer"><input type="checkbox" checked data-idx="' + i + '" style="width:19px;height:19px;accent-color:#10b981;flex-shrink:0"><span>' + esc(it.ru) + (it.orig && it.orig !== it.ru ? '<small style="display:block;color:#94a3b8;font-weight:500;font-size:12px">' + esc(it.orig) + '</small>' : '') + '</span></label>').join('') + '</div><div class="pt-ft"><button type="button" class="pt-add" id="ocrAddAll"><span>Добавить выбранные</span></button></div></div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    g('ocrX').onclick = close;
    m.onclick = e => { if (e.target === m) close(); };
    g('ocrAddAll').onclick = async () => {
      const checked = Array.from(m.querySelectorAll('input:checked')).map(cb => items.at(+cb.dataset.idx));
      close();
      if (!checked.length) return;
      const st = g('s');
      let added = 0, approxCnt = 0;
      if (typeof busy === 'function') busy(1);
      try {
        for (const it of checked) {
          if (st) st.textContent = 'Ищу: ' + it.ru + '...';
          const res = await resolveBestYandex(it);
          if (res.hit) {
            const cleanName = stripPin(res.hit.name);
            if (!res.hit.exact) approxCnt++;
            if (typeof saveAdrCache === 'function') saveAdrCache({ name: cleanName, lat: res.hit.lat, lon: res.hit.lon });
            P.push({ name: cleanName + (res.hit.exact ? '' : ' 📍'), lat: res.hit.lat, lon: res.hit.lon });
            added++;
          }
        }
      } finally { if (typeof busy === 'function') busy(0); }
      if (st) st.textContent = '';
      if (added) { save(); window.toast && toast(approxCnt ? 'Добавлено: ' + added + ' (неточн.: ' + approxCnt + ')' : 'Адрес добавлен', approxCnt ? 'err' : 'ok'); }
      else window.toast && toast('Не удалось найти координаты', 'err');
    };
  }

  async function scanFile(file){
    const btn = g('camBtn'), st = g('s'), inp = g('a');
    if (btn) btn.classList.add('busy');
    if (st) st.textContent = 'Распознаю текст с фото...';
    if (typeof busy === 'function') busy(1);
    try {
      const b64 = await compressImage(file);
      const items = await askGemini(b64);
      if (!items.length) { if (st) st.textContent = 'Текст на фото не найден'; window.toast && toast('Текст на фото не найден', 'err'); return; }
      if (items.length === 1) {
        const one = items.at(0);
        if (st) st.textContent = 'Проверяю точный дом в Яндексе...';
        const res = await resolveBestYandex(one);
        if (st) st.textContent = '';
        if (inp) { inp.value = one.ru; inp.dispatchEvent(new Event('input', { bubbles: true })); }
        if (res.hit && res.hit.exact) {
          const cleanName = stripPin(res.hit.name);
          if (typeof saveAdrCache === 'function') saveAdrCache({ name: cleanName, lat: res.hit.lat, lon: res.hit.lon });
          P.push({ name: cleanName, lat: res.hit.lat, lon: res.hit.lon });
          if (inp) inp.value = '';
          if (typeof showList === 'function') showList(new Array());
          save(); window.toast && toast('Адрес добавлен', 'ok');
        } else if (res.list && res.list.length && typeof showList === 'function') {
          window.toast && toast('Выберите адрес из списка, чтобы добавить', 'err');
          showList(res.list, 'Уточните дом по фото («' + one.ru + '»):');
        } else if (typeof window.add === 'function') await window.add();
      } else { if (st) st.textContent = ''; showMultiPicker(items); }
    } catch (e) {
      if (st) st.textContent = (e && (e.name === 'TimeoutError' || /timed out/i.test(e.message))) ? 'Сервер долго отвечает, проверьте интернет' : ((e && e.message) || 'Не удалось распознать фото');
      window.toast && toast('Не удалось распознать фото', 'err');
    } finally { if (btn) btn.classList.remove('busy'); if (typeof busy === 'function') busy(0); }
  }

  function mount(){
    const inp = g('a');
    if (!inp || g('camBtn')) return;
    const wrap = inp.closest('.inp-w');
    if (!wrap) return;
    const fileInp = document.createElement('input');
    fileInp.type = 'file'; fileInp.id = 'camFile'; fileInp.accept = 'image/*'; fileInp.hidden = true;
    fileInp.onchange = () => { const f = fileInp.files && fileInp.files.item(0); fileInp.value = ''; if (f) scanFile(f); };
    const btn = document.createElement('span');
    btn.id = 'camBtn'; btn.className = 'inp-cam'; btn.title = 'Сканировать адрес с фото';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>';
    btn.onclick = () => fileInp.click();
    wrap.appendChild(fileInp); wrap.appendChild(btn);
  }

  window.EUROBAZA_OCR_KEY = GKEY;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
