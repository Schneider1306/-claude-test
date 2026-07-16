"use server";

import { db } from "@/db/client";
import { cases, caseStages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { caseFormSchema, stageFormSchema, type CaseFormValues, type StageFormValues } from "@/domain/schemas";
import { rublesToKopecks, hoursToMinutes } from "@/domain/calculations";
import { generateInternalNumber } from "@/server/queries/cases";
import { logHistory } from "@/server/history";

export type WizardStagePayload = Omit<StageFormValues, "caseId">;

export async function createCaseWithStages(input: {
  caseForm: CaseFormValues;
  stages: WizardStagePayload[];
}) {
  const caseData = caseFormSchema.parse(input.caseForm);

  const internalNumber = generateInternalNumber();

  const inserted = db
    .insert(cases)
    .values({
      internalNumber,
      shortName: caseData.shortName,
      clientCode: caseData.clientCode,
      clientType: caseData.clientType,
      caseType: caseData.caseType,
      status: caseData.status,
      responsible: caseData.responsible,
      comment: caseData.comment,
      inquiryDate: caseData.inquiryDate || null,
      contractDate: caseData.contractDate || null,
      startDate: caseData.startDate || null,
      endDate: caseData.endDate || null,
      nextActionDate: caseData.nextActionDate || null,
      initialEstimateKopecks:
        caseData.initialEstimateRubles != null
          ? rublesToKopecks(caseData.initialEstimateRubles)
          : null,
    })
    .returning({ id: cases.id })
    .get();

  const caseId = inserted.id;

  for (const [index, stage] of input.stages.entries()) {
    const parsed = stageFormSchema.parse({ ...stage, caseId });
    db.insert(caseStages)
      .values({
        caseId,
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
        sortOrder: index,
      })
      .run();
  }

  logHistory({
    caseId,
    entityType: "case",
    entityId: caseId,
    action: "create",
    summary: `Создано дело №${internalNumber} «${caseData.shortName}»`,
  });

  revalidatePath("/cases");
  revalidatePath("/");
  return { id: caseId, internalNumber };
}

export async function updateCase(id: number, values: CaseFormValues) {
  const parsed = caseFormSchema.parse(values);
  const before = db.select().from(cases).where(eq(cases.id, id)).get();

  db.update(cases)
    .set({
      shortName: parsed.shortName,
      clientCode: parsed.clientCode,
      clientType: parsed.clientType,
      caseType: parsed.caseType,
      status: parsed.status,
      responsible: parsed.responsible,
      comment: parsed.comment,
      inquiryDate: parsed.inquiryDate || null,
      contractDate: parsed.contractDate || null,
      startDate: parsed.startDate || null,
      endDate: parsed.endDate || null,
      nextActionDate: parsed.nextActionDate || null,
      initialEstimateKopecks:
        parsed.initialEstimateRubles != null ? rublesToKopecks(parsed.initialEstimateRubles) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(cases.id, id))
    .run();

  logHistory({
    caseId: id,
    entityType: "case",
    entityId: id,
    action: "update",
    summary: `Изменена карточка дела «${parsed.shortName}»${
      before && before.status !== parsed.status ? ` (статус: ${before.status} → ${parsed.status})` : ""
    }`,
  });

  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function softDeleteCase(id: number) {
  const row = db.select().from(cases).where(eq(cases.id, id)).get();
  if (!row) return;
  db.update(cases)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(cases.id, id))
    .run();
  logHistory({
    caseId: id,
    entityType: "case",
    entityId: id,
    action: "delete",
    summary: `Дело «${row.shortName}» перемещено в удалённые (мягкое удаление)`,
  });
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function restoreCase(id: number) {
  const row = db.select().from(cases).where(eq(cases.id, id)).get();
  if (!row) return;
  db.update(cases).set({ deletedAt: null }).where(eq(cases.id, id)).run();
  logHistory({
    caseId: id,
    entityType: "case",
    entityId: id,
    action: "restore",
    summary: `Дело «${row.shortName}» восстановлено из удалённых`,
  });
  revalidatePath("/cases");
  revalidatePath("/");
}
