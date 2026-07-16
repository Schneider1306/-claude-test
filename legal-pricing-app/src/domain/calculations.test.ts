import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  computeFixedCostsKopecks,
  computeMonthlyBillableCapacityHours,
  computeRequiredPriceRevenueKopecks,
  computeTargetRateKopecks,
  computeLineSurchargeKopecks,
  computeLineBaseAmountKopecks,
  computeLineTotalKopecks,
  computeCalculationTotals,
  computeAdditionalHearings,
  computeRateStatus,
  computeActualComparison,
  rublesToKopecks,
  kopecksToRubles,
  type CalculationLineInput,
} from "./calculations";

const rub = rublesToKopecks;

describe("исходные настройки", () => {
  it("постоянные расходы = 45 750 ₽", () => {
    expect(kopecksToRubles(computeFixedCostsKopecks(DEFAULT_SETTINGS))).toBe(
      45_750,
    );
  });

  it("месячная оплачиваемая ёмкость = 71.67 часа", () => {
    expect(
      computeMonthlyBillableCapacityHours(DEFAULT_SETTINGS),
    ).toBeCloseTo(71.6667, 3);
  });

  it("требуемая прайсовая выручка ≈ 582 613 ₽", () => {
    const revenue = kopecksToRubles(
      computeRequiredPriceRevenueKopecks(DEFAULT_SETTINGS),
    );
    expect(Math.round(revenue)).toBe(582_613);
  });

  it("целевая ставка = 8 200 ₽/час", () => {
    expect(kopecksToRubles(computeTargetRateKopecks(DEFAULT_SETTINGS))).toBe(
      8_200,
    );
  });
});

describe("коэффициенты строки (не перемножаются)", () => {
  it("надбавка = базовая цена × количество × сумма коэффициентов", () => {
    const line: CalculationLineInput = {
      basePriceKopecks: rub(100_000),
      quantity: 1,
      plannedMinutesPerUnit: 60,
      complexityBps: 1500,
      urgencyBps: 0,
      responsibilityBps: 1500,
    };
    expect(kopecksToRubles(computeLineSurchargeKopecks(line))).toBe(30_000);
    expect(kopecksToRubles(computeLineBaseAmountKopecks(line))).toBe(100_000);
    expect(kopecksToRubles(computeLineTotalKopecks(line))).toBe(130_000);
  });

  it("срочность применяется только к своей строке", () => {
    const urgentLine: CalculationLineInput = {
      basePriceKopecks: rub(9_000),
      quantity: 1,
      plannedMinutesPerUnit: 90,
      complexityBps: 0,
      urgencyBps: 3000,
      responsibilityBps: 0,
    };
    const normalLine: CalculationLineInput = {
      basePriceKopecks: rub(20_000),
      quantity: 1,
      plannedMinutesPerUnit: 120,
      complexityBps: 0,
      urgencyBps: 0,
      responsibilityBps: 0,
    };
    expect(kopecksToRubles(computeLineSurchargeKopecks(urgentLine))).toBe(
      2_700,
    );
    expect(kopecksToRubles(computeLineSurchargeKopecks(normalLine))).toBe(0);
  });
});

describe("дополнительные заседания", () => {
  it("= max(общее − включённое, 0)", () => {
    expect(computeAdditionalHearings(4, 1)).toBe(3);
    expect(computeAdditionalHearings(1, 1)).toBe(0);
    expect(computeAdditionalHearings(0, 1)).toBe(0);
  });
});

