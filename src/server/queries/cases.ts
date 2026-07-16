import "server-only";
import { db } from "@/db/client";
import { cases, caseMeetings, expenses, payments, timeEntries } from "@/db/schema";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { getCaseFinancials } from "./case-financials";

export type CaseRow = typeof cases.$inferSelect;

export function generateInternalNumber(): string {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;
  const row = db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(like(cases.internalNumber, `${prefix}%`))
    .get();
  const nextSeq = (row?.count ?? 0) + 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

export function listCases(options?: { includeDeleted?: boolean }): CaseRow[] {
  const rows = db.select().from(cases).orderBy(desc(cases.id)).all();
  if (options?.includeDeleted) return rows;
  return rows.filter((c) => !c.deletedAt);
}

export function getCaseById(id: number): CaseRow | undefined {
  return db.select().from(cases).where(eq(cases.id, id)).get();
}

export function listCasesWithSummary() {
  const all = listCases();
  return all.map((c) => {
    const fin = getCaseFinancials(c.id);
    return { case: c, financials: fin };
  });
}

export function getMeetingsForCase(caseId: number) {
  return db
    .select()
    .from(caseMeetings)
    .where(and(eq(caseMeetings.caseId, caseId), isNull(caseMeetings.deletedAt)))
    .orderBy(desc(caseMeetings.meetingDate))
    .all();
}

export function getTimeEntriesForCase(caseId: number) {
  return db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.caseId, caseId), isNull(timeEntries.deletedAt)))
    .orderBy(desc(timeEntries.workDate), desc(timeEntries.id))
    .all();
}

export function getPaymentsForCase(caseId: number) {
  return db
    .select()
    .from(payments)
    .where(and(eq(payments.caseId, caseId), isNull(payments.deletedAt)))
    .orderBy(desc(payments.paymentDate), desc(payments.id))
    .all();
}

export function getExpensesForCase(caseId: number) {
  return db
    .select()
    .from(expenses)
    .where(and(eq(expenses.caseId, caseId), isNull(expenses.deletedAt)))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id))
    .all();
}

export function searchCases(query: string): CaseRow[] {
  const q = `%${query}%`;
  return db
    .select()
    .from(cases)
    .where(
      and(
        isNull(cases.deletedAt),
        or(like(cases.shortName, q), like(cases.internalNumber, q), like(cases.clientCode, q)),
      ),
    )
    .orderBy(desc(cases.id))
    .all();
}
