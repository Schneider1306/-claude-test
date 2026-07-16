"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import type { CalculationStatus } from "@/db/schema";
import {
  computeCalculationTotals,
  type CalculationLineInput,
} from "@/domain/calculations";
import { getTargetRateKopecks, getCalculationDetail } from "@/server/queries";
import {
  calculationDraftSchema,
  actualResultInputSchema,
  type CalculationDraftInput,
} from "@/lib/schemas";

function nextCalculationNumber(): number {
  const row = db
    .select({ max: sql<number | null>`max(${schema.calculations.number})` })
    .from(schema.calculations)
    .get();
  return (row?.max ?? 0) + 1;
}

function computeTotals(data: CalculationDraftInput, targetRateKopecks: number) {
  const lineInputs: CalculationLineInput[] = data.lines.map((l) => ({
    basePriceKopecks: l.basePriceKopecks,
    quantity: l.quantity,
    plannedMinutesPerUnit: l.plannedMinutesPerUnit,
    complexityBps: l.complexityBps,
    urgencyBps: l.urgencyBps,
    responsibilityBps: l.responsibilityBps,
  }));
  return computeCalculationTotals({
    lines: lineInputs,
    expenses: data.expenses.map((e) => ({ amountKopecks: e.amountKopecks })),
    discountBps: data.discountBps,
    travelMinutes: data.travelMinutes,
    targetRateKopecks,
  });
}

function replaceLinesAndExpenses(calcId: number, data: CalculationDraftInput) {
  db.delete(schema.calculationLines).where(eq(schema.calculationLines.calculationId, calcId)).run();
  db.delete(schema.calculationExpenses)
    .where(eq(schema.calculationExpenses.calculationId, calcId))
    .run();

  data.lines.forEach((line, index) => {
    db.insert(schema.calculationLines)
      .values({
        calculationId: calcId,
        serviceId: line.serviceId,
        kind: line.kind,
        name: line.name,
        basePriceKopecks: line.basePriceKopecks,
        quantity: line.quantity,
        plannedMinutesPerUnit: line.plannedMinutesPerUnit,
        complexityBps: line.complexityBps,
        urgencyBps: line.urgencyBps,
        responsibilityBps: line.responsibilityBps,
        comment: line.comment,
        manualOverridesJson: JSON.stringify(line.manualOverrides),
        sortOrder: index,
      })
      .run();
  });

  data.expenses.forEach((expense, index) => {
    db.insert(schema.calculationExpenses)
      .values({
        calculationId: calcId,
        category: expense.category,
        description: expense.description,
        amountKopecks: expense.amountKopecks,
        sortOrder: index,
      })
      .run();
  });
}

interface UpsertOptions {
  status: CalculationStatus;
  isDraftAutosave: boolean;
}

export async function upsertCalculation(
  input: CalculationDraftInput,
  options: UpsertOptions,
) {
  const data = calculationDraftSchema.parse(input);
  const targetRateKopecks = getTargetRateKopecks();
  const totals = computeTotals(data, targetRateKopecks);
  const now = new Date().toISOString();

  const fields = {
    internalName: data.internalName,
    clientCode: data.clientCode,
    caseType: data.caseType,
    status: options.status,
    discountBps: data.discountBps,
    discountReason: data.discountReason,
    travelMinutes: data.travelMinutes,
    comment: data.comment,
    baseAmountKopecks: totals.baseAmountKopecks,
    surchargeKopecks: totals.surchargeKopecks,
    professionalBeforeDiscountKopecks: totals.professionalBeforeDiscountKopecks,
    discountAmountKopecks: totals.discountAmountKopecks,
    professionalAfterDiscountKopecks: totals.professionalAfterDiscountKopecks,
    externalExpensesKopecks: totals.externalExpensesKopecks,
    clientTotalKopecks: totals.clientTotalKopecks,
    plannedMinutes: totals.plannedMinutes,
    targetRateKopecksSnapshot: targetRateKopecks,
    economicMinimumKopecks: totals.economicMinimumKopecks,
    effectiveRateKopecks:
      totals.effectiveRateKopecks !== null ? Math.round(totals.effectiveRateKopecks) : null,
    rateStatus: totals.status,
    isDraftAutosave: options.isDraftAutosave,
    updatedAt: now,
  };

  let calcId: number;

  if (data.id) {
    db.update(schema.calculations).set(fields).where(eq(schema.calculations.id, data.id)).run();
    calcId = data.id;
  } else {
    const result = db
      .insert(schema.calculations)
      .values({
        ...fields,
        number: nextCalculationNumber(),
        version: 1,
        parentCalculationId: null,
      })
      .run();
    calcId = Number(result.lastInsertRowid);
  }

  replaceLinesAndExpenses(calcId, data);

  revalidatePath("/calculations");
  revalidatePath(`/calculations/${calcId}`);
  revalidatePath("/");

  return { id: calcId, totals };
}

