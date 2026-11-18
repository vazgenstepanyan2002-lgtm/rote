// OCR: точное распознавание адресов EuroBaza (Gemini + Яндекс)
(function(){
  const GKEY = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('');
  const g = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stripPin = s => String(s || '').replace(/\s*[\u{1F50E}\u{1F4CD}]\s*$/u, '').trim();

  async function compressImage(file){
    const maxSide = 1600;
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
        return cv.toDataURL('image/jpeg', 0.74).split(',').pop();
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
        res(cv.toDataURL('image/jpeg', 0.74).split(',').pop());
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Ошибка чтения фото')); };
      img.src = url;
    });
  }

  async function askGemini(b64){
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const prompt = [
      'Ты извлекаешь адреса доставки в Армении с фото накладных («Բեռնափոխադրման թերթիկ» или «ՎԱՃԱՌՔԻ ՓԱՍՏԱԹՈՒՂԹ»).',
      'Где искать адрес:',
      '1) Колонка «Տեղափոխման հասցե» или «Հասցե».',
      '2) В документе «ՎԱՃԱՌՔԻ ՓԱՍՏԱԹՈՒՂԹ» адрес находится в блоке покупателя сразу под ФИО.',
      'Правила обработки каждого адреса:',
      '- «շ.», «շ», «շենք», «տ.», «տ», «տուն», «դ.» сразу после числа (в том числе слитно: «30տ», «3շ», «36շ», «45տ», «82 տուն», «42/12») — это НОМЕР ДОМА, а НЕ номер улицы! Никогда не превращай «Լուկաշինի 3շ» в «3-ю улицу Лукашина»: «Լուկաշինի 3շ» означает основную улицу Лукашина, дом 3 («Երևան, Աջափնյակ, Լուկաշինի փողոց, 3» / «Ереван, Ачапняк, улица Лукашина, 3»). Номерную улицу пиши только если в тексте явно есть «-րդ», «փողոց 3» или «3-я».',
      '- Дробный номер дома (например «42/12») ОБЯЗАТЕЛЬНО сохраняй целиком с дробью («42/12»), не обрезай до «42». Буквы «շ» и «տ» после числа удаляй.',
      '- «բն.», «բն», «բնակարան», «մուտք», «հարկ», «հ», «բ.» и цифры рядом с ними (в том числе слитно: «1բն», «16բն», «48բն», «5բն», «2 մուտք», «1 հ», «5հ», «Վ-06») — это квартира, подъезд, этаж или домофон. УДАЛИ их полностью! Никогда не добавляй квартиру через дробь к номеру дома.',
      '- Сохраняй область (մարզ), город (ք.), административный район Еревана (Շենգավիթ, Աջափնյակ, Նոր Նորք, Էրեբունի и др.), массив (Ջրվեժ, Ավան и др.) и село (գ. / գյուղ: Փարաքար, Վանանդ, Նուռնուս и др.). Если указана ереванская улица или район без города — добавь Ереван.',
      '- Полностью игнорируй номера телефонов (055..., 093..., 094..., 098..., 099..., 077..., 091..., 096..., 044...), ФИО, номера машин, коды товаров и суммы.',
      '- Примеры эталонного разбора:',
      '  • «Արմավիրի մ, Գ. Փարաքար, Տիգրան Մեծ 30տ» -> {"orig":"Արմավիրի մարզ, գ. Փարաքար, Տիգրան Մեծի 30","ru":"Армавирская область, село Паракар, улица Тиграна Меца, 30"}',
      '  • «Ք. Երևան, Շենգավիթ, Արշակունյաց 42/12 1բն, 1 հ» -> {"orig":"Երևան, Շենգավիթ, Արշակունյաց պողոտա, 42/12","ru":"Ереван, проспект Аршакуняц, 42/12"}',
      '  • «ք Երևան Աջափնյակ Լուկաշինի 3շ 16բն 2 մուտք 1հ» -> {"orig":"Երևան, Աջափնյակ, Լուկաշինի փողոց, 3","ru":"Ереван, Ачапняк, улица Лукашина, 3"}',
      '  • «Ք. Երևան, Նոր Նորք, Ջրվեժ Մայակ 2շ 48բն, 5հ» -> {"orig":"Երևան, Ջրվեժ, Մայակ թաղամաս, 2","ru":"Ереван, Джрвеж, квартал Маяк, 2"}',
      '  • «Կոտայք գյուղ Նուռնուս Այգեգործների 45տ» -> {"orig":"Կոտայքի մարզ, գ. Նուռնուս, Այգեգործների 45","ru":"Котайкская область, село Нурнус, улица Айгегорцнери, 45"}',
      'Верни ТОЛЬКО валидный JSON-массив объектов [{"orig":"...","ru":"..."}] или [].'
    ].join('\n');

    const bodyStr = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mime_type: 'image/jpeg', data: b64 } }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } }
    });
    const runModel = async mdl => {
      const url = 'https' + '://' + host + '/v1beta/models/' + mdl + ':generateContent?key=' + encodeURIComponent(GKEY);
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(18000), body: bodyStr });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    };
    const j = await Promise.any(['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'].map(runModel));
    const cand = j && Array.isArray(j.candidates) ? j.candidates.at(0) : null;
    const parts = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts : [];
    const ansPart = parts.find(p => p && !p.thought && typeof p.text === 'string') || parts.at(-1);
    const raw = (ansPart && ansPart.text) || '[]';
    const arr = JSON.parse(raw.replace(/```json|```/gi, '').trim());
    if (!Array.isArray(arr)) return [];
    return arr.map(x => typeof x === 'string'
      ? { orig: x.trim(), ru: x.trim() }
      : { orig: String((x && x.orig) || '').trim(), ru: String((x && x.ru) || (x && x.orig) || '').trim() }
    ).filter(x => x.ru || x.orig);
  }

  async function resolveBestYandex(item){
    const cleanQ = t => String(t || '')
      .replace(/\s*[\u{1F4CD}\u{1F50E}]\s*$/gu, '')
      .replace(/(\d+(?:\/\d+)?)\s*(?:շենք|շ\.?|տուն|տ\.?|դ\.?)(?=\s|,|$)/giu, '$1')
      .replace(/[,\s]+(?:\d+\s*)?(?:բն\.?|բնակարան|մուտք|հարկ|հ\.?|կվ\.?|кв\.?|подъезд|этаж).*$/iu, '')
      .replace(/\s+/g, ' ')
      .trim();

    const origClean = cleanQ(item.orig);
    const ruClean = cleanQ(item.ru);
    const queries = Array.from(new Set([ruClean, origClean].filter(Boolean)));

    const hm = (ruClean + ' ' + origClean).match(/(?:^|[,\s])(\d+(?:\/\d+)?)(?=\s|,|$)/);
    const houseNum = hm ? hm.at(1).toLowerCase() : '';
    const hasSlash = houseNum.includes('/');
    const wantOrdStreet = /(?:^|\s|\d)(?:-րդ|-я|-й|-е|переулок|тупик|նրբ|փակ)/i.test(ruClean + ' ' + origClean);
    const isOrdStreet = txt => /(?:^|\s)\d+(?:-րդ|-я|-й|-е)\s+(?:улица|переулок|проезд|փողոց|նրբ)/i.test(String(txt || ''));

    const escRe = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactHouse = txt => !houseNum || new RegExp('(^|[^0-9/])' + escRe(houseNum) + '([^0-9/]|$)').test(String(txt || ''));
    const baseHouse = txt => !houseNum || new RegExp('(^|[^0-9])' + escRe(houseNum.split('/').at(0)) + '([^0-9]|$)').test(String(txt || ''));

    const scoreCandidate = (name, exactFlag) => {
      let sc = 0;
      if (exactFlag) sc += 20;
      if (exactHouse(name)) sc += 50;
      else if (baseHouse(name)) sc += 10;
      if (!wantOrdStreet && isOrdStreet(name)) sc -= 40;
      return sc;
    };

    let bestHit = null, bestScore = -999, bestList = [];
    const consider = (cand, list) => {
      if (!cand) return;
      const sc = scoreCandidate(cand.name, cand.exact);
      if (sc > bestScore) {
        bestScore = sc;
        bestHit = cand;
        bestList = list || [];
      }
    };

    // 1. Для дробных домов (42/12) сначала проверяем прямой Геокодер, чтобы не потерять дробь
    if (hasSlash) {
      for (const q of queries) {
        const list = await yan(q);
        if (list && list.length) {
          for (const x of list) consider({ name: cleanQ(x.name), lat: x.lat, lon: x.lon, exact: x.exact }, list);
          if (bestHit && exactHouse(bestHit.name) && bestHit.exact) return { hit: bestHit, list: bestList };
        }
      }
    }

    // 2. Поиск через Яндекс Саджест с ранжированием (штраф за ложную номерную улицу и бонус за точный дом)
    if (typeof sugList === 'function') {
      for (const q of queries) {
        const sugs = await sugList(q);
        const orderedSugs = (sugs || []).slice().sort((a, b) => {
          const sa = scoreCandidate(a.text || a.name, false);
          const sb = scoreCandidate(b.text || b.name, false);
          return sb - sa;
        });
        for (const sg of orderedSugs.slice(0, 4)) {
          const sugTitle = cleanQ(sg.name || sg.text);
          const sq = cleanQ(sg.text || sg.name);
          if (!sq) continue;
          const list = await yan(sq);
          if (list && list.length) {
            for (const picked of list) {
              const finalName = sugTitle && exactHouse(sugTitle) && (!isOrdStreet(sugTitle) || wantOrdStreet)
                ? sugTitle
                : cleanQ(picked.name);
              consider({ name: finalName, lat: picked.lat, lon: picked.lon, exact: picked.exact }, list);
            }
            if (bestHit && exactHouse(bestHit.name) && bestHit.exact && (wantOrdStreet || !isOrdStreet(bestHit.name))) {
              return { hit: bestHit, list: bestList };
            }
          }
        }
      }
    }

    // 3. Прямой поиск через Яндекс Геокодер
    for (const q of queries) {
      const list = await yan(q);
      if (list && list.length) {
        for (const x of list) consider({ name: cleanQ(x.name), lat: x.lat, lon: x.lon, exact: x.exact }, list);
        if (bestHit && exactHouse(bestHit.name) && bestHit.exact && (wantOrdStreet || !isOrdStreet(bestHit.name))) {
          return { hit: bestHit, list: bestList };
        }
      }
    }

    return { hit: bestHit, list: bestList };
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
          if (st) st.textContent = 'Ищу через Саджест: ' + it.ru + '...';
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
        if (st) st.textContent = 'Ищу в Яндекс Саджесте...';
        const res = await resolveBestYandex(one);
        if (st) st.textContent = '';
        if (res.hit) {
          const cleanName = stripPin(res.hit.name);
          if (typeof saveAdrCache === 'function') saveAdrCache({ name: cleanName, lat: res.hit.lat, lon: res.hit.lon });
          P.push({ name: cleanName + (res.hit.exact ? '' : ' 📍'), lat: res.hit.lat, lon: res.hit.lon });
          if (inp) inp.value = '';
          if (typeof showList === 'function') showList(new Array());
          save();
          window.toast && toast(res.hit.exact ? 'Адрес добавлен' : 'Адрес добавлен (неточный дом)', res.hit.exact ? 'ok' : 'err');
        } else {
          if (inp) { inp.value = one.ru; inp.dispatchEvent(new Event('input', { bubbles: true })); }
          window.toast && toast('Адрес не найден. Попробуйте написать иначе или добавьте город', 'err');
        }
      } else { if (st) st.textContent = ''; showMultiPicker(items); }
    } catch (e) {
      if (st) st.textContent = (e && (e.name === 'TimeoutError' || /timed out/i.test(e.message))) ? 'Сервер долго отвечает, проверьте интернет' : (e && e.errors ? e.errors.map(x => x.message).join('; ') : ((e && e.message) || 'Не удалось распознать фото'));
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
