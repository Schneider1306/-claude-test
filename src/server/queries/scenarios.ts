import "server-only";
import { db } from "@/db/client";
import { scenarioItems, scenarioPlans } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export function listScenarios() {
  return db.select().from(scenarioPlans).orderBy(desc(scenarioPlans.id)).all();
}

export function getScenario(id: number) {
  return db.select().from(scenarioPlans).where(eq(scenarioPlans.id, id)).get();
}

export function getScenarioItems(scenarioId: number) {
  return db
    .select()
    .from(scenarioItems)
    .where(eq(scenarioItems.scenarioId, scenarioId))
    .orderBy(scenarioItems.id)
    .all();
}
