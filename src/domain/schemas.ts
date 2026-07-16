import { z } from "zod";
import { CASE_CLIENT_TYPES, CASE_STATUSES, CASE_TYPES, MEETING_STATUSES, PAYER_TYPES, PAYMENT_KINDS, PAYMENT_METHODS, STAGE_STATUSES } from "@/db/schema";

// Формы работают в "человеческих" единицах (рубли, часы, проценты) —
// перевод в копейки/минуты/базисные пункты происходит один раз на границе (server actions),
// после чего везде используются только целые числа.

export const caseFormSchema = z.object({
  shortName: z.string().min(2, "Укажите короткое название дела"),
  clientCode: z.string().min(1, "Укажите обезличенный код клиента"),
  clientType: z.enum(CASE_CLIENT_TYPES),
  caseType: z.enum(CASE_TYPES),
  status: z.enum(CASE_STATUSES).default("lead"),
  responsible: z.string().default(""),
  comment: z.string().default(""),
  inquiryDate: z.string().optional().nullable(),
  contractDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  nextActionDate: z.string().optional().nullable(),
  initialEstimateRubles: z.number().nonnegative().optional().nullable(),
});
export type CaseFormValues = z.infer<typeof caseFormSchema>;

export const stageFormSchema = z.object({
  caseId: z.number(),
  name: z.string().min(1),
  serviceId: z.number().nullable().optional(),
  catalogPriceRubles: z.number().nullable().optional(),
  catalogPlannedHours: z.number().nullable().optional(),
  priceDeviationReason: z.string().optional().nullable(),
  agreedPriceRubles: z.number().nonnegative(),
  quantity: z.number().int().positive().default(1),
  plannedHours: z.number().nonnegative(),
  includedMeetings: z.number().int().nonnegative().default(0),
  agreedDate: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(STAGE_STATUSES).default("planned"),
  isUrgent: z.boolean().default(false),
  urgencySurchargeBp: z.number().int().min(0).max(10000).default(3000),
  discountBp: z.number().int().min(0).max(10000).default(0),
  comment: z.string().optional().default(""),
});
export type StageFormValues = z.infer<typeof stageFormSchema>;

export const meetingFormSchema = z.object({
  caseId: z.number(),
  stageId: z.number().nullable().optional(),
  meetingDate: z.string().min(1),
  location: z.string().optional().default(""),
  purpose: z.string().optional().default(""),
  status: z.enum(MEETING_STATUSES).default("scheduled"),
  resultComment: z.string().optional().default(""),
});
export type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export const timeEntryFormSchema = z.object({
  caseId: z.number(),
  stageId: z.number().nullable().optional(),
  workDate: z.string().min(1),
  workType: z.string().optional().default(""),
  minutes: z.number().int().positive(),
  isBillable: z.boolean().default(true),
  comment: z.string().optional().default(""),
});
export type TimeEntryFormValues = z.infer<typeof timeEntryFormSchema>;

export const paymentFormSchema = z.object({
  caseId: z.number(),
  stageId: z.number().nullable().optional(),
  paymentDate: z.string().min(1),
  amountRubles: z.number().positive(),
  payerType: z.enum(PAYER_TYPES),
  purpose: z.string().optional().default(""),
  kind: z.enum(PAYMENT_KINDS),
  paymentMethod: z.enum(PAYMENT_METHODS).default("bank_transfer"),
  comment: z.string().optional().default(""),
});
export type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const expenseFormSchema = z.object({
  caseId: z.number(),
  expenseDate: z.string().min(1),
  amountRubles: z.number().positive(),
  category: z.string().optional().default(""),
  isReimbursable: z.boolean().default(true),
  isReimbursed: z.boolean().default(false),
  comment: z.string().optional().default(""),
});
export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const serviceFormSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  marketPriceRubles: z.number().nonnegative(),
  workPriceRubles: z.number().nonnegative(),
  plannedHours: z.number().nonnegative(),
  description: z.string().optional().default(""),
  extraPaymentBasis: z.string().optional().default(""),
  isActive: z.boolean().default(true),
  includedMeetings: z.number().int().nonnegative().default(0),
  monthlyLimitHours: z.number().nonnegative().nullable().optional(),
});
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const settingsFormSchema = z.object({
  desiredMonthlyIncomeRubles: z.number().nonnegative(),
  rentRubles: z.number().nonnegative(),
  internetRubles: z.number().nonnegative(),
  stationeryRubles: z.number().nonnegative(),
  aiToolsRubles: z.number().nonnegative(),
  practiceReserveRubles: z.number().nonnegative(),
  workingWeeksPerYear: z.number().int().positive(),
  workingDaysPerWeek: z.number().int().positive(),
  billableHoursPerDay: z.number().positive(),
  avgDiscountLossPercent: z.number().min(0).max(100),
  taxRegime: z.enum(["npd", "usn", "custom"]),
  npdIndividualRatePercent: z.number().min(0).max(100),
  npdOrgRatePercent: z.number().min(0).max(100),
  npdAnnualLimitRubles: z.number().nonnegative(),
  usnRatePercent: z.number().min(0).max(100),
  customTaxRatePercent: z.number().min(0).max(100),
  standardUrgencySurchargePercent: z.number().min(0).max(1000),
  standardDiscountPercent: z.number().min(0).max(100),
  maxDiscountPercent: z.number().min(0).max(100),
  theme: z.enum(["light", "dark", "system"]),
});
export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const scenarioFormSchema = z.object({
  name: z.string().min(1),
  month: z.string().min(1),
  comment: z.string().optional().default(""),
});
export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

export const scenarioItemFormSchema = z.object({
  scenarioId: z.number(),
  serviceId: z.number().nullable().optional(),
  label: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPriceRubles: z.number().nonnegative(),
  unitHours: z.number().nonnegative(),
  expectedPaymentRubles: z.number().nonnegative().nullable().optional(),
});
export type ScenarioItemFormValues = z.infer<typeof scenarioItemFormSchema>;
