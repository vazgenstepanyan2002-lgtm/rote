---
name: pwa-release
description: >-
  Use this skill to publish a release for EuroBaza: runs syntax verification, increments 14-digit version in 4 files, and pushes to git.
---

# PWA Release Skill

Процедура публикации обновлений приложения:

1. Запустить проверку:
   `node check.js`
   Если проверка упала — остановить релиз и исправить ошибки.
2. Получить текущий 14-значный таймштамп:
   `date +%Y%m%d%H%M%S`
3. Обновить версию сразу в 4 файлах:
   - `version.json` -> `{"v": "TIMESTAMP"}`
   - `sw.js` -> `const CACHE_NAME = 'eurobaza-vTIMESTAMP';`
   - `index.html` -> обновить `?v=TIMESTAMP` во всех тегах `<script>` и `<link>`
   - `admin.html` -> обновить `?v=TIMESTAMP` во всех тегах `<script>` и `<link>`
4. Запустить финальный `node check.js`.
5. Отправить коммит на GitHub:
   `git add -A && git commit -m "..." && git push origin main`
