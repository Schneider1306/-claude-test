import type { PricingSettings } from "@/domain/calculations";
import type { settings } from "@/db/schema";

type SettingsRow = typeof settings.$inferSelect;

export interface CoefficientOption {
  code: string;
  label: string;
  bps: number;
}

export function toPricingSettings(row: SettingsRow): PricingSettings {
  return {
    desiredMonthlyIncomeKopecks: row.desiredMonthlyIncomeKopecks,
    rentKopecks: row.rentKopecks,
    internetKopecks: row.internetKopecks,
    stationeryKopecks: row.stationeryKopecks,
    aiAssistantsKopecks: row.aiAssistantsKopecks,
    practiceReserveKopecks: row.practiceReserveKopecks,
    workWeeksPerYear: row.workWeeksPerYear,
    workDaysPerWeek: row.workDaysPerWeek,
    billableMinutesPerDay: row.billableMinutesPerDay,
    lossRateBps: row.lossRateBps,
    taxRateBps: row.taxRateBps,
    targetRateRoundingKopecks: row.targetRateRoundingKopecks,
    travelMinutesCountedRatioBps: row.travelMinutesCountedRatioBps,
  };
}

export function parseCoefficientOptions(json: string): CoefficientOption[] {
  return JSON.parse(json) as CoefficientOption[];
}

export function parseDiscountOptions(json: string): number[] {
  return JSON.parse(json) as number[];
}
