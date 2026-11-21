---
name: ui-inspector
description: >-
  Use this skill to inspect latest user screenshots from mobile device, extract UI errors, badge glitches, and layout bugs without loading images into main context.
---

# UI Inspector Skill

Процедура инспекции мобильных скриншотов:

1. **Найти самый последний скриншот**:
   `ls -lt /sdcard/DCIM/Screenshots/ /sdcard/Pictures/Screenshots/ 2>/dev/null | head -n 5`
2. **Анализ изображения**:
   - Проверить наличие плашек ошибок (`red error box`, `Uncaught ...`, `ReferenceError`, `TypeError`, `SyntaxError`).
   - Проверить состояние бейджей (`usrBadge`, `dockChatBdg`, `dmTabAdmBdg`, `dmTabDlvBdg`).
   - Проверить нижнюю панель (док), шапку и перекрытия модальных окон.
   - Сверить номер версии в подвале профиля (`sh-ver`).
3. **Компактный результат**:
   - Вернуть строго краткую суть проблемы (текст ошибки, проблемный элемент, файл и строка), чтобы сохранить контекст пользователя лёгким и не тратить токены.
