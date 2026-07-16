import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  computeTargetRateKopecks,
  computeCalculationTotals,
  computeActualComparison,
  type CalculationLineInput,
} from "@/domain/calculations";
import {
  toPricingSettings,
  parseCoefficientOptions,
  parseDiscountOptions,
} from "@/server/settings-mapper";

export function getSettingsRow() {
  const row = db.select().from(schema.settings).where(eq(schema.settings.id, 1)).get();
  if (!row) throw new Error("Настройки не найдены — база данных повреждена");
  return row;
}

export function getPricingSettings() {
  return toPricingSettings(getSettingsRow());
}

export function getTargetRateKopecks() {
  return computeTargetRateKopecks(getPricingSettings());
}

export function getSettingsView() {
  const row = getSettingsRow();
  return {
    row,
    pricing: toPricingSettings(row),
    targetRateKopecks: computeTargetRateKopecks(toPricingSettings(row)),
    complexityOptions: parseCoefficientOptions(row.complexityOptionsJson),
    urgencyOptions: parseCoefficientOptions(row.urgencyOptionsJson),
    responsibilityOptions: parseCoefficientOptions(row.responsibilityOptionsJson),
    discountOptionsBps: parseDiscountOptions(row.discountOptionsJson),
  };
}

// ---------------------------------------------------------------------------
// Услуги
// ---------------------------------------------------------------------------

export function getActiveServices() {
  return db
    .select()
    .from(schema.services)
    .where(eq(schema.services.isActive, true))
    .orderBy(schema.services.category, schema.services.name)
    .all();
}

export function getAllServices() {
  return db
    .select()
    .from(schema.services)
    .orderBy(schema.services.category, schema.services.name)
    .all();
}

export function getServiceById(id: number) {
  return db.select().from(schema.services).where(eq(schema.services.id, id)).get();
}

export function getServicePriceHistory(serviceId: number) {
  return db
    .select()
    .from(schema.servicePriceHistory)
    .where(eq(schema.servicePriceHistory.serviceId, serviceId))
    .orderBy(desc(schema.servicePriceHistory.changedAt))
    .all();
}

// ---------------------------------------------------------------------------
// Расчёты — список
// ---------------------------------------------------------------------------

export interface CalculationListFilters {
  search?: string;
  status?: schema.CalculationStatus | "all";
  sortBy?: "createdAt" | "clientTotalKopecks" | "effectiveRateKopecks" | "plannedMinutes";
  sortDir?: "asc" | "desc";
}

