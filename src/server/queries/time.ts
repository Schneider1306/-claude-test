import "server-only";
import { db } from "@/db/client";
import { cases, timeEntries } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";

export function listAllTimeEntries() {
  return db
    .select({ entry: timeEntries, caseRow: cases })
    .from(timeEntries)
    .innerJoin(cases, eq(timeEntries.caseId, cases.id))
    .where(isNull(timeEntries.deletedAt))
    .orderBy(desc(timeEntries.workDate), desc(timeEntries.id))
    .all();
}
