/**
 * Единый расчётный модуль.
 *
 * Единицы измерения:
 *  - деньги -> целые копейки (integer kopecks)
 *  - время -> целые минуты (integer minutes)
 *  - проценты/коэффициенты -> целые базисные пункты (bps), 10000 bps = 100%
 *
 * Все формулы приложения обязаны проходить через эти функции — компоненты
 * и server actions не должны пересчитывать деньги самостоятельно.
 */

export type RateStatus = "green" | "yellow" | "red" | "no-data";

export interface PricingSettings {
  desiredMonthlyIncomeKopecks: number;
  rentKopecks: number;
  internetKopecks: number;
  stationeryKopecks: number;
  aiAssistantsKopecks: number;
  practiceReserveKopecks: number;
  workWeeksPerYear: number;
  workDaysPerWeek: number;
  billableMinutesPerDay: number;
  lossRateBps: number;
  taxRateBps: number;
  targetRateRoundingKopecks: number;
  travelMinutesCountedRatioBps: number;
}

export const DEFAULT_SETTINGS: PricingSettings = {
  desiredMonthlyIncomeKopecks: 450_000_00,
  rentKopecks: 22_250_00,
  internetKopecks: 3_000_00,
  stationeryKopecks: 500_00,
  aiAssistantsKopecks: 20_000_00,
  practiceReserveKopecks: 30_000_00,
  workWeeksPerYear: 43,
  workDaysPerWeek: 5,
  billableMinutesPerDay: 240,
  lossRateBps: 400,
  taxRateBps: 600,
  targetRateRoundingKopecks: 100_00,
  travelMinutesCountedRatioBps: 10000,
};

export const BPS_DENOMINATOR = 10_000;

export function bpsToFraction(bps: number): number {
  return bps / BPS_DENOMINATOR;
}

export function kopecksToRubles(kopecks: number): number {
  return kopecks / 100;
}

export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * 100);
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/** Постоянные расходы практики (без резерва). */
export function computeFixedCostsKopecks(settings: PricingSettings): number {
  return (
    settings.rentKopecks +
    settings.internetKopecks +
    settings.stationeryKopecks +
    settings.aiAssistantsKopecks
  );
}

/** Месячная оплачиваемая ёмкость в минутах. */
export function computeMonthlyBillableCapacityMinutes(
  settings: PricingSettings,
): number {
  return (
    (settings.workWeeksPerYear *
      settings.workDaysPerWeek *
      settings.billableMinutesPerDay) /
    12
  );
}

export function computeMonthlyBillableCapacityHours(
  settings: PricingSettings,
): number {
  return minutesToHours(computeMonthlyBillableCapacityMinutes(settings));
}

/**
 * Требуемая прайсовая выручка в копейках (дробная — до округления).
 * (доход + постоянные расходы + резерв) / ((1 − налог) × (1 − потери))
 */
export function computeRequiredPriceRevenueKopecks(
  settings: PricingSettings,
): number {
  const numerator =
    settings.desiredMonthlyIncomeKopecks +
    computeFixedCostsKopecks(settings) +
    settings.practiceReserveKopecks;
  const taxFactor = 1 - bpsToFraction(settings.taxRateBps);
  const lossFactor = 1 - bpsToFraction(settings.lossRateBps);
  const denominator = taxFactor * lossFactor;
  if (denominator <= 0) {
    throw new Error("Некорректные настройки: налог и потери дают нулевой знаменатель");
  }
  return numerator / denominator;
}

/**
 * Целевая ставка в копейках/час, округлённая вверх до
 * settings.targetRateRoundingKopecks (по умолчанию 100 ₽ = 10000 коп).
 */
export function computeTargetRateKopecks(settings: PricingSettings): number {
  const requiredRevenue = computeRequiredPriceRevenueKopecks(settings);
  const capacityHours = computeMonthlyBillableCapacityHours(settings);
  if (capacityHours <= 0) {
    throw new Error("Некорректные настройки: нулевая оплачиваемая ёмкость");
  }
  const rawRate = requiredRevenue / capacityHours;
  const rounding = settings.targetRateRoundingKopecks || 1;
  return Math.ceil(rawRate / rounding) * rounding;
}

// ---------------------------------------------------------------------------
// Строки расчёта (этапы/услуги)
// ---------------------------------------------------------------------------

export interface CalculationLineCoefficients {
  complexityBps: number;
  urgencyBps: number;
  responsibilityBps: number;
}

