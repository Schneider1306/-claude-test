// Расчётный движок. Чистые функции без зависимостей от экранов и хранилища.
// Деньги — целые рубли. Округления выполняются явно и предсказуемо.

import type {
  CalcInput,
  CalcResult,
  CalcWarning,
  FinanceSettings,
  Thresholds,
} from './types';

// Округление вверх до заданного шага (например, до 1000 ₽).
export function ceilTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.ceil(value / step) * step;
}

// Оплачиваемые часы в месяц.
export function billableHoursPerMonth(finance: FinanceSettings): number {
  return (
    (finance.workDaysPerWeek *
      finance.billableHoursPerDay *
      finance.workWeeksPerYear) /
    12
  );
}

// Сумма постоянных расходов и резерва за месяц.
export function monthlyExpenses(finance: FinanceSettings): number {
  return (
    finance.rent +
    finance.internet +
    finance.stationery +
    finance.aiServices +
    finance.reserve
  );
}

// Применяемая внутренняя ставка, руб/час (целое число).
export function computeInternalRate(finance: FinanceSettings): number {
  const hours = billableHoursPerMonth(finance);
  const expenses = monthlyExpenses(finance);
  const tax = finance.taxRate;
  const requiredRevenue = (finance.desiredIncome + expenses) / (1 - tax);
  const computedRate = hours > 0 ? requiredRevenue / hours : 0;
  const applied = Math.max(computedRate, finance.baseHourlyRate);
  return Math.round(applied);
}

// Основной расчёт стоимости услуг.
export function calculate(
  input: CalcInput,
  finance: FinanceSettings,
  thresholds: Thresholds
): CalcResult {
  // Каталожная стоимость работ.
  const catalogCost = input.lines.reduce(
    (sum, line) => sum + Math.round(line.unitPrice * line.quantity),
    0
  );

  // Юридические часы.
  const linesHours = input.lines.reduce(
    (sum, line) => sum + line.hoursPerUnit * line.quantity,
    0
  );
  const legalHours = linesHours + input.extraLegalHours;

  // Оплачиваемые дорожные часы.
  const billableTravelHours = input.travelHours * input.travelCoef;

  // Внутренняя ставка и стоимость времени.
  const internalRate = computeInternalRate(finance);
  const timeCost = Math.round(
    (legalHours + billableTravelHours) * internalRate
  );

  // База вознаграждения.
  const feeBase = Math.max(catalogCost, timeCost);

  // Вознаграждение до скидки.
  const feeBeforeDiscount = Math.round(
    feeBase * input.complexityCoef * input.urgencyCoef * input.installmentCoef
  );

  // Вознаграждение после скидки.
  const discount = clampDiscount(input.discountPercent) / 100;
  const feeAfterDiscount = Math.round(feeBeforeDiscount * (1 - discount));

  const directExpenses = Math.max(0, Math.round(input.directExpenses));

  // Экономический минимум = стоимость времени (прямые расходы не входят).
  const economicMinimum = timeCost;

  // Рекомендуемая цена: округление вверх до 1000 ₽.
  const recommendedPrice = ceilTo(feeBeforeDiscount + directExpenses, 1000);

  // Итоговая цена: ручная либо округлённая вверх до 1000 ₽.
  const hasManual =
    input.manualPrice !== undefined &&
    input.manualPrice !== null &&
    !Number.isNaN(input.manualPrice);
  const autoFinal = ceilTo(feeAfterDiscount + directExpenses, 1000);
  const finalPrice = hasManual ? Math.max(0, Math.round(input.manualPrice!)) : autoFinal;

  // Фактическое вознаграждение (без прямых расходов) — для проверки порогов.
  const effectiveFee = hasManual
    ? finalPrice - directExpenses
    : feeAfterDiscount;

  // Применяемый порог.
  const threshold = input.isMedical
    ? thresholds.medicalCase
    : thresholds.normalCase;

  // Предупреждения.
  const warnings: CalcWarning[] = [];
  if (effectiveFee < economicMinimum) {
    warnings.push({
      code: 'below_economic_minimum',
      message:
        'Итоговое вознаграждение ниже экономического минимума (стоимости вашего времени). Укажите причину.',
    });
  }
  if (effectiveFee < threshold) {
    warnings.push({
      code: 'below_threshold',
      message: input.isMedical
        ? 'Вознаграждение ниже порога медицинского дела. Укажите причину.'
        : 'Вознаграждение ниже порога обычного дела. Укажите причину.',
    });
  }

  return {
    catalogCost,
    legalHours: round2(legalHours),
    billableTravelHours: round2(billableTravelHours),
    internalRate,
    timeCost,
    feeBase,
    feeBeforeDiscount,
    feeAfterDiscount,
    effectiveFee,
    economicMinimum,
    recommendedPrice,
    finalPrice,
    directExpenses,
    threshold,
    isManual: hasManual,
    warnings,
  };
}

// Ограничение скидки диапазоном 0..20%.
export function clampDiscount(percent: number): number {
  if (Number.isNaN(percent)) return 0;
  return Math.min(20, Math.max(0, percent));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
