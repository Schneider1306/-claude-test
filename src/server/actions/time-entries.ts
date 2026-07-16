"use server";

import { db } from "@/db/client";
import { timeEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { timeEntryFormSchema, type TimeEntryFormValues } from "@/domain/schemas";
import { logHistory } from "@/server/history";
import { formatHours } from "@/domain/calculations";

export async function addTimeEntry(values: TimeEntryFormValues) {
  const parsed = timeEntryFormSchema.parse(values);
  const inserted = db
    .insert(timeEntries)
    .values({
      caseId: parsed.caseId,
      stageId: parsed.stageId ?? null,
      workDate: parsed.workDate,
      workType: parsed.workType ?? "",
      minutes: parsed.minutes,
      isBillable: parsed.isBillable,
      comment: parsed.comment ?? "",
    })
    .returning({ id: timeEntries.id })
    .get();

  logHistory({
    caseId: parsed.caseId,
    entityType: "time_entry",
    entityId: inserted.id,
    action: "create",
    summary: `Учтено время: ${formatHours(parsed.minutes)} (${parsed.workDate})`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/time");
  revalidatePath("/cases");
  revalidatePath("/");
  return inserted.id;
}

export async function deleteTimeEntry(id: number, caseId: number) {
  db.update(timeEntries)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(timeEntries.id, id))
    .run();
  logHistory({
    caseId,
    entityType: "time_entry",
    entityId: id,
    action: "delete",
    summary: "Удалена запись времени",
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/time");
  revalidatePath("/cases");
  revalidatePath("/");
}
