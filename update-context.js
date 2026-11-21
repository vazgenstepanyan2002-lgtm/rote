const fs = require('fs');

const ver = JSON.parse(fs.readFileSync('version.json', 'utf8')).v;
const files = fs.readdirSync('.')
  .filter(f => f !== 'update-context.js' && !f.startsWith('.') && /\.(html|js|css|json)$/i.test(f))
  .sort();

const extMap = { html: 'html', js: 'js', css: 'css', json: 'json' };
let codeSec = '## Актуальный код файлов\n\n';
for (const f of files) {
  const ext = extMap[f.split('.').pop().toLowerCase()] || '';
  const body = fs.readFileSync(f, 'utf8').replace(/\s+$/, '');
  codeSec += '### ' + f + '\n```' + ext + '\n' + body + '\n```\n\n';
}

const rulesSec = [
  '## Правила работы с проектом для ИИ',
  '',
  '1. **Ничего наугад:** перед любым изменением опираться только на реальный код файлов, реальные ключи Firebase (`users`, `labels`, `accounts`, `online`, `chat`, `dm`, `config`) и реальную разметку HTML/CSS. Не придумывать несуществующие функции, переменные и селекторы.',
  '2. **Формат ответов для Termux:** пользователь работает в Termux на Android. Все правки кода выдавать в виде готовых, самодостаточных команд для терминала (`node -e` или `cat << \'EOF\'`), которые безопасно проверяют наличие целевого блока перед заменой.',
  '3. **Обязательная проверка:** любая команда с правками должна завершаться запуском `node check.js` для проверки синтаксиса всех `.js`, `.json`, встроенных `<script>` в `.html` и баланса скобок в `style.css`.',
  '4. **Синхронизация версии и кэша PWA:** после каждого изменения кода обновлять 14-значную версию (`YYYYMMDDHHMMSS`) сразу в 4 файлах: `version.json`, `sw.js` (`CACHE_NAME`), `index.html` и `admin.html`, затем отправлять изменения на GitHub (`git add -A && git commit -m "..." && git push`).',
  '5. **Единый стиль интерфейса и модальных окон:** не использовать системные `alert()`, `confirm()` и `prompt()`. В основном приложении использовать `askC()` и `toast()`, в админ-панели — `ask()`, `askInput()` и `toast()`.',
  '6. **Совместимость и локализация:** учитывать 3 языка интерфейса (`ru`, `hy`, `en` в `i18n.js` и `auto-translations.json`), мобильную вёрстку, безопасные отступы iOS/Android и работу Service Worker в офлайн-режиме.',
  '7. **Защита файла контекста:** при обновлении `EuroBaza для ИИ/EuroBaza_CONTEXT.md` обновлять только секцию с версией и кодом файлов, обязательно сохраняя этот раздел с правилами.',
  '8. **Команда «Обнови для ИИ»:** обновление `EuroBaza_CONTEXT.md` и `EuroBaza_SKELETON.md` выполняется командой `node update-context.js` в папке проекта (скрипт сам сохраняет раздел с правилами и заметками, обновляя версию и код). Если пользователь просит «Обнови для ИИ» — выдавать команду `cd "/sdcard/Download/EuroBaza Project" && node update-context.js`.',
  '9. **Сбор контекста для задачи в единый `.md` файл:** если пользователь просит что-то сделать и ИИ не хватает кода или данных, ИИ выдаёт готовую команду для Termux, которая удаляет старый `/sdcard/Download/EuroBaza Project/EuroBaza для ИИ/EuroBaza_TASK.md` и записывает всю нужную для задачи информацию в новый `/sdcard/Download/EuroBaza Project/EuroBaza для ИИ/EuroBaza_TASK.md`, чтобы пользователь скинул этот файл в чат.',
  '10. **Краткость ответов:** писать как можно меньше текста, но чтобы пользователю всё было понятно.',
  '11. **Каталоги моделей мебели:** справочники и каталоги моделей находятся в папке `EuroBaza Каталоги/` в корне проекта (`eurobaza_models.json`, `eurobaza_doors.json`, `eurobaza_all_items.json` и др.).',
  '12. **Правила базы данных Firebase:** файл с актуальными правилами безопасности хранится в `EuroBaza для ИИ/Правила FireBase.md`. При добавлении или изменении любых функций, затрагивающих Firebase, ИИ обязан проверить соответствие правилам: если логика требует новых узлов или прав доступа, ИИ должен обновить `EuroBaza для ИИ/Правила FireBase.md` и предупредить пользователя об обновлении в консоли Firebase.',
  '',
  '### Примечание для ИИ при работе напрямую в терминале Termux (локальный агент):',
  '- **Не нужны правила 2, 8, 9 (и частично 7):** если у ИИ есть прямой доступ к терминалу Termux и файловой системе, нет необходимости формировать команды `cat << \'EOF\'` или `node -e` для ручной вставки пользователем, не нужно просить пользователя запускать `node update-context.js` или формировать файл задачи `EuroBaza_TASK.md` — агент читает, редактирует файлы и запускает команды напрямую.',
  '- **Обязательны к исполнению правила 1, 3, 4, 5, 6, 10, 12:** опираться только на реальный код, запускать `node check.js` самостоятельно после любых правок, синхронизировать 14-значную версию PWA в 4 файлах (`version.json`, `sw.js`, `index.html`, `admin.html`) с коммитом в git, соблюдать единый UI-стиль (`askC`/`ask`/`toast` без `alert`), поддерживать 3 языка интерфейса (`ru`, `hy`, `en`), контролировать соответствие правилам Firebase (`Правила FireBase.md`) и отвечать кратко.',
  ''
].join('\n');

