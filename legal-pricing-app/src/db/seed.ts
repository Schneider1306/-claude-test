import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import {
  DEFAULT_SETTINGS,
  DEFAULT_COMPLEXITY_OPTIONS,
  DEFAULT_URGENCY_OPTIONS,
  DEFAULT_RESPONSIBILITY_OPTIONS,
  DEFAULT_DISCOUNT_OPTIONS_BPS,
  DISCOUNT_REASON_REQUIRED_THRESHOLD_BPS,
  rublesToKopecks,
} from "@/domain/calculations";

const rub = rublesToKopecks;

type Db = BetterSQLite3Database<typeof schema>;

const STARTER_SERVICES: (typeof schema.services.$inferInsert)[] = [
  {
    name: "Консультация",
    category: "Консультации",
    basePriceKopecks: rub(9_000),
    marketReferenceKopecks: rub(5_000),
    plannedMinutes: 90,
    description: "Устная или письменная консультация по правовому вопросу.",
    extraPaymentTerms: "",
    kind: "standard",
  },
  {
    name: "Анализ документов до 100 страниц",
    category: "Анализ документов",
    basePriceKopecks: rub(12_000),
    marketReferenceKopecks: rub(10_000),
    plannedMinutes: 90,
    description: "Правовой анализ пакета документов объёмом до 100 страниц.",
    extraPaymentTerms: "Свыше 100 страниц — по дополнительному соглашению.",
    kind: "standard",
  },
  {
    name: "Письменное заключение",
    category: "Заключения",
    basePriceKopecks: rub(20_000),
    marketReferenceKopecks: null,
    plannedMinutes: 120,
    description: "Подготовка письменного правового заключения.",
    extraPaymentTerms: "",
    kind: "standard",
  },
  {
    name: "Претензия или досудебное требование",
    category: "Досудебная работа",
    basePriceKopecks: rub(35_000),
    marketReferenceKopecks: null,
    plannedMinutes: 240,
    description: "Подготовка и направление претензии или досудебного требования.",
    extraPaymentTerms: "",
    kind: "standard",
  },
  {
    name: "Обычное дело — начальный этап",
    category: "Обычное дело",
    basePriceKopecks: rub(90_000),
    marketReferenceKopecks: rub(80_000),
    plannedMinutes: 780,
    description:
      "Изучение материалов, формирование позиции, подготовка основного документа и участие в первом заседании.",
    extraPaymentTerms:
      "Дополнительные заседания и процессуальные блоки оплачиваются отдельно.",
    kind: "standard",
  },
  {
    name: "Обычное дело — дополнительное заседание",
    category: "Обычное дело",
    basePriceKopecks: rub(25_000),
    marketReferenceKopecks: null,
    plannedMinutes: 150,
    description: "Участие в дополнительном судебном заседании.",
    extraPaymentTerms: "",
    kind: "hearing",
  },
  {
    name: "Обычное дело — дополнительный процессуальный блок",
    category: "Обычное дело",
    basePriceKopecks: rub(35_000),
    marketReferenceKopecks: null,
    plannedMinutes: 270,
    description: "Дополнительный существенный процессуальный объём работ.",
    extraPaymentTerms: "",
    kind: "process_block",
  },
  {
    name: "Медицинское дело — начальный этап",
    category: "Медицинское дело",
    basePriceKopecks: rub(135_000),
    marketReferenceKopecks: null,
    plannedMinutes: 810,
    description:
      "Изучение материалов, медико-правовая позиция, подготовка основного документа и участие в первом заседании.",
    extraPaymentTerms:
      "Дополнительные заседания, экспертиза и процессуальные блоки оплачиваются отдельно.",
    kind: "standard",
  },
  {
    name: "Медицинское дело — работа с экспертизой",
    category: "Медицинское дело",
    basePriceKopecks: rub(45_000),
    marketReferenceKopecks: null,
    plannedMinutes: 210,
    description: "Формирование вопросов, анализ заключения судебно-медицинской экспертизы.",
    extraPaymentTerms: "",
    kind: "expertise",
  },
  {
    name: "Медицинское дело — дополнительное заседание",
    category: "Медицинское дело",
    basePriceKopecks: rub(25_000),
    marketReferenceKopecks: null,
    plannedMinutes: 150,
    description: "Участие в дополнительном судебном заседании.",
    extraPaymentTerms: "",
    kind: "hearing",
  },
  {
    name: "Медицинское дело — дополнительный процессуальный блок",
    category: "Медицинское дело",
    basePriceKopecks: rub(35_000),
    marketReferenceKopecks: null,
    plannedMinutes: 270,
    description: "Дополнительный существенный процессуальный объём работ.",
    extraPaymentTerms: "",
    kind: "process_block",
  },
  {
    name: "Юридический аудит клиники",
    category: "Клиники",
    basePriceKopecks: rub(60_000),
    marketReferenceKopecks: null,
    plannedMinutes: 330,
    description: "Комплексная проверка юридического соответствия деятельности клиники.",
    extraPaymentTerms: "",
    kind: "standard",
  },
  {
    name: "Комплект документов для клиники",
    category: "Клиники",
    basePriceKopecks: rub(330_000),
    marketReferenceKopecks: null,
    plannedMinutes: 2250,
    description: "Разработка полного комплекта юридических документов клиники.",
    extraPaymentTerms: "",
    kind: "standard",
  },
  {
    name: "Абонентское сопровождение",
    category: "Абонентское обслуживание",
    basePriceKopecks: rub(90_000),
    marketReferenceKopecks: null,
    plannedMinutes: 540,
    description: "Ежемесячное юридическое сопровождение, до 9 часов в месяц.",
    extraPaymentTerms: "Часы сверх лимита оплачиваются дополнительно.",
    kind: "subscription",
  },
];

