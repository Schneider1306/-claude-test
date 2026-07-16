#!/bin/sh
set -e

mkdir -p "${DATA_DIR:-/app/data}"

echo "Применяю миграции базы данных..."
npm run db:migrate

echo "Проверяю стартовые настройки и каталог услуг..."
npm run db:seed

echo "Запускаю приложение..."
exec npm start
