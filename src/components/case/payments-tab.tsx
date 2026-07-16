"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu, formatMoney } from "@/domain/calculations";
import { PAYER_TYPE_LABELS, PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/domain/labels";
import { deletePayment } from "@/server/actions/payments";
import { PaymentFormModal } from "./payment-form-modal";
import type { StageRow } from "@/server/queries/case-financials";
import type { payments } from "@/db/schema";

type Payment = typeof payments.$inferSelect;

const KIND_BADGE: Record<string, "neutral" | "primary" | "accent" | "warning" | "danger"> = {
  planned: "primary",
  actual: "accent",
  refund: "danger",
  expense_reimbursement: "warning",
};

export function PaymentsTab({
  caseId,
  payments,
  stages,
  defaultPayerType,
}: {
  caseId: number;
  payments: Payment[];
  stages: StageRow[];
  defaultPayerType: "individual" | "organization";
}) {
  const router = useRouter();
  const groups: Record<string, Payment[]> = { planned: [], actual: [], refund: [], expense_reimbursement: [] };
  for (const p of payments) groups[p.kind]?.push(p);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end no-print">
        <PaymentFormModal caseId={caseId} stages={stages} defaultPayerType={defaultPayerType} trigger={<Button>+ Добавить платёж</Button>} />
      </div>

      {(["planned", "actual", "refund", "expense_reimbursement"] as const).map((kind) => (
        <div key={kind}>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            {PAYMENT_KIND_LABELS[kind]} ({groups[kind].length})
          </h3>
          <Card>
            <Table>
              <Thead>
                <tr>
                  <Th>Дата</Th>
                  <Th className="text-right">Сумма</Th>
                  <Th>Плательщик</Th>
                  <Th>Способ</Th>
                  <Th>Назначение</Th>
                  {kind === "actual" && <Th className="text-right">Налог</Th>}
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {groups[kind].map((p) => (
                  <Tr key={p.id}>
                    <Td>{formatDateRu(p.paymentDate)}</Td>
                    <Td className="text-right tabular-nums font-medium">{formatMoney(p.amountKopecks)}</Td>
                    <Td>{PAYER_TYPE_LABELS[p.payerType]}</Td>
                    <Td>{PAYMENT_METHOD_LABELS[p.paymentMethod]}</Td>
                    <Td className="max-w-56 truncate text-muted-foreground">{p.purpose || "—"}</Td>
                    {kind === "actual" && (
                      <Td className="text-right tabular-nums text-muted-foreground">
                        {formatMoney(p.taxAmountKopecks)} ({p.taxRateBp / 100}%)
                      </Td>
                    )}
                    <Td className="no-print">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          if (!confirm("Удалить платёж?")) return;
                          await deletePayment(p.id, caseId);
                          router.refresh();
                        }}
                      >
                        Удалить
                      </Button>
                    </Td>
                  </Tr>
                ))}
                {groups[kind].length === 0 && (
                  <Tr>
                    <Td colSpan={kind === "actual" ? 7 : 6} className="py-6 text-center text-muted-foreground">
                      Нет записей.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Card>
        </div>
      ))}
    </div>
  );
}
