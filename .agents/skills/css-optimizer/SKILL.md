---
name: css-optimizer
description: >-
  Use this skill to inspect and edit style.css: maintains mobile safe-areas, ensures bracket balance, and keeps styles modular.
---

# CSS Optimizer Skill

Процедура работы со стилями `style.css`:

1. **Не читать 110 КБ файл целиком**:
   - Искать нужный селектор через:
     `grep -n -C 10 ".selector" style.css`
2. **Мобильная верстка**:
   - Учитывать `env(safe-area-inset-top)` и `env(safe-area-inset-bottom)` для наэкранных кнопок Android/iOS.
   - Использовать `touch-action: manipulation` и отклик `:active`.
3. **Обязательная проверка скобок**:
   - После правок обязательно запускать:
     `node check.js` (проверяет баланс фигурных скобок `{` и `}`).
