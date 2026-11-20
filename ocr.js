// OCR: автоподсчёт бонусов EuroBaza по накладным (Gemini + облачный словарь)
(function(){
  const GKEY = ['AQ.Ab8RN6LziHiRoI-kFxMOFA', 'FNqH9QT5tjkiqPTvuiHhnkVeFSMg'].join('');
  const g = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const CUR = '֏';
  const fm = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });

  const BON_ITEMS = [
    { code: 'other_a', cat: 'Другое', name: 'Стулья, стеллажи', one: 1, p1: 50, p2: 50 },
    { code: 'other_b', cat: 'Другое', name: 'Стулья, столы', one: 1, p1: 100, p2: 100 },
    { code: 'other_c', cat: 'Другое', name: 'Раковина', p1: 300, p2: 390 },
    { code: 'other_d', cat: 'Другое', name: 'Комоды', p1: 500, p2: 650 },
    { code: 'other_e', cat: 'Другое', name: 'Кровать', p1: 500, p2: 650 },
    { code: 'other_f', cat: 'Другое', name: 'Модули', p1: 250, p2: 325 },
    { code: 'other_g', cat: 'Другое', name: 'Матрасы', p1: 250, p2: 325 },
    { code: 'other_h', cat: 'Другое', name: 'Системы хранения', p1: 500, p2: 650 },
    { code: 'other_i', cat: 'Другое', name: 'Дверь', one: 1, p1: 500, p2: 500 },
    { code: 'other_j', cat: 'Другое', name: 'Пуфы', p1: 50, p2: 65 },
    { code: 'other_k', cat: 'Другое', name: 'Тумбы', p1: 50, p2: 65 },
    { code: 'sofas_a', cat: 'Диваны', name: 'Кресло', p1: 500, p2: 650 },
    { code: 'sofas_b', cat: 'Диваны', name: 'Диван', p1: 1000, p2: 1300 },
    { code: 'sofas_c', cat: 'Диваны', name: 'Комплект мягкой мебели', p1: 1500, p2: 1950 },
    { code: 'recep_a', cat: 'Ресепшен', name: 'Прихожая / ресепшен до 1,6 м', p1: 700, p2: 910 },
    { code: 'recep_b', cat: 'Ресепшен', name: 'Прихожая / ресепшен более 1,6 м', p1: 1200, p2: 1560 },
    { code: 'kitchen_a', cat: 'Кухни', name: 'Кухня 1,6 м', p1: 1000, p2: 1300 },
    { code: 'kitchen_b', cat: 'Кухни', name: 'Кухня 2–3 м', p1: 2500, p2: 3250 },
    { code: 'living_a', cat: 'Гостиная', name: 'Гостиная до 1,7 м', p1: 1000, p2: 1300 },
    { code: 'living_b', cat: 'Гостиная', name: 'Гостиная более 1,7 м', p1: 2000, p2: 2600 },
    { code: 'living_c', cat: 'Гостиная', name: 'Гостиная Эксклюзив', p1: 3000, p2: 3900 },
    { code: 'bedroom_a', cat: 'Спальни', name: 'Спальня 2 двери', p1: 1050, p2: 1365 },
    { code: 'bedroom_b', cat: 'Спальни', name: 'Спальня 3 двери без комода', p1: 1550, p2: 2015 },
    { code: 'bedroom_c', cat: 'Спальни', name: 'Спальня 3 двери с комодом', p1: 2050, p2: 2665 },
    { code: 'bedroom_d', cat: 'Спальни', name: 'Спальня 4 двери', p1: 2600, p2: 3380 },
    { code: 'bedroom_e', cat: 'Спальни', name: 'Спальня 5 дверей', p1: 3100, p2: 4030 },
    { code: 'bedroom_f', cat: 'Спальни', name: 'Спальня 6 дверей', p1: 3600, p2: 4680 },
    { code: 'bedroom_g', cat: 'Спальни', name: 'Спальня 0,9*2', p1: 3100, p2: 4030 },
    { code: 'wardrobe_a', cat: 'Шкафы', name: 'Шкаф 2 двери', p1: 500, p2: 650 },
    { code: 'wardrobe_b', cat: 'Шкафы', name: 'Шкаф 3 двери', p1: 1000, p2: 1300 },
    { code: 'wardrobe_c', cat: 'Шкафы', name: 'Шкаф 4 двери', p1: 1500, p2: 1950 },
    { code: 'wardrobe_d', cat: 'Шкафы', name: 'Шкаф 5 дверей', p1: 2000, p2: 2600 },
    { code: 'wardrobe_e', cat: 'Шкафы', name: 'Шкаф 6 дверей', p1: 2500, p2: 3250 }
  ];
  const BON_BY_CODE = Object.fromEntries(BON_ITEMS.map(x => [x.code, x]));
  const normModel = s => String(s || '').toLowerCase().replace(/[\"'«»().,]/g, ' ').replace(/\s+/g, ' ').trim();
  const fbKey = k => normModel(k).replace(/[.#$\[\]\/]+/g, '_').slice(0, 120);

  let CLOUD_MAP = (() => { try { return JSON.parse(localStorage.getItem('BON_OCR_MAP') || '{}') || {}; } catch (e) { return {}; } })();
  const _cmWait = setInterval(() => {
    if (!window.firebase || !firebase.apps || !firebase.apps.length) return;
    clearInterval(_cmWait);
    firebase.database().ref('config/ocrMap').on('value', s => {
      if (s.val() && typeof s.val() === 'object') {
        CLOUD_MAP = Object.assign({}, CLOUD_MAP, s.val());
        try { localStorage.setItem('BON_OCR_MAP', JSON.stringify(CLOUD_MAP)); } catch (e) {}
      }
    }, () => {});
  }, 800);

  function saveCloudModel(rawName, code){
    const fk = fbKey(rawName);
    if (!fk) return;
    if (code) CLOUD_MAP[fk] = code; else delete CLOUD_MAP[fk];
    try { localStorage.setItem('BON_OCR_MAP', JSON.stringify(CLOUD_MAP)); } catch (e) {}
    if (window.firebase && firebase.apps && firebase.apps.length) firebase.database().ref('config/ocrMap/' + fk).set(code || null).catch(() => {});
  }

  const RULES = [
    { ignore: true, rx: /(?:տեղափոխու[թտ]յուն|հավաքում|доставк|перевозк|сборк)/i },
    { code: 'bedroom_g', rx: /(?:ննջասենյակ|спальн).*0[.,]9\s*[*xх]\s*2/i },
    { code: 'bedroom_d', rx: /(?:ննջասենյակ|спальн).*(?:նիցցա|ницца|ալսու|алсу|մոնա լիզա|мона лиза)/i },
    { code: 'bedroom_c', rx: /(?:ննջասենյակ|спальн).*(?:էկո|эко|րիո|рио)/i },
    { code: 'bedroom_f', rx: /(?:ննջասենյակ|спальн).*(?:պրեստիժ|престиж)/i },
    { code: 'bedroom_f', rx: /(?:ննջասենյակ|спальн).*6\s*(?:դուռ|двер)/i },
    { code: 'bedroom_e', rx: /(?:ննջասենյակ|спальн).*5\s*(?:դուռ|двер)/i },
    { code: 'bedroom_d', rx: /(?:ննջասենյակ|спальн).*4\s*(?:դուռ|двер)/i },
    { code: 'bedroom_b', rx: /(?:ննջասենյակ|спальн).*3\s*(?:դուռ|двер).*(?:առանց կոմոդ|без комод)/i },
    { code: 'bedroom_c', rx: /(?:ննջասենյակ|спальн).*3\s*(?:դուռ|двер)/i },
    { code: 'bedroom_a', rx: /(?:ննջասենյակ|спальн).*2\s*(?:դուռ|двер)/i },
    { code: 'recep_a', rx: /(?:ընդունարան|прихож|ресепш).*(?:էկո|эко|մինի|мини|յանա|яна)/i },
    { code: 'recep_a', rx: /(?:ընդունարան|прихож|ресепш).*(?:1[.,][0-6]|90|100|110|120|130|140|150|160)\b/i },
    { code: 'recep_b', rx: /(?:ընդունարան|прихож|ресепш).*(?:1[.,][7-9]|2[.,]\d|170|180|190|200|210|220|240)\b/i },
    { code: 'kitchen_b', rx: /(?:խոհանոց|кухн).*(?:լյուքս|люкс|2[.,]\d|3[.,]0|2-3|200|220|240|250|260|280|300)\b/i },
    { code: 'kitchen_a', rx: /(?:խոհանոց|кухн).*(?:1[.,]6|160)\b/i },
    { code: 'living_c', rx: /(?:հյուրասենյակ|гостин).*(?:էքսկլ|экскл)/i },
    { code: 'living_a', rx: /(?:հյուրասենյակ|гостин).*(?:մինի|мини|1[.,][0-7]|120|130|140|150|160|170)\b/i },
    { code: 'living_b', rx: /(?:հյուրասենյակ|гостин).*(?:1[.,]|2[.,]\d|180|190|200|210|220|240|250|260)\b/i },
    { code: 'wardrobe_b', rx: /(?:պահարան|шкаф).*(?:ատլանտա|атланта)/i },
    { code: 'wardrobe_c', rx: /(?:պահարան|шкаф).*1600\b/i },
    { code: 'wardrobe_e', rx: /(?:պահարան|шкаф).*6\s*(?:դուռ|двер)/i },
    { code: 'wardrobe_d', rx: /(?:պահարան|шкаф).*5\s*(?:դուռ|двер)/i },
    { code: 'wardrobe_c', rx: /(?:պահարան|шкаф).*4\s*(?:դուռ|двер)/i },
    { code: 'wardrobe_b', rx: /(?:պահարան|шкаф).*3\s*(?:դուռ|двер)/i },
    { code: 'wardrobe_a', rx: /(?:պահարան|шкаф).*2\s*(?:դուռ|двер)/i },
    { code: 'sofas_c', rx: /(?:փափուկ կահույք|հավաքածու|комплект).*(?:բազմոց|диван)/i },
    { code: 'sofas_a', rx: /(?:բազկաթոռ|кресл)/i },
    { code: 'sofas_b', rx: /(?:բազմոց|диван)/i },
    { code: 'other_g', rx: /(?:ներքնակ|матрас)/i },
    { code: 'other_h', rx: /(?:պահոց|короб|ящик для белья)/i },
    { code: 'other_d', rx: /(?:կոմոդ|комод)/i },
    { code: 'other_e', rx: /(?:մահճակալ|кроват)/i },
    { code: 'other_k', rx: /(?:տումբա|тумб)/i },
    { code: 'other_j', rx: /(?:պուֆ|пуф)/i },
    { code: 'other_c', rx: /(?:լվացարան|раковин|мойк)/i },
    { code: 'other_f', rx: /(?:մոդուլ|модул)/i },
    { code: 'other_i', rx: /(?:^|\s)(?:դուռ|дверь)(?:\s|$)/i },
    { code: 'other_a', rx: /(?:դարակաշար|стеллаж|полк)/i },
    { code: 'other_b', rx: /(?:գրասեղան|սեղան|стол)/i },
    { code: 'other_a', rx: /(?:աթոռ|стул)/i }
  ];

  function classifyProduct(rawName){
    const clean = String(rawName || '').replace(/\s+/g, ' ').trim();
    if (!clean) return { ignore: true };
    const norm = normModel(clean);
    if (RULES[0].rx.test(norm)) return { ignore: true };
    const fk = fbKey(clean);
    if (fk && CLOUD_MAP[fk] && BON_BY_CODE[CLOUD_MAP[fk]]) return { ignore: false, code: CLOUD_MAP[fk] };
    for (let i = 1; i < RULES.length; i++) if (RULES[i].rx.test(norm)) return { ignore: false, code: RULES[i].code };
    return { ignore: false, code: '' };
  }

  const isRegionAddress = s => /(?:կոտայք|քանաքեռավան|աբովյան|հրազդան|չարենցավան|եզվարդ|բյուրեղավան|նոր հաճն|արարատ|մասիս|արտաշատ|վեդի|արմավիր|վաղարշապատ|էջմիածին|մեծամոր|արագածոտն|աշտարակ|ապարան|թալին|շիրակ|գյումրի|արթիկ|մարալիկ|լոռի|վանաձոր|ալավերդի|սպիտակ|ստեփանավան|տաշիր|տավուշ|իջևան|դիլիջան|բերդ|նոյեմբերյան|գեղարքունիք|գավառ|սևան|մարտունի|վարդենիս|ճամբարակ|վայոց ձոր|եզեգնաձոր|ջերմուկ|վայք|սյունիք|կապան|գորիս|սիսիան|մեղրի|քաջարան|котайк|канакераван|абовян|раздан|чаренцаван|егвард|бюрегаван|нор ачин|арарат|масис|арташат|веди|армавир|вагаршапат|эчмиадзин|мецамор|арагацотн|аштарак|ширак|гюмри|лори|ванадзор|тавуш|иджеван|дилижан|гегаркуник|гавар|севан|мартини|вайоц дзор|ехегнадзор|сюник|капан|горис|сисиан)/i.test(String(s || "").toLowerCase());
  const isYerevanAddress = s => {
    const low = String(s || "").toLowerCase();
    if (isRegionAddress(low)) return false;
    return /(?:ереван|երևան|yerevan|աջափնյակ|արաբկիր|ավան|դավթաշեն|էրեբունի|կենտրոն|մալաթիա|նոր նորք|նորք-մարաշ|նուբարաշեն|շենգավիթ|քանաքեռ-զեյթուն|քանաքեռ|ачапняк|арабкир|аван|давидашен|эребуни|кентрон|малатия|нор норк|норк-мараш|нубарашен|шенгавит|канакер)/i.test(low);
  };

  async function compressImage(file){
    const maxSide = 1600;
    const url = URL.createObjectURL(file);
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        if (w > maxSide || h > maxSide) { if (w > h) { h = Math.round(h * maxSide / w); w = maxSide; } else { w = Math.round(w * maxSide / h); h = maxSide; } }
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        res(cv.toDataURL('image/jpeg', 0.74).split(',').pop());
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Ошибка чтения фото')); };
      img.src = url;
    });
  }

  async function askGemini(b64){
    const host = ['generativelanguage', 'googleapis', 'com'].join('.');
    const prompt = 'Считай накладную EuroBaza. Верни ТОЛЬКО JSON: {"addr":"адрес из Տեղափոխման հասցե","items":[{"name":"точное название товара из Ապրանքի անվանումը","qty":1}]}. Игнорируй услуги доставки (Տեղափոխություն, Տեղափոխուտյուն), сборки (Հավաքում, Сборка) и фурнитуру.';
    const bodyStr = JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mime_type: 'image/jpeg', data: b64 } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } });
    const runModel = async mdl => {
      const res = await fetch('https' + '://' + host + '/v1beta/models/' + mdl + ':generateContent?key=' + encodeURIComponent(GKEY), { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(18000), body: bodyStr });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    };
    const j = await Promise.any(['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'].map(runModel));
    const cand = j && Array.isArray(j.candidates) ? j.candidates.at(0) : null; const parts = (cand && cand.content && Array.isArray(cand.content.parts)) ? cand.content.parts : [];
    const ans = parts.find(p => p && !p.thought && typeof p.text === 'string') || parts.at(-1);
    const parsed = JSON.parse(((ans && ans.text) || '{}').replace(/```json|```/gi, '').trim());
    const items = [];
    (Array.isArray(parsed.items) ? parsed.items : []).forEach(x => {
      const name = String((x && x.name) || '').trim(), qty = Math.max(1, Math.round(+x.qty || 1));
      if (!name) return;
      const cls = classifyProduct(name);
      if (!cls.ignore) items.push({ name, qty, code: cls.code || '' });
    });
    return { addr: String((parsed && parsed.addr) || '').trim(), items };
  }

  const saveOcrDraft = (rows, isCity) => {
    try {
      if (!rows || !rows.length) sessionStorage.removeItem("OCR_BON_DRAFT");
      else sessionStorage.setItem("OCR_BON_DRAFT", JSON.stringify({ rows, isCity: !!isCity }));
    } catch (e) {}
  };

  function openBonusInvoiceModal(items, defaultIsCity){
    if (!Array.isArray(items) || !items.length) return;
    let m = g('ocrBonMdl'); if (m) m.remove();
    let isCity = !!defaultIsCity;
    const rows = items.map(x => ({ name: x.name, qty: x.qty, code: x.code || '' }));
    saveOcrDraft(rows, isCity);
    const CAT_ICO = { 'Другое': '📦', 'Диваны': '🛋️', 'Ресепшен': '🗄️', 'Кухни': '🍳', 'Гостиная': '📺', 'Спальни': '🛏️', 'Шкафы': '🚪' };
    const catsList = Array.from(new Set(BON_ITEMS.map(x => x.cat)));
    const openCatPicker = rowIdx => {
      const r = rows[rowIdx]; if (!r) return;
      let pm = g('ocrCatMdl'); if (pm) pm.remove();
      let selCat = (r.code && BON_BY_CODE[r.code]) ? BON_BY_CODE[r.code].cat : 'all', q = '';
      pm = document.createElement('div'); pm.id = 'ocrCatMdl'; pm.className = 'cm open';
      pm.innerHTML = '<div class="cm-b ob-pk-box"><div class="ob-pk-hd"><div><b>Категория бонусов</b><small>' + esc(r.name) + '</small></div><button type="button" class="pt-x" id="obPkX">✕</button></div><div class="ob-pk-srch"><input id="obPkInp" type="search" placeholder="Поиск мебели..."></div><div class="ob-pk-chips" id="obPkChips"><button type="button" data-c="all" class="' + (selCat === 'all' ? 'on' : '') + '">Все</button>' + catsList.map(c => '<button type="button" data-c="' + esc(c) + '" class="' + (selCat === c ? 'on' : '') + '">' + (CAT_ICO[c] || '📦') + ' ' + esc(c) + '</button>').join('') + '</div><div class="ob-pk-list" id="obPkList"></div></div>';
      document.body.appendChild(pm);
      const closePk = () => pm.remove();
      g('obPkX').onclick = closePk; pm.onclick = ev => { if (ev.target === pm) closePk(); };
      const drawItems = () => {
        const box = g('obPkList');
        const list = BON_ITEMS.filter(it => (selCat === 'all' || it.cat === selCat) && (!q || it.name.toLowerCase().includes(q) || it.cat.toLowerCase().includes(q)));
        if (!list.length) { box.innerHTML = '<div class="pt-empty">Ничего не найдено</div>'; return; }
        box.innerHTML = list.map(it => {
          const on = r.code === it.code, pr = it.one ? it.p1 : (isCity ? it.p1 : it.p2);
          return '<button type="button" class="ob-pk-it' + (on ? ' on' : '') + '" data-code="' + it.code + '"><span>' + (CAT_ICO[it.cat] || '📦') + '</span><span class="ob-pk-tx"><b>' + esc(it.name) + '</b><small>' + esc(it.cat) + '</small></span><span class="ob-pk-pr">' + fm(pr) + ' ' + CUR + '</span></button>';
        }).join('');
      };
      g('obPkChips').onclick = ev => { const b = ev.target.closest('button[data-c]'); if (!b) return; selCat = b.dataset.c; g('obPkChips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawItems(); };
      g('obPkInp').oninput = ev => { q = ev.target.value.trim().toLowerCase(); drawItems(); };
      g('obPkList').onclick = ev => { const it = ev.target.closest('button[data-code]'); if (!it) return; r.code = it.dataset.code; saveCloudModel(r.name, r.code); closePk(); renderRows(); };
      drawItems();
    };

    m = document.createElement('div'); m.id = 'ocrBonMdl'; m.className = 'mdl open';
    m.innerHTML = '<div class="mdl-b pt-box ob-box"><div class="pt-hd"><div class="pt-hd-l"><div class="pt-hd-ic" style="background:rgba(250,204,21,.16);border-color:rgba(250,204,21,.42);color:#fde047">🧮</div><div><div class="pt-hd-t">Бонусы по накладной</div><div class="pt-hd-s" id="obSub"></div></div></div><button type="button" class="pt-x" id="obX">✕</button></div>'
      + '<div class="ob-zone-w"><div class="ob-seg" id="obZoneSeg"><button type="button" data-z="city" class="' + (isCity ? 'on' : '') + '">🏙️ Город (Ереван)</button><button type="button" data-z="reg" class="' + (!isCity ? 'on' : '') + '">🛣️ Район (Области)</button></div></div>'
      + '<div class="pt-list" id="obList"></div>'
      + '<div class="pt-ft"><div class="ob-tot"><span>Будет начислено:</span><b id="obTotSum">0 ' + CUR + '</b></div><button type="button" class="pt-add" id="obSaveBtn"><span>➕ Добавить в бонусы</span></button></div></div>';
    document.body.appendChild(m);
    const close = () => { saveOcrDraft(null); m.remove(); };
    g('obX').onclick = close; m.onclick = e => { if (e.target === m) close(); };

    const carCode = (() => { try { return (localStorage.getItem('USER_CAR') || '').trim().toUpperCase(); } catch (e) { return ''; } })();
    if (g('obSub')) g('obSub').innerHTML = carCode && carCode !== 'ADMIN' ? 'Экипаж <b style="color:#6ee7b7">' + esc(carCode) + '</b> · ' + (isCity ? 'Ереван → Город' : 'Область → Район') : (carCode === 'ADMIN' ? 'Режим Админ' : '<span style="color:#fbbf24">⚠️ Экипаж не назначен</span>');

    const renderRows = () => {
      const box = g('obList');
      if (!rows.length) { box.innerHTML = '<div class="pt-empty">Все позиции удалены</div>'; g('obTotSum').textContent = '0 ' + CUR; return; }
      let tot = 0;
      box.innerHTML = rows.map((r, i) => {
        const info = r.code ? BON_BY_CODE[r.code] : null;
        const up = info ? (info.one ? info.p1 : (isCity ? info.p1 : info.p2)) : 0;
        tot += up * r.qty;
        const pickLabel = info
          ? '<span class="ob-pick-l"><span>' + (CAT_ICO[info.cat] || '📦') + '</span><b>' + esc(info.name) + '</b></span><span class="ob-pick-r"><span class="ob-pick-tag">' + fm(up) + ' ' + CUR + '</span><span>▾</span></span>'
          : '<span class="ob-pick-l"><span>⚠️</span><b style="color:#fbbf24">Выберите категорию бонусов</b></span><span class="ob-pick-r"><span>▾</span></span>';
        return '<div class="ob-card' + (info ? '' : ' unk') + '"><div class="ob-top"><div class="ob-nm">' + esc(r.name) + '</div><button type="button" class="ob-del" data-i="' + i + '">✕</button></div>'
          + '<button type="button" class="ob-pick' + (info ? '' : ' unk') + '" data-pick="' + i + '">' + pickLabel + '</button>'
          + '<div class="ob-bot"><div class="ob-qbox"><button type="button" class="ob-pm" data-act="dec" data-i="' + i + '">−</button><b>' + r.qty + ' шт</b><button type="button" class="ob-pm" data-act="inc" data-i="' + i + '">+</button></div>'
          + '<div class="ob-pr">' + (info ? (fm(up) + ' × ' + r.qty + ' = <b>' + fm(up * r.qty) + ' ' + CUR + '</b>') : '<span style="color:#fbbf24">Не выбрано</span>') + '</div></div></div>';
      }).join('');
      g('obTotSum').textContent = fm(tot) + ' ' + CUR;
      saveOcrDraft(rows, isCity);
    };

    g('obZoneSeg').onclick = e => { const b = e.target.closest('button[data-z]'); if (!b) return; isCity = b.dataset.z === 'city'; g('obZoneSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderRows(); };
    g('obList').onclick = e => {
      const pk = e.target.closest('[data-pick]'); if (pk) { openCatPicker(+pk.dataset.pick); return; }
      const del = e.target.closest('.ob-del'); if (del) { rows.splice(+del.dataset.i, 1); renderRows(); return; }
      const pm = e.target.closest('.ob-pm'); if (pm && rows[+pm.dataset.i]) { rows[+pm.dataset.i].qty = pm.dataset.act === 'inc' ? rows[+pm.dataset.i].qty + 1 : Math.max(1, rows[+pm.dataset.i].qty - 1); renderRows(); }
    };
    g('obSaveBtn').onclick = async () => {
      const valid = rows.filter(r => r.code && BON_BY_CODE[r.code] && r.qty > 0);
      if (!valid.length) { window.toast && toast('Выберите категорию хотя бы для одной позиции', 'err'); return; }
      const code = (() => { try { return (localStorage.getItem('USER_CAR') || '').trim().toUpperCase(); } catch (e) { return ''; } })();
      if (!code || !window.firebase || !firebase.apps.length) { window.toast && toast('Нет связи или не назначен экипаж', 'err'); return; }
      g('obSaveBtn').disabled = true;
      try {
        const db = firebase.database(), qRef = db.ref('cars/' + code + '/qty'), cur = (await qRef.once('value')).val() || {}, patch = {};
        let s = 0, q = 0;
        valid.forEach(r => { const info = BON_BY_CODE[r.code], k = info.one ? r.code : (isCity ? r.code : r.code + '_2'); patch[k] = (+cur[k] || 0) + r.qty; s += (info.one ? info.p1 : (isCity ? info.p1 : info.p2)) * r.qty; q += r.qty; });
        await qRef.update(patch); await db.ref('cars/' + code + '/t').set(Date.now());
        close(); window.toast && toast('Начислено: +' + q + ' шт (' + fm(s) + ' ' + CUR + ')');
      } catch (err) { g('obSaveBtn').disabled = false; window.toast && toast('Ошибка записи в базу', 'err'); }
    };
    renderRows();
  }

  const ensureOcrInputs = () => {
    const mk = (id, cap) => {
      let el = g(id);
      if (!el && document.body) {
        el = document.createElement('input');
        el.type = 'file';
        el.id = id;
        el.accept = 'image/*';
        el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0';
        if (cap) el.setAttribute('capture', 'environment');
        el.addEventListener('change', () => {
          const f = el.files && el.files[0];
          el.value = '';
          if (f) scanBonusFile(f);
        });
        document.body.appendChild(el);
      }
      return el;
    };
    return { cam: mk('bnCamFile', 1), gal: mk('bnGalFile', 0) };
  };

  async function scanBonusFile(file){
    if (!file) return;
    window._ocrScanning = true;
    if (window.openBon && (!g('bnMdl') || !g('bnMdl').classList.contains('open'))) window.openBon(true);
    const btn = g('bnCamBtn'); if (btn) btn.classList.add('busy'); if (typeof busy === 'function') busy(1);
    window.toast && toast('Распознаю накладную...');
    try {
      const b64 = await compressImage(file);
      const { addr, items } = await askGemini(b64);
      if (!items.length) { window.toast && toast('Товары в накладной не найдены', 'err'); return; }
      openBonusInvoiceModal(items, isYerevanAddress(addr));
    } catch (e) { window.toast && toast('Ошибка OCR: ' + ((e && e.message) || e), 'err'); }
    finally { window._ocrScanning = false; if (btn) btn.classList.remove('busy'); if (typeof busy === 'function') busy(0); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureOcrInputs);
  else ensureOcrInputs();

  window.openBonusScanner = () => {
    const { cam, gal } = ensureOcrInputs();
    let m = g('ocrSrcMdl'); if (m) m.remove();
    m = document.createElement('div'); m.id = 'ocrSrcMdl'; m.className = 'cm open';
    m.innerHTML = '<div class="cm-b ocr-src-box"><button type="button" class="pm-x" id="ocrPickX">✕</button><div class="ocr-src-top"><div class="ocr-src-ring"><div class="ocr-src-in">📷</div></div><div class="ocr-src-pill"><i></i>Smart OCR</div><div class="ocr-src-t">Сканировать накладную</div><div class="ocr-src-s">Автоподсчёт бонусов по фото документа</div></div><div class="pm-acts"><button type="button" class="pm-btn pm-chat" id="ocrPickCam"><span class="pm-btn-l"><span class="pm-ic">📸</span><span class="pm-tx"><b>Открыть камеру</b><small>Сфотографировать накладную</small></span></span><span class="pm-arr">›</span></button><button type="button" class="pm-btn pm-dm" id="ocrPickGal"><span class="pm-btn-l"><span class="pm-ic">🖼️</span><span class="pm-tx"><b>Выбрать из галереи</b><small>Загрузить готовый снимок</small></span></span><span class="pm-arr">›</span></button></div><button type="button" class="pm-cls" id="ocrPickNo">Отмена</button></div>';
    document.body.appendChild(m);
    const close = () => m.remove();
    g('ocrPickNo').onclick = close; g('ocrPickX').onclick = close; m.onclick = e => { if (e.target === m) close(); };
    g('ocrPickCam').onclick = () => { close(); cam.click(); }; g('ocrPickGal').onclick = () => { close(); gal.click(); };
  };
  window.EUROBAZA_OCR_KEY = GKEY;
  setTimeout(() => {
    try {
      const raw = sessionStorage.getItem("OCR_BON_DRAFT");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.rows) && d.rows.length) {
        if (window.openBon && (!g("bnMdl") || !g("bnMdl").classList.contains("open"))) window.openBon(true);
        openBonusInvoiceModal(d.rows, !!d.isCity);
      }
    } catch (e) {}
  }, 350);
})();
