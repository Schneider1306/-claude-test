"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu, formatMoney } from "@/domain/calculations";
import { deleteExpense } from "@/server/actions/expenses";
import { ExpenseFormModal } from "./expense-form-modal";
import type { expenses } from "@/db/schema";

type Expense = typeof expenses.$inferSelect;

export function ExpensesTab({ caseId, expenses }: { caseId: number; expenses: Expense[] }) {
  const router = useRouter();
  const total = expenses.reduce((sum, e) => sum + e.amountKopecks, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Всего расходов: {formatMoney(total)}</p>
        <div className="no-print">
          <ExpenseFormModal caseId={caseId} trigger={<Button>+ Добавить расход</Button>} />
        </div>
      </div>
      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Дата</Th>
              <Th>Категория</Th>
              <Th className="text-right">Сумма</Th>
              <Th>Возмещаемый</Th>
              <Th>Возмещён</Th>
              <Th>Комментарий</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {expenses.map((e) => (
              <Tr key={e.id}>
                <Td>{formatDateRu(e.expenseDate)}</Td>
                <Td>{e.category || "—"}</Td>
                <Td className="text-right tabular-nums font-medium">{formatMoney(e.amountKopecks)}</Td>
                <Td>
                  <Badge variant={e.isReimbursable ? "accent" : "neutral"}>{e.isReimbursable ? "Да" : "Нет"}</Badge>
                </Td>
                <Td>
                  <Badge variant={e.isReimbursed ? "accent" : "warning"}>{e.isReimbursed ? "Да" : "Нет"}</Badge>
                </Td>
                <Td className="max-w-56 truncate text-muted-foreground">{e.comment || "—"}</Td>
                <Td className="no-print">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Удалить расход?")) return;
                      await deleteExpense(e.id, caseId);
                      router.refresh();
                    }}
                  >
                    Удалить
                  </Button>
                </Td>
              </Tr>
            ))}
            {expenses.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Расходов пока нет.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
