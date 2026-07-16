/**
 * Единый модуль финансовых формул экономики юридической практики.
 *
 * Соглашения:
 *  - деньги — целые копейки (integer);
 *  - время — целые минуты (integer);
 *  - ставки/проценты — целые базисные пункты, 1% = 100 б.п. (integer).
 *
 * Компоненты интерфейса не должны содержать собственных копий этих формул —
 * только вызывать функции отсюда.
 */

// ---------------------------------------------------------------------------
// Базовые преобразования
// ---------------------------------------------------------------------------

export const KOPECKS_PER_RUBLE = 100;
export const BP_DENOMINATOR = 10_000;

export function rublesToKopecks(rubles: number): number {
  return Math.round(rubles * KOPECKS_PER_RUBLE);
}

export function kopecksToRubles(kopecks: number): number {
  return kopecks / KOPECKS_PER_RUBLE;
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function bpToFraction(bp: number): number {
  return bp / BP_DENOMINATOR;
}

/** amount * (bp / 10000), округлено до целой копейки */
export function applyBp(amountKopecks: number, bp: number): number {
  return Math.round((amountKopecks * bp) / BP_DENOMINATOR);
}

/** Округление копеек вверх до ближайшего кратного шага (в копейках). */
export function ceilToNearest(kopecks: number, stepKopecks: number): number {
  return Math.ceil(kopecks / stepKopecks) * stepKopecks;
}

// ---------------------------------------------------------------------------
// Форматирование (RU)
// ---------------------------------------------------------------------------

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(kopecks: number | null | undefined): string {
  if (kopecks === null || kopecks === undefined || Number.isNaN(kopecks)) {
    return "—";
  }
  const rubles = kopecksToRubles(kopecks);
  return `${moneyFormatter.format(rubles)} ₽`;
}

export function formatMoneySigned(kopecks: number): string {
  const sign = kopecks > 0 ? "+" : "";
  return `${sign}${formatMoney(kopecks)}`;
}

const hoursFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatHours(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }
  return `${hoursFormatter.format(minutesToHours(minutes))} ч`;
}

export function formatPercent(bp: number): string {
  return `${hoursFormatter.format(bpToFraction(bp) * 100)}%`;
}

