import { describe, it, expect } from "vitest";
import {
  additionalMeetingsCount,
  applyBp,
  computeCaseFinancials,
  computeBenchmark,
  evaluateBenchmarkStatus,
  evaluateNpdLimit,
  evaluateWorkload,
  forecastPersonalIncomeKopecks,
  actualPersonalIncomeKopecks,
  hoursToMinutes,
  monthlyCapacityMinutes,
  resolveTaxRateBp,
  resolveBenchmarkTaxRateBp,
  rublesToKopecks,
  stageDiscountKopecks,
  stageLinePlannedMinutes,
  stageLineTotalKopecks,
  stageUrgencySurchargeKopecks,
  ceilToNearest,
  formatMoney,
  type StageLineInput,
} from "./calculations";

const stage = (partial: Partial<StageLineInput>): StageLineInput => ({
  agreedPriceKopecks: 0,
  quantity: 1,
  plannedMinutes: 0,
  discountBp: 0,
  isUrgent: false,
  urgencySurchargeBp: 3000,
  ...partial,
});

describe("базовые преобразования", () => {
  it("рубли <-> копейки", () => {
    expect(rublesToKopecks(135000)).toBe(13_500_000);
    expect(rublesToKopecks(9.5)).toBe(950);
  });

  it("часы -> минуты", () => {
    expect(hoursToMinutes(13.5)).toBe(810);
    expect(hoursToMinutes(1.5)).toBe(90);
  });

  it("applyBp считает проценты в базисных пунктах", () => {
    expect(applyBp(10_000_000, 3000)).toBe(3_000_000); // 30% от 100000₽
    expect(applyBp(10_000_000, 1000)).toBe(1_000_000); // 10%
  });

  it("ceilToNearest округляет вверх до шага", () => {
    expect(ceilToNearest(813_181, 10_000)).toBe(820_000);
    expect(ceilToNearest(800_000, 10_000)).toBe(800_000);
  });

  it("formatMoney форматирует рубли с ₽", () => {
    expect(formatMoney(rublesToKopecks(290000))).toBe("290 000 ₽");
  });
});

describe("дополнительные заседания", () => {
  it("считает превышение включённого количества", () => {
    expect(additionalMeetingsCount(4, 1)).toBe(3);
    expect(additionalMeetingsCount(1, 1)).toBe(0);
    expect(additionalMeetingsCount(0, 1)).toBe(0);
  });
});

describe("строки этапа", () => {
  it("считает сумму и время с учётом количества", () => {
    const s = stage({
      agreedPriceKopecks: rublesToKopecks(25000),
      quantity: 3,
      plannedMinutes: hoursToMinutes(2.5),
    });
    expect(stageLineTotalKopecks(s)).toBe(rublesToKopecks(75000));
    expect(stageLinePlannedMinutes(s)).toBe(hoursToMinutes(7.5));
  });

  it("срочная надбавка применяется только к срочному этапу", () => {
    const urgent = stage({
      agreedPriceKopecks: rublesToKopecks(90000),
      quantity: 1,
      isUrgent: true,
      urgencySurchargeBp: 3000,
    });
    const normal = stage({
      agreedPriceKopecks: rublesToKopecks(90000),
      quantity: 1,
      isUrgent: false,
      urgencySurchargeBp: 3000,
    });
    expect(stageUrgencySurchargeKopecks(urgent)).toBe(rublesToKopecks(27000));
    expect(stageUrgencySurchargeKopecks(normal)).toBe(0);
  });

  it("скидка ограничена и применяется к вознаграждению этапа", () => {
    const s = stage({
      agreedPriceKopecks: rublesToKopecks(100000),
      quantity: 1,
      discountBp: 1000,
    });
    expect(stageDiscountKopecks(s)).toBe(rublesToKopecks(10000));
  });
});

