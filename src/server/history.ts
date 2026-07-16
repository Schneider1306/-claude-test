import "server-only";
import { db } from "@/db/client";
import { caseHistory } from "@/db/schema";

export function logHistory(entry: {
  caseId?: number | null;
  entityType: string;
  entityId?: number | null;
  action: "create" | "update" | "delete" | "restore";
  summary: string;
  fieldChanges?: { field: string; old: unknown; new: unknown }[];
}) {
  db.insert(caseHistory)
    .values({
      caseId: entry.caseId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      action: entry.action,
      summary: entry.summary,
      fieldChanges: entry.fieldChanges ? JSON.stringify(entry.fieldChanges) : null,
    })
    .run();
}