export interface CalculationLineInput extends CalculationLineCoefficients {
  basePriceKopecks: number;
  quantity: number;
  plannedMinutesPerUnit: number;
}

export function computeLineBaseAmountKopecks(
  line: CalculationLineInput,
): number {
  return line.basePriceKopecks * line.quantity;
}

/**
 * надбавка = базовая цена × количество × (сложность + срочность + ответственность)
 * Коэффициенты складываются, а не перемножаются.
 */
export function computeLineSurchargeKopecks(
  line: CalculationLineInput,
): number {
  const totalBps =
    line.complexityBps + line.urgencyBps + line.responsibilityBps;
  const amount =
    line.basePriceKopecks * line.quantity * bpsToFraction(totalBps);
  return Math.round(amount);
}

export function computeLineTotalKopecks(line: CalculationLineInput): number {
  return computeLineBaseAmountKopecks(line) + computeLineSurchargeKopecks(line);
}

export function computeLinePlannedMinutes(line: CalculationLineInput): number {
  return line.plannedMinutesPerUnit * line.quantity;
}

// ---------------------------------------------------------------------------
// Внешние расходы
// ---------------------------------------------------------------------------

export interface ExpenseInput {
  amountKopecks: number;
}

export function computeExpensesTotalKopecks(expenses: ExpenseInput[]): number {
  return expenses.reduce((sum, e) => sum + e.amountKopecks, 0);
}

// ---------------------------------------------------------------------------
// Итоговый расчёт
// ---------------------------------------------------------------------------

export interface CalculationTotalsInput {
  lines: CalculationLineInput[];
  expenses: ExpenseInput[];
  discountBps: number;
  travelMinutes: number;
  targetRateKopecks: number;
}

export interface CalculationTotals {
  baseAmountKopecks: number;
  surchargeKopecks: number;
  professionalBeforeDiscountKopecks: number;
  discountAmountKopecks: number;
  professionalAfterDiscountKopecks: number;
  externalExpensesKopecks: number;
  clientTotalKopecks: number;
  plannedMinutes: number;
  plannedHours: number;
  economicMinimumKopecks: number | null;
  effectiveRateKopecks: number | null;
  targetRateKopecks: number;
  deviationFromTargetBps: number | null;
  status: RateStatus;
  belowEconomicMinimumKopecks: number | null;
}

export function computeCalculationTotals(
  input: CalculationTotalsInput,
): CalculationTotals {
  const baseAmountKopecks = input.lines.reduce(
    (sum, l) => sum + computeLineBaseAmountKopecks(l),
    0,
  );
  const surchargeKopecks = input.lines.reduce(
    (sum, l) => sum + computeLineSurchargeKopecks(l),
    0,
  );
  const professionalBeforeDiscountKopecks = baseAmountKopecks + surchargeKopecks;
  const discountAmountKopecks = Math.round(
    professionalBeforeDiscountKopecks * bpsToFraction(input.discountBps),
  );
  const professionalAfterDiscountKopecks =
    professionalBeforeDiscountKopecks - discountAmountKopecks;
  const externalExpensesKopecks = computeExpensesTotalKopecks(input.expenses);
  const clientTotalKopecks =
    professionalAfterDiscountKopecks + externalExpensesKopecks;

  const linesMinutes = input.lines.reduce(
    (sum, l) => sum + computeLinePlannedMinutes(l),
    0,
  );
  const plannedMinutes = linesMinutes + input.travelMinutes;
  const plannedHours = minutesToHours(plannedMinutes);

  const hasHours = plannedMinutes > 0;
  const economicMinimumKopecks = hasHours
    ? Math.round((plannedMinutes * input.targetRateKopecks) / 60)
    : null;
  const effectiveRateKopecks = hasHours
    ? professionalAfterDiscountKopecks / plannedHours
    : null;
  const deviationFromTargetBps =
    effectiveRateKopecks !== null && input.targetRateKopecks > 0
      ? Math.round(
          ((effectiveRateKopecks - input.targetRateKopecks) /
            input.targetRateKopecks) *
            BPS_DENOMINATOR,
        )
      : null;

  const status = computeRateStatus(effectiveRateKopecks, input.targetRateKopecks);

  const belowEconomicMinimumKopecks =
    economicMinimumKopecks !== null &&
    professionalAfterDiscountKopecks < economicMinimumKopecks
      ? economicMinimumKopecks - professionalAfterDiscountKopecks
      : null;

  return {
    baseAmountKopecks,
    surchargeKopecks,
    professionalBeforeDiscountKopecks,
    discountAmountKopecks,
    professionalAfterDiscountKopecks,
    externalExpensesKopecks,
    clientTotalKopecks,
    plannedMinutes,
    plannedHours,
    economicMinimumKopecks,
    effectiveRateKopecks,
    targetRateKopecks: input.targetRateKopecks,
    deviationFromTargetBps,
    status,
    belowEconomicMinimumKopecks,
  };
}

