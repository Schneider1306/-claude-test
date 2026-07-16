"use server";

import { z } from "zod";
import { sqlite } from "@/db";
import { manualBackupCopyPath, listBackups } from "@/db/backup";

export async function runManualBackup() {
  const path = manualBackupCopyPath();
  return { path };
}

export async function getBackupsList() {
  return listBackups();
}

const TABLES = [
  "settings",
  "services",
  "service_price_history",
  "calculations",
  "calculation_lines",
  "calculation_expenses",
  "calculation_change_log",
  "calculation_status_history",
] as const;

export interface DatabaseDump {
  exportedAt: string;
  formatVersion: 1;
  tables: Record<(typeof TABLES)[number], Record<string, unknown>[]>;
}

export async function exportDatabaseJSON(): Promise<string> {
  const tables: Partial<DatabaseDump["tables"]> = {};
  for (const table of TABLES) {
    tables[table] = sqlite.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
  }
  const dump: DatabaseDump = {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    tables: tables as DatabaseDump["tables"],
  };
  return JSON.stringify(dump, null, 2);
}

const dumpSchema = z.object({
  exportedAt: z.string(),
  formatVersion: z.literal(1),
  tables: z.object({
    settings: z.array(z.record(z.string(), z.unknown())),
    services: z.array(z.record(z.string(), z.unknown())),
    service_price_history: z.array(z.record(z.string(), z.unknown())),
    calculations: z.array(z.record(z.string(), z.unknown())),
    calculation_lines: z.array(z.record(z.string(), z.unknown())),
    calculation_expenses: z.array(z.record(z.string(), z.unknown())),
    calculation_change_log: z.array(z.record(z.string(), z.unknown())),
    calculation_status_history: z.array(z.record(z.string(), z.unknown())),
  }),
});

export interface RestoreValidationResult {
  valid: boolean;
  error?: string;
  summary?: Record<string, number>;
}

export async function validateRestoreFile(jsonText: string): Promise<RestoreValidationResult> {
  try {
    const parsed = JSON.parse(jsonText);
    const result = dumpSchema.safeParse(parsed);
    if (!result.success) {
      return { valid: false, error: "Файл не соответствует ожидаемой структуре базы данных." };
    }
    const summary: Record<string, number> = {};
    for (const table of TABLES) {
      summary[table] = result.data.tables[table].length;
    }
    return { valid: true, summary };
  } catch {
    return { valid: false, error: "Не удалось разобрать файл как JSON." };
  }
}

export async function restoreFromJSON(jsonText: string): Promise<RestoreValidationResult> {
  const validation = await validateRestoreFile(jsonText);
  if (!validation.valid) return validation;

  const dump = dumpSchema.parse(JSON.parse(jsonText));

  manualBackupCopyPath();

  const applyRestore = sqlite.transaction(() => {
    for (const table of [...TABLES].reverse()) {
      sqlite.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of TABLES) {
      const rows = dump.tables[table];
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((c) => `@${c}`).join(", ");
      const stmt = sqlite.prepare(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
      );
      for (const row of rows) {
        stmt.run(row as Record<string, unknown>);
      }
    }
  });
  applyRestore();

  return validation;
}

export async function getDatabaseStats() {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const row = sqlite.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number };
    counts[table] = row.c;
  }
  return counts;
}
