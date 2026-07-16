import "server-only";
import { db } from "@/db/client";
import { caseStages, payments, timeEntries } from "@/db/schema";
import { isNull } from "drizzle-orm";
import { CASE_TYPE_LABELS } from "@/domain/labels";
import { listCasesWithSummary } from "./cases";

function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export interface MonthlyRevenuePoint {
  month: string;
  invoicedKopecks: number;
  receivedKopecks: number;
  taxKopecks: number;
}

export function getMonthlyRevenue(months = 12): MonthlyRevenuePoint[] {
  const allPayments = db.select().from(payments).where(isNull(payments.deletedAt)).all();
  const keys = lastNMonths(months);
  const map = new Map<string, MonthlyRevenuePoint>(
    keys.map((k) => [k, { month: k, invoicedKopecks: 0, receivedKopecks: 0, taxKopecks: 0 }]),
  );
  for (const p of allPayments) {
    const key = monthKey(p.paymentDate);
    const point = map.get(key);
    if (!point) continue;
    if (p.kind === "planned" || p.kind === "actual") point.invoicedKopecks += p.amountKopecks;
    if (p.kind === "actual") {
      point.receivedKopecks += p.amountKopecks;
      point.taxKopecks += p.taxAmountKopecks;
    }
  }
  return keys.map((k) => map.get(k)!);
}

export interface CapacityUsagePoint {
  month: string;
  billableMinutes: number;
  capacityMinutes: number;
}

export function getCapacityUsage(capacityMinutesPerMonth: number, months = 6): CapacityUsagePoint[] {
  const allEntries = db.select().from(timeEntries).where(isNull(timeEntries.deletedAt)).all();
  const keys = lastNMonths(months);
  const map = new Map<string, number>(keys.map((k) => [k, 0]));
  for (const e of allEntries) {
    if (!e.isBillable) continue;
    const key = monthKey(e.workDate);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + e.minutes);
  }
  return keys.map((k) => ({ month: k, billableMinutes: map.get(k) ?? 0, capacityMinutes: capacityMinutesPerMonth }));
}

export interface CaseTypeStat {
  caseType: string;
  label: string;
  count: number;
  totalToClientKopecks: number;
  receivedKopecks: number;
  avgEffectiveRateKopecksPerHour: number | null;
}

export function getCaseTypeProfitability(): CaseTypeStat[] {
  const rows = listCasesWithSummary();
  const groups = new Map<string, { count: number; total: number; received: number; rateNum: number; rateDenomMinutes: number }>();
  for (const { case: c, financials } of rows) {
    const g = groups.get(c.caseType) ?? { count: 0, total: 0, received: 0, rateNum: 0, rateDenomMinutes: 0 };
    g.count += 1;
    g.total += financials.totalToClientKopecks;
    g.received += financials.receivedKopecks;
    if (financials.actualMinutesTotal) {
      g.rateNum += financials.feeAfterDiscountKopecks;
      g.rateDenomMinutes += financials.actualMinutesTotal;
    }
    groups.set(c.caseType, g);
  }
  return [...groups.entries()].map(([caseType, g]) => ({
    caseType,
    label: CASE_TYPE_LABELS[caseType] ?? caseType,
    count: g.count,
    totalToClientKopecks: g.total,
    receivedKopecks: g.received,
    avgEffectiveRateKopecksPerHour: g.rateDenomMinutes > 0 ? Math.round(g.rateNum / (g.rateDenomMinutes / 60)) : null,
  }));
}

export interface OverBudgetCase {
  id: number;
  internalNumber: string;
  name: string;
  plannedMinutes: number;
  actualMinutes: number;
  overrunMinutes: number;
}

export function getOverBudgetCases(): OverBudgetCase[] {
  const rows = listCasesWithSummary();
  return rows
    .filter(({ financials }) => financials.actualMinutesTotal && financials.actualMinutesTotal > financials.plannedMinutesTotal)
    .map(({ case: c, financials }) => ({
      id: c.id,
      internalNumber: c.internalNumber,
      name: c.shortName,
      plannedMinutes: financials.plannedMinutesTotal,
      actualMinutes: financials.actualMinutesTotal!,
      overrunMinutes: financials.actualMinutesTotal! - financials.plannedMinutesTotal,
    }))
    .sort((a, b) => b.overrunMinutes - a.overrunMinutes);
}

