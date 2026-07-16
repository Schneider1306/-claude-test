"use server";

import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { settingsFormSchema, type SettingsFormValues } from "@/domain/schemas";
import { rublesToKopecks } from "@/domain/calculations";
import { logHistory } from "@/server/history";

export async function updateSettings(values: SettingsFormValues) {
  const parsed = settingsFormSchema.parse(values);

  db.update(settings)
    .set({
      desiredMonthlyIncomeKopecks: rublesToKopecks(parsed.desiredMonthlyIncomeRubles),
      rentKopecks: rublesToKopecks(parsed.rentRubles),
      internetKopecks: rublesToKopecks(parsed.internetRubles),
      stationeryKopecks: rublesToKopecks(parsed.stationeryRubles),
      aiToolsKopecks: rublesToKopecks(parsed.aiToolsRubles),
      practiceReserveKopecks: rublesToKopecks(parsed.practiceReserveRubles),
      workingWeeksPerYear: parsed.workingWeeksPerYear,
      workingDaysPerWeek: parsed.workingDaysPerWeek,
      billableHoursPerDayX100: Math.round(parsed.billableHoursPerDay * 100),
      avgDiscountLossBp: Math.round(parsed.avgDiscountLossPercent * 100),
      taxRegime: parsed.taxRegime,
      npdIndividualRateBp: Math.round(parsed.npdIndividualRatePercent * 100),
      npdOrgRateBp: Math.round(parsed.npdOrgRatePercent * 100),
      npdAnnualLimitKopecks: rublesToKopecks(parsed.npdAnnualLimitRubles),
      usnRateBp: Math.round(parsed.usnRatePercent * 100),
      customTaxRateBp: Math.round(parsed.customTaxRatePercent * 100),
      standardUrgencySurchargeBp: Math.round(parsed.standardUrgencySurchargePercent * 100),
      standardDiscountBp: Math.round(parsed.standardDiscountPercent * 100),
      maxDiscountBp: Math.round(parsed.maxDiscountPercent * 100),
      theme: parsed.theme,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(settings.id, 1))
    .run();

  logHistory({
    entityType: "settings",
    entityId: 1,
    action: "update",
    summary: "Изменены настройки приложения (цели, расходы, налоги, лимиты)",
  });

  revalidatePath("/", "layout");
}