export function ensureSeedData(db: Db): void {
  // Атомарная вставка через onConflictDoNothing действует как блокировка:
  // при параллельном запуске нескольких процессов (например, воркеров сборки
  // Next.js) только один из них реально вставит строку настроек и продолжит
  // засев справочника услуг — остальные увидят конфликт и просто выйдут.
  const settingsInsertResult = db
    .insert(schema.settings)
    .values({
      id: 1,
      desiredMonthlyIncomeKopecks: DEFAULT_SETTINGS.desiredMonthlyIncomeKopecks,
      rentKopecks: DEFAULT_SETTINGS.rentKopecks,
      internetKopecks: DEFAULT_SETTINGS.internetKopecks,
      stationeryKopecks: DEFAULT_SETTINGS.stationeryKopecks,
      aiAssistantsKopecks: DEFAULT_SETTINGS.aiAssistantsKopecks,
      practiceReserveKopecks: DEFAULT_SETTINGS.practiceReserveKopecks,
      workWeeksPerYear: DEFAULT_SETTINGS.workWeeksPerYear,
      workDaysPerWeek: DEFAULT_SETTINGS.workDaysPerWeek,
      billableMinutesPerDay: DEFAULT_SETTINGS.billableMinutesPerDay,
      lossRateBps: DEFAULT_SETTINGS.lossRateBps,
      taxRateBps: DEFAULT_SETTINGS.taxRateBps,
      targetRateRoundingKopecks: DEFAULT_SETTINGS.targetRateRoundingKopecks,
      travelMinutesCountedRatioBps: DEFAULT_SETTINGS.travelMinutesCountedRatioBps,
      complexityOptionsJson: JSON.stringify(DEFAULT_COMPLEXITY_OPTIONS),
      urgencyOptionsJson: JSON.stringify(DEFAULT_URGENCY_OPTIONS),
      responsibilityOptionsJson: JSON.stringify(DEFAULT_RESPONSIBILITY_OPTIONS),
      discountOptionsJson: JSON.stringify(DEFAULT_DISCOUNT_OPTIONS_BPS),
      discountReasonRequiredThresholdBps: DISCOUNT_REASON_REQUIRED_THRESHOLD_BPS,
    })
    .onConflictDoNothing()
    .run();

  const wonSeedRace = settingsInsertResult.changes > 0;
  if (!wonSeedRace) return;

  for (const service of STARTER_SERVICES) {
    db.insert(schema.services).values(service).run();
  }
}
