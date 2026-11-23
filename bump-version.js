#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Формируем локальный 14-значный таймштамп (в часовом поясе Армении/пользователя)
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const vNew = '' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) +
             pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

console.log('🚀 Начинаем релиз EuroBaza...');
console.log('🕒 Новый номер версии (локальное время):', vNew);

// 2. Читаем старую версию из version.json
const verPath = path.join(__dirname, 'version.json');
let vOld = '';
try {
  const verData = JSON.parse(fs.readFileSync(verPath, 'utf8'));
  vOld = verData.v;
} catch (e) {
  console.error('Ошибка чтения version.json:', e);
  process.exit(1);
}

if (!vOld || !/^\d{14}$/.test(vOld)) {
  console.error('Текущая версия в version.json некорректна:', vOld);
  process.exit(1);
}

console.log('📦 Старая версия:', vOld);

// 3. Обновляем версию во всех 4 файлах (устойчиво к рассинхрону отдельных ?v= меток)
const files = ['version.json', 'sw.js', 'index.html', 'admin.html'];
for (const fn of files) {
  const fp = path.join(__dirname, fn);
  const orig = fs.readFileSync(fp, 'utf8');
  let content = orig;
  if (fn === 'version.json') {
    content = content.replace(/"v"\s*:\s*"\d{14}"/, `"v":"${vNew}"`);
  } else if (fn === 'sw.js') {
    content = content.replace(/eurobaza-v\d{14}/g, `eurobaza-v${vNew}`);
  } else {
    content = content.replace(/\?v=\d{14}/g, `?v=${vNew}`).replaceAll(vOld, vNew);
  }
  if (content === orig) {
    console.error(`❌ Ошибка: в ${fn} не удалось обновить версию (ожидалась ${vOld})`);
    process.exit(1);
  }
  fs.writeFileSync(fp, content, 'utf8');
  console.log(`✔ Обновлена версия в ${fn}`);
}

// 4. Запускаем проверку check.js
console.log('\n🔍 Запуск валидации check.js...');
try {
  execSync('node check.js', { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  console.error('❌ Ошибка валидации check.js! Релиз прерван.');
  process.exit(1);
}

// 5. Обновляем контекст для ИИ
try {
  execSync('node update-context.js', { stdio: 'inherit', cwd: __dirname });
} catch (e) {}

console.log('\n✅ Релиз успешно подготовлен! Версия:', vNew);
