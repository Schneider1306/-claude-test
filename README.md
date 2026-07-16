# Экономика юридической практики

Локальное веб-приложение для учёта дел, этапов, заседаний, оплат, расходов
и фактически затраченного времени юридической практики, с автоматическим
расчётом экономики (эффективная ставка, задолженность, налоги, прогноз
личного дохода).

Пользовательская инструкция по установке, запуску, резервному копированию
и восстановлению данных: **[README_FOR_ILYA.md](./README_FOR_ILYA.md)**.

## Стек

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · SQLite ·
Drizzle ORM · Zod · React Hook Form · Recharts · Vitest · Playwright.

## Быстрый старт (для разработки)

```bash
npm install
npm run db:setup   # миграции + стартовые настройки и каталог услуг
npm run dev
```

Откройте http://localhost:3000

## Продакшн-запуск

```bash
npm run build
npm start
```

Или на Windows — двойной клик по `start-windows.bat`.

## Проверки

```bash
npm run typecheck
npm run lint
npm test           # Vitest — формулы экономики (src/domain/calculations.ts)
npm run test:e2e   # Playwright — пользовательские сценарии
```

## Структура

- `src/domain/calculations.ts` — единственный модуль всех финансовых формул.
- `src/db/schema.ts` — схема базы данных (Drizzle), `drizzle/` — миграции.
- `src/server/queries/*` — чтение данных (Server Components).
- `src/server/actions/*` — мутации (Server Actions, `"use server"`).
- `src/app/*` — страницы (App Router).
- `data/legal-practice.db` — единственный источник истины (SQLite, WAL).
