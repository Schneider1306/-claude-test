import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { BACKUPS_DIR, DB_PATH, ensureDataDir, closeDatabaseConnection } from "./client";

const MAX_BACKUPS = 10;
const BACKUP_PREFIX = "legal-practice-";
const BACKUP_EXT = ".db";

function timestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
}

export function listBackups(): BackupFileInfo[] {
  ensureDataDir();
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_EXT))
    .map((fileName) => {
      const filePath = path.join(BACKUPS_DIR, fileName);
      const stat = fs.statSync(filePath);
      return {
        fileName,
        filePath,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function pruneOldBackups() {
  const all = listBackups();
  const excess = all.slice(MAX_BACKUPS);
  for (const file of excess) {
    fs.unlinkSync(file.filePath);
  }
}

/**
 * Создаёт согласованную резервную копию текущей базы данных с помощью
 * штатного онлайн-бэкапа SQLite (безопасно даже при включённом WAL и
 * параллельных транзакциях) и удаляет старые копии сверх лимита.
 */
export async function createBackup(reason: string): Promise<BackupFileInfo | null> {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) return null;

  const fileName = `${BACKUP_PREFIX}${timestampForFilename(new Date())}-${reason}${BACKUP_EXT}`;
  const filePath = path.join(BACKUPS_DIR, fileName);

  const source = new Database(DB_PATH, { readonly: true });
  try {
    await source.backup(filePath);
  } finally {
    source.close();
  }

  pruneOldBackups();

  const stat = fs.statSync(filePath);
  return { fileName, filePath, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
}

let startupBackupDone = false;

/** Выполняется один раз при старте сервера (см. instrumentation.ts). */
export async function runStartupBackupOnce() {
  if (startupBackupDone) return;
  startupBackupDone = true;
  try {
    const result = await createBackup("startup");
    if (result) {
      console.log(`[backup] Резервная копия при запуске создана: ${result.fileName}`);
    }
  } catch (err) {
    console.error("[backup] Не удалось создать резервную копию при запуске:", err);
  }
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
}

const REQUIRED_TABLES = ["cases", "case_stages", "payments", "settings", "services"];

/** Проверяет файл резервной копии перед восстановлением: целостность SQLite и наличие ожидаемых таблиц. */
export function validateBackupFile(filePath: string): BackupValidationResult {
  const errors: string[] = [];
  if (!fs.existsSync(filePath)) {
    return { isValid: false, errors: ["Файл не найден."] };
  }

  let testDb: Database.Database | null = null;
  try {
    testDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const integrity = testDb.pragma("integrity_check") as { integrity_check: string }[];
    const integrityOk =
      integrity.length === 1 && integrity[0].integrity_check === "ok";
    if (!integrityOk) {
      errors.push("Файл не прошёл проверку целостности SQLite (integrity_check).");
    }

    const tableNames = new Set(
      (
        testDb
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all() as { name: string }[]
      ).map((r) => r.name),
    );
    for (const required of REQUIRED_TABLES) {
      if (!tableNames.has(required)) {
        errors.push(`В файле отсутствует обязательная таблица "${required}".`);
      }
    }
  } catch (err) {
    errors.push(
      `Не удалось открыть файл как базу данных SQLite: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  } finally {
    testDb?.close();
  }

  return { isValid: errors.length === 0, errors };
}

export interface RestoreResult {
  ok: boolean;
  message: string;
}

/**
 * Восстанавливает базу данных из проверенного файла резервной копии.
 * Перед заменой создаёт "аварийную" резервную копию текущей базы.
 * После восстановления процесс приложения необходимо перезапустить —
 * это указывается пользователю явно, чтобы избежать работы со старым
 * соединением к файлу, который был подменён на диске.
 */
export async function restoreFromBackupFile(sourceFilePath: string): Promise<RestoreResult> {
  const validation = validateBackupFile(sourceFilePath);
  if (!validation.isValid) {
    return {
      ok: false,
      message: `Восстановление отменено — файл не прошёл проверку: ${validation.errors.join(" ")}`,
    };
  }

  await createBackup("before-restore");

  closeDatabaseConnection();

  for (const suffix of ["", "-wal", "-shm"]) {
    const p = `${DB_PATH}${suffix}`;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.copyFileSync(sourceFilePath, DB_PATH);

  return {
    ok: true,
    message:
      "База данных восстановлена из резервной копии. Перезапустите приложение (остановите и запустите снова), чтобы изменения вступили в силу.",
  };
}
