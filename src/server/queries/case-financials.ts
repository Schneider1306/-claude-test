import "server-only";
import { db } from "@/db/client";
import { caseStages, expenses, payments, timeEntries } from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  computeCaseFinancials,
  type CaseFinancials,
  type StageLineInput,
} from "@/domain/calculations";

export type StageRow = typeof caseStages.$inferSelect;

export function getStagesForCase(caseId: number): StageRow[] {
  return db
    .select()
    .from(caseStages)
    .where(and(eq(caseStages.caseId, caseId), isNull(caseStages.deletedAt)))
    .orderBy(caseStages.sortOrder, caseStages.id)
    .all();
}

export function getActualMinutesForCase(caseId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${timeEntries.minutes}), 0)` })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.caseId, caseId),
        eq(timeEntries.isBillable, true),
        isNull(timeEntries.deletedAt),
      ),
    )
    .get();
  return row?.total ?? 0;
}

export function getActualMinutesByStage(caseId: number): Map<number, number> {
  const rows = db
    .select({
      stageId: timeEntries.stageId,
      total: sql<number>`coalesce(sum(${timeEntries.minutes}), 0)`,
    })
    .from(timeEntries)
    .where(
      and(
        eq(timeEntries.caseId, caseId),
        eq(timeEntries.isBillable, true),
        isNull(timeEntries.deletedAt),
      ),
    )
    .groupBy(timeEntries.stageId)
    .all();
  const map = new Map<number, number>();
  for (const r of rows) {
    if (r.stageId !== null) map.set(r.stageId, r.total);
  }
  return map;
}

export function getPaymentTotalsForCase(caseId: number) {
  const rows = db
    .select({
      kind: payments.kind,
      total: sql<number>`coalesce(sum(${payments.amountKopecks}), 0)`,
    })
    .from(payments)
    .where(and(eq(payments.caseId, caseId), isNull(payments.deletedAt)))
    .groupBy(payments.kind)
    .all();
  const byKind: Record<string, number> = {};
  for (const r of rows) byKind[r.kind] = r.total;
  return {
    plannedKopecks: byKind["planned"] ?? 0,
    actualKopecks: byKind["actual"] ?? 0,
    refundKopecks: byKind["refund"] ?? 0,
    expenseReimbursementKopecks: byKind["expense_reimbursement"] ?? 0,
  };
}

export function getReimbursableExpensesForCase(caseId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${expenses.amountKopecks}), 0)` })
    .from(expenses)
    .where(
      and(
        eq(expenses.caseId, caseId),
        eq(expenses.isReimbursable, true),
        isNull(expenses.deletedAt),
      ),
    )
    .get();
  return row?.total ?? 0;
}

export function stageToLineInput(stage: StageRow): StageLineInput {
  return {
    agreedPriceKopecks: stage.agreedPriceKopecks,
    quantity: stage.quantity,
    plannedMinutes: stage.plannedMinutes,
    discountBp: stage.discountBp,
    isUrgent: stage.isUrgent,
    urgencySurchargeBp: stage.urgencySurchargeBp,
    isCancelled: stage.status === "cancelled",
  };
}

export function getCaseFinancials(caseId: number): CaseFinancials & {
  stages: StageRow[];
  actualMinutesByStage: Map<number, number>;
} {
  const stages = getStagesForCase(caseId);
  const actualMinutesTotal = getActualMinutesForCase(caseId);
  const actualMinutesByStage = getActualMinutesByStage(caseId);
  const paymentTotals = getPaymentTotalsForCase(caseId);
  const reimbursableExpensesKopecks = getReimbursableExpensesForCase(caseId);

  const financials = computeCaseFinancials({
    stages: stages.map(stageToLineInput),
    reimbursableExpensesKopecks,
    actualMinutes: actualMinutesTotal > 0 ? actualMinutesTotal : null,
    actualPaymentsReceivedKopecks: paymentTotals.actualKopecks,
    refundsKopecks: paymentTotals.refundKopecks,
    expenseReimbursementsReceivedKopecks: paymentTotals.expenseReimbursementKopecks,
  });

  return { ...financials, stages, actualMinutesByStage };
}
