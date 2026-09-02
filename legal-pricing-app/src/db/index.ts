import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { createStartupBackup, DATA_DIR, DB_PATH } from "./backup";
import { ensureSeedData } from "./seed";

declare global {
  var __legalPricingDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __legalPricingSqlite: Database.Database | undefined;
}

function isBenignConcurrentInitError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (/already exists/i.test(message)) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

function initDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const isNewDb = !fs.existsSync(DB_PATH);
  if (!isNewDb) {
    try {
      createStartupBackup();
    } catch {
      // Резервная копия — вспомогательное действие, не должна прерывать запуск.
    }
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });

  try {
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle/migrations") });
  } catch (error) {
    // Несколько процессов (например, параллельные воркеры сборки Next.js)
    // могут одновременно попытаться применить миграции к одному файлу.
    // Проигравший гонку получает "table already exists" — это ожидаемо и
    // означает, что схема уже создана победителем.
    if (!isBenignConcurrentInitError(error)) throw error;
  }

  ensureSeedData(db);

  return { db, sqlite };
}

const globalForDb = globalThis;

if (!globalForDb.__legalPricingDb || !globalForDb.__legalPricingSqlite) {
  const { db, sqlite } = initDb();
  globalForDb.__legalPricingDb = db;
  globalForDb.__legalPricingSqlite = sqlite;
}

export const db = globalForDb.__legalPricingDb!;
export const sqlite = globalForDb.__legalPricingSqlite!;
