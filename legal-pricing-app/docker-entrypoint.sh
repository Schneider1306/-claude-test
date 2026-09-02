#!/bin/sh
set -e

mkdir -p "${LEGAL_PRICING_DATA_DIR:-/app/data}"

# Миграции и стартовый засев справочника выполняются автоматически при
# первом обращении к базе (см. src/db/index.ts) — отдельный шаг не нужен.
echo "Запускаю приложение..."
exec npm start
