import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Соглашения о хранении данных
// ---------------------------------------------------------------------------
// - Деньги: целые числа в копейках (integer, суффикс _kopecks)
// - Время: целые числа в минутах (integer, суффикс _minutes)
// - Проценты/ставки: целые числа в базисных пунктах, 1% = 100 б.п. (суффикс _bp)
// - Даты: ISO-строки "YYYY-MM-DD" для календарных дат,
//   ISO datetime для меток времени создания/изменения записей.
// ---------------------------------------------------------------------------

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};

// ---------------------------------------------------------------------------
// Настройки приложения (единственная строка, id = 1)
// ---------------------------------------------------------------------------
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),

  desiredMonthlyIncomeKopecks: integer("desired_monthly_income_kopecks")
    .notNull()
    .default(45_000_000),
  rentKopecks: integer("rent_kopecks").notNull().default(2_225_000),
  internetKopecks: integer("internet_kopecks").notNull().default(300_000),
  stationeryKopecks: integer("stationery_kopecks").notNull().default(50_000),
  aiToolsKopecks: integer("ai_tools_kopecks").notNull().default(2_000_000),
  practiceReserveKopecks: integer("practice_reserve_kopecks")
    .notNull()
    .default(3_000_000),

  workingWeeksPerYear: integer("working_weeks_per_year").notNull().default(43),
  workingDaysPerWeek: integer("working_days_per_week").notNull().default(5),
  billableHoursPerDayX100: integer("billable_hours_per_day_x100")
    .notNull()
    .default(400), // хранится x100, т.е. 400 = 4.00 часа

  avgDiscountLossBp: integer("avg_discount_loss_bp").notNull().default(400), // 4%

  taxRegime: text("tax_regime", { enum: ["npd", "usn", "custom"] })
    .notNull()
    .default("npd"),
  npdIndividualRateBp: integer("npd_individual_rate_bp").notNull().default(400), // 4%
  npdOrgRateBp: integer("npd_org_rate_bp").notNull().default(600), // 6%
  npdAnnualLimitKopecks: integer("npd_annual_limit_kopecks")
    .notNull()
    .default(240_000_000),
  usnRateBp: integer("usn_rate_bp").notNull().default(600), // 6%
  customTaxRateBp: integer("custom_tax_rate_bp").notNull().default(600),

  standardUrgencySurchargeBp: integer("standard_urgency_surcharge_bp")
    .notNull()
    .default(3000), // 30%
  standardDiscountBp: integer("standard_discount_bp").notNull().default(1000), // 10%
  maxDiscountBp: integer("max_discount_bp").notNull().default(2000), // 20%

  defaultIncludedMeetings: integer("default_included_meetings")
    .notNull()
    .default(1),

  theme: text("theme", { enum: ["light", "dark", "system"] })
    .notNull()
    .default("system"),

  ...timestamps,
});

// ---------------------------------------------------------------------------
// Справочник услуг
// ---------------------------------------------------------------------------
export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  marketPriceKopecks: integer("market_price_kopecks").notNull(),
  workPriceKopecks: integer("work_price_kopecks").notNull(),
  plannedMinutes: integer("planned_minutes").notNull(),
  description: text("description").notNull().default(""),
  extraPaymentBasis: text("extra_payment_basis").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  includedMeetings: integer("included_meetings").notNull().default(0),
  monthlyLimitMinutes: integer("monthly_limit_minutes"),
  priceChangedAt: text("price_changed_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Дела
// ---------------------------------------------------------------------------
export const CASE_STATUSES = [
  "lead", // потенциальный клиент
  "proposal_sent", // предложение направлено
  "contracted", // договор заключён
  "active", // активное
  "on_hold", // приостановлено
  "completed", // завершено
  "declined_by_client", // отказ клиента
  "declined_by_lawyer", // отказ юриста
] as const;

export const CASE_CLIENT_TYPES = ["individual", "ip", "organization"] as const;

export const CASE_TYPES = [
  "medical",
  "regular",
  "consultation",
  "audit",
  "subscription",
  "other",
] as const;

export const cases = sqliteTable("cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  internalNumber: text("internal_number").notNull().unique(),
  shortName: text("short_name").notNull(),
  clientCode: text("client_code").notNull(),
  clientType: text("client_type", { enum: CASE_CLIENT_TYPES })
    .notNull()
    .default("individual"),
  caseType: text("case_type", { enum: CASE_TYPES }).notNull().default("regular"),
  status: text("status", { enum: CASE_STATUSES }).notNull().default("lead"),

  inquiryDate: text("inquiry_date"),
  contractDate: text("contract_date"),
  startDate: text("start_date"),
  endDate: text("end_date"),

  responsible: text("responsible").notNull().default(""),
  comment: text("comment").notNull().default(""),

  initialEstimateKopecks: integer("initial_estimate_kopecks"),

  nextActionDate: text("next_action_date"),

  deletedAt: text("deleted_at"),
  ...timestamps,
}, (t) => ({
  statusIdx: index("cases_status_idx").on(t.status),
  deletedIdx: index("cases_deleted_idx").on(t.deletedAt),
}));

