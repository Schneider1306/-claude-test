import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { services, settings } from "./schema";
import { rublesToKopecks, hoursToMinutes } from "../domain/calculations";
import { eq, sql } from "drizzle-orm";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "legal-practice.db");

function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);

  // Настройки — единственная строка id=1, значения по умолчанию уже заданы в схеме.
  const existingSettings = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (!existingSettings) {
    db.insert(settings).values({ id: 1 }).run();
    console.log("Созданы настройки по умолчанию.");
  } else {
    console.log("Настройки уже существуют — пропуск.");
  }

  const existingServicesCount = db
    .select({ count: sql<number>`count(*)` })
    .from(services)
    .get();

  if (existingServicesCount && existingServicesCount.count > 0) {
    console.log("Каталог услуг уже заполнен — пропуск.");
    sqlite.close();
    return;
  }

  const catalog: (typeof services.$inferInsert)[] = [
    {
      name: "Консультация",
      category: "Консультации",
      marketPriceKopecks: rublesToKopecks(5000),
      workPriceKopecks: rublesToKopecks(9000),
      plannedMinutes: hoursToMinutes(1.5),
      description: "Устная или письменная консультация по правовому вопросу.",
      extraPaymentBasis: "",
      includedMeetings: 0,
      sortOrder: 1,
    },
    {
      name: "Анализ документов до 100 страниц",
      category: "Анализ документов",
      marketPriceKopecks: rublesToKopecks(10000),
      workPriceKopecks: rublesToKopecks(12000),
      plannedMinutes: hoursToMinutes(1.5),
      description: "Правовой анализ представленных документов объёмом до 100 страниц.",
      extraPaymentBasis: "Свыше 100 страниц — согласовывается отдельно.",
      includedMeetings: 0,
      sortOrder: 2,
    },
    {
      name: "Письменное заключение",
      category: "Анализ документов",
      marketPriceKopecks: rublesToKopecks(20000),
      workPriceKopecks: rublesToKopecks(20000),
      plannedMinutes: hoursToMinutes(2),
      description: "Подготовка письменного правового заключения.",
      extraPaymentBasis: "",
      includedMeetings: 0,
      sortOrder: 3,
    },
    {
      name: "Претензия или досудебное требование",
      category: "Досудебная работа",
      marketPriceKopecks: rublesToKopecks(30000),
      workPriceKopecks: rublesToKopecks(35000),
      plannedMinutes: hoursToMinutes(4),
      description: "Подготовка и направление претензии / досудебного требования.",
      extraPaymentBasis: "",
      includedMeetings: 0,
      sortOrder: 4,
    },
    {
      name: "Обычное судебное дело — начальный этап",
      category: "Обычные дела",
      marketPriceKopecks: rublesToKopecks(80000),
      workPriceKopecks: rublesToKopecks(90000),
      plannedMinutes: hoursToMinutes(13),
      description:
        "Включены: подготовка правовой позиции, основной процессуальный документ и первое заседание.",
      extraPaymentBasis:
        "Дополнительные заседания и новый существенный процессуальный объём — отдельно.",
      includedMeetings: 1,
      sortOrder: 10,
    },
    {
      name: "Обычное дело — дополнительное заседание",
      category: "Обычные дела",
      marketPriceKopecks: rublesToKopecks(25000),
      workPriceKopecks: rublesToKopecks(25000),
      plannedMinutes: hoursToMinutes(2.5),
      description: "Одно дополнительное судебное заседание сверх включённого в начальный этап.",
      extraPaymentBasis: "Заседание сверх количества, включённого в начальный этап.",
      includedMeetings: 0,
      sortOrder: 11,
    },
    {
      name: "Обычное дело — дополнительный процессуальный блок",
      category: "Обычные дела",
      marketPriceKopecks: rublesToKopecks(35000),
      workPriceKopecks: rublesToKopecks(35000),
      plannedMinutes: hoursToMinutes(4.5),
      description: "Новый существенный процессуальный объём работ (напр. новое требование, апелляция).",
      extraPaymentBasis: "Существенный новый процессуальный объём, не входивший в начальную оценку.",
      includedMeetings: 0,
      sortOrder: 12,
    },
    {
      name: "Медицинское дело — начальный этап",
      category: "Медицинские дела",
      marketPriceKopecks: rublesToKopecks(135000),
      workPriceKopecks: rublesToKopecks(135000),
      plannedMinutes: hoursToMinutes(13.5),
      description:
        "Включены: изучение материалов, медико-правовая позиция, первое заседание и завершение начального этапа.",
      extraPaymentBasis:
        "Экспертиза, дополнительные заседания и новый процессуальный объём — отдельно.",
      includedMeetings: 1,
      sortOrder: 20,
    },
    {
      name: "Медицинское дело — работа с экспертизой",
      category: "Медицинские дела",
      marketPriceKopecks: rublesToKopecks(45000),
      workPriceKopecks: rublesToKopecks(45000),
      plannedMinutes: hoursToMinutes(3.5),
      description: "Формулирование вопросов, анализ заключения экспертизы, участие в назначении.",
      extraPaymentBasis: "Назначение/проведение судебной экспертизы по делу.",
      includedMeetings: 0,
      sortOrder: 21,
    },
    {
      name: "Медицинское дело — дополнительное заседание",
      category: "Медицинские дела",
      marketPriceKopecks: rublesToKopecks(25000),
      workPriceKopecks: rublesToKopecks(25000),
      plannedMinutes: hoursToMinutes(2.5),
      description: "Одно дополнительное судебное заседание сверх включённого в начальный этап.",
      extraPaymentBasis: "Заседание сверх количества, включённого в начальный этап.",
      includedMeetings: 0,
      sortOrder: 22,
    },
    {
      name: "Медицинское дело — дополнительный процессуальный блок",
      category: "Медицинские дела",
      marketPriceKopecks: rublesToKopecks(35000),
      workPriceKopecks: rublesToKopecks(35000),
      plannedMinutes: hoursToMinutes(4.5),
      description: "Новый существенный процессуальный объём работ по медицинскому делу.",
      extraPaymentBasis: "Существенный новый процессуальный объём, не входивший в начальную оценку.",
      includedMeetings: 0,
      sortOrder: 23,
    },
    {
      name: "Юридический аудит клиники",
      category: "Клиники",
      marketPriceKopecks: rublesToKopecks(60000),
      workPriceKopecks: rublesToKopecks(60000),
      plannedMinutes: hoursToMinutes(5.5),
      description: "Комплексная проверка юридических рисков деятельности клиники.",
      extraPaymentBasis: "",
      includedMeetings: 0,
      sortOrder: 30,
    },
    {
      name: "Комплект документов для клиники",
      category: "Клиники",
      marketPriceKopecks: rublesToKopecks(330000),
      workPriceKopecks: rublesToKopecks(330000),
      plannedMinutes: hoursToMinutes(37.5),
      description: "Разработка полного комплекта внутренних юридических документов клиники.",
      extraPaymentBasis: "",
      includedMeetings: 0,
      sortOrder: 31,
    },
    {
      name: "Абонентский пакет",
      category: "Абонемент",
      marketPriceKopecks: rublesToKopecks(90000),
      workPriceKopecks: rublesToKopecks(90000),
      plannedMinutes: hoursToMinutes(9),
      description: "Абонентское юридическое обслуживание с лимитом часов в месяц.",
      extraPaymentBasis: "Часы сверх месячного лимита согласовываются и оплачиваются отдельно.",
      includedMeetings: 0,
      monthlyLimitMinutes: hoursToMinutes(9),
      sortOrder: 40,
    },
  ];

  db.insert(services).values(catalog).run();
  console.log(`Каталог услуг заполнен: ${catalog.length} позиций.`);

  sqlite.close();
}

main();
