"use server";

import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { serviceInputSchema, type ServiceInputData } from "@/lib/schemas";

export async function getServicePriceHistoryAction(serviceId: number) {
  return db
    .select()
    .from(schema.servicePriceHistory)
    .where(eq(schema.servicePriceHistory.serviceId, serviceId))
    .orderBy(desc(schema.servicePriceHistory.changedAt))
    .all();
}

export async function createService(input: ServiceInputData) {
  const data = serviceInputSchema.parse(input);
  const result = db
    .insert(schema.services)
    .values({
      name: data.name,
      category: data.category,
      basePriceKopecks: data.basePriceKopecks,
      marketReferenceKopecks: data.marketReferenceKopecks,
      plannedMinutes: data.plannedMinutes,
      description: data.description,
      extraPaymentTerms: data.extraPaymentTerms,
      kind: data.kind,
      isActive: data.isActive,
    })
    .run();

  revalidatePath("/services");
  return { id: Number(result.lastInsertRowid) };
}

export async function updateService(id: number, input: ServiceInputData) {
  const data = serviceInputSchema.parse(input);
  const existing = db.select().from(schema.services).where(eq(schema.services.id, id)).get();
  if (!existing) throw new Error("Услуга не найдена");

  if (
    existing.basePriceKopecks !== data.basePriceKopecks ||
    existing.plannedMinutes !== data.plannedMinutes
  ) {
    db.insert(schema.servicePriceHistory)
      .values({
        serviceId: id,
        oldPriceKopecks: existing.basePriceKopecks,
        newPriceKopecks: data.basePriceKopecks,
        oldPlannedMinutes: existing.plannedMinutes,
        newPlannedMinutes: data.plannedMinutes,
        comment: data.changeComment,
      })
      .run();
  }

  db.update(schema.services)
    .set({
      name: data.name,
      category: data.category,
      basePriceKopecks: data.basePriceKopecks,
      marketReferenceKopecks: data.marketReferenceKopecks,
      plannedMinutes: data.plannedMinutes,
      description: data.description,
      extraPaymentTerms: data.extraPaymentTerms,
      kind: data.kind,
      isActive: data.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.services.id, id))
    .run();

  revalidatePath("/services");
}

export async function duplicateService(id: number) {
  const existing = db.select().from(schema.services).where(eq(schema.services.id, id)).get();
  if (!existing) throw new Error("Услуга не найдена");

  const result = db
    .insert(schema.services)
    .values({
      name: `${existing.name} (копия)`,
      category: existing.category,
      basePriceKopecks: existing.basePriceKopecks,
      marketReferenceKopecks: existing.marketReferenceKopecks,
      plannedMinutes: existing.plannedMinutes,
      description: existing.description,
      extraPaymentTerms: existing.extraPaymentTerms,
      kind: existing.kind,
      isActive: existing.isActive,
    })
    .run();

  revalidatePath("/services");
  return { id: Number(result.lastInsertRowid) };
}

export async function setServiceActive(id: number, isActive: boolean) {
  db.update(schema.services)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(schema.services.id, id))
    .run();
  revalidatePath("/services");
}
