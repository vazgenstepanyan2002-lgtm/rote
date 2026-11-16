#!/usr/bin/env bash
# Резервная копия проекта: исходники + настройки, без .git и изображений
set -e
NAME="route_backup_$(date +%Y%m%d_%H%M).tar.gz"
tar -czf "$NAME" \
  app.js bonus.js i18n.js map.js sw.js ui.js yandex.js \
  index.html style.css manifest.json version.json CLAUDE.md
echo "Создан бэкап: $NAME"
