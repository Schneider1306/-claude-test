"use server";

import { db } from "@/db/client";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { paymentFormSchema, type PaymentFormValues } from "@/domain/schemas";
import { calculatePaymentTax, formatMoney, resolveTaxRateBp, rublesToKopecks } from "@/domain/calculations";
import { getSettings } from "@/server/queries/settings";
import { logHistory } from "@/server/history";

export async function addPayment(values: PaymentFormValues) {
  const parsed = paymentFormSchema.parse(values);
  const settings = getSettings();
  const amountKopecks = rublesToKopecks(parsed.amountRubles);

  // Налог считается только по фактически полученным платежам; ставка фиксируется как исторический снимок.
  const taxRateBp = parsed.kind === "actual" ? resolveTaxRateBp(settings, parsed.payerType) : 0;
  const taxAmountKopecks = parsed.kind === "actual" ? calculatePaymentTax(amountKopecks, taxRateBp) : 0;

  const inserted = db
    .insert(payments)
    .values({
      caseId: parsed.caseId,
      stageId: parsed.stageId ?? null,
      paymentDate: parsed.paymentDate,
      amountKopecks,
      payerType: parsed.payerType,
      purpose: parsed.purpose ?? "",
      kind: parsed.kind,
      taxRateBp,
      taxAmountKopecks,
      paymentMethod: parsed.paymentMethod,
      comment: parsed.comment ?? "",
    })
    .returning({ id: payments.id })
    .get();

  const kindLabel: Record<string, string> = {
    planned: "Запланирован платёж",
    actual: "Получен платёж",
    refund: "Оформлен возврат",
    expense_reimbursement: "Получено возмещение расходов",
  };

  logHistory({
    caseId: parsed.caseId,
    entityType: "payment",
    entityId: inserted.id,
    action: "create",
    summary: `${kindLabel[parsed.kind]}: ${formatMoney(amountKopecks)} (${parsed.paymentDate})`,
  });

  revalidatePath(`/cases/${parsed.caseId}`);
  revalidatePath("/payments");
  revalidatePath("/cases");
  revalidatePath("/");
  return inserted.id;
}

export async function deletePayment(id: number, caseId: number) {
  db.update(payments)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(payments.id, id))
    .run();
  logHistory({
    caseId,
    entityType: "payment",
    entityId: id,
    action: "delete",
    summary: "Удалён платёж",
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/payments");
  revalidatePath("/cases");
  revalidatePath("/");
}