export function listCalculations(filters: CalculationListFilters = {}) {
  const rows = db.select().from(schema.calculations).all();
  let filtered = rows;

  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.internalName.toLowerCase().includes(q) ||
          r.clientCode.toLowerCase().includes(q) ||
          r.caseType.toLowerCase().includes(q) ||
          String(r.number).includes(q),
      );
    }
  }

  const sortBy = filters.sortBy ?? "createdAt";
  const sortDir = filters.sortDir ?? "desc";
  filtered = [...filtered].sort((a, b) => {
    const av = a[sortBy] ?? 0;
    const bv = b[sortBy] ?? 0;
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return filtered;
}

export function getCalculationDetail(id: number) {
  const calculation = db
    .select()
    .from(schema.calculations)
    .where(eq(schema.calculations.id, id))
    .get();
  if (!calculation) return null;

  const lines = db
    .select()
    .from(schema.calculationLines)
    .where(eq(schema.calculationLines.calculationId, id))
    .orderBy(schema.calculationLines.sortOrder)
    .all();

  const expenses = db
    .select()
    .from(schema.calculationExpenses)
    .where(eq(schema.calculationExpenses.calculationId, id))
    .orderBy(schema.calculationExpenses.sortOrder)
    .all();

  const changeLog = db
    .select()
    .from(schema.calculationChangeLog)
    .where(eq(schema.calculationChangeLog.calculationId, id))
    .orderBy(desc(schema.calculationChangeLog.createdAt))
    .all();

  const statusHistory = db
    .select()
    .from(schema.calculationStatusHistory)
    .where(eq(schema.calculationStatusHistory.calculationId, id))
    .orderBy(desc(schema.calculationStatusHistory.createdAt))
    .all();

  const versions = db
    .select()
    .from(schema.calculations)
    .where(eq(schema.calculations.number, calculation.number))
    .orderBy(schema.calculations.version)
    .all();

  const totalsInput: CalculationLineInput[] = lines.map((l) => ({
    basePriceKopecks: l.basePriceKopecks,
    quantity: l.quantity,
    plannedMinutesPerUnit: l.plannedMinutesPerUnit,
    complexityBps: l.complexityBps,
    urgencyBps: l.urgencyBps,
    responsibilityBps: l.responsibilityBps,
  }));

  const totals = computeCalculationTotals({
    lines: totalsInput,
    expenses: expenses.map((e) => ({ amountKopecks: e.amountKopecks })),
    discountBps: calculation.discountBps,
    travelMinutes: calculation.travelMinutes,
    targetRateKopecks: calculation.targetRateKopecksSnapshot,
  });

  const actualComparison =
    calculation.actualPriceKopecks !== null && calculation.actualMinutes !== null
      ? computeActualComparison(
          {
            actualPriceKopecks: calculation.actualPriceKopecks,
            actualMinutes: calculation.actualMinutes,
          },
          totals.plannedMinutes,
          totals.professionalAfterDiscountKopecks,
        )
      : null;

  return {
    calculation,
    lines,
    expenses,
    changeLog,
    statusHistory,
    versions,
    totals,
    actualComparison,
  };
}

// ---------------------------------------------------------------------------
// Дашборд и аналитика
// ---------------------------------------------------------------------------

const NON_DRAFT_STATUSES: schema.CalculationStatus[] = [
  "proposal_sent",
  "agreed",
  "in_progress",
  "completed",
];

export function getDashboardStats() {
  const all = db.select().from(schema.calculations).all();
  const relevant = all.filter((c) => NON_DRAFT_STATUSES.includes(c.status) || c.status === "completed");

  const recent = [...all]
    .filter((c) => !c.isDraftAutosave)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);

  const withHours = relevant.filter((c) => c.plannedMinutes > 0);
  const averageCheckKopecks = relevant.length
    ? Math.round(relevant.reduce((s, c) => s + c.clientTotalKopecks, 0) / relevant.length)
    : null;
  const averageRateKopecks = withHours.length
    ? Math.round(
        withHours.reduce((s, c) => s + (c.effectiveRateKopecks ?? 0), 0) / withHours.length,
      )
    : null;

  const belowMinimum = relevant.filter(
    (c) =>
      c.economicMinimumKopecks !== null &&
      c.professionalAfterDiscountKopecks < c.economicMinimumKopecks,
  );

  const monthly = new Map<string, number>();
  for (const c of relevant) {
    const month = c.createdAt.slice(0, 7);
    monthly.set(month, (monthly.get(month) ?? 0) + c.clientTotalKopecks);
  }
  const monthlyRevenue = [...monthly.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-12)
    .map(([month, totalKopecks]) => ({ month, totalKopecks }));

  return {
    recent,
    averageCheckKopecks,
    averageRateKopecks,
    belowMinimumCount: belowMinimum.length,
    belowMinimum: belowMinimum.slice(0, 5),
    monthlyRevenue,
    totalCount: all.filter((c) => !c.isDraftAutosave).length,
  };
}