export async function saveDraftCalculation(input: CalculationDraftInput) {
  return upsertCalculation(input, { status: "draft", isDraftAutosave: true });
}

export async function finalizeCalculation(
  input: CalculationDraftInput,
  status: CalculationStatus = "draft",
) {
  const result = await upsertCalculation(input, { status, isDraftAutosave: false });
  db.insert(schema.calculationStatusHistory)
    .values({ calculationId: result.id, status, comment: "Расчёт сохранён" })
    .run();
  return result;
}

export async function updateCalculationStatus(
  id: number,
  status: CalculationStatus,
  comment = "",
) {
  db.update(schema.calculations)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(schema.calculations.id, id))
    .run();
  db.insert(schema.calculationStatusHistory).values({ calculationId: id, status, comment }).run();

  revalidatePath("/calculations");
  revalidatePath(`/calculations/${id}`);
  revalidatePath("/");
}

export async function archiveCalculation(id: number) {
  await updateCalculationStatus(id, "archived", "Перемещено в архив");
}

export async function deleteCalculation(id: number) {
  db.delete(schema.calculations).where(eq(schema.calculations.id, id)).run();
  revalidatePath("/calculations");
  revalidatePath("/");
}

function cloneDetailToDraft(id: number): CalculationDraftInput {
  const detail = getCalculationDetail(id);
  if (!detail) throw new Error("Расчёт не найден");
  return {
    internalName: detail.calculation.internalName,
    clientCode: detail.calculation.clientCode,
    caseType: detail.calculation.caseType,
    discountBps: detail.calculation.discountBps,
    discountReason: detail.calculation.discountReason,
    travelMinutes: detail.calculation.travelMinutes,
    comment: detail.calculation.comment,
    lines: detail.lines.map((l) => ({
      clientId: crypto.randomUUID(),
      serviceId: l.serviceId,
      kind: l.kind,
      name: l.name,
      basePriceKopecks: l.basePriceKopecks,
      quantity: l.quantity,
      plannedMinutesPerUnit: l.plannedMinutesPerUnit,
      complexityBps: l.complexityBps,
      urgencyBps: l.urgencyBps,
      responsibilityBps: l.responsibilityBps,
      comment: l.comment,
      manualOverrides: JSON.parse(l.manualOverridesJson),
    })),
    expenses: detail.expenses.map((e) => ({
      clientId: crypto.randomUUID(),
      category: e.category,
      description: e.description,
      amountKopecks: e.amountKopecks,
    })),
  };
}

export async function createNewVersion(id: number) {
  const detail = getCalculationDetail(id);
  if (!detail) throw new Error("Расчёт не найден");
  const draft = cloneDetailToDraft(id);
  const targetRateKopecks = getTargetRateKopecks();
  const totals = computeTotals(draft, targetRateKopecks);
  const now = new Date().toISOString();

  const result = db
    .insert(schema.calculations)
    .values({
      internalName: draft.internalName,
      clientCode: draft.clientCode,
      caseType: draft.caseType,
      status: "draft",
      discountBps: draft.discountBps,
      discountReason: draft.discountReason,
      travelMinutes: draft.travelMinutes,
      comment: draft.comment,
      baseAmountKopecks: totals.baseAmountKopecks,
      surchargeKopecks: totals.surchargeKopecks,
      professionalBeforeDiscountKopecks: totals.professionalBeforeDiscountKopecks,
      discountAmountKopecks: totals.discountAmountKopecks,
      professionalAfterDiscountKopecks: totals.professionalAfterDiscountKopecks,
      externalExpensesKopecks: totals.externalExpensesKopecks,
      clientTotalKopecks: totals.clientTotalKopecks,
      plannedMinutes: totals.plannedMinutes,
      targetRateKopecksSnapshot: targetRateKopecks,
      economicMinimumKopecks: totals.economicMinimumKopecks,
      effectiveRateKopecks:
        totals.effectiveRateKopecks !== null ? Math.round(totals.effectiveRateKopecks) : null,
      rateStatus: totals.status,
      number: detail.calculation.number,
      version: detail.calculation.version + 1,
      parentCalculationId: id,
      isDraftAutosave: false,
      updatedAt: now,
    })
    .run();

  const newId = Number(result.lastInsertRowid);
  replaceLinesAndExpenses(newId, draft);
  db.insert(schema.calculationStatusHistory)
    .values({ calculationId: newId, status: "draft", comment: `Новая версия от расчёта №${detail.calculation.number}` })
    .run();

  revalidatePath("/calculations");
  return { id: newId };
}