describe("Обязательный пример: медицинское дело", () => {
  const stages: StageLineInput[] = [
    stage({
      agreedPriceKopecks: rublesToKopecks(135000),
      quantity: 1,
      plannedMinutes: hoursToMinutes(13.5),
    }),
    stage({
      agreedPriceKopecks: rublesToKopecks(25000), // доп. заседание — цена за одно
      quantity: 3, // три дополнительных заседания сверх включённого
      plannedMinutes: hoursToMinutes(2.5),
    }),
    stage({
      agreedPriceKopecks: rublesToKopecks(45000), // экспертиза
      quantity: 1,
      plannedMinutes: hoursToMinutes(3.5),
    }),
    stage({
      agreedPriceKopecks: rublesToKopecks(35000), // доп. процессуальный блок
      quantity: 1,
      plannedMinutes: hoursToMinutes(4.5),
    }),
  ];

  it("даёт доп. заседания = 3 при 4 фактических и 1 включённом", () => {
    expect(additionalMeetingsCount(4, 1)).toBe(3);
  });

  it("итоговая цена 290 000 ₽, время 29 часов, ставка 10 000 ₽/ч", () => {
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: 0,
      actualMinutes: hoursToMinutes(29),
      actualPaymentsReceivedKopecks: 0,
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });

    expect(result.feeGrossKopecks).toBe(rublesToKopecks(290000));
    expect(result.totalToClientKopecks).toBe(rublesToKopecks(290000));
    expect(result.plannedMinutesTotal).toBe(hoursToMinutes(29));
    expect(result.effectiveRateKopecksPerHour).toBe(rublesToKopecks(10000));
    expect(result.effectiveRateIsPlanned).toBe(false);
  });
});

describe("Обязательный пример: обычное дело", () => {
  const stages: StageLineInput[] = [
    stage({
      agreedPriceKopecks: rublesToKopecks(90000),
      quantity: 1,
      plannedMinutes: hoursToMinutes(13),
    }),
    stage({
      agreedPriceKopecks: rublesToKopecks(25000), // доп. заседание — цена за одно
      quantity: 2, // два дополнительных заседания = 50 000 ₽ и 5 часов
      plannedMinutes: hoursToMinutes(2.5),
    }),
    stage({
      agreedPriceKopecks: rublesToKopecks(35000),
      quantity: 1,
      plannedMinutes: hoursToMinutes(4.5),
    }),
  ];

  it("итоговая цена 175 000 ₽, время 22,5 часа, ставка 7 777,78 ₽/ч", () => {
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: 0,
      actualMinutes: hoursToMinutes(22.5),
      actualPaymentsReceivedKopecks: 0,
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });

    expect(result.feeGrossKopecks).toBe(rublesToKopecks(175000));
    expect(result.plannedMinutesTotal).toBe(hoursToMinutes(22.5));
    // 175000 / 22.5 = 7777.777... ₽ -> округление до копейки
    expect(result.effectiveRateKopecksPerHour).toBe(
      Math.round((rublesToKopecks(175000) / 22.5) * 1) ,
    );
    expect(result.effectiveRateKopecksPerHour! / 100).toBeCloseTo(7777.78, 1);
  });

  it("использует плановые часы, если фактических ещё нет, и явно это помечает", () => {
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: 0,
      actualMinutes: null,
      actualPaymentsReceivedKopecks: 0,
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });
    expect(result.effectiveRateIsPlanned).toBe(true);
    expect(result.effectiveRateKopecksPerHour).not.toBeNull();
  });

  it("при нулевых часах возвращает null (а не деление на ноль)", () => {
    const result = computeCaseFinancials({
      stages: [],
      reimbursableExpensesKopecks: 0,
      actualMinutes: null,
      actualPaymentsReceivedKopecks: 0,
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });
    expect(result.effectiveRateKopecksPerHour).toBeNull();
  });
});

