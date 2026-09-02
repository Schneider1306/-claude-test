import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.LEGAL_PRICING_DATA_DIR
  ? path.resolve(process.env.LEGAL_PRICING_DATA_DIR)
  : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "legal-pricing.db");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_BACKUPS = 10;

function timestampSuffix(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/** Резервная копия базы при запуске приложения. Хранит последние MAX_BACKUPS копий. */
export function createStartupBackup(): string | null {
  if (!fs.existsSync(DB_PATH)) return null;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(
    BACKUP_DIR,
    `legal-pricing-${timestampSuffix()}.db`,
  );
  fs.copyFileSync(DB_PATH, backupPath);

  pruneOldBackups();
  return backupPath;
}

function pruneOldBackups(): void {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const file of files.slice(MAX_BACKUPS)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file.name));
  }
}

export function listBackups(): { name: string; sizeBytes: number; createdAt: string }[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function manualBackupCopyPath(): string {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupPath = path.join(
    BACKUP_DIR,
    `legal-pricing-manual-${timestampSuffix()}.db`,
  );
  fs.copyFileSync(DB_PATH, backupPath);
  pruneOldBackups();
  return backupPath;
}

export { DATA_DIR, DB_PATH, BACKUP_DIR };
