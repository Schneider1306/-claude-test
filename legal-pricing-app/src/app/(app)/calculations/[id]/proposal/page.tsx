import { notFound } from "next/navigation";
import { getCalculationDetail } from "@/server/queries";
import { formatKopecks, formatDate } from "@/lib/format";
import { LINE_KIND_LABELS, EXPENSE_CATEGORY_LABELS } from "@/lib/status-labels";
import { CLIENT_PROPOSAL_DISCLAIMER } from "@/domain/calculations";
import { PrintButton } from "@/components/calculations/print-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProposalPage({ params }: Props) {
  const { id } = await params;
  const detail = getCalculationDetail(Number(id));
  if (!detail) notFound();

  const { calculation, lines, expenses, totals } = detail;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>

      <div className="rounded-lg border border-border bg-card p-8 print:border-0 print:p-0">
        <header className="mb-6 flex items-start justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-semibold">Коммерческое предложение</h1>
            <p className="text-sm text-muted-foreground">
              № {calculation.number} от {formatDate(calculation.createdAt)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Клиент: {calculation.clientCode}</p>
        </header>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Состав работ
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2">Этап / услуга</th>
                <th className="py-2 text-right">Кол-во</th>
                <th className="py-2 text-right">Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const coeff = line.complexityBps + line.urgencyBps + line.responsibilityBps;
                const amount =
                  line.basePriceKopecks * line.quantity +
                  Math.round(line.basePriceKopecks * line.quantity * (coeff / 10000));
                return (
                  <tr key={line.id} className="border-b border-border/50">
                    <td className="py-2">
                      <p>{line.name}</p>
                      <p className="text-xs text-muted-foreground">{LINE_KIND_LABELS[line.kind]}</p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{line.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{formatKopecks(amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {expenses.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Дополнительные (внешние) расходы
            </h2>
            <table className="w-full text-sm">
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/50">
                    <td className="py-2">{e.description || EXPENSE_CATEGORY_LABELS[e.category]}</td>
                    <td className="py-2 text-right tabular-nums">{formatKopecks(e.amountKopecks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mb-6 flex flex-col gap-2 rounded-md bg-secondary p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Вознаграждение</span>
            <span className="tabular-nums">{formatKopecks(totals.professionalAfterDiscountKopecks)}</span>
          </div>
          {totals.discountAmountKopecks > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>В том числе скидка</span>
              <span className="tabular-nums">{formatKopecks(totals.discountAmountKopecks)}</span>
            </div>
          )}
          {totals.externalExpensesKopecks > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span>Внешние расходы</span>
              <span className="tabular-nums">{formatKopecks(totals.externalExpensesKopecks)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 text-lg font-semibold">
            <span>Итого</span>
            <span className="tabular-nums text-primary">{formatKopecks(totals.clientTotalKopecks)}</span>
          </div>
        </section>

        <section className="text-sm leading-relaxed text-muted-foreground">
          <p>{CLIENT_PROPOSAL_DISCLAIMER}</p>
        </section>
      </div>
    </div>
  );
}