export function getDiscountImpact() {
  const rows = listCasesWithSummary();
  let totalDiscount = 0;
  let casesWithDiscount = 0;
  let totalFeeGross = 0;
  for (const { financials } of rows) {
    totalDiscount += financials.discountTotalKopecks;
    totalFeeGross += financials.feeGrossKopecks;
    if (financials.discountTotalKopecks > 0) casesWithDiscount += 1;
  }
  return {
    totalDiscountKopecks: totalDiscount,
    casesWithDiscount,
    totalCases: rows.length,
    impactFraction: totalFeeGross > 0 ? totalDiscount / totalFeeGross : 0,
  };
}

export function getAverageCheckKopecks(): number {
  const rows = listCasesWithSummary().filter(({ case: c }) => c.status !== "lead" && c.status !== "proposal_sent");
  if (rows.length === 0) return 0;
  const total = rows.reduce((sum, r) => sum + r.financials.totalToClientKopecks, 0);
  return Math.round(total / rows.length);
}

export function getTaxBurden() {
  const allPayments = db.select().from(payments).where(isNull(payments.deletedAt)).all();
  let received = 0;
  let tax = 0;
  for (const p of allPayments) {
    if (p.kind !== "actual") continue;
    received += p.amountKopecks;
    tax += p.taxAmountKopecks;
  }
  return { receivedKopecks: received, taxKopecks: tax, burdenFraction: received > 0 ? tax / received : 0 };
}

export interface ServiceStat {
  name: string;
  totalRevenueKopecks: number;
  totalMinutes: number;
  effectiveRateKopecksPerHour: number | null;
}

export function getServiceProfitability(): ServiceStat[] {
  const stages = db.select().from(caseStages).where(isNull(caseStages.deletedAt)).all();
  const entries = db.select().from(timeEntries).where(isNull(timeEntries.deletedAt)).all();
  const minutesByStage = new Map<number, number>();
  for (const e of entries) {
    if (e.stageId == null || !e.isBillable) continue;
    minutesByStage.set(e.stageId, (minutesByStage.get(e.stageId) ?? 0) + e.minutes);
  }

  const byName = new Map<string, { revenue: number; minutes: number; hasActual: boolean }>();
  for (const s of stages) {
    if (s.status === "cancelled") continue;
    const revenue = s.agreedPriceKopecks * s.quantity;
    const actualMinutes = minutesByStage.get(s.id);
    const minutes = actualMinutes ?? s.plannedMinutes * s.quantity;
    const g = byName.get(s.name) ?? { revenue: 0, minutes: 0, hasActual: false };
    g.revenue += revenue;
    g.minutes += minutes;
    if (actualMinutes) g.hasActual = true;
    byName.set(s.name, g);
  }

  return [...byName.entries()]
    .map(([name, g]) => ({
      name,
      totalRevenueKopecks: g.revenue,
      totalMinutes: g.minutes,
      effectiveRateKopecksPerHour: g.minutes > 0 ? Math.round(g.revenue / (g.minutes / 60)) : null,
    }))
    .sort((a, b) => (b.effectiveRateKopecksPerHour ?? 0) - (a.effectiveRateKopecksPerHour ?? 0));
}

export function getPlannedVsActualTotals() {
  const rows = listCasesWithSummary();
  let planned = 0;
  let actual = 0;
  for (const { financials } of rows) {
    planned += financials.plannedMinutesTotal;
    actual += financials.actualMinutesTotal ?? 0;
  }
  return { plannedMinutes: planned, actualMinutes: actual };
}

export function getTotalDebtKopecks(): number {
  const rows = listCasesWithSummary();
  return rows.reduce((sum, r) => sum + Math.max(r.financials.debtKopecks, 0), 0);
}