describe("скидка и срочность не задваиваются, внешние расходы не влияют на ставку", () => {
  it("скидка уменьшает итог, но не время; расходы увеличивают итог, но не ставку", () => {
    const stages: StageLineInput[] = [
      stage({
        agreedPriceKopecks: rublesToKopecks(90000),
        quantity: 1,
        plannedMinutes: hoursToMinutes(13),
        discountBp: 1000, // 10%
      }),
    ];
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: rublesToKopecks(5000),
      actualMinutes: hoursToMinutes(13),
      actualPaymentsReceivedKopecks: 0,
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });
    expect(result.discountTotalKopecks).toBe(rublesToKopecks(9000));
    expect(result.feeAfterDiscountKopecks).toBe(rublesToKopecks(81000));
    expect(result.totalToClientKopecks).toBe(rublesToKopecks(86000)); // 81000 + 5000 внешних
    // ставка считается от вознаграждения после скидки БЕЗ внешних расходов
    expect(result.effectiveRateKopecksPerHour).toBe(
      Math.round(rublesToKopecks(81000) / 13),
    );
  });

  it("срочная надбавка применяется только к помеченному этапу", () => {
    const stages: StageLineInput[] = [
      stage({
        agreedPriceKopecks: rublesToKopecks(90000),
        quantity: 1,
        isUrgent: true,
        urgencySurchargeBp: 3000,
      }),
      stage({
        agreedPriceKopecks: rublesToKopecks(25000),
        quantity: 1,
        isUrgent: false,
        urgencySurchargeBp: 3000,
      }),
    ];
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: 0,
      actualMinutes: null,
      actualPaymentsReceivedKopecks: 0,
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });
    expect(result.urgencySurchargeTotalKopecks).toBe(rublesToKopecks(27000));
    expect(result.totalToClientKopecks).toBe(rublesToKopecks(90000 + 25000 + 27000));
  });
});

describe("задолженность клиента", () => {
  it("плановые платежи не считаются полученными", () => {
    const stages: StageLineInput[] = [
      stage({ agreedPriceKopecks: rublesToKopecks(100000), quantity: 1 }),
    ];
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: 0,
      actualMinutes: null,
      actualPaymentsReceivedKopecks: rublesToKopecks(40000),
      refundsKopecks: 0,
      expenseReimbursementsReceivedKopecks: 0,
    });
    expect(result.debtKopecks).toBe(rublesToKopecks(60000));
  });

  it("возвраты увеличивают задолженность (уменьшают зачтённую оплату)", () => {
    const stages: StageLineInput[] = [
      stage({ agreedPriceKopecks: rublesToKopecks(100000), quantity: 1 }),
    ];
    const result = computeCaseFinancials({
      stages,
      reimbursableExpensesKopecks: 0,
      actualMinutes: null,
      actualPaymentsReceivedKopecks: rublesToKopecks(100000),
      refundsKopecks: rublesToKopecks(20000),
      expenseReimbursementsReceivedKopecks: 0,
    });
    expect(result.debtKopecks).toBe(rublesToKopecks(20000));
  });
});

describe("налоги", () => {
  it("НПД: 4% с физлица, 6% с организации/ИП", () => {
    const settings = {
      taxRegime: "npd" as const,
      npdIndividualRateBp: 400,
      npdOrgRateBp: 600,
      usnRateBp: 600,
      customTaxRateBp: 600,
    };
    expect(resolveTaxRateBp(settings, "individual")).toBe(400);
    expect(resolveTaxRateBp(settings, "organization")).toBe(600);
  });

  it("предупреждения по лимиту НПД на 70/85/100%", () => {
    const limit = rublesToKopecks(2_400_000);
    expect(evaluateNpdLimit(rublesToKopecks(1_000_000), limit).level).toBe("ok");
    expect(evaluateNpdLimit(rublesToKopecks(1_700_000), limit).level).toBe(
      "warning70",
    );
    expect(evaluateNpdLimit(rublesToKopecks(2_100_000), limit).level).toBe(
      "warning85",
    );
    expect(evaluateNpdLimit(rublesToKopecks(2_400_001), limit).level).toBe(
      "exceeded",
    );
  });
});

