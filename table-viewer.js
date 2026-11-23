// table-viewer.js — Встроенный просмотрщик Excel/CSV таблиц и экспорт с Web Share API
(function(){
  'use strict';

  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fm = v => (+v || 0).toLocaleString('ru-RU');

  // ===== Генератор настоящего .xlsx (ZIP STORE + OOXML) с авто-шириной столбцов =====
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeZip(files) {
    const enc = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = enc.encode(f.name);
      const dataBytes = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(dataBytes);
      const size = dataBytes.length;

      const lh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034B50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      localParts.push(lh, dataBytes);

      const ch = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014B50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      centralParts.push(ch);

      offset += lh.length + size;
    }

    const centralSize = centralParts.reduce((s, a) => s + a.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054B50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, eocd], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  }

  function xmlEsc(v) {
    return String(v == null ? '' : v)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function colLetter(idx) {
    let s = '', n = idx + 1;
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  function createXlsxBlob(allRows, hasTotal, mergeFirstCol) {
    const colCount = allRows.reduce((m, r) => Math.max(m, (r && r.length) || 0), 0);
    const widths = new Array(colCount).fill(0);

    for (let r = 0; r < allRows.length; r++) {
      const row = allRows[r] || [];
      for (let c = 0; c < colCount; c++) {
        const s = String(row[c] == null ? '' : row[c]);
        let w = 0;
        for (let i = 0; i < s.length; i++) {
          const ch = s.charCodeAt(i);
          w += ch > 127 ? 1.15 : 1.0;
        }
        if (w > widths[c]) widths[c] = w;
      }
    }

    const colsXml = '<cols>' + widths.map((w, i) => {
      const cw = Math.max(4.2, Math.min(60, +(w + 2.4).toFixed(1)));
      return `<col min="${i + 1}" max="${i + 1}" width="${cw}" customWidth="1"/>`;
    }).join('') + '</cols>';

    // Объединение одинаковых подряд идущих ячеек в первом столбце (например, экипажи)
    const merges = [];
    const skipFirstCol = new Set();
    if (mergeFirstCol && allRows.length > 2) {
      const lastDataIdx = hasTotal ? allRows.length - 2 : allRows.length - 1;
      let i = 1;
      while (i <= lastDataIdx) {
        const val = String((allRows[i] && allRows[i][0]) || '');
        let j = i;
        while (j + 1 <= lastDataIdx && String((allRows[j + 1] && allRows[j + 1][0]) || '') === val) {
          j++;
        }
        if (val && j > i) {
          merges.push(`A${i + 1}:A${j + 1}`);
          for (let k = i + 1; k <= j; k++) skipFirstCol.add(k);
        }
        i = j + 1;
      }
    }

    const rowsXml = allRows.map((row, rIdx) => {
      const rNum = rIdx + 1;
      const isHead = rIdx === 0;
      const isTot = hasTotal && rIdx === allRows.length - 1;
      const cells = [];
      for (let c = 0; c < colCount; c++) {
        const ref = colLetter(c) + rNum;
        if (c === 0 && skipFirstCol.has(rIdx)) {
          cells.push(`<c r="${ref}" s="6"/>`);
          continue;
        }
        const val = row && row[c] !== undefined && row[c] !== null ? row[c] : '';
        const isShort = widths[c] <= 3.5;
        let styleId = isHead ? (isShort ? 2 : 1) : (isTot ? (isShort ? 4 : 3) : (isShort ? 5 : 0));
        if (mergeFirstCol && c === 0 && !isHead && !isTot) styleId = 6;
        if (mergeFirstCol && c === 0 && isHead) styleId = 2;
        if (typeof val === 'number' && isFinite(val)) {
          cells.push(`<c r="${ref}" s="${styleId}"><v>${val}</v></c>`);
        } else {
          const str = String(val);
          if (str === '' && !isHead && !isTot) continue;
          if (!isHead && !isTot) {
            if (str === '✕') styleId = 7;
            else if (str === '✓') styleId = 8;
            else if (str === 'В') styleId = 9;
          }
          cells.push(`<c r="${ref}" t="inlineStr" s="${styleId}"><is><t>${xmlEsc(str)}</t></is></c>`);
        }
      }
      return `<row r="${rNum}">${cells.join('')}</row>`;
    }).join('');

    const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      + '<Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + '</Types>';

    const rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      + '</Relationships>';

    const workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<sheets><sheet name="EuroBaza" sheetId="1" r:id="rId1"/></sheets>'
      + '</workbook>';

    const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      + '</Relationships>';

    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="5">'
      + '<font><sz val="11"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FF047857"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/></font>'
      + '</fonts>'
      + '<fills count="6">'
      + '<fill><patternFill patternType="none"/></fill>'
      + '<fill><patternFill patternType="gray125"/></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFECACA"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFA7F3D0"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>'
      + '</fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="10">'
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
      + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="4" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '</cellXfs>'
      + '</styleSheet>';

    const mergeXml = merges.length
      ? `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
      : '';

    const sheet1 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + colsXml
      + '<sheetData>' + rowsXml + '</sheetData>'
      + mergeXml
      + '</worksheet>';

    return makeZip([
      { name: '[Content_Types].xml', data: contentTypes },
      { name: '_rels/.rels', data: rootRels },
      { name: 'xl/workbook.xml', data: workbook },
      { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
      { name: 'xl/styles.xml', data: styles },
      { name: 'xl/worksheets/sheet1.xml', data: sheet1 }
    ]);
  }

  // Скачивание файла по ссылке
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1200);
  }

  // Поделиться через системное меню Android (Telegram, WhatsApp и т.д.)
  async function shareFile(blob, filename, title) {
    try {
      const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || 'EuroBaza',
          text: title || 'Отчёт EuroBaza'
        });
        return 'shared';
      }
      return 'unsupported';
    } catch (e) {
      if (e && e.name === 'AbortError') {
        return 'aborted';
      }
      console.warn('Share error:', e);
      return 'error';
    }
  }

  const TableViewer = {
    // Открыть модальное окно с таблицей
    open({ title, filename, headers = [], rows = [], totalRow = null, mergeFirstCol = false }) {
      const old = document.getElementById('tvMdl');
      if (old) {
        if (typeof old._tvClose === 'function') old._tvClose();
        else old.remove();
      }

      const xlsxName = String(filename || 'EuroBaza.xlsx').replace(/\.csv$/i, '.xlsx');
      const allRows = [headers, ...rows, ...(totalRow ? [totalRow] : [])];
      const blob = createXlsxBlob(allRows, !!totalRow, !!mergeFirstCol);

      const prevHtmlOv = document.documentElement.style.overflow;
      const prevBodyOv = document.body.style.overflow;
      const prevBodyObs = document.body.style.overscrollBehavior;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      const m = document.createElement('div');
      m.id = 'tvMdl';
      m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:12px;touch-action:none;overscroll-behavior:contain;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';

      m.innerHTML = `
        <div class="tv-box" style="max-width:min(94vw,1180px);width:100%;height:min(88dvh,760px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:18px;background:#0d131f;border:1px solid rgba(255,255,255,.16);box-shadow:0 18px 45px rgba(0,0,0,.75);animation:cmIn .16s ease-out">
          <div class="tv-hd" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0">
            <div style="min-width:0">
              <div style="font-size:15px;font-weight:800;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📊 ${esc(title || 'Ведомость')}</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">Строк: <b id="tvRowCount">${rows.length}</b></div>
            </div>
            <button type="button" id="tvClose" style="width:32px!important;height:32px!important;margin:0!important;padding:0!important;background:transparent!important;border:none!important;color:#94a3b8!important;font-size:18px!important;cursor:pointer;display:flex!important;align-items:center;justify-content:center;border-radius:8px;box-shadow:none!important">✕</button>
          </div>

          <div class="tv-bar" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;box-sizing:border-box">
            <input type="search" id="tvSearch" placeholder="🔍 Поиск..." style="flex:1 1 auto;width:auto;min-width:0;height:34px;margin:0;padding:0 10px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#f8fafc;font-size:12.5px;outline:none;box-sizing:border-box">
            <button type="button" id="tvShare" title="Поделиться" style="width:auto!important;margin:0!important;height:34px!important;padding:0 10px!important;border-radius:9px!important;background:linear-gradient(135deg,rgba(56,189,248,.25),rgba(2,132,199,.15))!important;border:1px solid rgba(56,189,248,.5)!important;color:#7dd3fc!important;font-size:12px!important;font-weight:700!important;display:inline-flex!important;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:none!important">
              📤 Поделиться
            </button>
            <button type="button" id="tvDownload" title="Скачать Excel" style="width:auto!important;margin:0!important;height:34px!important;padding:0 10px!important;border-radius:9px!important;background:rgba(16,185,129,.18)!important;border:1px solid rgba(52,211,153,.45)!important;color:#6ee7b7!important;font-size:12px!important;font-weight:700!important;display:inline-flex!important;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:none!important">
              📥 Excel
            </button>
          </div>

          <div class="tv-scroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0;max-width:100%;min-width:0;touch-action:pan-x pan-y">
            <table id="tvTable" style="width:max-content;min-width:100%;border-collapse:collapse;font-size:12px;line-height:1.35;text-align:left">
              <thead>
                <tr style="background:#131c2e;position:sticky;top:0;z-index:2;box-shadow:0 1px 0 rgba(255,255,255,.1)">
                  ${headers.map((h, idx) => `<th style="padding:10px 14px;font-weight:700;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.1);white-space:nowrap;${idx > 1 ? 'text-align:right;' : ''}">${esc(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="tvTbody">
                ${this.renderRowsHtml(rows, mergeFirstCol)}
              </tbody>
              ${totalRow ? `
              <tfoot>
                <tr style="background:#131c2e;position:sticky;bottom:0;z-index:2;border-top:2px solid rgba(250,204,21,.35);font-weight:800;color:#fde047">
                  ${totalRow.map((c, idx) => `<td style="padding:10px 14px;white-space:nowrap;${idx > 1 ? 'text-align:right;' : ''}">${esc(c)}</td>`).join('')}
                </tr>
              </tfoot>` : ''}
            </table>
          </div>
        </div>
      `;

      document.body.appendChild(m);

      const onKey = e => { if (e.key === 'Escape') close(); };
      const close = () => {
        document.documentElement.style.overflow = prevHtmlOv;
        document.body.style.overflow = prevBodyOv;
        document.body.style.overscrollBehavior = prevBodyObs;
        document.removeEventListener('keydown', onKey);
        m.remove();
      };
      m._tvClose = close;
      m.addEventListener('touchmove', e => {
        if (!e.target.closest('.tv-scroll')) e.preventDefault();
      }, { passive: false });
      document.addEventListener('keydown', onKey);
      document.getElementById('tvClose').onclick = close;
      m.onclick = e => { if (e.target === m) close(); };

      // Поделиться
      document.getElementById('tvShare').onclick = async () => {
        const res = await shareFile(blob, xlsxName, title);
        if (res === 'unsupported' || res === 'error') {
          downloadBlob(blob, xlsxName);
          if (window.toast) window.toast('Файл скачан');
        }
      };

      // Скачать Excel (.xlsx)
      document.getElementById('tvDownload').onclick = () => {
        downloadBlob(blob, xlsxName);
        if (window.toast) window.toast('Файл Excel скачан');
      };

      // Живой поиск
      const searchInp = document.getElementById('tvSearch');
      const tbody = document.getElementById('tvTbody');
      const countEl = document.getElementById('tvRowCount');

      searchInp.oninput = () => {
        const q = searchInp.value.trim().toLowerCase();
        if (!q) {
          tbody.innerHTML = this.renderRowsHtml(rows, mergeFirstCol);
          countEl.textContent = rows.length;
          return;
        }
        const filtered = rows.filter(r => r.some(cell => String(cell || '').toLowerCase().includes(q)));
        tbody.innerHTML = this.renderRowsHtml(filtered, mergeFirstCol);
        countEl.textContent = filtered.length;
      };
    },

    // Отрисовка строк таблицы
    renderRowsHtml(rows, mergeFirstCol = false) {
      if (!rows.length) {
        return `<tr><td colspan="10" style="padding:28px 12px;text-align:center;color:#64748b">Ничего не найдено</td></tr>`;
      }
      const spans = new Array(rows.length).fill(1);
      if (mergeFirstCol) {
        let i = 0;
        while (i < rows.length) {
          const v = String((rows[i] && rows[i][0]) || '');
          let j = i;
          while (j + 1 < rows.length && String((rows[j + 1] && rows[j + 1][0]) || '') === v) j++;
          if (v && j > i) {
            spans[i] = j - i + 1;
            for (let k = i + 1; k <= j; k++) spans[k] = 0;
          }
          i = j + 1;
        }
      }
      return rows.map((r, rIdx) => {
        const bg = rIdx % 2 === 1 ? 'background:rgba(255,255,255,.02);' : '';
        return `
          <tr style="${bg}border-bottom:1px solid rgba(255,255,255,.04)">
            ${r.map((c, idx) => {
              if (mergeFirstCol && idx === 0) {
                if (spans[rIdx] === 0) return '';
                return `<td rowspan="${spans[rIdx]}" style="padding:9px 14px;white-space:nowrap;text-align:center;vertical-align:middle;font-weight:800;color:#6ee7b7;border-right:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.1)">${esc(c)}</td>`;
              }
              const s = String(c == null ? '' : c);
              if (s === '✕') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:800;color:#fca5a5;background:rgba(239,68,68,.26)">✕</td>`;
              }
              if (s === '✓') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:800;color:#6ee7b7;background:rgba(16,185,129,.26)">✓</td>`;
              }
              if (s === 'В') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:700;color:#fbbf24;background:rgba(245,158,11,.12)">В</td>`;
              }
              const isNum = typeof c === 'number' || (!isNaN(+c) && idx > 1);
              return `<td style="padding:9px 14px;white-space:nowrap;color:#cbd5e1;${idx > 1 ? 'text-align:right;' : ''}${idx === r.length - 1 ? 'font-weight:700;color:#f8fafc;' : ''}">${esc(isNum && typeof c === 'number' ? fm(c) : c)}</td>`;
            }).join('')}
          </tr>
        `;
      }).join('');
    }
  };

  window.TableViewer = TableViewer;
})();