describe("обязательные тестовые сценарии из ТЗ", () => {
  it("медицинское дело: 290 000 ₽, 29 часов, ставка 10 000 ₽", () => {
    const lines: CalculationLineInput[] = [
      {
        basePriceKopecks: rub(135_000),
        quantity: 1,
        plannedMinutesPerUnit: 13.5 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
      {
        basePriceKopecks: rub(25_000),
        quantity: 3,
        plannedMinutesPerUnit: 2.5 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
      {
        basePriceKopecks: rub(45_000),
        quantity: 1,
        plannedMinutesPerUnit: 3.5 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
      {
        basePriceKopecks: rub(35_000),
        quantity: 1,
        plannedMinutesPerUnit: 4.5 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
    ];
    const totals = computeCalculationTotals({
      lines,
      expenses: [],
      discountBps: 0,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(kopecksToRubles(totals.professionalAfterDiscountKopecks)).toBe(
      290_000,
    );
    expect(totals.plannedHours).toBeCloseTo(29, 6);
    expect(kopecksToRubles(totals.effectiveRateKopecks!)).toBeCloseTo(
      10_000,
      6,
    );
  });

  it("обычное дело: 175 000 ₽, 22.5 часа, ставка 7 777.78 ₽", () => {
    const lines: CalculationLineInput[] = [
      {
        basePriceKopecks: rub(90_000),
        quantity: 1,
        plannedMinutesPerUnit: 13 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
      {
        basePriceKopecks: rub(25_000),
        quantity: 2,
        plannedMinutesPerUnit: 2.5 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
      {
        basePriceKopecks: rub(35_000),
        quantity: 1,
        plannedMinutesPerUnit: 4.5 * 60,
        complexityBps: 0,
        urgencyBps: 0,
        responsibilityBps: 0,
      },
    ];
    const totals = computeCalculationTotals({
      lines,
      expenses: [],
      discountBps: 0,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(kopecksToRubles(totals.professionalAfterDiscountKopecks)).toBe(
      175_000,
    );
    expect(totals.plannedHours).toBeCloseTo(22.5, 6);
    expect(kopecksToRubles(totals.effectiveRateKopecks!)).toBeCloseTo(
      7_777.78,
      1,
    );
  });

  it("срочная консультация: надбавка 2 700 ₽, итог 11 700 ₽", () => {
    const line: CalculationLineInput = {
      basePriceKopecks: rub(9_000),
      quantity: 1,
      plannedMinutesPerUnit: 90,
      complexityBps: 0,
      urgencyBps: 3000,
      responsibilityBps: 0,
    };
    const totals = computeCalculationTotals({
      lines: [line],
      expenses: [],
      discountBps: 0,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(kopecksToRubles(totals.surchargeKopecks)).toBe(2_700);
    expect(kopecksToRubles(totals.clientTotalKopecks)).toBe(11_700);
  });

  it("сложная услуга: надбавки 30 000, до скидки 130 000, скидка 13 000, проф. сумма 117 000, итог 137 000", () => {
    const line: CalculationLineInput = {
      basePriceKopecks: rub(100_000),
      quantity: 1,
      plannedMinutesPerUnit: 60,
      complexityBps: 1500,
      urgencyBps: 0,
      responsibilityBps: 1500,
    };
    const totals = computeCalculationTotals({
      lines: [line],
      expenses: [{ amountKopecks: rub(20_000) }],
      discountBps: 1000,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(kopecksToRubles(totals.surchargeKopecks)).toBe(30_000);
    expect(
      kopecksToRubles(totals.professionalBeforeDiscountKopecks),
    ).toBe(130_000);
    expect(kopecksToRubles(totals.discountAmountKopecks)).toBe(13_000);
    expect(
      kopecksToRubles(totals.professionalAfterDiscountKopecks),
    ).toBe(117_000);
    expect(kopecksToRubles(totals.clientTotalKopecks)).toBe(137_000);
  });
});

describe("скидка не затрагивает расходы", () => {
  it("внешние расходы прибавляются после скидки без изменений", () => {
    const line: CalculationLineInput = {
      basePriceKopecks: rub(10_000),
      quantity: 1,
      plannedMinutesPerUnit: 60,
      complexityBps: 0,
      urgencyBps: 0,
      responsibilityBps: 0,
    };
    const totals = computeCalculationTotals({
      lines: [line],
      expenses: [{ amountKopecks: rub(5_000) }],
      discountBps: 5000,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(kopecksToRubles(totals.externalExpensesKopecks)).toBe(5_000);
    expect(kopecksToRubles(totals.professionalAfterDiscountKopecks)).toBe(
      5_000,
    );
    expect(kopecksToRubles(totals.clientTotalKopecks)).toBe(10_000);
  });
});

describe("внешние расходы не влияют на эффективную ставку", () => {
  it("ставка считается только от профессионального вознаграждения", () => {
    const line: CalculationLineInput = {
      basePriceKopecks: rub(10_000),
      quantity: 1,
      plannedMinutesPerUnit: 60,
      complexityBps: 0,
      urgencyBps: 0,
      responsibilityBps: 0,
    };
    const withoutExpenses = computeCalculationTotals({
      lines: [line],
      expenses: [],
      discountBps: 0,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    const withExpenses = computeCalculationTotals({
      lines: [line],
      expenses: [{ amountKopecks: rub(100_000) }],
      discountBps: 0,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(withoutExpenses.effectiveRateKopecks).toBe(
      withExpenses.effectiveRateKopecks,
    );
  });
});

describe("нулевые часы", () => {
  it('показывает "нет данных" вместо ошибки', () => {
    const totals = computeCalculationTotals({
      lines: [],
      expenses: [{ amountKopecks: rub(1_000) }],
      discountBps: 0,
      travelMinutes: 0,
      targetRateKopecks: rub(8_200),
    });
    expect(totals.effectiveRateKopecks).toBeNull();
    expect(totals.economicMinimumKopecks).toBeNull();
    expect(totals.status).toBe("no-data");
    expect(kopecksToRubles(totals.clientTotalKopecks)).toBe(1_000);
  });
});

describe("статус ставки", () => {
  const target = rub(10_000);
  it("зелёный: ставка >= целевой", () => {
    expect(computeRateStatus(rub(10_000), target)).toBe("green");
    expect(computeRateStatus(rub(12_000), target)).toBe("green");
  });
  it("жёлтый: ниже не более чем на 15%", () => {
    expect(computeRateStatus(rub(9_000), target)).toBe("yellow");
    expect(computeRateStatus(rub(8_500), target)).toBe("yellow");
  });
  it("красный: ниже более чем на 15%", () => {
    expect(computeRateStatus(rub(8_000), target)).toBe("red");
    expect(computeRateStatus(rub(1_000), target)).toBe("red");
  });
  it("нет данных при null", () => {
    expect(computeRateStatus(null, target)).toBe("no-data");
  });
});

describe("факт vs план", () => {
  it("считает перерасход времени и отклонение цены", () => {
    const comparison = computeActualComparison(
      { actualPriceKopecks: rub(100_000), actualMinutes: 13 * 60 },
      12 * 60,
      rub(90_000),
    );
    expect(comparison.timeOverrunMinutes).toBe(60);
    expect(comparison.timeOverrunBps).toBe(833);
    expect(kopecksToRubles(comparison.priceDeviationKopecks)).toBe(10_000);
    expect(comparison.actualRateKopecks).toBeCloseTo(rub(100_000) / 13, 4);
  });
});
