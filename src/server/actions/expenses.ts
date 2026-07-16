"use server";

import { db } from "@/db/client";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { expenseFormSchema, type ExpenseFormValues } from "@/domain/schemas";
import { formatMoney, rublesToKopecks } from "@/domain/calculations";
import { logHistory } from "@/server/history";

export async function addExpense(values: ExpenseFormValues) {
  const parsed = expenseFormSchema.parse(values);
  const amountKopecks = rublesToKopecks(parsed.amountRubles);
  const inserted = db
    .insert(expenses)
    .values({
      caseId: parsed.caseId,
      expenseDate: parsed.expenseDate,
      amountKopecks,
      category: parsed.category ?? "",
      isReimbursable: parsed.isReimbursable,
      isReimbursed: parsed.isReimbursed,
      comment: parsed.comment ?? "",
    })
    .returning({ id: expenses.id })
    .get();

  logHistory({
    caseId: parsed.caseId,
    entityType: "expense",
    entityId: inserted.id,
    action: "create",
    summary: `Добавлен расход: ${formatMoney(amountKopecks)} (${parsed.category || "без категории"})`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
  return inserted.id;
}

export async function updateExpense(id: number, values: ExpenseFormValues) {
  const parsed = expenseFormSchema.parse(values);
  db.update(expenses)
    .set({
      expenseDate: parsed.expenseDate,
      amountKopecks: rublesToKopecks(parsed.amountRubles),
      category: parsed.category ?? "",
      isReimbursable: parsed.isReimbursable,
      isReimbursed: parsed.isReimbursed,
      comment: parsed.comment ?? "",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(expenses.id, id))
    .run();
  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
}

export async function deleteExpense(id: number, caseId: number) {
  db.update(expenses)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(expenses.id, id))
    .run();
  logHistory({
    caseId,
    entityType: "expense",
    entityId: id,
    action: "delete",
    summary: "Удалён расход",
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  revalidatePath("/");
}
