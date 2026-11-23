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

  function createXlsxBlob(allRows, hasTotal, mergeFirstCol, rowTypes = []) {
    const colCount = allRows.reduce((m, r) => Math.max(m, (r && r.length) || 0), 0);
    const widths = new Array(colCount).fill(0);

    for (let r = 0; r < allRows.length; r++) {
      const row = allRows[r] || [];
      for (let c = 0; c < colCount; c++) {
        const raw = row[c];
        const s = typeof raw === 'number' && isFinite(raw) ? fm(raw) : String(raw == null ? '' : raw);
        let w = 0;
        for (let i = 0; i < s.length; i++) {
          const ch = s.charCodeAt(i);
          w += ch > 127 ? 1.15 : 1.0;
        }
        if (w > widths[c]) widths[c] = w;
      }
    }

    const colsXml = '<cols>' + widths.map((w, i) => {
      const cw = Math.max(4.2, Math.min(60, +(w + 2.6).toFixed(1)));
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
      const rType = (!isHead && !isTot) ? (rowTypes[rIdx - 1] || '') : '';
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
        if (rType === 'cat') styleId = (typeof val === 'number' && isFinite(val)) ? 11 : 10;
        else if (rType === 'hi') styleId = (typeof val === 'number' && isFinite(val)) ? 13 : 12;

        if (typeof val === 'number' && isFinite(val)) {
          if (rType === '' && !isHead && !isTot && !isShort) styleId = 14;
          if (isTot && !isShort) styleId = 15;
          cells.push(`<c r="${ref}" s="${styleId}"><v>${val}</v></c>`);
        } else {
          const str = String(val);
          if (str === '' && !isHead && !isTot && rType !== 'cat' && rType !== 'hi') continue;
          if (!isHead && !isTot && rType === '') {
            if (str === '✕') styleId = 7;
            else if (str === '✓') styleId = 8;
            else if (str === 'В' || str === 'Հ' || str === 'Off') styleId = 9;
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
      + '<fonts count="6">'
      + '<font><sz val="11"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FF047857"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>'
      + '</fonts>'
      + '<fills count="8">'
      + '<fill><patternFill patternType="none"/></fill>'
      + '<fill><patternFill patternType="gray125"/></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFBFDBFE"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFECACA"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFA7F3D0"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>'
      + '</fills>'
      + '<borders count="2">'
      + '<border><left/><right/><top/><bottom/><diagonal/></border>'
      + '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>'
      + '</borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="16">'
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
      + '<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="3" fontId="1" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="3" fontId="3" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      + '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      + '<xf numFmtId="3" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
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

  // Печать таблицы на принтер (чистый белый лист А4, альбомная для широких таблиц)
  function printTable({ title, headers = [], rows = [], totalRow = null, mergeFirstCol = false, rowTypes = [] }) {
    const isWide = headers.length > 7;
    const isCatalog = rowTypes && rowTypes.length > 0;
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

    const thHtml = headers.map((h, idx) => `<th class="${isCatalog ? (idx === 1 ? '' : 'r') : (idx > 1 ? 'c' : (mergeFirstCol && idx === 0 ? 'c' : ''))}">${esc(h)}</th>`).join('');
    const tbHtml = rows.map((r, rIdx) => {
      const rt = rowTypes[rIdx] || '';
      const trCls = rt === 'cat' ? ' class="cat-r"' : (rt === 'hi' ? ' class="hi-r"' : '');
      const tds = r.map((c, idx) => {
        if (mergeFirstCol && idx === 0) {
          if (spans[rIdx] === 0) return '';
          return `<td rowspan="${spans[rIdx]}" class="crew">${esc(c)}</td>`;
        }
        const s = String(c == null ? '' : c);
        if (s === '✕') return `<td class="c abs">✕</td>`;
        if (s === '✓') return `<td class="c wrk">✓</td>`;
        if (s === 'В' || s === 'Հ' || s === 'Off') return `<td class="c off">${esc(s)}</td>`;
        const val = typeof c === 'number' ? fm(c) : s;
        if (isCatalog) {
          const al = idx === 1 ? '' : (idx === 2 ? 'c' : 'r');
          const bld = (rt === 'cat' || (rt === 'hi' && idx >= 2)) ? ' b' : '';
          return `<td class="${al}${bld}">${esc(val)}</td>`;
        }
        return `<td class="${idx > 1 ? 'c' : ''}${idx === r.length - 1 ? ' b' : ''}">${esc(val)}</td>`;
      }).join('');
      return `<tr${trCls}>${tds}</tr>`;
    }).join('');
    const tfHtml = totalRow ? `<tfoot><tr>${totalRow.map((c, idx) => {
      const val = typeof c === 'number' ? fm(c) : String(c == null ? '' : c);
      const cls = isCatalog ? (idx === 1 ? '' : (idx === 2 ? 'c' : 'r')) : (idx > 1 ? 'c' : '');
      return `<td class="${cls}">${esc(val)}</td>`;
    }).join('')}</tr></tfoot>` : '';
    const dt = new Date().toLocaleDateString('ru-RU');

    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${esc(title || 'EuroBaza')}</title><style>
      @page { size: A4 ${isWide ? 'landscape' : 'portrait'}; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; }
      .hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
      .hd h1 { margin: 0; font-size: ${isWide ? '14px' : '15px'}; font-weight: 800; color: #1e3a8a; }
      .hd span { font-size: 10.5px; color: #475569; }
      table { width: 100%; border-collapse: collapse; font-size: ${isWide ? '9px' : (isCatalog ? '9.5px' : '11.5px')}; table-layout: auto; }
      th, td { border: 1px solid #cbd5e1; padding: ${isWide ? '3px 2px' : (isCatalog ? '2.5px 6px' : '6px 8px')}; text-align: left; white-space: nowrap; }
      thead th { background: #bfdbfe; font-weight: 800; color: #1e3a8a; }
      tfoot td { background: #bfdbfe; font-weight: 800; color: #1e3a8a; border-top: 2px solid #2563eb; }
      .c { text-align: center; }
      .r { text-align: right; font-variant-numeric: tabular-nums; }
      .b { font-weight: 700; }
      .crew { text-align: center; vertical-align: middle; font-weight: 800; background: #f8fafc; }
      .cat-r td { background: #d9ead3; font-weight: 800; color: #14532d; }
      .hi-r td { background: #ecfdf5; }
      .abs { background: #fecaca; color: #b91c1c; font-weight: 800; }
      .wrk { background: #a7f3d0; color: #047857; font-weight: 800; }
      .off { background: #fef3c7; color: #b45309; font-weight: 700; }
    </style></head><body>
      <div class="hd"><h1>EuroBaza · ${esc(title || 'Таблица')}</h1><span>Дата печати: ${dt}</span></div>
      <table><thead><tr>${thHtml}</tr></thead><tbody>${tbHtml}</tbody>${tfHtml}</table>
    </body></html>`;

    const old = document.getElementById('tvPrintFrame');
    if (old) old.remove();
    const fr = document.createElement('iframe');
    fr.id = 'tvPrintFrame';
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const doc = fr.contentDocument || fr.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        fr.contentWindow.focus();
        fr.contentWindow.print();
      } catch (e) {
        if (window.toast) window.toast('Не удалось открыть печать', true);
      }
      setTimeout(() => fr.remove(), 60000);
    }, 150);
  }

  function trExcelVal(val, lang, keepCrewCode) {
    if (typeof val === 'number' || val == null || val === '') return val;
    const s = String(val);
    if (lang === 'ru') return s;
    // Коды экипажей (BB, CC, VV, RR, EE, GG, XX, ZZ, ADMIN) всегда на латинском
    if (keepCrewCode || /^[A-Z]{2,5}$/.test(s.trim())) return s;
    // «Экипаж BB (имена)» — переводим только слово «Экипаж», код и имена сохраняем
    const mCrew = s.match(/^Экипаж ([A-Z0-9]+)(.*)$/);
    if (mCrew) {
      const pref = lang === 'hy' ? 'Անձնակազմ ' : 'Crew ';
      const rest = mCrew[2] ? (window.i18nTranslateText ? window.i18nTranslateText(mCrew[2], lang) : mCrew[2]) : '';
      return pref + mCrew[1] + rest;
    }
    if (window.i18nTranslateText) return window.i18nTranslateText(s, lang);
    return s;
  }

  const TableViewer = {
    // Открыть модальное окно с таблицей
    open({ title, filename, headers = [], rows = [], totalRow = null, mergeFirstCol = false, rowTypes = [] }) {
      const old = document.getElementById('tvMdl');
      if (old) {
        if (typeof old._tvClose === 'function') old._tvClose();
        else old.remove();
      }

      const isDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const isCatalog = rowTypes && rowTypes.length > 0;
      const baseXlsxName = String(filename || 'EuroBaza.xlsx').replace(/\.csv$/i, '.xlsx');
      let excelLang = (window.getLang && window.getLang()) || 'ru';

      const buildLocalized = (lang) => {
        const lTitle = trExcelVal(title || 'Ведомость', lang, false);
        const lHeaders = headers.map(h => trExcelVal(h, lang, false));
        const lRows = rows.map(r => r.map((c, idx) => trExcelVal(c, lang, mergeFirstCol && idx === 0)));
        const lTotal = totalRow ? totalRow.map(c => trExcelVal(c, lang, false)) : null;
        const allRows = [lHeaders, ...lRows, ...(lTotal ? [lTotal] : [])];
        const lBlob = createXlsxBlob(allRows, !!lTotal, !!mergeFirstCol, rowTypes);
        const lName = lang === 'ru' ? baseXlsxName : baseXlsxName.replace(/\.xlsx$/i, '_' + lang.toUpperCase() + '.xlsx');
        return { lTitle, lHeaders, lRows, lTotal, lBlob, lName };
      };

      let loc = buildLocalized(excelLang);

      const prevHtmlOv = document.documentElement.style.overflow;
      const prevBodyOv = document.body.style.overflow;
      const prevBodyObs = document.body.style.overscrollBehavior;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';

      const m = document.createElement('div');
      m.id = 'tvMdl';
      m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:12px;touch-action:none;overscroll-behavior:contain;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)';

      const midBtn = isDesktop
        ? `<button type="button" id="tvPrint" title="Напечатать" style="width:auto!important;margin:0!important;height:34px!important;padding:0 12px!important;border-radius:9px!important;background:linear-gradient(135deg,rgba(168,85,247,.26),rgba(124,58,237,.16))!important;border:1px solid rgba(192,132,252,.5)!important;color:#e9d5ff!important;font-size:12px!important;font-weight:700!important;display:inline-flex!important;align-items:center;gap:5px;cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:none!important">🖨️ Напечатать</button>`
        : `<button type="button" id="tvShare" title="Поделиться" style="width:auto!important;margin:0!important;height:34px!important;padding:0 10px!important;border-radius:9px!important;background:linear-gradient(135deg,rgba(56,189,248,.25),rgba(2,132,199,.15))!important;border:1px solid rgba(56,189,248,.5)!important;color:#7dd3fc!important;font-size:12px!important;font-weight:700!important;display:inline-flex!important;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:none!important">📤 Поделиться</button>`;

      const langSegBtn = (k, lbl) => `<button type="button" data-tvl="${k}" style="width:auto!important;margin:0!important;height:26px!important;padding:0 8px!important;border-radius:7px!important;font-size:11px!important;font-weight:800!important;cursor:pointer;border:1px solid ${excelLang === k ? 'rgba(250,204,21,.55)' : 'transparent'}!important;background:${excelLang === k ? 'rgba(250,204,21,.22)' : 'transparent'}!important;color:${excelLang === k ? '#fde047' : '#94a3b8'}!important;box-shadow:none!important">${lbl}</button>`;

      const renderThead = (hdrs) => `<tr style="background:#131c2e;position:sticky;top:0;z-index:2;box-shadow:0 1px 0 rgba(255,255,255,.1)">${hdrs.map((h, idx) => `<th style="padding:10px 14px;font-weight:700;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.1);white-space:nowrap;${isCatalog ? (idx === 1 ? '' : (idx === 2 ? 'text-align:center;' : 'text-align:right;')) : (idx > 1 ? 'text-align:right;' : '')}">${esc(h)}</th>`).join('')}</tr>`;
      const renderTfoot = (tot) => tot ? `<tr style="background:#131c2e;position:sticky;bottom:0;z-index:2;border-top:2px solid rgba(250,204,21,.35);font-weight:800;color:#fde047">${tot.map((c, idx) => `<td style="padding:10px 14px;white-space:nowrap;${isCatalog ? (idx === 1 ? '' : (idx === 2 ? 'text-align:center;' : 'text-align:right;')) : (idx > 1 ? 'text-align:right;' : '')}">${esc(typeof c === 'number' ? fm(c) : c)}</td>`).join('')}</tr>` : '';

      m.innerHTML = `
        <div class="tv-box" style="max-width:min(94vw,1180px);width:100%;height:min(88dvh,760px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:18px;background:#0d131f;border:1px solid rgba(255,255,255,.16);box-shadow:0 18px 45px rgba(0,0,0,.75);animation:cmIn .16s ease-out">
          <div class="tv-hd" style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0">
            <div style="min-width:0;flex:1">
              <div id="tvTitle" data-no-i18n="1" style="font-size:14.5px;font-weight:800;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📊 ${esc(loc.lTitle)}</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">Строк: <b id="tvRowCount">${rows.length}</b></div>
            </div>
            <div id="tvLangBar" data-no-i18n="1" style="display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);flex-shrink:0">
              ${langSegBtn('ru', 'RU')}${langSegBtn('hy', 'HY')}${langSegBtn('en', 'EN')}
            </div>
            <button type="button" id="tvClose" style="width:32px!important;height:32px!important;margin:0!important;padding:0!important;background:transparent!important;border:none!important;color:#94a3b8!important;font-size:18px!important;cursor:pointer;display:flex!important;align-items:center;justify-content:center;border-radius:8px;box-shadow:none!important;flex-shrink:0">✕</button>
          </div>

          <div class="tv-bar" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0;box-sizing:border-box">
            <input type="search" id="tvSearch" placeholder="🔍 Поиск..." style="flex:1 1 auto;width:auto;min-width:0;height:34px;margin:0;padding:0 10px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#f8fafc;font-size:12.5px;outline:none;box-sizing:border-box">
            ${midBtn}
            <button type="button" id="tvDownload" title="Скачать Excel" style="width:auto!important;margin:0!important;height:34px!important;padding:0 10px!important;border-radius:9px!important;background:rgba(16,185,129,.18)!important;border:1px solid rgba(52,211,153,.45)!important;color:#6ee7b7!important;font-size:12px!important;font-weight:700!important;display:inline-flex!important;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0;box-shadow:none!important">
              📥 Excel
            </button>
          </div>

          <div class="tv-scroll" data-no-i18n="1" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0;max-width:100%;min-width:0;touch-action:pan-x pan-y">
            <table id="tvTable" style="width:max-content;min-width:100%;border-collapse:collapse;font-size:12px;line-height:1.35;text-align:left">
              <thead id="tvThead">${renderThead(loc.lHeaders)}</thead>
              <tbody id="tvTbody">${this.renderRowsHtml(loc.lRows, mergeFirstCol, rowTypes)}</tbody>
              <tfoot id="tvTfoot">${renderTfoot(loc.lTotal)}</tfoot>
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

      const searchInp = document.getElementById('tvSearch');
      const tbody = document.getElementById('tvTbody');
      const countEl = document.getElementById('tvRowCount');

      const applySearch = () => {
        const q = (searchInp.value || '').trim().toLowerCase();
        if (!q) {
          tbody.innerHTML = this.renderRowsHtml(loc.lRows, mergeFirstCol, rowTypes);
          countEl.textContent = loc.lRows.length;
          return;
        }
        const filtered = [], fTypes = [];
        loc.lRows.forEach((r, idx) => {
          if (r.some(cell => String(cell || '').toLowerCase().includes(q))) {
            filtered.push(r);
            fTypes.push(rowTypes[idx] || '');
          }
        });
        tbody.innerHTML = this.renderRowsHtml(filtered, mergeFirstCol, fTypes);
        countEl.textContent = filtered.length;
      };

      // Переключатель языка Excel-файла (RU / HY / EN)
      const langBar = document.getElementById('tvLangBar');
      if (langBar) {
        langBar.onclick = e => {
          const b = e.target.closest('button[data-tvl]');
          if (!b) return;
          const nl = b.dataset.tvl;
          if (!nl || nl === excelLang) return;
          excelLang = nl;
          loc = buildLocalized(excelLang);
          langBar.querySelectorAll('button[data-tvl]').forEach(x => {
            const on = x.dataset.tvl === excelLang;
            x.style.borderColor = on ? 'rgba(250,204,21,.55)' : 'transparent';
            x.style.background = on ? 'rgba(250,204,21,.22)' : 'transparent';
            x.style.color = on ? '#fde047' : '#94a3b8';
          });
          const ttl = document.getElementById('tvTitle');
          if (ttl) ttl.textContent = '📊 ' + loc.lTitle;
          const th = document.getElementById('tvThead');
          if (th) th.innerHTML = renderThead(loc.lHeaders);
          const tf = document.getElementById('tvTfoot');
          if (tf) tf.innerHTML = renderTfoot(loc.lTotal);
          applySearch();
        };
      }

      // Печать (на ПК)
      const printBtn = document.getElementById('tvPrint');
      if (printBtn) {
        printBtn.onclick = () => printTable({ title: loc.lTitle, headers: loc.lHeaders, rows: loc.lRows, totalRow: loc.lTotal, mergeFirstCol, rowTypes });
      }

      // Поделиться (на мобильном)
      const shareBtn = document.getElementById('tvShare');
      if (shareBtn) {
        shareBtn.onclick = async () => {
          const res = await shareFile(loc.lBlob, loc.lName, loc.lTitle);
          if (res === 'unsupported' || res === 'error') {
            downloadBlob(loc.lBlob, loc.lName);
            if (window.toast) window.toast('Файл скачан');
          }
        };
      }

      // Скачать Excel (.xlsx)
      document.getElementById('tvDownload').onclick = () => {
        downloadBlob(loc.lBlob, loc.lName);
        if (window.toast) window.toast('Файл Excel скачан');
      };

      // Живой поиск
      searchInp.oninput = applySearch;
    },

    // Отрисовка строк таблицы
    renderRowsHtml(rows, mergeFirstCol = false, rowTypes = []) {
      if (!rows.length) {
        return `<tr><td colspan="10" style="padding:28px 12px;text-align:center;color:#64748b">Ничего не найдено</td></tr>`;
      }
      const isCatalog = rowTypes && rowTypes.some(Boolean);
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
        const rt = rowTypes[rIdx] || '';
        const bg = rt === 'cat'
          ? 'background:rgba(16,185,129,.16);border-top:1px solid rgba(52,211,153,.32);border-bottom:1px solid rgba(52,211,153,.22);'
          : (rt === 'hi'
            ? 'background:rgba(56,189,248,.07);border-bottom:1px solid rgba(255,255,255,.06);'
            : (rIdx % 2 === 1 ? 'background:rgba(255,255,255,.02);border-bottom:1px solid rgba(255,255,255,.04);' : 'border-bottom:1px solid rgba(255,255,255,.04);'));
        return `
          <tr style="${bg}">
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
              if (s === 'В' || s === 'Հ' || s === 'Off') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:700;color:#fbbf24;background:rgba(245,158,11,.12)">${esc(s)}</td>`;
              }
              const txt = typeof c === 'number' ? fm(c) : s;
              if (isCatalog) {
                const al = idx === 1 ? '' : (idx === 2 ? 'text-align:center;' : 'text-align:right;');
                const col = rt === 'cat'
                  ? (idx === 3 && typeof c === 'number' ? 'color:#fde047;font-weight:800;' : 'color:#6ee7b7;font-weight:800;')
                  : (rt === 'hi'
                    ? (idx === 3 ? 'color:#fde047;font-weight:800;' : (idx === 2 ? 'color:#7dd3fc;font-weight:800;' : 'color:#f8fafc;font-weight:600;'))
                    : (idx === 0 ? 'color:#64748b;' : 'color:#94a3b8;'));
                return `<td style="padding:7px 12px;white-space:nowrap;${al}${col}">${esc(txt)}</td>`;
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
