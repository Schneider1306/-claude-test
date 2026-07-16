import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
export const DB_PATH = path.join(DATA_DIR, "legal-practice.db");
export const BACKUPS_DIR = path.join(DATA_DIR, "backups");

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

declare global {
  var __legalPracticeSqlite: Database.Database | undefined;
}

function openConnection(): Database.Database {
  ensureDataDir();
  const conn = new Database(DB_PATH);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.pragma("synchronous = NORMAL");
  return conn;
}

// В dev-режиме Next.js модуль может пересоздаваться при hot-reload —
// переиспользуем соединение через globalThis, чтобы не плодить файловые дескрипторы.
export const sqlite = globalThis.__legalPracticeSqlite ?? openConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__legalPracticeSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });

/**
 * Закрывает соединение с БД. Используется только перед восстановлением
 * из резервной копии, когда файл базы подменяется на диске.
 * После вызова процесс приложения нужно перезапустить.
 */
export function closeDatabaseConnection() {
  try {
    sqlite.close();
  } catch {
    // уже закрыто
  }
}
