// table-viewer.js — Встроенный просмотрщик Excel/CSV таблиц и экспорт с Web Share API
(function(){
  'use strict';

  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fm = v => (+v || 0).toLocaleString('ru-RU');

  // Генерация CSV строки (с разделителем ; и UTF-8 BOM для Excel)
  function createCsvBlob(rows) {
    const csvContent = '\uFEFF' + rows.map(r => r.map(c => {
      const s = String(c == null ? '' : c).replace(/"/g, '""');
      return /[";\n\r]/.test(s) ? `"${s}"` : s;
    }).join(';')).join('\r\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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
      const file = new File([blob], filename, { type: 'text/csv' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: title || 'EuroBaza',
          text: title || 'Отчёт по накладным EuroBaza'
        });
        return true;
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('Share error:', e);
      }
    }
    return false;
  }

  const TableViewer = {
    // Открыть модальное окно с таблицей
    open({ title, filename, headers = [], rows = [], totalRow = null }) {
      const old = document.getElementById('tvMdl');
      if (old) old.remove();

      const blob = createCsvBlob([headers, ...rows, ...(totalRow ? [totalRow] : [])]);

      const m = document.createElement('div');
      m.id = 'tvMdl';
      m.className = 'cm open';
      m.style.zIndex = '99999';

      m.innerHTML = `
        <div class="cm-b tv-box" style="max-width:540px;width:95vw;height:min(86dvh,640px);display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:18px;background:#0d131f;border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 45px rgba(0,0,0,.75)">
          <div class="tv-hd" style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(255,255,255,.03);border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0">
            <div style="min-width:0">
              <div style="font-size:15px;font-weight:800;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📊 ${esc(title || 'Ведомость')}</div>
              <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">Строк: <b id="tvRowCount">${rows.length}</b></div>
            </div>
            <button type="button" class="pt-x" id="tvClose" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;padding:4px 8px">✕</button>
          </div>

          <div class="tv-bar" style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.06);flex-shrink:0">
            <input type="search" id="tvSearch" placeholder="🔍 Поиск..." style="flex:1;min-width:0;height:34px;padding:0 10px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#f8fafc;font-size:12px;outline:none;box-sizing:border-box">
            <button type="button" id="tvShare" title="Поделиться" style="height:34px;padding:0 9px;border-radius:9px;background:linear-gradient(135deg,rgba(56,189,248,.25),rgba(2,132,199,.15));border:1px solid rgba(56,189,248,.5);color:#7dd3fc;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0">
              📤 Поделиться
            </button>
            <button type="button" id="tvDownload" title="Скачать Excel" style="height:34px;padding:0 9px;border-radius:9px;background:rgba(16,185,129,.18);border:1px solid rgba(52,211,153,.45);color:#6ee7b7;font-size:11.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;flex-shrink:0">
              📥 Excel
            </button>
          </div>

          <div class="tv-scroll" style="flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:0;max-width:100%;min-width:0">
            <table id="tvTable" style="width:max-content;min-width:100%;border-collapse:collapse;font-size:12px;line-height:1.35;text-align:left">
              <thead>
                <tr style="background:#131c2e;position:sticky;top:0;z-index:2;box-shadow:0 1px 0 rgba(255,255,255,.1)">
                  ${headers.map((h, idx) => `<th style="padding:10px 14px;font-weight:700;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,.1);white-space:nowrap;${idx > 1 ? 'text-align:right;' : ''}">${esc(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody id="tvTbody">
                ${this.renderRowsHtml(rows)}
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

      const close = () => m.remove();
      document.getElementById('tvClose').onclick = close;
      m.onclick = e => { if (e.target === m) close(); };

      // Поделиться
      document.getElementById('tvShare').onclick = async () => {
        const shared = await shareFile(blob, filename, title);
        if (!shared) {
          // Если Share API не поддержан или отменён, предлагаем скачать
          downloadBlob(blob, filename);
          if (window.toast) window.toast('Файл скачан');
        }
      };

      // Скачать Excel / CSV
      document.getElementById('tvDownload').onclick = () => {
        downloadBlob(blob, filename);
        if (window.toast) window.toast('Файл скачан');
      };

      // Живой поиск
      const searchInp = document.getElementById('tvSearch');
      const tbody = document.getElementById('tvTbody');
      const countEl = document.getElementById('tvRowCount');

      searchInp.oninput = () => {
        const q = searchInp.value.trim().toLowerCase();
        if (!q) {
          tbody.innerHTML = this.renderRowsHtml(rows);
          countEl.textContent = rows.length;
          return;
        }
        const filtered = rows.filter(r => r.some(cell => String(cell || '').toLowerCase().includes(q)));
        tbody.innerHTML = this.renderRowsHtml(filtered);
        countEl.textContent = filtered.length;
      };
    },

    // Отрисовка строк таблицы
    renderRowsHtml(rows) {
      if (!rows.length) {
        return `<tr><td colspan="10" style="padding:28px 12px;text-align:center;color:#64748b">Ничего не найдено</td></tr>`;
      }
      return rows.map((r, rIdx) => {
        const bg = rIdx % 2 === 1 ? 'background:rgba(255,255,255,.02);' : '';
        return `
          <tr style="${bg}border-bottom:1px solid rgba(255,255,255,.04)">
            ${r.map((c, idx) => {
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
