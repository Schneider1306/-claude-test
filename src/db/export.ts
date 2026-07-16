import { db } from "./client";
import {
  cases,
  caseStages,
  caseMeetings,
  timeEntries,
  payments,
  expenses,
  caseHistory,
  services,
  settings,
  scenarioPlans,
  scenarioItems,
} from "./schema";

/** Полный экспорт всех данных приложения в структуру для JSON. */
export function exportAllDataAsJson() {
  return {
    exportedAt: new Date().toISOString(),
    version: 1,
    data: {
      settings: db.select().from(settings).all(),
      services: db.select().from(services).all(),
      cases: db.select().from(cases).all(),
      caseStages: db.select().from(caseStages).all(),
      caseMeetings: db.select().from(caseMeetings).all(),
      timeEntries: db.select().from(timeEntries).all(),
      payments: db.select().from(payments).all(),
      expenses: db.select().from(expenses).all(),
      caseHistory: db.select().from(caseHistory).all(),
      scenarioPlans: db.select().from(scenarioPlans).all(),
      scenarioItems: db.select().from(scenarioItems).all(),
    },
  };
}
