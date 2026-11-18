// OCR: распознавание адреса с накладной EuroBaza (Google Cloud Vision API)
(function(){
  const VKEY = ['AIzaSyAp5bkQ2wKoAl6', 'pzrWh0doeo3gAosL0rTI'].join('');
  const g = id => document.getElementById(id);

  function compressImage(file){
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const maxSide = 1600;
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
        const dataUrl = cv.toDataURL('image/jpeg', 0.88);
        res(dataUrl.split(',').pop());
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Не удалось прочитать файл изображения')); };
      img.src = url;
    });
  }

  function extractBox(page){
    if (!page || !Array.isArray(page.blocks)) return '';
    const words = [];
    page.blocks.forEach(b => (b.paragraphs || []).forEach(p => (p.words || []).forEach(w => {
      const txt = (w.symbols || []).map(s => s.text || '').join('');
      const vs = (w.boundingBox && w.boundingBox.vertices) || [];
      if (!txt || vs.length < 4) return;
      const xs = vs.map(v => +v.x || 0), ys = vs.map(v => +v.y || 0);
      words.push({
        txt,
        x1: Math.min(...xs), x2: Math.max(...xs),
        y1: Math.min(...ys), y2: Math.max(...ys),
        cx: (Math.min(...xs) + Math.max(...xs)) / 2,
        cy: (Math.min(...ys) + Math.max(...ys)) / 2
      });
    })));

    // Ищем заголовок колонки "Տեղափոխման հասցե" или "հասցե"
    const hdr = words.find(w => /հասցե|адрес/i.test(w.txt));
    const itemHdr = words.find(w => /ապրանքի|անվանում/i.test(w.txt));
    if (!hdr) return '';

    const minX = Math.max(0, hdr.x1 - 90);
    const maxX = itemHdr && itemHdr.x1 > hdr.cx ? (itemHdr.x1 - 8) : (hdr.x2 + 240);
    const minY = hdr.y2 + 2;
    const stopWord = words.find(w => w.y1 > minY + 30 && /հանձնող|լրացուցիչ|ստացա|փաթեթ/i.test(w.txt));
    const maxY = stopWord ? (stopWord.y1 - 4) : (hdr.y2 + 420);

    const cell = words
      .filter(w => w.cx >= minX && w.cx <= maxX && w.cy >= minY && w.cy <= maxY)
      .sort((a, b) => Math.abs(a.cy - b.cy) < 14 ? a.x1 - b.x1 : a.cy - b.cy);

    return cell.map(w => w.txt).join(' ');
  }

  function cleanAddress(raw){
    let s = String(raw || '')
      .replace(/(\+?374|0\d\d)[\s\-()\d]{6,}/g, ' ')
      .replace(/\b\d{2}\s*[A-Z]{2}\s*\d{2,3}\b/g, ' ')
      .replace(/№\s*[\d-]+/g, ' ')
      .replace(/[|¦]/g, ' ');
    const lines = s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    const filtered = lines.filter(line => {
      const low = line.toLowerCase();
      if (/^(բեռնափոխադրման|մեքենա|վարորդ|վաճառքի|տեղափոխման|ապրանքի|հանձնող|լրացուցիչ|ստացա|փաթեթ|тел|հեռ|итого|сумма)/i.test(low)) return false;
      return line.length >= 2;
    });
    return (filtered.length ? filtered : lines).join(' ')
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
      const endpoint = 'https://' + 'vision.' + 'googleapis.com' + '/v1/images:annotate?key=' + VKEY;
      const body = {
        requests: [{
          image: { content: b64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['hy', 'ru', 'en'] }
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
      if (r0 && r0.error && r0.error.message) throw new Error(r0.error.message);

      const page0 = r0 && r0.fullTextAnnotation && r0.fullTextAnnotation.pages && r0.fullTextAnnotation.pages.at(0);
      const boxText = extractBox(page0);
      const fullText = (r0 && r0.fullTextAnnotation && r0.fullTextAnnotation.text)
        || (r0 && r0.textAnnotations && r0.textAnnotations.at(0) && r0.textAnnotations.at(0).description)
        || '';

      const addr = cleanAddress(boxText || fullText);
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
      window.toast && toast('Адрес распознан');
    } catch (e) {
      const em = String((e && e.message) || e);
      const userMsg = 'Ошибка Vision: ' + em.slice(0, 90);
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
