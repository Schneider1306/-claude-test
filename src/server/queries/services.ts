import "server-only";
import { db } from "@/db/client";
import { services } from "@/db/schema";
import { asc, eq } from "drizzle-orm";

export type Service = typeof services.$inferSelect;

export function listServices(includeInactive = true): Service[] {
  const rows = db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id)).all();
  return includeInactive ? rows : rows.filter((s) => s.isActive);
}

export function getService(id: number): Service | undefined {
  return db.select().from(services).where(eq(services.id, id)).get();
}