export function getAnalytics() {
  const all = db
    .select()
    .from(schema.calculations)
    .where(sql`${schema.calculations.isDraftAutosave} = 0`)
    .all();
  const relevant = all.filter((c) => c.status !== "draft" && c.status !== "declined");

  const averageCheckKopecks = relevant.length
    ? Math.round(relevant.reduce((s, c) => s + c.clientTotalKopecks, 0) / relevant.length)
    : null;

  const withHours = relevant.filter((c) => c.plannedMinutes > 0);
  const averagePlannedRateKopecks = withHours.length
    ? Math.round(
        withHours.reduce((s, c) => s + (c.effectiveRateKopecks ?? 0), 0) / withHours.length,
      )
    : null;

  const completedWithActuals = relevant.filter(
    (c) => c.actualPriceKopecks !== null && c.actualMinutes !== null && c.actualMinutes > 0,
  );
  const averageActualRateKopecks = completedWithActuals.length
    ? Math.round(
        completedWithActuals.reduce(
          (s, c) => s + Math.round((c.actualPriceKopecks! / c.actualMinutes!) * 60),
          0,
        ) / completedWithActuals.length,
      )
    : null;

  const averageDiscountBps = relevant.length
    ? Math.round(
        relevant.reduce((s, c) => {
          const before = c.professionalBeforeDiscountKopecks || 1;
          return s + (c.discountAmountKopecks / before) * 10000;
        }, 0) / relevant.length,
      )
    : null;

  const timeAccuracy = completedWithActuals.map((c) => ({
    id: c.id,
    number: c.number,
    internalName: c.internalName,
    plannedMinutes: c.plannedMinutes,
    actualMinutes: c.actualMinutes!,
    overrunBps:
      c.plannedMinutes > 0
        ? Math.round(((c.actualMinutes! - c.plannedMinutes) / c.plannedMinutes) * 10000)
        : null,
  }));

  const averageTimeOverrunBps = timeAccuracy.length
    ? Math.round(
        timeAccuracy.reduce((s, t) => s + (t.overrunBps ?? 0), 0) / timeAccuracy.length,
      )
    : null;

  const allLines = db.select().from(schema.calculationLines).all();
  const revenueByService = new Map<string, { name: string; revenueKopecks: number; count: number }>();
  for (const line of allLines) {
    const calc = relevant.find((c) => c.id === line.calculationId);
    if (!calc) continue;
    const key = line.serviceId ? `service-${line.serviceId}` : `custom-${line.name}`;
    const entry = revenueByService.get(key) ?? { name: line.name, revenueKopecks: 0, count: 0 };
    entry.revenueKopecks += line.basePriceKopecks * line.quantity;
    entry.count += 1;
    revenueByService.set(key, entry);
  }
  const topServices = [...revenueByService.values()]
    .sort((a, b) => b.revenueKopecks - a.revenueKopecks)
    .slice(0, 8);

  const overrunServices = timeAccuracy
    .filter((t) => (t.overrunBps ?? 0) > 0)
    .sort((a, b) => (b.overrunBps ?? 0) - (a.overrunBps ?? 0))
    .slice(0, 8);

  return {
    averageCheckKopecks,
    averagePlannedRateKopecks,
    averageActualRateKopecks,
    averageDiscountBps,
    averageTimeOverrunBps,
    timeAccuracySampleSize: timeAccuracy.length,
    topServices,
    overrunServices,
  };
}

export function getServiceTimeAdjustmentSuggestions() {
  const completed = db
    .select()
    .from(schema.calculations)
    .where(and(eq(schema.calculations.status, "completed"), sql`${schema.calculations.actualMinutes} is not null`))
    .all();

  const lines = db.select().from(schema.calculationLines).all();
  const linesByCalc = new Map<number, typeof lines>();
  for (const line of lines) {
    const arr = linesByCalc.get(line.calculationId) ?? [];
    arr.push(line);
    linesByCalc.set(line.calculationId, arr);
  }

  const bySingleServiceRatio = new Map<number, { serviceName: string; plannedMinutes: number; actualMinutes: number; count: number }>();

  for (const calc of completed) {
    const calcLines = linesByCalc.get(calc.id) ?? [];
    if (calcLines.length !== 1 || !calcLines[0].serviceId) continue;
    const line = calcLines[0];
    const entry = bySingleServiceRatio.get(line.serviceId!) ?? {
      serviceName: line.name,
      plannedMinutes: 0,
      actualMinutes: 0,
      count: 0,
    };
    entry.plannedMinutes += line.plannedMinutesPerUnit * line.quantity;
    entry.actualMinutes += calc.actualMinutes ?? 0;
    entry.count += 1;
    bySingleServiceRatio.set(line.serviceId!, entry);
  }

  return [...bySingleServiceRatio.entries()]
    .map(([serviceId, v]) => ({
      serviceId,
      serviceName: v.serviceName,
      averagePlannedMinutes: Math.round(v.plannedMinutes / v.count),
      averageActualMinutes: Math.round(v.actualMinutes / v.count),
      sampleSize: v.count,
    }))
    .filter((s) => s.sampleSize >= 2 && Math.abs(s.averageActualMinutes - s.averagePlannedMinutes) / s.averagePlannedMinutes > 0.15);
}