// ---------------------------------------------------------------------------
// Этапы дела (строки начисления)
// ---------------------------------------------------------------------------
export const STAGE_STATUSES = [
  "planned",
  "in_progress",
  "done",
  "cancelled",
] as const;

export const caseStages = sqliteTable("case_stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id),
  name: text("name").notNull(),
  serviceId: integer("service_id").references(() => services.id),

  // Снимок цены/времени справочника на момент добавления этапа —
  // изменение каталога впоследствии не должно менять старые дела.
  catalogPriceKopecks: integer("catalog_price_kopecks"),
  catalogPlannedMinutes: integer("catalog_planned_minutes"),
  priceDeviationReason: text("price_deviation_reason"),

  agreedPriceKopecks: integer("agreed_price_kopecks").notNull(),
  quantity: integer("quantity").notNull().default(1),
  plannedMinutes: integer("planned_minutes").notNull().default(0),

  includedMeetings: integer("included_meetings").notNull().default(0),

  agreedDate: text("agreed_date"),
  startDate: text("start_date"),
  dueDate: text("due_date"),
  status: text("status", { enum: STAGE_STATUSES }).notNull().default("planned"),

  isUrgent: integer("is_urgent", { mode: "boolean" }).notNull().default(false),
  urgencySurchargeBp: integer("urgency_surcharge_bp").notNull().default(0),
  discountBp: integer("discount_bp").notNull().default(0),

  comment: text("comment").notNull().default(""),
  isPaidFlag: integer("is_paid_flag", { mode: "boolean" }).notNull().default(false),

  sortOrder: integer("sort_order").notNull().default(0),
  deletedAt: text("deleted_at"),
  ...timestamps,
}, (t) => ({
  caseIdx: index("case_stages_case_idx").on(t.caseId),
}));

// ---------------------------------------------------------------------------
// Заседания (календарные события по делу)
// ---------------------------------------------------------------------------
export const MEETING_STATUSES = [
  "scheduled",
  "held",
  "postponed",
  "cancelled",
] as const;

export const caseMeetings = sqliteTable("case_meetings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id),
  stageId: integer("stage_id").references(() => caseStages.id),
  meetingDate: text("meeting_date").notNull(),
  location: text("location").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  status: text("status", { enum: MEETING_STATUSES }).notNull().default("scheduled"),
  resultComment: text("result_comment").notNull().default(""),
  deletedAt: text("deleted_at"),
  ...timestamps,
}, (t) => ({
  caseIdx: index("case_meetings_case_idx").on(t.caseId),
  dateIdx: index("case_meetings_date_idx").on(t.meetingDate),
}));

