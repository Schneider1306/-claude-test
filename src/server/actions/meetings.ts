"use server";

import { db } from "@/db/client";
import { caseMeetings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { meetingFormSchema, type MeetingFormValues } from "@/domain/schemas";
import { logHistory } from "@/server/history";

export async function addMeeting(values: MeetingFormValues) {
  const parsed = meetingFormSchema.parse(values);
  const inserted = db
    .insert(caseMeetings)
    .values({
      caseId: parsed.caseId,
      stageId: parsed.stageId ?? null,
      meetingDate: parsed.meetingDate,
      location: parsed.location ?? "",
      purpose: parsed.purpose ?? "",
      status: parsed.status,
      resultComment: parsed.resultComment ?? "",
    })
    .returning({ id: caseMeetings.id })
    .get();

  logHistory({
    caseId: parsed.caseId,
    entityType: "case_meeting",
    entityId: inserted.id,
    action: "create",
    summary: `Добавлено заседание на ${parsed.meetingDate}`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  return inserted.id;
}

export async function updateMeeting(id: number, values: MeetingFormValues) {
  const parsed = meetingFormSchema.parse(values);
  db.update(caseMeetings)
    .set({
      stageId: parsed.stageId ?? null,
      meetingDate: parsed.meetingDate,
      location: parsed.location ?? "",
      purpose: parsed.purpose ?? "",
      status: parsed.status,
      resultComment: parsed.resultComment ?? "",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(caseMeetings.id, id))
    .run();

  logHistory({
    caseId: parsed.caseId,
    entityType: "case_meeting",
    entityId: id,
    action: "update",
    summary: `Изменено заседание на ${parsed.meetingDate}`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/calendar");
}

export async function deleteMeeting(id: number, caseId: number) {
  db.update(caseMeetings)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(caseMeetings.id, id))
    .run();
  logHistory({
    caseId,
    entityType: "case_meeting",
    entityId: id,
    action: "delete",
    summary: "Удалено заседание",
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/calendar");
}
