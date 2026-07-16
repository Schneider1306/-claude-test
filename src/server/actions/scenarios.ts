"use server";

import { db } from "@/db/client";
import { scenarioItems, scenarioPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  scenarioFormSchema,
  scenarioItemFormSchema,
  type ScenarioFormValues,
  type ScenarioItemFormValues,
} from "@/domain/schemas";
import { hoursToMinutes, rublesToKopecks } from "@/domain/calculations";

export async function createScenario(values: ScenarioFormValues) {
  const parsed = scenarioFormSchema.parse(values);
  const inserted = db
    .insert(scenarioPlans)
    .values({ name: parsed.name, month: parsed.month, comment: parsed.comment ?? "" })
    .returning({ id: scenarioPlans.id })
    .get();
  revalidatePath("/scenarios");
  return inserted.id;
}

export async function deleteScenario(id: number) {
  db.delete(scenarioItems).where(eq(scenarioItems.scenarioId, id)).run();
  db.delete(scenarioPlans).where(eq(scenarioPlans.id, id)).run();
  revalidatePath("/scenarios");
}

export async function addScenarioItem(values: ScenarioItemFormValues) {
  const parsed = scenarioItemFormSchema.parse(values);
  db.insert(scenarioItems)
    .values({
      scenarioId: parsed.scenarioId,
      serviceId: parsed.serviceId ?? null,
      label: parsed.label,
      quantity: parsed.quantity,
      unitPriceKopecks: rublesToKopecks(parsed.unitPriceRubles),
      unitMinutes: hoursToMinutes(parsed.unitHours),
      expectedPaymentKopecks:
        parsed.expectedPaymentRubles != null ? rublesToKopecks(parsed.expectedPaymentRubles) : null,
    })
    .run();
  revalidatePath(`/scenarios/${parsed.scenarioId}`);
}

export async function deleteScenarioItem(id: number, scenarioId: number) {
  db.delete(scenarioItems).where(eq(scenarioItems.id, id)).run();
  revalidatePath(`/scenarios/${scenarioId}`);
}
