---
name: i18n-sync
description: >-
  Use this skill to audit interface texts and ensure all new UI strings have ru, hy (Armenian), and en translations.
---

# i18n Sync Skill

Процедура локализации интерфейса:

1. При добавлении любых новых строк, кнопок, заголовков или тостов:
   - Добавить фразы в словарь `auto-translations.json` (формат: `"Русский": ["Հայերեն", "English"]`).
   - Если строка используется внутри JS-модулей — использовать вызовы `t('...')` или переводчики из `i18n.js`.
2. Поддерживаемые языки:
   - `ru` (Русский, по умолчанию)
   - `hy` (Армянский)
   - `en` (Английский)
3. Проверить валидность JSON:
   `node -e "JSON.parse(fs.readFileSync('auto-translations.json'))"`
