import "server-only";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type Settings = typeof settings.$inferSelect;

/** Возвращает настройки приложения. Строка id=1 создаётся миграцией/сидом, но на всякий случай подстраховываемся. */
export function getSettings(): Settings {
  const row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (row) return row;
  db.insert(settings).values({ id: 1 }).run();
  return db.select().from(settings).where(eq(settings.id, 1)).get()!;
}

export function fixedExpensesNoReserveKopecks(s: Settings): number {
  return s.rentKopecks + s.internetKopecks + s.stationeryKopecks + s.aiToolsKopecks;
}

export function billableHoursPerDay(s: Settings): number {
  return s.billableHoursPerDayX100 / 100;
}
