import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Настройки (единственная строка, id = 1)
// ---------------------------------------------------------------------------

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey().default(1),

  desiredMonthlyIncomeKopecks: integer("desired_monthly_income_kopecks").notNull(),
  rentKopecks: integer("rent_kopecks").notNull(),
  internetKopecks: integer("internet_kopecks").notNull(),
  stationeryKopecks: integer("stationery_kopecks").notNull(),
  aiAssistantsKopecks: integer("ai_assistants_kopecks").notNull(),
  practiceReserveKopecks: integer("practice_reserve_kopecks").notNull(),

  workWeeksPerYear: integer("work_weeks_per_year").notNull(),
  workDaysPerWeek: integer("work_days_per_week").notNull(),
  billableMinutesPerDay: integer("billable_minutes_per_day").notNull(),

  lossRateBps: integer("loss_rate_bps").notNull(),
  taxRateBps: integer("tax_rate_bps").notNull(),
  targetRateRoundingKopecks: integer("target_rate_rounding_kopecks").notNull(),

  travelMinutesCountedRatioBps: integer("travel_minutes_counted_ratio_bps").notNull(),

  complexityOptionsJson: text("complexity_options_json").notNull(),
  urgencyOptionsJson: text("urgency_options_json").notNull(),
  responsibilityOptionsJson: text("responsibility_options_json").notNull(),
  discountOptionsJson: text("discount_options_json").notNull(),
  discountReasonRequiredThresholdBps: integer(
    "discount_reason_required_threshold_bps",
  ).notNull(),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// ---------------------------------------------------------------------------
// Справочник услуг
// ---------------------------------------------------------------------------

export const services = sqliteTable("services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  basePriceKopecks: integer("base_price_kopecks").notNull(),
  marketReferenceKopecks: integer("market_reference_kopecks"),
  plannedMinutes: integer("planned_minutes").notNull(),
  description: text("description").notNull().default(""),
  extraPaymentTerms: text("extra_payment_terms").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  kind: text("kind", {
    enum: ["standard", "hearing", "expertise", "process_block", "subscription", "custom"],
  })
    .notNull()
    .default("standard"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const servicePriceHistory = sqliteTable(
  "service_price_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    oldPriceKopecks: integer("old_price_kopecks").notNull(),
    newPriceKopecks: integer("new_price_kopecks").notNull(),
    oldPlannedMinutes: integer("old_planned_minutes").notNull(),
    newPlannedMinutes: integer("new_planned_minutes").notNull(),
    comment: text("comment").notNull().default(""),
    changedAt: text("changed_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [index("service_price_history_service_id_idx").on(t.serviceId)],
);

// ---------------------------------------------------------------------------
// Расчёты
// ---------------------------------------------------------------------------

export const CALCULATION_STATUSES = [
  "draft",
  "proposal_sent",
  "agreed",
  "declined",
  "in_progress",
  "completed",
  "archived",
] as const;
export type CalculationStatus = (typeof CALCULATION_STATUSES)[number];

export const calculations = sqliteTable(
  "calculations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: integer("number").notNull(),
    internalName: text("internal_name").notNull(),
    clientCode: text("client_code").notNull(),
    caseType: text("case_type").notNull().default(""),
    status: text("status", { enum: CALCULATION_STATUSES })
      .notNull()
      .default("draft"),

    discountBps: integer("discount_bps").notNull().default(0),
    discountReason: text("discount_reason").notNull().default(""),
    travelMinutes: integer("travel_minutes").notNull().default(0),
    comment: text("comment").notNull().default(""),

    baseAmountKopecks: integer("base_amount_kopecks").notNull().default(0),
    surchargeKopecks: integer("surcharge_kopecks").notNull().default(0),
    professionalBeforeDiscountKopecks: integer(
      "professional_before_discount_kopecks",
    )
      .notNull()
      .default(0),
    discountAmountKopecks: integer("discount_amount_kopecks").notNull().default(0),
    professionalAfterDiscountKopecks: integer(
      "professional_after_discount_kopecks",
    )
      .notNull()
      .default(0),
    externalExpensesKopecks: integer("external_expenses_kopecks")
      .notNull()
      .default(0),
    clientTotalKopecks: integer("client_total_kopecks").notNull().default(0),
    plannedMinutes: integer("planned_minutes").notNull().default(0),
    targetRateKopecksSnapshot: integer("target_rate_kopecks_snapshot")
      .notNull()
      .default(0),
    economicMinimumKopecks: integer("economic_minimum_kopecks"),
    effectiveRateKopecks: integer("effective_rate_kopecks"),
    rateStatus: text("rate_status", {
      enum: ["green", "yellow", "red", "no-data"],
    })
      .notNull()
      .default("no-data"),

    agreedPriceKopecks: integer("agreed_price_kopecks"),
    actualPriceKopecks: integer("actual_price_kopecks"),
    actualMinutes: integer("actual_minutes"),

    paymentScheduleJson: text("payment_schedule_json").notNull().default("[]"),

    version: integer("version").notNull().default(1),
    parentCalculationId: integer("parent_calculation_id"),
    isDraftAutosave: integer("is_draft_autosave", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [
    index("calculations_status_idx").on(t.status),
    index("calculations_created_at_idx").on(t.createdAt),
    index("calculations_parent_idx").on(t.parentCalculationId),
  ],
);

export const calculationLines = sqliteTable(
  "calculation_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    calculationId: integer("calculation_id")
      .notNull()
      .references(() => calculations.id, { onDelete: "cascade" }),
    serviceId: integer("service_id").references(() => services.id),
    kind: text("kind", {
      enum: ["standard", "hearing", "expertise", "process_block", "subscription", "custom"],
    })
      .notNull()
      .default("standard"),
    name: text("name").notNull(),
    basePriceKopecks: integer("base_price_kopecks").notNull(),
    quantity: integer("quantity").notNull().default(1),
    plannedMinutesPerUnit: integer("planned_minutes_per_unit").notNull(),
    complexityBps: integer("complexity_bps").notNull().default(0),
    urgencyBps: integer("urgency_bps").notNull().default(0),
    responsibilityBps: integer("responsibility_bps").notNull().default(0),
    comment: text("comment").notNull().default(""),
    manualOverridesJson: text("manual_overrides_json").notNull().default("[]"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("calculation_lines_calculation_id_idx").on(t.calculationId)],
);

export const EXPENSE_CATEGORIES = [
  "state_duty",
  "expertise",
  "notary",
  "travel_tickets",
  "accommodation",
  "taxi",
  "post",
  "specialist",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const calculationExpenses = sqliteTable(
  "calculation_expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    calculationId: integer("calculation_id")
      .notNull()
      .references(() => calculations.id, { onDelete: "cascade" }),
    category: text("category", { enum: EXPENSE_CATEGORIES }).notNull(),
    description: text("description").notNull().default(""),
    amountKopecks: integer("amount_kopecks").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("calculation_expenses_calculation_id_idx").on(t.calculationId)],
);

export const calculationChangeLog = sqliteTable(
  "calculation_change_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    calculationId: integer("calculation_id")
      .notNull()
      .references(() => calculations.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    reason: text("reason").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [index("calculation_change_log_calculation_id_idx").on(t.calculationId)],
);

export const calculationStatusHistory = sqliteTable(
  "calculation_status_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    calculationId: integer("calculation_id")
      .notNull()
      .references(() => calculations.id, { onDelete: "cascade" }),
    status: text("status", { enum: CALCULATION_STATUSES }).notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [index("calculation_status_history_calculation_id_idx").on(t.calculationId)],
);
