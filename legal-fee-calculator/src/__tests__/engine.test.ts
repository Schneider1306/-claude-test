import { describe, expect, test } from '@jest/globals';

import { calculate, ceilTo, computeInternalRate } from '@/domain/engine';
import type { CalcInput, CalcLine, FinanceSettings, Thresholds } from '@/domain/types';
import { createDefaultSettings } from '@/constants/defaults';
import { validateBackup, buildBackup, mergeData } from '@/storage/backup';
import type { AppData } from '@/storage/repository';

const settings = createDefaultSettings();
const finance: FinanceSettings = settings.finance; // baseHourlyRate 8200 доминирует -> ставка 8200
const thresholds: Thresholds = settings.thresholds; // normal 80000, medical 120000

function line(partial: Partial<CalcLine>): CalcLine {
  return {
    id: 'l1',
    title: 'Работа',
    quantity: 1,
    unit: 'ед',
    unitPrice: 0,
    hoursPerUnit: 0,
    ...partial,
  };
}

function input(partial: Partial<CalcInput>): CalcInput {
  return {
    lines: [],
    extraLegalHours: 0,
    travelHours: 0,
    travelCoef: 0,
    directExpenses: 0,
    complexityCoef: 1,
    urgencyCoef: 1,
    installmentCoef: 1,
    discountPercent: 0,
    isMedical: false,
    manualPrice: null,
    ...partial,
  };
}

const civilLine = line({ title: 'Гражданское дело', unitPrice: 90000, hoursPerUnit: 12, quantity: 1 });
const medicalLine = line({ title: 'Медицинское дело', unitPrice: 135000, hoursPerUnit: 16, quantity: 1 });
const consultLine = line({ title: 'Консультация', unitPrice: 9000, hoursPerUnit: 1.5, quantity: 1 });

describe('внутренняя ставка', () => {
  test('базовая ставка доминирует при настройках по умолчанию', () => {
    expect(computeInternalRate(finance)).toBe(8200);
  });

  // Случай 9: налог 4% и 6%
  test('налог 4% и 6% дают разные ставки, когда расчётная ставка выше базовой', () => {
    const lowBase: FinanceSettings = { ...finance, baseHourlyRate: 1000 };
    const rate4 = computeInternalRate({ ...lowBase, taxRate: 0.04 });
    const rate6 = computeInternalRate({ ...lowBase, taxRate: 0.06 });
    expect(rate4).toBe(7642);
    expect(rate6).toBe(7804);
    expect(rate6).toBeGreaterThan(rate4);
  });
});

describe('округление вверх до 1000', () => {
  // Случай 10
  test('ceilTo округляет вверх до 1000', () => {
    expect(ceilTo(98400, 1000)).toBe(99000);
    expect(ceilTo(99000, 1000)).toBe(99000);
    expect(ceilTo(99001, 1000)).toBe(100000);
    expect(ceilTo(0, 1000)).toBe(0);
  });
});

