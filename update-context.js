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
  '7. **Защита файла контекста:** при обновлении `../EuroBaza_CONTEXT.md` обновлять только секцию с версией и кодом файлов, обязательно сохраняя этот раздел с правилами.',
  '8. **Команда «Обнови для ИИ»:** если пользователь говорит «Обнови для ИИ» — правила, комментарии и любые пользовательские заметки в `../EuroBaza_CONTEXT.md` не трогаем и не перезаписываем, к ним только подставляется актуальный рабочий код и текущая версия проекта.',
  ''
].join('\n');

const head = '# EuroBaza — Актуальный контекст проекта для ИИ\n\n'
  + '- **Актуальная версия:** `' + ver + '`\n'
  + '- **Файлы проекта (' + files.length + '):** ' + files.map(f => '`' + f + '`').join(', ') + '\n\n';

const ctxPath = '../EuroBaza_CONTEXT.md';
let tail = rulesSec;
if (fs.existsSync(ctxPath)) {
  const old = fs.readFileSync(ctxPath, 'utf8');
  const idx = old.indexOf('## Правила работы с проектом для ИИ');
  if (idx !== -1) tail = old.slice(idx);
}

fs.writeFileSync(ctxPath, head + codeSec + tail, 'utf8');
console.log('✔ Обновлён ../EuroBaza_CONTEXT.md | Версия:', ver, '| Файлов:', files.length);
