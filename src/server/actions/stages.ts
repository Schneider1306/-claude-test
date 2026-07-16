"use server";

import { db } from "@/db/client";
import { caseStages } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { stageFormSchema, type StageFormValues } from "@/domain/schemas";
import { rublesToKopecks, hoursToMinutes } from "@/domain/calculations";
import { logHistory } from "@/server/history";

export async function addStage(values: StageFormValues) {
  const parsed = stageFormSchema.parse(values);

  const maxSort = db
    .select({ max: sql<number>`coalesce(max(${caseStages.sortOrder}), -1)` })
    .from(caseStages)
    .where(eq(caseStages.caseId, parsed.caseId))
    .get();

  const inserted = db
    .insert(caseStages)
    .values({
      caseId: parsed.caseId,
      name: parsed.name,
      serviceId: parsed.serviceId ?? null,
      catalogPriceKopecks:
        parsed.catalogPriceRubles != null ? rublesToKopecks(parsed.catalogPriceRubles) : null,
      catalogPlannedMinutes:
        parsed.catalogPlannedHours != null ? hoursToMinutes(parsed.catalogPlannedHours) : null,
      priceDeviationReason: parsed.priceDeviationReason || null,
      agreedPriceKopecks: rublesToKopecks(parsed.agreedPriceRubles),
      quantity: parsed.quantity,
      plannedMinutes: hoursToMinutes(parsed.plannedHours),
      includedMeetings: parsed.includedMeetings,
      agreedDate: parsed.agreedDate || null,
      startDate: parsed.startDate || null,
      dueDate: parsed.dueDate || null,
      status: parsed.status,
      isUrgent: parsed.isUrgent,
      urgencySurchargeBp: parsed.urgencySurchargeBp,
      discountBp: parsed.discountBp,
      comment: parsed.comment ?? "",
      sortOrder: (maxSort?.max ?? -1) + 1,
    })
    .returning({ id: caseStages.id })
    .get();

  logHistory({
    caseId: parsed.caseId,
    entityType: "case_stage",
    entityId: inserted.id,
    action: "create",
    summary: `Добавлен этап «${parsed.name}» (${parsed.agreedPriceRubles.toLocaleString("ru-RU")} ₽ × ${parsed.quantity})`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
  return inserted.id;
}

export async function updateStage(id: number, values: StageFormValues) {
  const parsed = stageFormSchema.parse(values);

  db.update(caseStages)
    .set({
      name: parsed.name,
      serviceId: parsed.serviceId ?? null,
      priceDeviationReason: parsed.priceDeviationReason || null,
      agreedPriceKopecks: rublesToKopecks(parsed.agreedPriceRubles),
      quantity: parsed.quantity,
      plannedMinutes: hoursToMinutes(parsed.plannedHours),
      includedMeetings: parsed.includedMeetings,
      agreedDate: parsed.agreedDate || null,
      startDate: parsed.startDate || null,
      dueDate: parsed.dueDate || null,
      status: parsed.status,
      isUrgent: parsed.isUrgent,
      urgencySurchargeBp: parsed.urgencySurchargeBp,
      discountBp: parsed.discountBp,
      comment: parsed.comment ?? "",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(caseStages.id, id))
    .run();

  logHistory({
    caseId: parsed.caseId,
    entityType: "case_stage",
    entityId: id,
    action: "update",
    summary: `Изменён этап «${parsed.name}»`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function markStagePaid(id: number, caseId: number, isPaid: boolean) {
  db.update(caseStages)
    .set({ isPaidFlag: isPaid, updatedAt: new Date().toISOString() })
    .where(eq(caseStages.id, id))
    .run();
  revalidatePath(`/cases/${caseId}`);
}

export async function deleteStage(id: number, caseId: number) {
  const row = db.select().from(caseStages).where(eq(caseStages.id, id)).get();
  db.update(caseStages)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(caseStages.id, id))
    .run();
  logHistory({
    caseId,
    entityType: "case_stage",
    entityId: id,
    action: "delete",
    summary: `Удалён этап «${row?.name ?? id}»`,
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
}