describe('расчёт стоимости', () => {
  // Случай 1: обычный расчёт без коэффициентов и расходов
  test('обычный расчёт без коэффициентов и расходов', () => {
    const r = calculate(input({ lines: [civilLine] }), finance, thresholds);
    expect(r.catalogCost).toBe(90000);
    expect(r.legalHours).toBe(12);
    expect(r.internalRate).toBe(8200);
    expect(r.timeCost).toBe(98400);
    expect(r.feeBase).toBe(98400);
    expect(r.feeBeforeDiscount).toBe(98400);
    expect(r.feeAfterDiscount).toBe(98400);
    expect(r.economicMinimum).toBe(98400);
    expect(r.recommendedPrice).toBe(99000);
    expect(r.finalPrice).toBe(99000);
    expect(r.warnings).toHaveLength(0);
  });

  // Случай 2: срочный сложный медицинский кейс
  test('срочный сложный медицинский кейс', () => {
    const r = calculate(
      input({
        lines: [medicalLine],
        complexityCoef: 1.2,
        urgencyCoef: 1.3,
        isMedical: true,
      }),
      finance,
      thresholds
    );
    expect(r.catalogCost).toBe(135000);
    expect(r.timeCost).toBe(131200);
    expect(r.feeBase).toBe(135000);
    expect(r.feeBeforeDiscount).toBe(210600); // 135000 * 1.2 * 1.3
    expect(r.finalPrice).toBe(211000);
    expect(r.warnings).toHaveLength(0);
  });

  // Случай 3: скидка 20%
  test('скидка 20% уменьшает вознаграждение', () => {
    const r = calculate(input({ lines: [civilLine], discountPercent: 20 }), finance, thresholds);
    expect(r.feeBeforeDiscount).toBe(98400);
    expect(r.feeAfterDiscount).toBe(78720); // 98400 * 0.8
    expect(r.recommendedPrice).toBe(99000);
    expect(r.finalPrice).toBe(79000);
    // 78720 ниже минимума (98400) и ниже порога (80000)
    const codes = r.warnings.map((w) => w.code);
    expect(codes).toContain('below_economic_minimum');
    expect(codes).toContain('below_threshold');
  });

  // Случай 4: прямые расходы не уменьшаются скидкой
  test('прямые расходы не уменьшаются скидкой', () => {
    const withExpenses = calculate(
      input({ lines: [civilLine], discountPercent: 20, directExpenses: 10000 }),
      finance,
      thresholds
    );
    const withoutExpenses = calculate(
      input({ lines: [civilLine], discountPercent: 20 }),
      finance,
      thresholds
    );
    // Разница ровно на сумму расходов -> расходы добавлены полностью, без скидки
    expect(withExpenses.finalPrice).toBe(89000);
    expect(withoutExpenses.finalPrice).toBe(79000);
    expect(withExpenses.finalPrice - withoutExpenses.finalPrice).toBe(10000);
    expect(withExpenses.feeAfterDiscount).toBe(withoutExpenses.feeAfterDiscount);
  });

  // Случай 5: дорожное время по коэффициентам 0%, 50%, 100%
  test('дорожное время по коэффициентам 0/50/100', () => {
    const base = { lines: [civilLine], travelHours: 4 };
    const r0 = calculate(input({ ...base, travelCoef: 0 }), finance, thresholds);
    const r50 = calculate(input({ ...base, travelCoef: 0.5 }), finance, thresholds);
    const r100 = calculate(input({ ...base, travelCoef: 1 }), finance, thresholds);
    expect(r0.billableTravelHours).toBe(0);
    expect(r0.timeCost).toBe(98400); // 12 ч
    expect(r50.billableTravelHours).toBe(2);
    expect(r50.timeCost).toBe(114800); // 14 ч
    expect(r100.billableTravelHours).toBe(4);
    expect(r100.timeCost).toBe(131200); // 16 ч
  });

  // Случай 6: предупреждение ниже экономического минимума
  test('предупреждение ниже экономического минимума', () => {
    // ручная цена 90000: ниже минимума 98400, но выше порога 80000
    const r = calculate(input({ lines: [civilLine], manualPrice: 90000 }), finance, thresholds);
    const codes = r.warnings.map((w) => w.code);
    expect(r.economicMinimum).toBe(98400);
    expect(codes).toContain('below_economic_minimum');
    expect(codes).not.toContain('below_threshold');
  });

  // Случай 7: предупреждение ниже порога обычного дела
  test('предупреждение ниже порога обычного дела', () => {
    // консультация: вознаграждение 12300 < 80000 (порог), но не ниже минимума
    const r = calculate(input({ lines: [consultLine] }), finance, thresholds);
    const codes = r.warnings.map((w) => w.code);
    expect(codes).toContain('below_threshold');
    expect(codes).not.toContain('below_economic_minimum');
  });

  // Случай 8: предупреждение ниже порога медицинского дела
  test('предупреждение ниже порога медицинского дела', () => {
    // ручная цена 100000 < 120000 (медицинский порог), выше минимума
    const r = calculate(
      input({ lines: [consultLine], isMedical: true, manualPrice: 100000 }),
      finance,
      thresholds
    );
    const codes = r.warnings.map((w) => w.code);
    expect(r.threshold).toBe(120000);
    expect(codes).toContain('below_threshold');
    expect(codes).not.toContain('below_economic_minimum');
  });

  // Случай 11: сохранённый старый расчёт не меняется после изменения каталога
  test('снимок расчёта не меняется после изменения каталога', () => {
    const savedInput = input({ lines: [{ ...civilLine }] });
    const before = calculate(savedInput, finance, thresholds);

    // «Меняем каталог» — но сохранённый input содержит собственный снимок цен
    const mutatedCatalog = createDefaultSettings();
    mutatedCatalog.catalog[1].price = 999999;

    const after = calculate(savedInput, finance, thresholds);
    expect(after).toEqual(before);
    expect(after.catalogCost).toBe(90000);
  });
});

describe('резервное копирование', () => {
  const appData: AppData = {
    settings,
    clients: [
      { id: 'c1', type: 'individual', name: 'Иванов', archived: false, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    cases: [],
    calculations: [],
    payments: [],
  };

  // Случай 12: импорт некорректной резервной копии не уничтожает данные
  test('некорректные копии отклоняются валидацией', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup(undefined).ok).toBe(false);
    expect(validateBackup(42).ok).toBe(false);
    expect(validateBackup({}).ok).toBe(false);
    expect(validateBackup({ appId: 'other', schemaVersion: 1 }).ok).toBe(false);
    expect(
      validateBackup({ appId: 'legal-fee-calculator', schemaVersion: 999, settings: {}, clients: [], cases: [], calculations: [], payments: [] }).ok
    ).toBe(false);
    expect(
      validateBackup({ appId: 'legal-fee-calculator', schemaVersion: 1, settings: {} }).ok
    ).toBe(false);
  });

  test('корректная копия проходит валидацию и даёт сводку', () => {
    const backup = buildBackup(appData);
    const result = validateBackup(backup as unknown);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.clients).toBe(1);
      expect(result.summary.cases).toBe(0);
    }
  });

  test('слияние не создаёт дубликатов по id', () => {
    const merged = mergeData(appData, appData);
    expect(merged.clients).toHaveLength(1);
  });
});