const head = '# EuroBaza — Актуальный контекст проекта для ИИ\n\n'
  + '- **Актуальная версия:** `' + ver + '`\n'
  + '- **Файлы проекта (' + files.length + '):** ' + files.map(f => '`' + f + '`').join(', ') + '\n\n';

const aiDir = 'EuroBaza для ИИ';
if (!fs.existsSync(aiDir)) fs.mkdirSync(aiDir, { recursive: true });

const ctxPath = aiDir + '/EuroBaza_CONTEXT.md';
let tail = rulesSec;
if (fs.existsSync(ctxPath)) {
  const old = fs.readFileSync(ctxPath, 'utf8');
  const rx = /(?:^|\n)(## Правила работы с проектом для ИИ[\s\S]*?)(?=\n## Актуальный код файлов|$)/;
  const m = old.match(rx);
  if (m && m[1]) tail = m[1].trim() + '\n';
}
fs.writeFileSync(ctxPath, head + tail.trim() + '\n\n' + codeSec.trim() + '\n', 'utf8');

const skelPath = aiDir + '/EuroBaza_SKELETON.md';

const SK_SKIP = new Set(['leaflet.min.js', 'leaflet.min.css']);
const SK_KW = new Set(['if', 'for', 'while', 'switch', 'catch', 'with', 'return', 'typeof', 'else', 'new']);

function skelJs(code) {
  const out = [];
  for (const l of code.split(/\r?\n/)) {
    const s = l.trim();
    if (!s || s.startsWith('//') || s.startsWith('*') || s.startsWith('/*')) continue;
    const indent = l.length - l.replace(/^[ \t]+/, '').length;
    let m;
    if (/^(export\s+)?(async\s+)?function\s+[\w$]+\s*\(/.test(s)) {
      out.push(s.slice(0, 110));
    } else if (/^(export\s+)?(const|let|var)\s+[\w$]+\s*=\s*(async\s+)?(\([^)]*\)|[\w$]+)\s*=>/.test(s)) {
      out.push(s.split('=>')[0].trim() + ' => ...');
    } else if (/^(export\s+)?(const|let|var)\s+[\w$]+\s*=\s*(async\s+)?function\b/.test(s)) {
      out.push(s.slice(0, 110));
    } else if (/^window\.[\w$]+\s*=/.test(s)) {
      out.push(s.slice(0, 100));
    } else if (/^(export\s+)?class\s+[\w$]+/.test(s)) {
      out.push(s.slice(0, 100));
    } else if ((m = s.match(/^(async\s+)?([\w$]+)\s*\(([^()]*)\)\s*\{/)) && !SK_KW.has(m[2])) {
      out.push('  ' + s.slice(0, 100));
    } else if (indent <= 2 && /^(const|let|var)\s+[A-ZА-Я0-9_a-z$]+\s*=/.test(s)) {
      out.push(s.slice(0, 90) + (s.length > 90 ? ' ...' : ''));
    } else if (s.includes('addEventListener(')) {
      out.push('  ' + s.slice(0, 95));
    }
  }
  return out.join('\n');
}

function skelHtml(code) {
  const out = [];
  for (const l of code.split(/\r?\n/)) {
    const s = l.trim();
    if (!s) continue;
    if (['<title', '<script', '<link', '<form', 'id=', 'onclick=', 'onchange='].some(k => s.includes(k))) {
      const c = s.replace(/data:[^"'\s>]{40,}/g, 'data:...');
      out.push(c.slice(0, 120) + (c.length > 120 ? '...' : ''));
    }
  }
  return out.join('\n');
}

function skelCss(code) {
  const vars = [...new Set(code.match(/--[\w-]+/g) || [])].sort();
  const ids = [...new Set(code.match(/(#[\w-]+)(?=[^;{}]*\{)/g) || [])].sort();
  const medias = [...new Set((code.match(/@media[^{]+/g) || []).map(m => m.trim()))].sort();
  const parts = [];
  if (vars.length) parts.push('CSS vars: ' + vars.slice(0, 40).join(', ') + (vars.length > 40 ? ' (+' + (vars.length - 40) + ')' : ''));
  if (ids.length) parts.push('IDs: ' + ids.slice(0, 60).join(', ') + (ids.length > 60 ? ' (+' + (ids.length - 60) + ')' : ''));
  if (medias.length) parts.push('Media: ' + medias.slice(0, 10).join(' | '));
  return parts.join('\n');
}

const skToc = ['## Карта файлов'];
const skJson = [];
const skCode = ['## Скелет кода'];

for (const f of files) {
  const body = fs.readFileSync(f, 'utf8').replace(/\s+$/, '');
  const linesCnt = body.split(/\r?\n/).length;
  const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
  const low = f.toLowerCase();
  skToc.push('- `' + f + '` (' + kb + ' КБ, ' + linesCnt + ' строк)');

  if (SK_SKIP.has(low)) {
    skCode.push('### ' + f + ' (' + kb + ' КБ) — сторонняя библиотека');
    continue;
  }

  if (low.endsWith('.json')) {
    let jTxt = body;
    try { jTxt = JSON.stringify(JSON.parse(body)); } catch (e) {}
    skJson.push('### ' + f + '\n```json\n' + (jTxt.length < 4000 ? jTxt : jTxt.slice(0, 1500) + '...') + '\n```');
  } else if (low.endsWith('.js')) {
    skCode.push('### ' + f + ' (' + kb + ' КБ, ' + linesCnt + ' строк)\n```\n' + skelJs(body) + '\n```');
  } else if (low.endsWith('.html')) {
    skCode.push('### ' + f + ' (' + kb + ' КБ, ' + linesCnt + ' строк)\n```\n' + skelHtml(body) + '\n```');
  } else if (low.endsWith('.css')) {
    skCode.push('### ' + f + ' (' + kb + ' КБ, ' + linesCnt + ' строк)\n```\n' + skelCss(body) + '\n```');
  }
}

const skelOut = [head.trim(), tail.trim(), skToc.join('\n'), skJson.join('\n\n'), skCode.join('\n\n')].filter(Boolean).join('\n\n') + '\n';
fs.writeFileSync(skelPath, skelOut, 'utf8');
console.log('✓ Обновлён ' + skelPath + ' | Размер:', (Buffer.byteLength(skelOut, 'utf8') / 1024).toFixed(1), 'КБ');

console.log('✔ Обновлён ' + ctxPath + ' | Версия:', ver, '| Файлов:', files.length);
