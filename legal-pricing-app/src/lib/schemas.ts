import { z } from "zod";
import { EXPENSE_CATEGORIES, CALCULATION_STATUSES } from "@/db/schema";

export const lineKindSchema = z.enum([
  "standard",
  "hearing",
  "expertise",
  "process_block",
  "subscription",
  "custom",
]);

export const manualOverrideSchema = z.object({
  field: z.string().min(1),
  original: z.string(),
  next: z.string(),
  reason: z.string(),
});

export const calculationLineInputSchema = z.object({
  clientId: z.string(),
  serviceId: z.number().int().positive().nullable(),
  kind: lineKindSchema,
  name: z.string().min(1, "Укажите название строки"),
  basePriceKopecks: z.number().int().min(0),
  quantity: z.number().int().min(1),
  plannedMinutesPerUnit: z.number().int().min(0),
  complexityBps: z.number().int().min(0).max(10000),
  urgencyBps: z.number().int().min(0).max(10000),
  responsibilityBps: z.number().int().min(0).max(10000),
  comment: z.string().default(""),
  manualOverrides: z.array(manualOverrideSchema).default([]),
});

export const expenseInputSchema = z.object({
  clientId: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().default(""),
  amountKopecks: z.number().int().min(0),
});

export const calculationDraftSchema = z.object({
  id: z.number().int().positive().optional(),
  internalName: z.string().min(1, "Укажите внутреннее название"),
  clientCode: z.string().min(1, "Укажите обезличенный код клиента"),
  caseType: z.string().default(""),
  lines: z.array(calculationLineInputSchema),
  discountBps: z.number().int().min(0).max(10000),
  discountReason: z.string().default(""),
  travelMinutes: z.number().int().min(0),
  expenses: z.array(expenseInputSchema),
  comment: z.string().default(""),
});

export type CalculationDraftInput = z.infer<typeof calculationDraftSchema>;
export type CalculationLineInputData = z.infer<typeof calculationLineInputSchema>;
export type ExpenseInputData = z.infer<typeof expenseInputSchema>;

export const calculationStatusSchema = z.enum(CALCULATION_STATUSES);

export const serviceInputSchema = z.object({
  name: z.string().min(1, "Укажите название услуги"),
  category: z.string().min(1, "Укажите категорию"),
  basePriceKopecks: z.number().int().min(0),
  marketReferenceKopecks: z.number().int().min(0).nullable(),
  plannedMinutes: z.number().int().min(0),
  description: z.string(),
  extraPaymentTerms: z.string(),
  kind: lineKindSchema,
  isActive: z.boolean(),
  changeComment: z.string(),
});

export type ServiceInputData = z.infer<typeof serviceInputSchema>;

export const settingsInputSchema = z.object({
  desiredMonthlyIncomeKopecks: z.number().int().min(0),
  rentKopecks: z.number().int().min(0),
  internetKopecks: z.number().int().min(0),
  stationeryKopecks: z.number().int().min(0),
  aiAssistantsKopecks: z.number().int().min(0),
  practiceReserveKopecks: z.number().int().min(0),
  workWeeksPerYear: z.number().int().min(1).max(52),
  workDaysPerWeek: z.number().int().min(1).max(7),
  billableMinutesPerDay: z.number().int().min(1).max(1440),
  lossRateBps: z.number().int().min(0).max(10000),
  taxRateBps: z.number().int().min(0).max(10000),
  targetRateRoundingKopecks: z.number().int().min(1),
  travelMinutesCountedRatioBps: z.number().int().min(0).max(10000),
  discountReasonRequiredThresholdBps: z.number().int().min(0).max(10000),
  complexityOptions: z.array(
    z.object({ code: z.string(), label: z.string(), bps: z.number().int().min(0).max(10000) }),
  ),
  urgencyOptions: z.array(
    z.object({ code: z.string(), label: z.string(), bps: z.number().int().min(0).max(10000) }),
  ),
  responsibilityOptions: z.array(
    z.object({ code: z.string(), label: z.string(), bps: z.number().int().min(0).max(10000) }),
  ),
  discountOptionsBps: z.array(z.number().int().min(0).max(10000)),
});

export type SettingsInputData = z.infer<typeof settingsInputSchema>;

export const actualResultInputSchema = z.object({
  calculationId: z.number().int().positive(),
  actualPriceKopecks: z.number().int().min(0),
  actualMinutes: z.number().int().min(0),
});