export async function duplicateCalculation(id: number) {
  const draft = cloneDetailToDraft(id);
  const targetRateKopecks = getTargetRateKopecks();
  const totals = computeTotals(draft, targetRateKopecks);
  const now = new Date().toISOString();

  const result = db
    .insert(schema.calculations)
    .values({
      internalName: `${draft.internalName} (копия)`,
      clientCode: draft.clientCode,
      caseType: draft.caseType,
      status: "draft",
      discountBps: draft.discountBps,
      discountReason: draft.discountReason,
      travelMinutes: draft.travelMinutes,
      comment: draft.comment,
      baseAmountKopecks: totals.baseAmountKopecks,
      surchargeKopecks: totals.surchargeKopecks,
      professionalBeforeDiscountKopecks: totals.professionalBeforeDiscountKopecks,
      discountAmountKopecks: totals.discountAmountKopecks,
      professionalAfterDiscountKopecks: totals.professionalAfterDiscountKopecks,
      externalExpensesKopecks: totals.externalExpensesKopecks,
      clientTotalKopecks: totals.clientTotalKopecks,
      plannedMinutes: totals.plannedMinutes,
      targetRateKopecksSnapshot: targetRateKopecks,
      economicMinimumKopecks: totals.economicMinimumKopecks,
      effectiveRateKopecks:
        totals.effectiveRateKopecks !== null ? Math.round(totals.effectiveRateKopecks) : null,
      rateStatus: totals.status,
      number: nextCalculationNumber(),
      version: 1,
      parentCalculationId: null,
      isDraftAutosave: false,
      updatedAt: now,
    })
    .run();

  const newId = Number(result.lastInsertRowid);
  replaceLinesAndExpenses(newId, draft);
  db.insert(schema.calculationStatusHistory)
    .values({ calculationId: newId, status: "draft", comment: `Дублировано из расчёта №${id}` })
    .run();

  revalidatePath("/calculations");
  return { id: newId };
}

export async function setActualResult(input: {
  calculationId: number;
  actualPriceKopecks: number;
  actualMinutes: number;
}) {
  const data = actualResultInputSchema.parse(input);
  db.update(schema.calculations)
    .set({
      actualPriceKopecks: data.actualPriceKopecks,
      actualMinutes: data.actualMinutes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.calculations.id, data.calculationId))
    .run();

  revalidatePath(`/calculations/${data.calculationId}`);
  revalidatePath("/analytics");
}

export async function exportCalculationJSON(id: number): Promise<string> {
  const detail = getCalculationDetail(id);
  if (!detail) throw new Error("Расчёт не найден");
  return JSON.stringify(detail, null, 2);
}

export async function exportCalculationCSV(id: number): Promise<string> {
  const detail = getCalculationDetail(id);
  if (!detail) throw new Error("Расчёт не найден");

  const header = [
    "Строка",
    "Количество",
    "Базовая цена, ₽",
    "Плановое время, мин",
    "Сложность, %",
    "Срочность, %",
    "Ответственность, %",
    "Комментарий",
  ];
  const rows = detail.lines.map((l) => [
    l.name,
    String(l.quantity),
    (l.basePriceKopecks / 100).toFixed(2),
    String(l.plannedMinutesPerUnit * l.quantity),
    (l.complexityBps / 100).toFixed(1),
    (l.urgencyBps / 100).toFixed(1),
    (l.responsibilityBps / 100).toFixed(1),
    l.comment.replace(/"/g, '""'),
  ]);
  const expenseRows = detail.expenses.map((e) => [
    `Расход: ${e.description || e.category}`,
    "1",
    (e.amountKopecks / 100).toFixed(2),
    "0",
    "",
    "",
    "",
    "",
  ]);

  const csvLines = [header, ...rows, ...expenseRows].map((row) =>
    row.map((cell) => `"${cell}"`).join(";"),
  );
  return "﻿" + csvLines.join("\r\n");
}
