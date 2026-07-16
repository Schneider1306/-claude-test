"use server";

import { db } from "@/db/client";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { serviceFormSchema, type ServiceFormValues } from "@/domain/schemas";
import { hoursToMinutes, rublesToKopecks } from "@/domain/calculations";
import { logHistory } from "@/server/history";

export async function createService(values: ServiceFormValues) {
  const parsed = serviceFormSchema.parse(values);
  const inserted = db
    .insert(services)
    .values({
      name: parsed.name,
      category: parsed.category,
      marketPriceKopecks: rublesToKopecks(parsed.marketPriceRubles),
      workPriceKopecks: rublesToKopecks(parsed.workPriceRubles),
      plannedMinutes: hoursToMinutes(parsed.plannedHours),
      description: parsed.description ?? "",
      extraPaymentBasis: parsed.extraPaymentBasis ?? "",
      isActive: parsed.isActive,
      includedMeetings: parsed.includedMeetings,
      monthlyLimitMinutes:
        parsed.monthlyLimitHours != null ? hoursToMinutes(parsed.monthlyLimitHours) : null,
    })
    .returning({ id: services.id })
    .get();

  logHistory({
    entityType: "service",
    entityId: inserted.id,
    action: "create",
    summary: `Добавлена услуга в каталог: «${parsed.name}»`,
  });

  revalidatePath("/settings");
  revalidatePath("/cases/new");
  return inserted.id;
}

export async function updateService(id: number, values: ServiceFormValues) {
  const parsed = serviceFormSchema.parse(values);
  const before = db.select().from(services).where(eq(services.id, id)).get();
  const priceChanged =
    before &&
    (before.workPriceKopecks !== rublesToKopecks(parsed.workPriceRubles) ||
      before.marketPriceKopecks !== rublesToKopecks(parsed.marketPriceRubles));

  db.update(services)
    .set({
      name: parsed.name,
      category: parsed.category,
      marketPriceKopecks: rublesToKopecks(parsed.marketPriceRubles),
      workPriceKopecks: rublesToKopecks(parsed.workPriceRubles),
      plannedMinutes: hoursToMinutes(parsed.plannedHours),
      description: parsed.description ?? "",
      extraPaymentBasis: parsed.extraPaymentBasis ?? "",
      isActive: parsed.isActive,
      includedMeetings: parsed.includedMeetings,
      monthlyLimitMinutes:
        parsed.monthlyLimitHours != null ? hoursToMinutes(parsed.monthlyLimitHours) : null,
      priceChangedAt: priceChanged ? new Date().toISOString() : before?.priceChangedAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(services.id, id))
    .run();

  logHistory({
    entityType: "service",
    entityId: id,
    action: "update",
    summary: `Изменена услуга каталога: «${parsed.name}»${priceChanged ? " (изменена цена)" : ""}`,
  });

  revalidatePath("/settings");
  revalidatePath("/cases/new");
}

export async function setServiceActive(id: number, isActive: boolean) {
  db.update(services)
    .set({ isActive, updatedAt: new Date().toISOString() })
    .where(eq(services.id, id))
    .run();
  revalidatePath("/settings");
  revalidatePath("/cases/new");
}
