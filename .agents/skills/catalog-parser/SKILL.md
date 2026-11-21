---
name: catalog-parser
description: >-
  Use this skill to query and inspect EuroBaza furniture catalogs (JSON) without dumping large files into context.
---

# Catalog Parser Skill

Процедура работы со справочниками `EuroBaza Каталоги/`:

1. Каталоги проекта:
   - `EuroBaza Каталоги/eurobaza_all_items.json`
   - `EuroBaza Каталоги/eurobaza_models.json`
   - `EuroBaza Каталоги/eurobaza_doors.json`
2. **Запрещено выводить весь JSON в чат**:
   - Использовать точечные однострочники Node.js:
     `node -e "const d=require('./EuroBaza Каталоги/eurobaza_models.json'); console.log(Object.keys(d).filter(k=>k.includes('...')))"`
3. Возвращать только краткий результат выборки.
