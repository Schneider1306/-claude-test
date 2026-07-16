import Link from "next/link";
import { listAllPayments } from "@/server/queries/payments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateRu, formatMoney } from "@/domain/calculations";
import { PAYER_TYPE_LABELS, PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/domain/labels";
import { PAYMENT_KINDS } from "@/db/schema";
import { GlobalDeletePaymentButton } from "@/components/case/global-delete-payment-button";

export const dynamic = "force-dynamic";

const KIND_BADGE: Record<string, "neutral" | "primary" | "accent" | "warning" | "danger"> = {
  planned: "primary",
  actual: "accent",
  refund: "danger",
  expense_reimbursement: "warning",
};

type SearchParams = { [key: string]: string | string[] | undefined };
function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const kind = str(sp.kind);
  const from = str(sp.from);
  const to = str(sp.to);
  const q = str(sp.q).toLowerCase();

  let rows = listAllPayments();
  rows = rows.filter(({ payment: p, caseRow: c }) => {
    if (kind && p.kind !== kind) return false;
    if (from && p.paymentDate < from) return false;
    if (to && p.paymentDate > to) return false;
    if (q && !`${c.shortName} ${c.internalNumber} ${p.purpose}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const total = rows.reduce((sum, r) => sum + r.payment.amountKopecks, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Платежи</h1>

      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Тип</label>
              <Select name="kind" defaultValue={kind} className="min-w-48">
                <option value="">Все типы</option>
                {PAYMENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PAYMENT_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">С даты</label>
              <Input type="date" name="from" defaultValue={from} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">По дату</label>
              <Input type="date" name="to" defaultValue={to} />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Поиск</label>
              <Input name="q" defaultValue={q} placeholder="Дело, назначение…" />
            </div>
            <Button type="submit" variant="outline">
              Применить
            </Button>
            {(kind || from || to || q) && (
              <Link href="/payments" className="text-sm text-muted-foreground hover:underline">
                Сбросить
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Найдено {rows.length} платежей на сумму <strong>{formatMoney(total)}</strong>
      </p>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Дата</Th>
              <Th>Дело</Th>
              <Th>Тип</Th>
              <Th className="text-right">Сумма</Th>
              <Th>Плательщик</Th>
              <Th>Способ</Th>
              <Th>Назначение</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {rows.map(({ payment: p, caseRow: c }) => (
              <Tr key={p.id}>
                <Td>{formatDateRu(p.paymentDate)}</Td>
                <Td className="max-w-40 truncate">
                  <Link href={`/cases/${c.id}?tab=payments`} className="text-primary hover:underline">
                    {c.shortName}
                  </Link>
                </Td>
                <Td>
                  <Badge variant={KIND_BADGE[p.kind]}>{PAYMENT_KIND_LABELS[p.kind]}</Badge>
                </Td>
                <Td className="text-right tabular-nums font-medium">{formatMoney(p.amountKopecks)}</Td>
                <Td>{PAYER_TYPE_LABELS[p.payerType]}</Td>
                <Td>{PAYMENT_METHOD_LABELS[p.paymentMethod]}</Td>
                <Td className="max-w-56 truncate text-muted-foreground">{p.purpose || "—"}</Td>
                <Td>
                  <GlobalDeletePaymentButton paymentId={p.id} caseId={c.id} />
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <Tr>
                <Td colSpan={8} className="py-8 text-center text-muted-foreground">
                  Платежей не найдено.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
