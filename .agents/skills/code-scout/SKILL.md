---
name: code-scout
description: >-
  Use this skill to quickly find functions, variables, lines, and references in EuroBaza codebase without reading entire large files.
---

# Code Scout Skill

Процедура точечной разведки кода:

1. **Не читать большие файлы целиком** (`admin.js`, `ocr.js`, `auth.js`):
   - Использовать быстрый поиск:
     `grep -n -C 5 "keyword" filename.js`
   - Для поиска функций и классов использовать `EuroBaza для ИИ/EuroBaza_SKELETON.md`.
2. **Точечное чтение**:
   - Читать только конкретный диапазон строк (например, строки 120-160), где обнаружен нужный фрагмент.
3. **Экономия контекста**:
   - Возвращать только точные номера строк и найденный компактный фрагмент кода.
