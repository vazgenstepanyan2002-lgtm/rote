---
name: firebase-guard
description: >-
  Use this skill to audit Firebase database operations, verify schema against rules, and ensure driver/admin seen markers isolation.
---

# Firebase Guard Skill

Процедура проверки операций с базой данных:

1. Свериться с актуальными правилами безопасности в файле:
   `EuroBaza для ИИ/Правила FireBase.md`
2. Правила изолированных путей:
   - Общий чат: `chat/`
   - Личные сообщения: `dm/{uid}/adm` (Админ) и `dm/{uid}/dlv` (Отдел доставки)
   - Пользовательские метки: `users/{uid}/chatSeen`, `users/{uid}/dmSeenAdm`, `users/{uid}/dmSeenDlv`
   - Админские метки в браузере: `ADM_DM_SEEN_ADM` (главный админ) и `SUBADM_DM_SEEN_DLV` (субадмин)
3. Запрещено:
   - Стирать ключи прочитанных сообщений при логауте (`pmOut`).
   - Использовать один и тот же ключ `localStorage` для главного админа и субадмина.
