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

  // Точный расчёт ширины текста в единицах Excel (ширина цифры '0' Calibri 11pt)
  let _mCtx = null, _mZeroW = 0;
  function getMeasureCtx() {
    if (_mCtx !== null) return _mCtx;
    try {
      if (typeof document !== 'undefined') {
        const cv = document.createElement('canvas');
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.font = '11pt Calibri, "Segoe UI", Roboto, Arial, sans-serif';
          _mZeroW = ctx.measureText('0000000000').width / 10 || 7.5;
          _mCtx = ctx;
          return _mCtx;
        }
      }
    } catch (e) {}
    _mCtx = false;
    return false;
  }

  function measureExcelLine(line, isBold) {
    if (!line) return 0;
    let heur = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line.charCodeAt(i);
      // Суррогатные пары (эмодзи и т.п.)
      if (ch >= 0xD800 && ch <= 0xDBFF && i + 1 < line.length) {
        heur += 2.1;
        i++;
        continue;
      }
      if (ch >= 0x0531 && ch <= 0x0556) {
        // Армянские заглавные
        heur += 1.48;
      } else if (ch >= 0x0561 && ch <= 0x058F) {
        // Армянские строчные (широкие буквы вроде մ, շ, պ, խ, փ, թ, ծ, ձ, ճ, ջ, ա, դ, ղ, և)
        const c = line[i];
        heur += 'մշպխփթծձճջադղև'.includes(c) ? 1.42 : 1.28;
      } else if ((ch >= 0x0410 && ch <= 0x042F) || ch === 0x0401) {
        // Кириллица заглавная
        const c = line[i];
        heur += 'ЖШЩЮФМЫД'.includes(c) ? 1.48 : 1.32;
      } else if ((ch >= 0x0430 && ch <= 0x044F) || ch === 0x0451) {
        // Кириллица строчная
        const c = line[i];
        heur += 'жшщюфмы'.includes(c) ? 1.36 : 1.12;
      } else if (ch >= 65 && ch <= 90) {
        // Латиница заглавная
        const c = line[i];
        heur += (c === 'W' || c === 'M') ? 1.48 : (c === 'I' ? 0.65 : 1.22);
      } else if (ch >= 48 && ch <= 57) {
        heur += 1.04;
      } else if (ch < 128) {
        const c = line[i];
        heur += 'iljtf.,:;!| '.includes(c) ? 0.62 : ((c === 'w' || c === 'm') ? 1.35 : 1.0);
      } else {
        heur += 1.45;
      }
    }
    if (isBold) heur *= 1.10;

    let canvasW = 0;
    const ctx = getMeasureCtx();
    if (ctx && _mZeroW > 0) {
      ctx.font = (isBold ? 'bold ' : '') + '11pt Calibri, "Segoe UI", Roboto, Arial, sans-serif';
      canvasW = (ctx.measureText(line).width / _mZeroW) * 1.10;
    }
    return Math.max(heur, canvasW);
  }

  function measureExcelText(str, isBold) {
    const s = String(str == null ? '' : str);
    if (!s) return 0;
    if (!s.includes('\n')) return measureExcelLine(s, isBold);
    let best = 0;
    for (const part of s.split('\n')) {
      const w = measureExcelLine(part, isBold);
      if (w > best) best = w;
    }
    return best;
  }

  function createXlsxBlob(allRows, hasTotal, mergeFirstCol, rowTypes = [], mergeCols = null) {
    const colCount = allRows.reduce((m, r) => Math.max(m, (r && r.length) || 0), 0);
    const widths = new Array(colCount).fill(0);
    const mCols = Array.isArray(mergeCols) && mergeCols.length ? mergeCols : (mergeFirstCol ? [0] : []);
    const mColSet = new Set(mCols);

    for (let r = 0; r < allRows.length; r++) {
      const row = allRows[r] || [];
      const isHead = r === 0;
      const isTot = hasTotal && r === allRows.length - 1;
      const rType = (!isHead && !isTot) ? (rowTypes[r - 1] || '') : '';
      for (let c = 0; c < colCount; c++) {
        const raw = row[c];
        const isNum = typeof raw === 'number' && isFinite(raw);
        const s = isNum ? fm(raw) : String(raw == null ? '' : raw);
        const isBold = isHead || isTot || rType === 'cat' || (mergeFirstCol && c === 0);
        let w = measureExcelText(s, isBold);
        if (isNum) w += 0.8; // небольшой запас для форматирования #,##0, чтобы не было ###
        if (w > widths[c]) widths[c] = w;
      }
    }

    const colsXml = colCount > 0 ? '<cols>' + widths.map((w, i) => {
      const cw = w <= 3.6
        ? Math.max(4.4, +(w + 2.2).toFixed(1))
        : Math.max(6.0, Math.min(255, +(w + 3.2).toFixed(1)));
      return `<col min="${i + 1}" max="${i + 1}" width="${cw}" bestFit="1" customWidth="1"/>`;
    }).join('') + '</cols>' : '';

    // Объединение одинаковых подряд идущих групп строк по первому столбцу (например, экипажи и их итоги)
    const merges = [];
    const skipCells = new Set();
    if (mCols.length && allRows.length > 2) {
      const lastDataIdx = hasTotal ? allRows.length - 2 : allRows.length - 1;
      let i = 1;
      while (i <= lastDataIdx) {
        const val = String((allRows[i] && allRows[i][0]) || '');
        let j = i;
        while (j + 1 <= lastDataIdx && String((allRows[j + 1] && allRows[j + 1][0]) || '') === val) {
          j++;
        }
        if (val && j > i) {
          mCols.forEach(mc => {
            if (mc >= 0 && mc < colCount) {
              const colL = colLetter(mc);
              merges.push(`${colL}${i + 1}:${colL}${j + 1}`);
              for (let k = i + 1; k <= j; k++) skipCells.add(k + ':' + mc);
            }
          });
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
        if (skipCells.has(rIdx + ':' + c)) {
          cells.push(`<c r="${ref}" s="${c === 0 ? 6 : 14}"/>`);
          continue;
        }
        const val = row && row[c] !== undefined && row[c] !== null ? row[c] : '';
        const isShort = widths[c] <= 3.5 && !(mColSet.has(c) && c > 0);
        let styleId = isHead ? (isShort ? 2 : 1) : (isTot ? (isShort ? 4 : 3) : (isShort ? 5 : 0));
        if (mergeFirstCol && c === 0 && !isHead && !isTot) styleId = 6;
        if (mergeFirstCol && c === 0 && isHead) styleId = 2;
        if (rType === 'cat') styleId = (typeof val === 'number' && isFinite(val)) ? 11 : 10;
        else if (rType === 'hi') styleId = (typeof val === 'number' && isFinite(val)) ? 13 : 12;

        if (typeof val === 'number' && isFinite(val)) {
          if (rType === '' && !isHead && !isTot && (!isShort || colCount <= 4)) styleId = 14;
          if (isTot && (!isShort || colCount <= 4)) styleId = 15;
          cells.push(`<c r="${ref}" s="${styleId}"><v>${val}</v></c>`);
        } else {
          const str = String(val);
          if (str === '' && !isHead && !isTot && rType !== 'cat' && rType !== 'hi') {
            cells.push(`<c r="${ref}" s="${styleId}"/>`);
            continue;
          }
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
      + '<font><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FF000000"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FF047857"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FFB45309"/><name val="Calibri"/></font>'
      + '<font><b/><sz val="11"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>'
      + '</fonts>'
      + '<fills count="9">'
      + '<fill><patternFill patternType="none"/></fill>'
      + '<fill><patternFill patternType="gray125"/></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFBFDBFE"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFECACA"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFA7F3D0"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFD9EAD3"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill>'
      + '</fills>'
      + '<borders count="2">'
      + '<border><left/><right/><top/><bottom/><diagonal/></border>'
      + '<border><left style="thin"><color rgb="FF475569"/></left><right style="thin"><color rgb="FF475569"/></right><top style="thin"><color rgb="FF475569"/></top><bottom style="thin"><color rgb="FF475569"/></bottom><diagonal/></border>'
      + '</borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="16">'
      + '<xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="3" fontId="1" fillId="6" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      + '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="3" fontId="3" fillId="7" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
      + '<xf numFmtId="3" fontId="0" fillId="8" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>'
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
  async function shareFile(blob, filename, title, allRows) {
    if (!navigator.share) return 'unsupported';
    let lastErr = '';
    const safeTitle = title || 'EuroBaza';
    const tryShare = async (data) => {
      try {
        if (data.files && (!navigator.canShare || !navigator.canShare({ files: data.files }))) {
          return 'skip';
        }
        await navigator.share(data);
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'aborted';
        lastErr = (e && (e.name + ': ' + e.message)) || String(e);
        console.warn('Share attempt failed:', lastErr);
        return 'fail';
      }
    };

    // 1. Настоящий .xlsx (iOS Safari и браузеры с поддержкой .xlsx)
    const xlsxFile = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    let r = await tryShare({ files: [xlsxFile], title: safeTitle });
    if (r === 'shared' || r === 'aborted') return r;

    // 2. Файл .csv (в белом списке Chrome Android)
    if (Array.isArray(allRows) && allRows.length) {
      const csvStr = '\uFEFF' + allRows.map(row => (row || []).map(v => {
        const s = String(v == null ? '' : v).replace(/"/g, '""');
        return /[",\n\r;]/.test(s) ? ('"' + s + '"') : s;
      }).join(';')).join('\r\n');
      const csvName = String(filename || 'EuroBaza.csv').replace(/\.xlsx$/i, '.csv');
      const csvFile = new File([csvStr], csvName, { type: 'text/csv' });
      r = await tryShare({ files: [csvFile], title: safeTitle });
      if (r === 'shared' || r === 'aborted') return r;
    }

    // 3. Системное окно «Поделиться» текстом таблицы (работает всегда на Android/iOS)
    const preview = Array.isArray(allRows) && allRows.length
      ? allRows.slice(0, 60).map(row => (row || []).filter(v => v !== '' && v != null).join(' | ')).join('\n')
      : safeTitle;
    r = await tryShare({ title: safeTitle, text: safeTitle + '\n\n' + preview });
    if (r === 'shared' || r === 'aborted') return r;

    return lastErr ? ('error:' + lastErr) : 'unsupported';
  }

  // Печать таблицы на принтер (чистый белый лист А4, альбомная для широких таблиц)
  function printTable({ title, headers = [], rows = [], totalRow = null, mergeFirstCol = false, rowTypes = [], mergeCols = null }) {
    const isWide = headers.length > 7;
    const isCatalog = rowTypes && rowTypes.length > 0;
    const mColSet = new Set(Array.isArray(mergeCols) && mergeCols.length ? mergeCols : (mergeFirstCol ? [0] : []));
    const spans = new Array(rows.length).fill(1);
    if (mColSet.size) {
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

    const isNumCol = idx => idx > 0 && rows.some(r => r && typeof r[idx] === 'number');
    const thHtml = headers.map((h, idx) => `<th class="${isCatalog ? (idx === 1 ? '' : 'r') : (mColSet.has(idx) && idx > 0 ? 'r' : (isNumCol(idx) && !isWide ? 'r' : (idx > 1 ? 'c' : (mergeFirstCol && idx === 0 ? 'c' : ''))))}">${esc(h)}</th>`).join('');
    const tbHtml = rows.map((r, rIdx) => {
      const rt = rowTypes[rIdx] || '';
      const trCls = rt === 'cat' ? ' class="cat-r"' : (rt === 'hi' ? ' class="hi-r"' : '');
      const tds = r.map((c, idx) => {
        if (mColSet.has(idx)) {
          if (spans[rIdx] === 0) return '';
          if (idx === 0) return `<td rowspan="${spans[rIdx]}" class="crew">${esc(c)}</td>`;
          const valM = typeof c === 'number' ? fm(c) : String(c == null ? '' : c);
          return `<td rowspan="${spans[rIdx]}" class="r${idx === r.length - 1 ? ' b' : ''}" style="vertical-align:middle">${esc(valM)}</td>`;
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
        const alCls = isNumCol(idx) && !isWide ? 'r' : (idx > 1 ? 'c' : '');
        return `<td class="${alCls}${idx === r.length - 1 ? ' b' : ''}">${esc(val)}</td>`;
      }).join('');
      return `<tr${trCls}>${tds}</tr>`;
    }).join('');
    const tfHtml = totalRow ? `<tfoot><tr>${totalRow.map((c, idx) => {
      const val = typeof c === 'number' ? fm(c) : String(c == null ? '' : c);
      const cls = isCatalog ? (idx === 1 ? '' : (idx === 2 ? 'c' : 'r')) : (mColSet.has(idx) && idx > 0 ? 'r' : (isNumCol(idx) && !isWide ? 'r' : (idx > 1 ? 'c' : '')));
      return `<td class="${cls}">${esc(val)}</td>`;
    }).join('')}</tr></tfoot>` : '';
    const pLang = (() => { try { const l = localStorage.getItem('EXCEL_LANG'); return (l === 'ru' || l === 'hy' || l === 'en') ? l : ((window.getLang && window.getLang()) || 'ru'); } catch (e) { return 'ru'; } })();
    const dt = new Date().toLocaleDateString(pLang === 'hy' ? 'hy-AM' : (pLang === 'en' ? 'en-US' : 'ru-RU'));
    const printLbl = pLang === 'hy' ? 'Տպման ամսաթիվը՝' : (pLang === 'en' ? 'Print date:' : 'Дата печати:');

    const html = `<!doctype html><html lang="${esc(pLang)}"><head><meta charset="utf-8"><title>${esc(title || 'EuroBaza')}</title><style>
      @page { size: A4 ${isWide ? 'landscape' : 'portrait'}; margin: 8mm; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; }
      .hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
      .hd h1 { margin: 0; font-size: ${isWide ? '14px' : '15px'}; font-weight: 800; color: #1e3a8a; }
      .hd span { font-size: 10.5px; color: #475569; }
      table { width: 100%; border-collapse: collapse; font-size: ${isWide ? '9px' : (isCatalog ? '9.5px' : '11.5px')}; table-layout: auto; }
      th, td { border: 1px solid #475569; padding: ${isWide ? '3px 2px' : (isCatalog ? '2.5px 6px' : '6px 8px')}; text-align: left; white-space: nowrap; }
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
      <div class="hd"><h1>EuroBaza · ${esc(title || 'Таблица')}</h1><span>${printLbl} ${dt}</span></div>
      <table><thead><tr>${thHtml}</tr></thead><tbody>${tbHtml}</tbody>${tfHtml}</table>
    </body></html>`;

    const old = document.getElementById('tvPrintFrame');
    if (old) old.remove();
    const fr = document.createElement('iframe');
    fr.id = 'tvPrintFrame';
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(fr);
    const doc = fr.contentDocument || (fr.contentWindow && fr.contentWindow.document);
    if (!doc) { fr.remove(); if (window.toast) window.toast('Не удалось открыть печать', true); return; }
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => { try { fr.remove(); } catch (e) {} };
    try { if (fr.contentWindow) fr.contentWindow.addEventListener('afterprint', cleanup, { once: true }); } catch (e) {}
    setTimeout(() => {
      try {
        fr.contentWindow.focus();
        fr.contentWindow.print();
      } catch (e) {
        if (window.toast) window.toast('Не удалось открыть печать', true);
      }
      setTimeout(cleanup, 120000);
    }, 150);
  }

  // Словарь и транслитерация имён для Excel (RU / HY / EN)
  const KNOWN_NAMES = {
    narek: { ru: 'Нарек', hy: 'Նարեկ', en: 'Narek' },
    vazgen: { ru: 'Вазген', hy: 'Վազգեն', en: 'Vazgen' },
    nver: { ru: 'Нвер', hy: 'Նվեր', en: 'Nver' },
    edo: { ru: 'Эдо', hy: 'Էդո', en: 'Edo' },
    davo: { ru: 'Даво', hy: 'Դավո', en: 'Davo' },
    lyov: { ru: 'Лёв', hy: 'Լյով', en: 'Lyov' },
    vito: { ru: 'Вито', hy: 'Վիտո', en: 'Vito' },
    aleks: { ru: 'Алекс', hy: 'Ալեքս', en: 'Aleks' },
    alex: { ru: 'Алекс', hy: 'Ալեքս', en: 'Alex' },
    gor: { ru: 'Гор', hy: 'Գոռ', en: 'Gor' },
    karen: { ru: 'Карен', hy: 'Կարեն', en: 'Karen' },
    mher: { ru: 'Мгер', hy: 'Մհեր', en: 'Mher' },
    hayk: { ru: 'Айк', hy: 'Հայկ', en: 'Hayk' },
    artur: { ru: 'Артур', hy: 'Արթուր', en: 'Artur' },
    tiko: { ru: 'Тико', hy: 'Տիկո', en: 'Tiko' },
    aren: { ru: 'Арен', hy: 'Արեն', en: 'Aren' },
    sanasar: { ru: 'Санасар', hy: 'Սանասար', en: 'Sanasar' },
    sasun: { ru: 'Сасун', hy: 'Սասուն', en: 'Sasun' },
    harut: { ru: 'Арут', hy: 'Հարութ', en: 'Harut' },
    hrant: { ru: 'Грант', hy: 'Հրանտ', en: 'Hrant' },
    armen: { ru: 'Армен', hy: 'Արմեն', en: 'Armen' },
    artak: { ru: 'Артак', hy: 'Արտակ', en: 'Artak' },
    arman: { ru: 'Арман', hy: 'Արման', en: 'Arman' },
    arthur: { ru: 'Артур', hy: 'Արթուր', en: 'Arthur' },
    davit: { ru: 'Давид', hy: 'Դավիթ', en: 'Davit' },
    david: { ru: 'Давид', hy: 'Դավիթ', en: 'David' },
    tigran: { ru: 'Тигран', hy: 'Տիգրան', en: 'Tigran' },
    samvel: { ru: 'Самвел', hy: 'Սամվել', en: 'Samvel' },
    vahe: { ru: 'Ваге', hy: 'Վահե', en: 'Vahe' },
    gevorg: { ru: 'Геворг', hy: 'Գևորգ', en: 'Gevorg' },
    vahan: { ru: 'Ваган', hy: 'Վահան', en: 'Vahan' },
    hovhannes: { ru: 'Ованес', hy: 'Հովհաննես', en: 'Hovhannes' },
    aram: { ru: 'Арам', hy: 'Արամ', en: 'Aram' },
    sargis: { ru: 'Саркис', hy: 'Սարգիս', en: 'Sargis' },
    ruben: { ru: 'Рубен', hy: 'Ռուբեն', en: 'Ruben' },
    levon: { ru: 'Левон', hy: 'Լևոն', en: 'Levon' },
    grigor: { ru: 'Григор', hy: 'Գրիգոր', en: 'Grigor' },
    sergey: { ru: 'Сергей', hy: 'Սերգեյ', en: 'Sergey' },
    diana: { ru: 'Диана', hy: 'Դիանա', en: 'Diana' },
    dianna: { ru: 'Дианна', hy: 'Դիաննա', en: 'Dianna' }
  };

  function toLatinBase(s) {
    const cyr = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    const arm = { ա:'a',բ:'b',գ:'g',դ:'d',ե:'e',զ:'z',է:'e',ը:'y',թ:'t',ժ:'zh',ի:'i',լ:'l',խ:'kh',ծ:'ts',կ:'k',հ:'h',ձ:'dz',ղ:'gh',ճ:'ch',մ:'m',յ:'y',ն:'n',շ:'sh',ո:'o',չ:'ch',պ:'p',ջ:'j',ռ:'r',ս:'s',վ:'v',տ:'t',ր:'r',ց:'ts',ւ:'v',փ:'p',ք:'k',և:'ev',օ:'o',ֆ:'f' };
    return s.toLowerCase().replace(/ու/g, 'u').split('').map(ch => cyr[ch] !== undefined ? cyr[ch] : (arm[ch] !== undefined ? arm[ch] : ch)).join('');
  }

  function isKnownCrewCode(s) {
    const t = String(s || '').trim();
    if (!t) return false;
    if (window._crewsSet && window._crewsSet.has(t)) return true;
    return /^(BB|CC|VV|RR|EE|GG|XX|ZZ|ADMIN)$/.test(t);
  }

  function isCrewCodeToken(s) {
    const t = String(s || '').trim();
    if (!t) return false;
    return isKnownCrewCode(t) || /^(?=.*[A-Z])[A-Z0-9]{2,6}$/.test(t);
  }

  function translitWord(word, lang) {
    if (!word || isKnownCrewCode(word) || /^\d+$/.test(word)) return word;
    const base = toLatinBase(word);
    if (KNOWN_NAMES[base] && KNOWN_NAMES[base][lang]) return KNOWN_NAMES[base][lang];
    const cap = s => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
    if (lang === 'en') {
      if (/^[A-Za-z]+$/.test(word)) return cap(word);
      return cap(base);
    }
    if (lang === 'ru') {
      if (/[А-Яа-яЁё]/.test(word)) return cap(word);
      let r = base
        .replace(/shch/g, 'щ').replace(/zh/g, 'ж').replace(/kh/g, 'х').replace(/ts/g, 'ц')
        .replace(/ch/g, 'ч').replace(/sh/g, 'ш').replace(/yu/g, 'ю').replace(/ya/g, 'я')
        .replace(/yo/g, 'ё').replace(/gh/g, 'г').replace(/dz/g, 'дз').replace(/ev/g, 'ев');
      const m = { a:'а',b:'б',c:'к',d:'д',e:'е',f:'ф',g:'г',h:'г',i:'и',j:'дж',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'к',r:'р',s:'с',t:'т',u:'у',v:'в',w:'в',x:'кс',y:'й',z:'з' };
      r = r.split('').map(ch => m[ch] !== undefined ? m[ch] : ch).join('');
      return cap(r);
    }
    if (lang === 'hy') {
      if (/[\u0531-\u0587]/.test(word)) return cap(word);
      let r = base
        .replace(/sh/g, 'շ').replace(/ch/g, 'չ').replace(/zh/g, 'ժ').replace(/kh/g, 'խ')
        .replace(/ts/g, 'ծ').replace(/dz/g, 'ձ').replace(/gh/g, 'ղ').replace(/yu/g, 'յու')
        .replace(/ya/g, 'յա').replace(/yo/g, 'յո').replace(/ev/g, 'և');
      const m = { a:'ա',b:'բ',c:'ց',d:'դ',e:'ե',f:'ֆ',g:'գ',h:'հ',i:'ի',j:'ջ',k:'կ',l:'լ',m:'մ',n:'ն',o:'ո',p:'պ',q:'ք',r:'ր',s:'ս',t:'տ',u:'ու',v:'վ',w:'վ',x:'խ',y:'յ',z:'զ' };
      r = r.split('').map(ch => m[ch] !== undefined ? m[ch] : ch).join('');
      if (r.startsWith('ե')) r = 'է' + r.slice(1);
      return cap(r);
    }
    return cap(word);
  }

  function translitPersonName(name, lang) {
    const s = String(name == null ? '' : name);
    if (!s.trim()) return s;
    return s.replace(/[\p{L}]+/gu, w => translitWord(w, lang));
  }

  function trExcelVal(val, lang, keepCrewCode, isPersonName) {
    if (typeof val === 'number' || val == null || val === '') return val;
    const s = String(val);
    // Коды экипажей (BB, CC, ... и любые созданные админом) всегда на латинском
    if (keepCrewCode) return s;
    if (isPersonName) return translitPersonName(s, lang);
    if (isCrewCodeToken(s)) return s;
    // «Экипаж BB (имена)» — переводим слово «Экипаж» и имена в скобках, код BB сохраняем
    const mCrew = s.match(/^Экипаж ([A-Z0-9]+)(?:\s*\(([^)]+)\))?(.*)$/);
    if (mCrew) {
      const pref = lang === 'hy' ? 'Անձնակազմ ' : (lang === 'en' ? 'Crew ' : 'Экипаж ');
      const names = mCrew[2] ? (' (' + translitPersonName(mCrew[2], lang) + ')') : '';
      const rest = mCrew[3] ? ((lang !== 'ru' && window.i18nTranslateText) ? window.i18nTranslateText(mCrew[3], lang) : mCrew[3]) : '';
      return pref + mCrew[1] + names + rest;
    }
    if (lang === 'ru') return s;
    if (window.i18nTranslateText) return window.i18nTranslateText(s, lang);
    return s;
  }

  window.addEventListener('popstate', e => {
    if (Date.now() < (window._tvSkipPopUntil || 0)) {
      e.stopImmediatePropagation();
      return;
    }
    const tv = document.getElementById('tvMdl');
    if (tv) {
      window._tvSkipPopUntil = Date.now() + 150;
      e.stopImmediatePropagation();
      if (typeof tv._tvClose === 'function') tv._tvClose('pop');
      else tv.remove();
    }
  }, true);

  const TableViewer = {
    // Открыть модальное окно с таблицей
    open({ title, filename, headers = [], rows = [], totalRow = null, mergeFirstCol = false, rowTypes = [], nameCol = -1, mergeCols = null }) {
      const old = document.getElementById('tvMdl');
      if (old) {
        if (typeof old._tvClose === 'function') old._tvClose('replace');
        else old.remove();
      }
      window._tvSkipPopUntil = 0;

      const isDesktop = !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isCatalog = rowTypes && rowTypes.length > 0;
      const baseXlsxName = String(filename || 'EuroBaza.xlsx').replace(/\.csv$/i, '.xlsx');
      let excelLang = 'ru';
      try {
        const savedL = localStorage.getItem('EXCEL_LANG');
        if (savedL === 'ru' || savedL === 'hy' || savedL === 'en') excelLang = savedL;
        else if (window.getLang) excelLang = window.getLang();
      } catch (e) {
        if (window.getLang) excelLang = window.getLang();
      }

      const buildLocalized = (lang) => {
        const lTitle = trExcelVal(title || 'Ведомость', lang, false, false);
        const lHeaders = headers.map(h => trExcelVal(h, lang, false, false));
        const lRows = rows.map(r => r.map((c, idx) => trExcelVal(c, lang, mergeFirstCol && idx === 0, idx === nameCol)));
        const lTotal = totalRow ? totalRow.map(c => trExcelVal(c, lang, false, false)) : null;
        const allRows = [lHeaders, ...lRows, ...(lTotal ? [lTotal] : [])];
        const lBlob = createXlsxBlob(allRows, !!lTotal, !!mergeFirstCol, rowTypes, mergeCols);
        const lName = lang === 'ru' ? baseXlsxName : baseXlsxName.replace(/\.xlsx$/i, '_' + lang.toUpperCase() + '.xlsx');
        return { lTitle, lHeaders, lRows, lTotal, lAllRows: allRows, lBlob, lName };
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

      const isNumCol = idx => idx > 0 && rows.some(r => r && typeof r[idx] === 'number');
      const renderThead = (hdrs) => `<tr style="background:#131c2e;position:sticky;top:0;z-index:2;box-shadow:0 1px 0 rgba(148,163,184,.28)">${hdrs.map((h, idx) => `<th style="padding:10px 14px;font-weight:700;color:#94a3b8;border:1px solid rgba(148,163,184,.22);white-space:nowrap;${isCatalog ? (idx === 1 ? '' : (idx === 2 ? 'text-align:center;' : 'text-align:right;')) : (mergeFirstCol && idx === 0 ? 'text-align:center;' : (isNumCol(idx) ? 'text-align:right;' : 'text-align:left;'))}">${esc(h)}</th>`).join('')}</tr>`;
      const renderTfoot = (tot) => tot ? `<tr style="background:#131c2e;position:sticky;bottom:0;z-index:2;border-top:2px solid rgba(250,204,21,.45);font-weight:800;color:#fde047">${tot.map((c, idx) => `<td style="padding:10px 14px;white-space:nowrap;border:1px solid rgba(148,163,184,.22);${isCatalog ? (idx === 1 ? '' : (idx === 2 ? 'text-align:center;' : 'text-align:right;')) : (isNumCol(idx) ? 'text-align:right;' : 'text-align:left;')}">${esc(typeof c === 'number' ? fm(c) : c)}</td>`).join('')}</tr>` : '';

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
              <tbody id="tvTbody">${this.renderRowsHtml(loc.lRows, mergeFirstCol, rowTypes, loc.lHeaders.length, mergeCols)}</tbody>
              <tfoot id="tvTfoot">${renderTfoot(loc.lTotal)}</tfoot>
            </table>
          </div>
        </div>
      `;

      document.body.appendChild(m);

      let closed = false;
      const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); } };
      const close = (src) => {
        if (closed) return;
        closed = true;
        document.documentElement.style.overflow = prevHtmlOv;
        document.body.style.overflow = prevBodyOv;
        document.body.style.overscrollBehavior = prevBodyObs;
        document.removeEventListener('keydown', onKey);
        m.remove();
        if (src !== 'pop' && src !== 'replace') {
          try {
            if (history.state && history.state.tv) {
              window._tvSkipPopUntil = Date.now() + 350;
              history.back();
            }
          } catch (e) {}
        }
      };
      m._tvClose = close;
      if (!old) {
        try { history.pushState({ tv: 1 }, ''); } catch (e) {}
      }
      m.addEventListener('touchmove', e => {
        if (!e.target.closest('.tv-scroll')) e.preventDefault();
      }, { passive: false });
      document.addEventListener('keydown', onKey);
      document.getElementById('tvClose').onclick = () => close();
      m.onclick = e => { if (e.target === m) close(); };

      const searchInp = document.getElementById('tvSearch');
      const tbody = document.getElementById('tvTbody');
      const countEl = document.getElementById('tvRowCount');

      const applySearch = () => {
        const q = (searchInp.value || '').trim().toLowerCase();
        if (!q) {
          tbody.innerHTML = this.renderRowsHtml(loc.lRows, mergeFirstCol, rowTypes, loc.lHeaders.length, mergeCols);
          countEl.textContent = loc.lRows.length;
          return;
        }
        const filtered = [], fTypes = [];
        loc.lRows.forEach((r, idx) => {
          if (r.some(cell => String(cell == null ? '' : cell).toLowerCase().includes(q))) {
            filtered.push(r);
            fTypes.push(rowTypes[idx] || '');
          }
        });
        tbody.innerHTML = this.renderRowsHtml(filtered, mergeFirstCol, fTypes, loc.lHeaders.length, mergeCols);
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
          try { localStorage.setItem('EXCEL_LANG', excelLang); } catch (e) {}
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
        printBtn.onclick = () => printTable({ title: loc.lTitle, headers: loc.lHeaders, rows: loc.lRows, totalRow: loc.lTotal, mergeFirstCol, rowTypes, mergeCols });
      }

      // Поделиться (на мобильном)
      const shareBtn = document.getElementById('tvShare');
      if (shareBtn) {
        let sharing = false;
        shareBtn.onclick = async () => {
          if (sharing) return;
          sharing = true;
          try {
            const res = await shareFile(loc.lBlob, loc.lName, loc.lTitle, loc.lAllRows);
            if (res === 'unsupported') {
              if (window.toast) window.toast('Системное меню «Поделиться» недоступно в этом браузере', true);
            } else if (typeof res === 'string' && res.startsWith('error:')) {
              if (window.toast) window.toast('Не удалось поделиться: ' + res.slice(6), true);
            }
          } finally {
            sharing = false;
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
    renderRowsHtml(rows, mergeFirstCol = false, rowTypes = [], colSpan = 10, mergeCols = null) {
      if (!rows.length) {
        return `<tr><td colspan="${Math.max(1, colSpan || 10)}" style="padding:28px 12px;text-align:center;color:#64748b">Ничего не найдено</td></tr>`;
      }
      const isCatalog = rowTypes && rowTypes.some(Boolean);
      const mColSet = new Set(Array.isArray(mergeCols) && mergeCols.length ? mergeCols : (mergeFirstCol ? [0] : []));
      const spans = new Array(rows.length).fill(1);
      if (mColSet.size) {
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
              if (mColSet.has(idx)) {
                if (spans[rIdx] === 0) return '';
                if (idx === 0) {
                  return `<td rowspan="${spans[rIdx]}" style="padding:9px 14px;white-space:nowrap;text-align:center;vertical-align:middle;font-weight:800;color:#6ee7b7;border:1px solid rgba(148,163,184,.22)">${esc(c)}</td>`;
                }
                const txtM = typeof c === 'number' ? fm(c) : String(c == null ? '' : c);
                return `<td rowspan="${spans[rIdx]}" style="padding:9px 14px;white-space:nowrap;text-align:right;vertical-align:middle;border:1px solid rgba(148,163,184,.22);${idx === r.length - 1 ? 'font-weight:800;color:#fde047;' : 'font-weight:700;color:#f8fafc;'}">${esc(txtM)}</td>`;
              }
              const s = String(c == null ? '' : c);
              if (s === '✕') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:800;color:#fca5a5;background:rgba(239,68,68,.26);border:1px solid rgba(148,163,184,.22)">✕</td>`;
              }
              if (s === '✓') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:800;color:#6ee7b7;background:rgba(16,185,129,.26);border:1px solid rgba(148,163,184,.22)">✓</td>`;
              }
              if (s === 'В' || s === 'Հ' || s === 'Off') {
                return `<td style="padding:9px 14px;white-space:nowrap;text-align:center;font-weight:700;color:#fbbf24;background:rgba(245,158,11,.12);border:1px solid rgba(148,163,184,.22)">${esc(s)}</td>`;
              }
              const txt = typeof c === 'number' ? fm(c) : s;
              if (isCatalog) {
                const al = idx === 1 ? '' : (idx === 2 ? 'text-align:center;' : 'text-align:right;');
                const col = rt === 'cat'
                  ? (idx === 3 && typeof c === 'number' ? 'color:#fde047;font-weight:800;' : 'color:#6ee7b7;font-weight:800;')
                  : (rt === 'hi'
                    ? (idx === 3 ? 'color:#fde047;font-weight:800;' : (idx === 2 ? 'color:#7dd3fc;font-weight:800;' : 'color:#f8fafc;font-weight:600;'))
                    : (idx === 0 ? 'color:#64748b;' : 'color:#94a3b8;'));
                return `<td style="padding:7px 12px;white-space:nowrap;border:1px solid rgba(148,163,184,.2);${al}${col}">${esc(txt)}</td>`;
              }
              const isNum = typeof c === 'number';
              return `<td style="padding:9px 14px;white-space:nowrap;color:#cbd5e1;border:1px solid rgba(148,163,184,.2);${isNum ? 'text-align:right;' : 'text-align:left;'}${isNum && idx === r.length - 1 ? 'font-weight:800;color:#fde047;' : (isNum ? 'font-weight:700;color:#f8fafc;' : '')}">${esc(isNum ? fm(c) : c)}</td>`;
            }).join('')}
          </tr>
        `;
      }).join('');
    }
  };

  window.TableViewer = TableViewer;
})();
