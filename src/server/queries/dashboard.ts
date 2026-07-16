import "server-only";
import { db } from "@/db/client";
import { cases, caseStages, payments } from "@/db/schema";
import { and, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import {
  actualPersonalIncomeKopecks,
  computeBenchmark,
  evaluateBenchmarkStatus,
  evaluateNpdLimit,
  evaluateWorkload,
  monthlyCapacityMinutes,
  resolveBenchmarkTaxRateBp,
} from "@/domain/calculations";
import { fixedExpensesNoReserveKopecks, getSettings, billableHoursPerDay } from "./settings";
import { listCasesWithSummary } from "./cases";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function monthRange(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = `${y}-${pad2(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad2(m + 1)}-${pad2(lastDay)}`;
  return { start, end, year: y };
}

export function yearRange(date = new Date()) {
  const y = date.getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31`, year: y };
}

export function getDashboardData() {
  const settings = getSettings();
  const today = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(today);
  const { start: yearStart, end: yearEnd } = yearRange(today);
  const todayIso = today.toISOString().slice(0, 10);

  const receivedThisMonthRow = db
    .select({ total: sql<number>`coalesce(sum(${payments.amountKopecks}), 0)` })
    .from(payments)
    .where(
      and(
        eq(payments.kind, "actual"),
        isNull(payments.deletedAt),
        gte(payments.paymentDate, monthStart),
        lte(payments.paymentDate, monthEnd),
      ),
    )
    .get();
  const receivedThisMonthKopecks = receivedThisMonthRow?.total ?? 0;

  const taxThisMonthRow = db
    .select({ total: sql<number>`coalesce(sum(${payments.taxAmountKopecks}), 0)` })
    .from(payments)
    .where(
      and(
        eq(payments.kind, "actual"),
        isNull(payments.deletedAt),
        gte(payments.paymentDate, monthStart),
        lte(payments.paymentDate, monthEnd),
      ),
    )
    .get();
  const taxThisMonthKopecks = taxThisMonthRow?.total ?? 0;

  const invoicedThisMonthRow = db
    .select({ total: sql<number>`coalesce(sum(${payments.amountKopecks}), 0)` })
    .from(payments)
    .where(
      and(
        sql`${payments.kind} in ('planned', 'actual')`,
        isNull(payments.deletedAt),
        gte(payments.paymentDate, monthStart),
        lte(payments.paymentDate, monthEnd),
      ),
    )
    .get();
  const invoicedThisMonthKopecks = invoicedThisMonthRow?.total ?? 0;

  const receivedThisYearRow = db
    .select({ total: sql<number>`coalesce(sum(${payments.amountKopecks}), 0)` })
    .from(payments)
    .where(
      and(
        eq(payments.kind, "actual"),
        isNull(payments.deletedAt),
        gte(payments.paymentDate, yearStart),
        lte(payments.paymentDate, yearEnd),
      ),
    )
    .get();
  const receivedThisYearKopecks = receivedThisYearRow?.total ?? 0;

  const billableMinutesThisMonthRow = db.get<{ total: number }>(sql`
    select coalesce(sum(minutes), 0) as total from time_entries
    where is_billable = 1 and deleted_at is null
    and work_date >= ${monthStart} and work_date <= ${monthEnd}
  `);
  const billableMinutesThisMonth = billableMinutesThisMonthRow?.total ?? 0;

  const allMinutesThisMonthRow = db.get<{ total: number }>(sql`
    select coalesce(sum(minutes), 0) as total from time_entries
    where deleted_at is null
    and work_date >= ${monthStart} and work_date <= ${monthEnd}
  `);
  const allMinutesThisMonth = allMinutesThisMonthRow?.total ?? 0;

  const activeCasesCountRow = db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(and(isNull(cases.deletedAt), eq(cases.status, "active")))
    .get();

  const upcomingPayments = db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.kind, "planned"),
        isNull(payments.deletedAt),
        gte(payments.paymentDate, todayIso),
      ),
    )
    .orderBy(payments.paymentDate)
    .limit(5)
    .all();

  const overdueStages = db
    .select({ stage: caseStages, caseRow: cases })
    .from(caseStages)
    .innerJoin(cases, eq(caseStages.caseId, cases.id))
    .where(
      and(
        isNull(caseStages.deletedAt),
        isNull(cases.deletedAt),
        lt(caseStages.dueDate, todayIso),
        sql`${caseStages.status} not in ('done', 'cancelled')`,
      ),
    )
    .all();

  const capacityMinutes = monthlyCapacityMinutes(
    settings.workingWeeksPerYear,
    settings.workingDaysPerWeek,
    billableHoursPerDay(settings),
  );
  const workload = evaluateWorkload(billableMinutesThisMonth, capacityMinutes);

  const fixedExpenses = fixedExpensesNoReserveKopecks(settings);
  const personalIncomeForecastKopecks = actualPersonalIncomeKopecks({
    receivedGrossKopecks: receivedThisMonthKopecks,
    taxPaidKopecks: taxThisMonthKopecks,
    fixedExpensesNoReserveKopecks: fixedExpenses,
    practiceReserveKopecks: settings.practiceReserveKopecks,
  });

  const benchmark = computeBenchmark({
    desiredMonthlyIncomeKopecks: settings.desiredMonthlyIncomeKopecks,
    fixedExpensesNoReserveKopecks: fixedExpenses,
    practiceReserveKopecks: settings.practiceReserveKopecks,
    taxRateBp: resolveBenchmarkTaxRateBp(settings),
    avgDiscountLossBp: settings.avgDiscountLossBp,
    workingWeeksPerYear: settings.workingWeeksPerYear,
    workingDaysPerWeek: settings.workingDaysPerWeek,
    billableHoursPerDay: billableHoursPerDay(settings),
  });

  const npdLimit = evaluateNpdLimit(receivedThisYearKopecks, settings.npdAnnualLimitKopecks);

  const allCases = listCasesWithSummary().filter((c) => !c.case.deletedAt);
  let debtTotalKopecks = 0;
  let weightedRateNumerator = 0;
  let weightedRateDenominatorMinutes = 0;
  const lowRateCases: { id: number; name: string; internalNumber: string; rate: number | null }[] = [];

  for (const { case: c, financials } of allCases) {
    if (financials.debtKopecks > 0) debtTotalKopecks += financials.debtKopecks;
    if (financials.effectiveRateKopecksPerHour !== null && financials.actualMinutesTotal) {
      weightedRateNumerator += financials.feeAfterDiscountKopecks;
      weightedRateDenominatorMinutes += financials.actualMinutesTotal;
    }
    const status = evaluateBenchmarkStatus(
      financials.effectiveRateKopecksPerHour,
      benchmark.controlRateKopecksPerHour,
    );
    if ((status === "yellow" || status === "red") && c.status === "active") {
      lowRateCases.push({
        id: c.id,
        name: c.shortName,
        internalNumber: c.internalNumber,
        rate: financials.effectiveRateKopecksPerHour,
      });
    }
  }

  const avgEffectiveRateKopecksPerHour =
    weightedRateDenominatorMinutes > 0
      ? Math.round(weightedRateNumerator / (weightedRateDenominatorMinutes / 60))
      : null;

  const goalProgressFraction =
    settings.desiredMonthlyIncomeKopecks > 0
      ? personalIncomeForecastKopecks / settings.desiredMonthlyIncomeKopecks
      : 0;

  return {
    settings,
    receivedThisMonthKopecks,
    invoicedThisMonthKopecks,
    debtTotalKopecks,
    taxThisMonthKopecks,
    fixedExpensesKopecks: fixedExpenses,
    practiceReserveKopecks: settings.practiceReserveKopecks,
    personalIncomeForecastKopecks,
    billableMinutesThisMonth,
    allMinutesThisMonth,
    capacityMinutes,
    capacityRemainingMinutes: Math.max(capacityMinutes - billableMinutesThisMonth, 0),
    workload,
    avgEffectiveRateKopecksPerHour,
    goalProgressFraction,
    npdLimit,
    activeCasesCount: activeCasesCountRow?.count ?? 0,
    upcomingPayments,
    lowRateCases: lowRateCases.slice(0, 6),
    overdueStages,
    benchmark,
  };
}
