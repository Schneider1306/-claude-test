import "server-only";
import { db } from "@/db/client";
import { cases, caseMeetings, caseStages, payments } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export type CalendarEventType = "meeting" | "stage_due" | "payment" | "next_action";

export interface CalendarEvent {
  date: string;
  type: CalendarEventType;
  title: string;
  caseId: number;
  caseName: string;
  overdue: boolean;
}

export function getCalendarEvents(): CalendarEvent[] {
  const todayIso = new Date().toISOString().slice(0, 10);
  const events: CalendarEvent[] = [];

  const meetings = db
    .select({ meeting: caseMeetings, caseRow: cases })
    .from(caseMeetings)
    .innerJoin(cases, eq(caseMeetings.caseId, cases.id))
    .where(and(isNull(caseMeetings.deletedAt), isNull(cases.deletedAt)))
    .all();
  for (const { meeting, caseRow } of meetings) {
    if (meeting.status === "cancelled") continue;
    const date = meeting.meetingDate.slice(0, 10);
    events.push({
      date,
      type: "meeting",
      title: `Заседание: ${meeting.purpose || caseRow.shortName}`,
      caseId: caseRow.id,
      caseName: caseRow.shortName,
      overdue: date < todayIso && meeting.status === "scheduled",
    });
  }

  const stages = db
    .select({ stage: caseStages, caseRow: cases })
    .from(caseStages)
    .innerJoin(cases, eq(caseStages.caseId, cases.id))
    .where(and(isNull(caseStages.deletedAt), isNull(cases.deletedAt)))
    .all();
  for (const { stage, caseRow } of stages) {
    if (!stage.dueDate || stage.status === "done" || stage.status === "cancelled") continue;
    events.push({
      date: stage.dueDate,
      type: "stage_due",
      title: `Срок этапа: ${stage.name}`,
      caseId: caseRow.id,
      caseName: caseRow.shortName,
      overdue: stage.dueDate < todayIso,
    });
  }

  const plannedPayments = db
    .select({ payment: payments, caseRow: cases })
    .from(payments)
    .innerJoin(cases, eq(payments.caseId, cases.id))
    .where(and(eq(payments.kind, "planned"), isNull(payments.deletedAt), isNull(cases.deletedAt)))
    .all();
  for (const { payment, caseRow } of plannedPayments) {
    events.push({
      date: payment.paymentDate,
      type: "payment",
      title: `Плановая оплата: ${payment.purpose || "платёж"}`,
      caseId: caseRow.id,
      caseName: caseRow.shortName,
      overdue: payment.paymentDate < todayIso,
    });
  }

  const nextActionCases = db
    .select()
    .from(cases)
    .where(isNull(cases.deletedAt))
    .all()
    .filter((c) => c.nextActionDate);
  for (const c of nextActionCases) {
    events.push({
      date: c.nextActionDate as string,
      type: "next_action",
      title: `Контрольная дата по делу «${c.shortName}»`,
      caseId: c.id,
      caseName: c.shortName,
      overdue: (c.nextActionDate as string) < todayIso,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