// ---------------------------------------------------------------------------
// Учёт времени
// ---------------------------------------------------------------------------
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id),
  stageId: integer("stage_id").references(() => caseStages.id),
  workDate: text("work_date").notNull(),
  workType: text("work_type").notNull().default(""),
  minutes: integer("minutes").notNull(),
  isBillable: integer("is_billable", { mode: "boolean" }).notNull().default(true),
  comment: text("comment").notNull().default(""),
  deletedAt: text("deleted_at"),
  ...timestamps,
}, (t) => ({
  caseIdx: index("time_entries_case_idx").on(t.caseId),
  dateIdx: index("time_entries_date_idx").on(t.workDate),
}));

// ---------------------------------------------------------------------------
// Платежи
// ---------------------------------------------------------------------------
export const PAYMENT_KINDS = [
  "planned",
  "actual",
  "refund",
  "expense_reimbursement",
] as const;

export const PAYER_TYPES = ["individual", "organization"] as const;

export const PAYMENT_METHODS = [
  "bank_transfer",
  "card",
  "cash",
  "other",
] as const;

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id),
  stageId: integer("stage_id").references(() => caseStages.id),
  paymentDate: text("payment_date").notNull(),
  amountKopecks: integer("amount_kopecks").notNull(),
  payerType: text("payer_type", { enum: PAYER_TYPES }).notNull().default("individual"),
  purpose: text("purpose").notNull().default(""),
  kind: text("kind", { enum: PAYMENT_KINDS }).notNull().default("actual"),
  taxRateBp: integer("tax_rate_bp").notNull().default(0),
  taxAmountKopecks: integer("tax_amount_kopecks").notNull().default(0),
  paymentMethod: text("payment_method", { enum: PAYMENT_METHODS })
    .notNull()
    .default("bank_transfer"),
  comment: text("comment").notNull().default(""),
  deletedAt: text("deleted_at"),
  ...timestamps,
}, (t) => ({
  caseIdx: index("payments_case_idx").on(t.caseId),
  dateIdx: index("payments_date_idx").on(t.paymentDate),
  kindIdx: index("payments_kind_idx").on(t.kind),
}));

// ---------------------------------------------------------------------------
// Внешние расходы по делу
// ---------------------------------------------------------------------------
export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id")
    .notNull()
    .references(() => cases.id),
  expenseDate: text("expense_date").notNull(),
  amountKopecks: integer("amount_kopecks").notNull(),
  category: text("category").notNull().default(""),
  isReimbursable: integer("is_reimbursable", { mode: "boolean" }).notNull().default(true),
  isReimbursed: integer("is_reimbursed", { mode: "boolean" }).notNull().default(false),
  comment: text("comment").notNull().default(""),
  deletedAt: text("deleted_at"),
  ...timestamps,
}, (t) => ({
  caseIdx: index("expenses_case_idx").on(t.caseId),
}));

// ---------------------------------------------------------------------------
// Журнал изменений (аудит)
// ---------------------------------------------------------------------------
export const caseHistory = sqliteTable("case_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseId: integer("case_id").references(() => cases.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  action: text("action").notNull(), // create | update | delete | restore
  summary: text("summary").notNull(),
  fieldChanges: text("field_changes"), // JSON строка [{field, old, new}]
  changedAt: text("changed_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, (t) => ({
  caseIdx: index("case_history_case_idx").on(t.caseId),
  dateIdx: index("case_history_date_idx").on(t.changedAt),
}));

// ---------------------------------------------------------------------------
// Сценарии (конструктор месяца)
// ---------------------------------------------------------------------------
export const scenarioPlans = sqliteTable("scenario_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  month: text("month").notNull(), // "YYYY-MM"
  comment: text("comment").notNull().default(""),
  ...timestamps,
});

export const scenarioItems = sqliteTable("scenario_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  scenarioId: integer("scenario_id")
    .notNull()
    .references(() => scenarioPlans.id),
  serviceId: integer("service_id").references(() => services.id),
  label: text("label").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceKopecks: integer("unit_price_kopecks").notNull(),
  unitMinutes: integer("unit_minutes").notNull().default(0),
  expectedPaymentKopecks: integer("expected_payment_kopecks"),
  ...timestamps,
});
