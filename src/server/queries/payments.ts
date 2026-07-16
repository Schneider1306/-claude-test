import "server-only";
import { db } from "@/db/client";
import { cases, payments } from "@/db/schema";
import { desc, eq, isNull } from "drizzle-orm";

export function listAllPayments() {
  return db
    .select({ payment: payments, caseRow: cases })
    .from(payments)
    .innerJoin(cases, eq(payments.caseId, cases.id))
    .where(isNull(payments.deletedAt))
    .orderBy(desc(payments.paymentDate), desc(payments.id))
    .all();
}
