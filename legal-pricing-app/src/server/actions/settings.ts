"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { settingsInputSchema, type SettingsInputData } from "@/lib/schemas";

export async function updateSettings(input: SettingsInputData) {
  const data = settingsInputSchema.parse(input);

  db.update(schema.settings)
    .set({
      desiredMonthlyIncomeKopecks: data.desiredMonthlyIncomeKopecks,
      rentKopecks: data.rentKopecks,
      internetKopecks: data.internetKopecks,
      stationeryKopecks: data.stationeryKopecks,
      aiAssistantsKopecks: data.aiAssistantsKopecks,
      practiceReserveKopecks: data.practiceReserveKopecks,
      workWeeksPerYear: data.workWeeksPerYear,
      workDaysPerWeek: data.workDaysPerWeek,
      billableMinutesPerDay: data.billableMinutesPerDay,
      lossRateBps: data.lossRateBps,
      taxRateBps: data.taxRateBps,
      targetRateRoundingKopecks: data.targetRateRoundingKopecks,
      travelMinutesCountedRatioBps: data.travelMinutesCountedRatioBps,
      discountReasonRequiredThresholdBps: data.discountReasonRequiredThresholdBps,
      complexityOptionsJson: JSON.stringify(data.complexityOptions),
      urgencyOptionsJson: JSON.stringify(data.urgencyOptions),
      responsibilityOptionsJson: JSON.stringify(data.responsibilityOptions),
      discountOptionsJson: JSON.stringify(data.discountOptionsBps),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.settings.id, 1))
    .run();

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/calculations/new");
}