/**
 * Зелёный — ставка >= целевой. Жёлтый — ниже не более чем на 15%.
 * Красный — ниже более чем на 15%. Нет данных — часы равны нулю.
 */
export function computeRateStatus(
  effectiveRateKopecks: number | null,
  targetRateKopecks: number,
): RateStatus {
  if (effectiveRateKopecks === null) return "no-data";
  if (effectiveRateKopecks >= targetRateKopecks) return "green";
  const yellowFloor = targetRateKopecks * 0.85;
  if (effectiveRateKopecks >= yellowFloor) return "yellow";
  return "red";
}

// ---------------------------------------------------------------------------
// Дополнительные заседания (для мастера)
// ---------------------------------------------------------------------------

/** дополнительные заседания = max(общее количество заседаний − включённое количество, 0) */
export function computeAdditionalHearings(
  totalHearings: number,
  includedHearings: number,
): number {
  return Math.max(totalHearings - includedHearings, 0);
}

// ---------------------------------------------------------------------------
// Факт (после завершения работы)
// ---------------------------------------------------------------------------

export interface ActualResult {
  actualPriceKopecks: number;
  actualMinutes: number;
}

export interface ActualComparison {
  actualRateKopecks: number | null;
  timeOverrunMinutes: number;
  timeOverrunBps: number | null;
  priceDeviationKopecks: number;
  priceDeviationBps: number | null;
}

export function computeActualComparison(
  actual: ActualResult,
  plannedMinutes: number,
  plannedPriceKopecks: number,
): ActualComparison {
  const actualRateKopecks =
    actual.actualMinutes > 0
      ? actual.actualPriceKopecks / minutesToHours(actual.actualMinutes)
      : null;
  const timeOverrunMinutes = actual.actualMinutes - plannedMinutes;
  const timeOverrunBps =
    plannedMinutes > 0
      ? Math.round((timeOverrunMinutes / plannedMinutes) * BPS_DENOMINATOR)
      : null;
  const priceDeviationKopecks = actual.actualPriceKopecks - plannedPriceKopecks;
  const priceDeviationBps =
    plannedPriceKopecks > 0
      ? Math.round((priceDeviationKopecks / plannedPriceKopecks) * BPS_DENOMINATOR)
      : null;
  return {
    actualRateKopecks,
    timeOverrunMinutes,
    timeOverrunBps,
    priceDeviationKopecks,
    priceDeviationBps,
  };
}

// ---------------------------------------------------------------------------
// Коэффициенты — справочные значения по умолчанию (редактируемы в настройках)
// ---------------------------------------------------------------------------

export const DEFAULT_COMPLEXITY_OPTIONS = [
  { code: "standard", label: "Стандартная", bps: 0 },
  { code: "elevated", label: "Повышенная", bps: 1500 },
  { code: "high", label: "Высокая", bps: 3500 },
  { code: "exceptional", label: "Исключительная", bps: 6000 },
] as const;

export const DEFAULT_URGENCY_OPTIONS = [
  { code: "normal", label: "Обычный срок", bps: 0 },
  { code: "3-5-days", label: "3–5 дней", bps: 1500 },
  { code: "24-hours", label: "В течение 24 часов", bps: 3000 },
  { code: "same-day", label: "В тот же день", bps: 5000 },
] as const;

export const DEFAULT_RESPONSIBILITY_OPTIONS = [
  { code: "standard", label: "Стандартные", bps: 0 },
  { code: "elevated", label: "Повышенные", bps: 1500 },
  { code: "high", label: "Высокие", bps: 3000 },
] as const;

export const DEFAULT_DISCOUNT_OPTIONS_BPS = [0, 1000, 2000] as const;
export const DISCOUNT_REASON_REQUIRED_THRESHOLD_BPS = 2000;

export const CLIENT_PROPOSAL_DISCLAIMER =
  "Указанная стоимость относится к перечисленному объёму работ. Дополнительные заседания, экспертиза, апелляция и новый существенный процессуальный объём согласовываются и оплачиваются отдельно до начала соответствующего этапа. Если дополнительный этап не возникает, клиент его не оплачивает.";