describe("Обязательный пример: экономическая контрольная ставка", () => {
  it("при настройках НПД по умолчанию для контрольной ставки используется ставка 6% (от организации/ИП)", () => {
    expect(
      resolveBenchmarkTaxRateBp({
        taxRegime: "npd",
        npdIndividualRateBp: 400,
        npdOrgRateBp: 600,
        usnRateBp: 600,
        customTaxRateBp: 600,
      }),
    ).toBe(600);
  });

  it("требуемая выручка ≈ 582 613 ₽, контрольная ставка 8 200 ₽/ч", () => {
    const result = computeBenchmark({
      desiredMonthlyIncomeKopecks: rublesToKopecks(450000),
      fixedExpensesNoReserveKopecks: rublesToKopecks(45750),
      practiceReserveKopecks: rublesToKopecks(30000),
      taxRateBp: 600,
      avgDiscountLossBp: 400,
      workingWeeksPerYear: 43,
      workingDaysPerWeek: 5,
      billableHoursPerDay: 4,
    });

    expect(result.requiredPriceRevenueKopecks / 100).toBeCloseTo(582613, 0);
    expect(result.controlRateKopecksPerHour).toBe(rublesToKopecks(8200));
  });

  it("месячная ёмкость = 71,67 часа (4300 минут)", () => {
    expect(monthlyCapacityMinutes(43, 5, 4)).toBe(4300);
  });

  it("статус ставки: зелёный/жёлтый/красный", () => {
    const control = rublesToKopecks(8200);
    expect(evaluateBenchmarkStatus(rublesToKopecks(8200), control)).toBe("green");
    expect(evaluateBenchmarkStatus(rublesToKopecks(9000), control)).toBe("green");
    expect(evaluateBenchmarkStatus(rublesToKopecks(7500), control)).toBe("yellow"); // -8.5%
    expect(evaluateBenchmarkStatus(rublesToKopecks(6000), control)).toBe("red"); // -27%
    expect(evaluateBenchmarkStatus(null, control)).toBe("red");
  });
});

describe("Обязательный пример: текущий месячный сценарий", () => {
  it("личный доход прогноза = 190 458 ₽", () => {
    const income = forecastPersonalIncomeKopecks({
      priceRevenueKopecks: rublesToKopecks(295000),
      avgDiscountLossBp: 400,
      taxRateBp: 600,
      fixedExpensesNoReserveKopecks: rublesToKopecks(45750),
      practiceReserveKopecks: rublesToKopecks(30000),
    });
    expect(income).toBe(rublesToKopecks(190458));
  });
});

describe("Обязательный пример: целевой сценарий", () => {
  it("общая выручка 585 000 ₽, личный доход прогноза = 452 154 ₽", () => {
    const revenue =
      rublesToKopecks(290000) + // медицинское дело
      rublesToKopecks(175000) + // обычное дело
      rublesToKopecks(90000) + // абонент
      rublesToKopecks(9000) * 2 + // две консультации
      rublesToKopecks(12000); // анализ документов
    expect(revenue).toBe(rublesToKopecks(585000));

    const income = forecastPersonalIncomeKopecks({
      priceRevenueKopecks: revenue,
      avgDiscountLossBp: 400,
      taxRateBp: 600,
      fixedExpensesNoReserveKopecks: rublesToKopecks(45750),
      practiceReserveKopecks: rublesToKopecks(30000),
    });
    expect(income).toBe(rublesToKopecks(452154));
  });
});

describe("фактический доход не задваивает вычет 4%", () => {
  it("фактический личный доход считает только налог, без повторного вычета скидки", () => {
    const receivedGross = rublesToKopecks(295000);
    const tax = applyBp(receivedGross, 600);
    const income = actualPersonalIncomeKopecks({
      receivedGrossKopecks: receivedGross,
      taxPaidKopecks: tax,
      fixedExpensesNoReserveKopecks: rublesToKopecks(45750),
      practiceReserveKopecks: rublesToKopecks(30000),
    });
    // 295000 - 17700(налог) - 45750 - 30000 = 201550, а не как в прогнозе (190458)
    expect(income).toBe(rublesToKopecks(201550));
    expect(income).not.toBe(rublesToKopecks(190458));
  });
});

describe("перегрузка по ёмкости", () => {
  it("отмечает перегрузку, если план превышает ёмкость", () => {
    const capacity = monthlyCapacityMinutes(43, 5, 4); // 4300 минут
    const under = evaluateWorkload(hoursToMinutes(50), capacity);
    const over = evaluateWorkload(hoursToMinutes(80), capacity);
    expect(under.isOverloaded).toBe(false);
    expect(over.isOverloaded).toBe(true);
  });
});