export function formatDateRu(dateIso: string | null | undefined): string {
  if (!dateIso) return "—";
  const d = new Date(dateIso.length <= 10 ? `${dateIso}T00:00:00` : dateIso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Этапы дела (строки начисления)
// ---------------------------------------------------------------------------

export interface StageLineInput {
  agreedPriceKopecks: number; // цена за единицу
  quantity: number;
  plannedMinutes: number; // плановое время за единицу
  discountBp: number;
  isUrgent: boolean;
  urgencySurchargeBp: number;
  /** Этап исключён из начисления (отменён) */
  isCancelled?: boolean;
}

/** Итоговая стоимость строки этапа (цена × количество) без скидок/надбавок. */
export function stageLineTotalKopecks(stage: StageLineInput): number {
  if (stage.isCancelled) return 0;
  return stage.agreedPriceKopecks * stage.quantity;
}

/** Итоговое плановое время строки этапа (время × количество). */
export function stageLinePlannedMinutes(stage: StageLineInput): number {
  if (stage.isCancelled) return 0;
  return stage.plannedMinutes * stage.quantity;
}

/** Сумма скидки по этапу (применяется к строке этапа). */
export function stageDiscountKopecks(stage: StageLineInput): number {
  return applyBp(stageLineTotalKopecks(stage), stage.discountBp);
}

/**
 * Срочная надбавка по этапу.
 * Применяется только если этап помечен как срочный (24 часа),
 * и только к стоимости этого этапа, а не всего дела.
 */
export function stageUrgencySurchargeKopecks(stage: StageLineInput): number {
  if (!stage.isUrgent) return 0;
  return applyBp(stageLineTotalKopecks(stage), stage.urgencySurchargeBp);
}

/**
 * Количество дополнительных заседаний сверх включённых в этап/дело.
 * дополнительные = max(факт − включено, 0)
 */
export function additionalMeetingsCount(
  actualMeetingsCount: number,
  includedMeetingsCount: number,
): number {
  return Math.max(actualMeetingsCount - includedMeetingsCount, 0);
}

// ---------------------------------------------------------------------------
// Финансы дела целиком
// ---------------------------------------------------------------------------

export interface CaseFinancialsInput {
  stages: StageLineInput[];
  /** Внешние расходы, подлежащие возмещению клиентом (в копейках). */
  reimbursableExpensesKopecks: number;
  /** Сумма фактически отработанных минут по делу (из учёта времени). Null, если записей ещё нет. */
  actualMinutes: number | null;
  /** Сумма фактически полученных оплат (kind=actual) в копейках. */
  actualPaymentsReceivedKopecks: number;
  /** Сумма возвратов (kind=refund) в копейках, положительное число. */
  refundsKopecks: number;
  /** Сумма полученных возмещений внешних расходов (kind=expense_reimbursement). */
  expenseReimbursementsReceivedKopecks: number;
}

export interface CaseFinancials {
  /** Профессиональное вознаграждение — сумма цен всех этапов с учётом количества. */
  feeGrossKopecks: number;
  discountTotalKopecks: number;
  urgencySurchargeTotalKopecks: number;
  /** Вознаграждение после скидки (без срочной надбавки и без внешних расходов). */
  feeAfterDiscountKopecks: number;
  /** Итог клиенту = вознаграждение + срочная надбавка − скидка + возмещаемые расходы. */
  totalToClientKopecks: number;
  reimbursableExpensesKopecks: number;
  plannedMinutesTotal: number;
  actualMinutesTotal: number | null;
  /** Эффективная ставка в копейках/час. Null, если совсем нет данных (0 плановых и 0 фактических часов). */
  effectiveRateKopecksPerHour: number | null;
  /** true — ставка рассчитана по плановым часам (фактических ещё нет). */
  effectiveRateIsPlanned: boolean;
  /** Сумма фактически поступивших денег, засчитываемых в счёт долга (оплаты + возмещения − возвраты). */
  receivedKopecks: number;
  /** Задолженность клиента = согласованные начисления − полученные оплаты. */
  debtKopecks: number;
}

export function computeCaseFinancials(
  input: CaseFinancialsInput,
): CaseFinancials {
  const activeStages = input.stages.filter((s) => !s.isCancelled);

  const feeGrossKopecks = activeStages.reduce(
    (sum, s) => sum + stageLineTotalKopecks(s),
    0,
  );
  const discountTotalKopecks = activeStages.reduce(
    (sum, s) => sum + stageDiscountKopecks(s),
    0,
  );
  const urgencySurchargeTotalKopecks = activeStages.reduce(
    (sum, s) => sum + stageUrgencySurchargeKopecks(s),
    0,
  );
  const feeAfterDiscountKopecks = feeGrossKopecks - discountTotalKopecks;

  const totalToClientKopecks =
    feeGrossKopecks +
    urgencySurchargeTotalKopecks -
    discountTotalKopecks +
    input.reimbursableExpensesKopecks;

  const plannedMinutesTotal = activeStages.reduce(
    (sum, s) => sum + stageLinePlannedMinutes(s),
    0,
  );

  const actualMinutesTotal = input.actualMinutes;

  let effectiveRateKopecksPerHour: number | null = null;
  let effectiveRateIsPlanned = false;

  if (actualMinutesTotal !== null && actualMinutesTotal > 0) {
    effectiveRateKopecksPerHour = Math.round(
      feeAfterDiscountKopecks / minutesToHours(actualMinutesTotal),
    );
  } else if (plannedMinutesTotal > 0) {
    effectiveRateKopecksPerHour = Math.round(
      feeAfterDiscountKopecks / minutesToHours(plannedMinutesTotal),
    );
    effectiveRateIsPlanned = true;
  }

  const receivedKopecks =
    input.actualPaymentsReceivedKopecks +
    input.expenseReimbursementsReceivedKopecks -
    input.refundsKopecks;

  const debtKopecks = totalToClientKopecks - receivedKopecks;

  return {
    feeGrossKopecks,
    discountTotalKopecks,
    urgencySurchargeTotalKopecks,
    feeAfterDiscountKopecks,
    totalToClientKopecks,
    reimbursableExpensesKopecks: input.reimbursableExpensesKopecks,
    plannedMinutesTotal,
    actualMinutesTotal,
    effectiveRateKopecksPerHour,
    effectiveRateIsPlanned,
    receivedKopecks,
    debtKopecks,
  };
}

// ---------------------------------------------------------------------------
// Налоги
// ---------------------------------------------------------------------------

export type TaxRegime = "npd" | "usn" | "custom";
export type PayerType = "individual" | "organization";

export interface TaxSettingsInput {
  taxRegime: TaxRegime;
  npdIndividualRateBp: number;
  npdOrgRateBp: number;
  usnRateBp: number;
  customTaxRateBp: number;
}

/** Определяет ставку налога (в б.п.) для конкретного платежа с учётом режима и типа плательщика. */
export function resolveTaxRateBp(
  settings: TaxSettingsInput,
  payerType: PayerType,
): number {
  switch (settings.taxRegime) {
    case "npd":
      return payerType === "individual"
        ? settings.npdIndividualRateBp
        : settings.npdOrgRateBp;
    case "usn":
      return settings.usnRateBp;
    case "custom":
      return settings.customTaxRateBp;
  }
}

/**
 * Единая налоговая ставка для практико-ориентированных расчётов, не привязанных
 * к конкретному платежу (контрольная ставка, прогноз личного дохода на Главной).
 * Для НПД используется ставка "от организации/ИП" как консервативный ориентир
 * (не зависит от фактического состава плательщиков по будущим делам).
 */
export function resolveBenchmarkTaxRateBp(settings: TaxSettingsInput): number {
  switch (settings.taxRegime) {
    case "npd":
      return settings.npdOrgRateBp;
    case "usn":
      return settings.usnRateBp;
    case "custom":
      return settings.customTaxRateBp;
  }
}

/** Считает налог с фактического платежа. Ставка фиксируется как исторический снимок. */
export function calculatePaymentTax(
  amountKopecks: number,
  rateBp: number,
): number {
  return applyBp(amountKopecks, rateBp);
}

export interface NpdLimitStatus {
  receivedThisYearKopecks: number;
  limitKopecks: number;
  usedFraction: number; // 0..1+
  level: "ok" | "warning70" | "warning85" | "exceeded";
}

export function evaluateNpdLimit(
  receivedThisYearKopecks: number,
  limitKopecks: number,
): NpdLimitStatus {
  const usedFraction =
    limitKopecks > 0 ? receivedThisYearKopecks / limitKopecks : 0;
  let level: NpdLimitStatus["level"] = "ok";
  if (usedFraction >= 1) level = "exceeded";
  else if (usedFraction >= 0.85) level = "warning85";
  else if (usedFraction >= 0.7) level = "warning70";
  return { receivedThisYearKopecks, limitKopecks, usedFraction, level };
}

// ---------------------------------------------------------------------------
// Экономическая контрольная ставка
// ---------------------------------------------------------------------------

export interface BenchmarkInput {
  desiredMonthlyIncomeKopecks: number;
  fixedExpensesNoReserveKopecks: number; // аренда+интернет+канцелярия+ИИ
  practiceReserveKopecks: number;
  taxRateBp: number;
  avgDiscountLossBp: number;
  workingWeeksPerYear: number;
  workingDaysPerWeek: number;
  billableHoursPerDay: number; // может быть дробным, напр. 4
}

export interface BenchmarkResult {
  requiredPriceRevenueKopecks: number;
  monthlyCapacityMinutes: number;
  controlRateKopecksPerHour: number;
}

/** Месячная оплачиваемая ёмкость в минутах: недели×дни×часы×60/12 */
export function monthlyCapacityMinutes(
  workingWeeksPerYear: number,
  workingDaysPerWeek: number,
  billableHoursPerDay: number,
): number {
  return (
    (workingWeeksPerYear * workingDaysPerWeek * billableHoursPerDay * 60) / 12
  );
}

export function computeBenchmark(input: BenchmarkInput): BenchmarkResult {
  const taxFraction = bpToFraction(input.taxRateBp);
  const lossFraction = bpToFraction(input.avgDiscountLossBp);
  const base =
    input.desiredMonthlyIncomeKopecks +
    input.fixedExpensesNoReserveKopecks +
    input.practiceReserveKopecks;
  const requiredPriceRevenueKopecks = Math.round(
    base / ((1 - taxFraction) * (1 - lossFraction)),
  );

  const capacityMinutes = monthlyCapacityMinutes(
    input.workingWeeksPerYear,
    input.workingDaysPerWeek,
    input.billableHoursPerDay,
  );
  const capacityHours = minutesToHours(capacityMinutes);
  const rawRateKopecks = requiredPriceRevenueKopecks / capacityHours;
  // округление вверх до ближайших 100 ₽ = 10 000 копеек
  const controlRateKopecksPerHour = ceilToNearest(rawRateKopecks, 10_000);

  return {
    requiredPriceRevenueKopecks,
    monthlyCapacityMinutes: capacityMinutes,
    controlRateKopecksPerHour,
  };
}

export type BenchmarkStatus = "green" | "yellow" | "red";

/**
 * Статус ставки дела относительно контрольной:
 * зелёный — на уровне контрольной или выше;
 * жёлтый — ниже не более чем на 15%;
 * красный — ниже более чем на 15%.
 */
export function evaluateBenchmarkStatus(
  effectiveRateKopecksPerHour: number | null,
  controlRateKopecksPerHour: number,
): BenchmarkStatus {
  if (effectiveRateKopecksPerHour === null) return "red";
  if (effectiveRateKopecksPerHour >= controlRateKopecksPerHour) return "green";
  const threshold85 = controlRateKopecksPerHour * 0.85;
  if (effectiveRateKopecksPerHour >= threshold85) return "yellow";
  return "red";
}

// ---------------------------------------------------------------------------
// Прогноз личного дохода
// ---------------------------------------------------------------------------

/**
 * Прогнозный личный доход (используется в конструкторе сценариев,
 * где выручка — это ПРАЙСОВАЯ (не согласованная по факту) оценка,
 * поэтому учитываются средние потери от скидок отдельно от налога.
 *
 * личный доход = выручка × (1 − потери от скидок) × (1 − налог) − постоянные расходы − резерв
 */
export function forecastPersonalIncomeKopecks(params: {
  priceRevenueKopecks: number;
  avgDiscountLossBp: number;
  taxRateBp: number;
  fixedExpensesNoReserveKopecks: number;
  practiceReserveKopecks: number;
}): number {
  const lossFraction = bpToFraction(params.avgDiscountLossBp);
  const taxFraction = bpToFraction(params.taxRateBp);
  const netRevenue = Math.round(
    params.priceRevenueKopecks * (1 - lossFraction) * (1 - taxFraction),
  );
  return (
    netRevenue -
    params.fixedExpensesNoReserveKopecks -
    params.practiceReserveKopecks
  );
}

/**
 * Фактический личный доход за период на основе РЕАЛЬНО полученных оплат.
 * Скидки здесь уже отражены в согласованных ценах — повторно не вычитаются,
 * только налог (уже посчитан и сохранён по каждому платежу) и постоянные расходы.
 *
 * личный доход = сумма(получено) − сумма(налог по платежам) − постоянные расходы − резерв
 */
export function actualPersonalIncomeKopecks(params: {
  receivedGrossKopecks: number;
  taxPaidKopecks: number;
  fixedExpensesNoReserveKopecks: number;
  practiceReserveKopecks: number;
}): number {
  return (
    params.receivedGrossKopecks -
    params.taxPaidKopecks -
    params.fixedExpensesNoReserveKopecks -
    params.practiceReserveKopecks
  );
}

// ---------------------------------------------------------------------------
// Загрузка / перегрузка
// ---------------------------------------------------------------------------

export interface WorkloadStatus {
  plannedMinutes: number;
  capacityMinutes: number;
  usedFraction: number;
  isOverloaded: boolean;
}

export function evaluateWorkload(
  plannedMinutes: number,
  capacityMinutes: number,
): WorkloadStatus {
  const usedFraction =
    capacityMinutes > 0 ? plannedMinutes / capacityMinutes : 0;
  return {
    plannedMinutes,
    capacityMinutes,
    usedFraction,
    isOverloaded: usedFraction > 1,
  };
}

// ---------------------------------------------------------------------------
// Скидка/срочность — ограничения
// ---------------------------------------------------------------------------

export function clampDiscountBp(discountBp: number, maxDiscountBp: number): number {
  return Math.min(Math.max(discountBp, 0), maxDiscountBp);
}
