---
name: git-doctor
description: >-
  Use this skill to inspect git status, verify clean working tree, and perform conventional semantic commits.
---

# Git Doctor Skill

Процедура работы с версиями Git:

1. Проверить статус:
   `git status --short`
2. Формат коммитов (Conventional Commits):
   - `feat(...)`: новый функционал
   - `fix(...)`: исправление бага
   - `docs(...)`: обновление документации или правил
   - `style(...)`: правка вёрстки и CSS
3. Отправка изменений:
   `git add -A && git commit -m "type(scope): message" && git push origin main`
4. В ответ выводить только краткий хэш и сообщение коммита.
