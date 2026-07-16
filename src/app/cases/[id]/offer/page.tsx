import { notFound } from "next/navigation";
import { getCaseById, getExpensesForCase, getPaymentsForCase } from "@/server/queries/cases";
import { getCaseFinancials } from "@/server/queries/case-financials";
import { getService } from "@/server/queries/services";
import { formatDateRu, formatHours, formatMoney, stageLineTotalKopecks } from "@/domain/calculations";
import { CASE_TYPE_LABELS } from "@/domain/labels";
import { PrintButton } from "@/components/case/print-button";

export const dynamic = "force-dynamic";

export default async function CommercialOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const caseId = Number(id);
  const caseRow = getCaseById(caseId);
  if (!caseRow) notFound();

  const financials = getCaseFinancials(caseId);
  const stages = financials.stages;
  const expenses = getExpensesForCase(caseId).filter((e) => e.isReimbursable);
  const plannedPayments = getPaymentsForCase(caseId).filter((p) => p.kind === "planned");

  const initialStage = stages[0];
  const includedMeetings = initialStage?.includedMeetings ?? 0;

  const findStageByKeyword = (keyword: string) =>
    stages.find((s) => s.name.toLowerCase().includes(keyword));

  const meetingStage = findStageByKeyword("заседан");
  const expertiseStage = findStageByKeyword("эксперти");
  const urgentStage = stages.find((s) => s.isUrgent);

  const extraBlockText =
    stages
      .map((s) => (s.serviceId ? getService(s.serviceId) : undefined))
      .find((svc) => svc?.extraPaymentBasis)?.extraPaymentBasis ??
    "Новый существенный процессуальный объём, не входящий в перечисленные позиции (например, новое самостоятельное требование, апелляционная/кассационная инстанция, новый ответчик).";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 print:border-0 print:p-0">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-semibold">Коммерческое предложение</h1>
            <p className="text-sm text-muted-foreground">
              {CASE_TYPE_LABELS[caseRow.caseType]} · {formatDateRu(new Date().toISOString())}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">№ {caseRow.internalNumber}</div>
        </div>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Состав и стоимость услуг
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left">
                <tr>
                  <th className="px-3 py-2">Наименование</th>
                  <th className="px-3 py-2">Что входит</th>
                  <th className="px-3 py-2 text-right">Срок</th>
                  <th className="px-3 py-2 text-right">Стоимость</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stages.map((s) => {
                  const service = s.serviceId ? getService(s.serviceId) : undefined;
                  return (
                    <tr key={s.id}>
                      <td className="px-3 py-2 font-medium">
                        {s.name}
                        {s.quantity > 1 ? ` × ${s.quantity}` : ""}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{service?.description || "—"}</td>
                      <td className="px-3 py-2 text-right">{formatDateRu(s.dueDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                        {formatMoney(
                          stageLineTotalKopecks({
                            agreedPriceKopecks: s.agreedPriceKopecks,
                            quantity: s.quantity,
                            plannedMinutes: s.plannedMinutes,
                            discountBp: 0,
                            isUrgent: false,
                            urgencySurchargeBp: 0,
                          }),
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {initialStage && (
            <p className="mt-2 text-sm text-muted-foreground">
              В начальный этап включено заседаний: <strong>{includedMeetings}</strong>. Плановая трудоёмкость этапов:{" "}
              {formatHours(financials.plannedMinutesTotal)}.
            </p>
          )}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Дополнительное заседание
            </h2>
            <p className="text-sm">
              {meetingStage ? `${formatMoney(meetingStage.agreedPriceKopecks)} за одно заседание сверх включённых.` : "Согласовывается отдельно при необходимости."}
            </p>
          </div>
          <div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Экспертиза</h2>
            <p className="text-sm">
              {expertiseStage ? formatMoney(expertiseStage.agreedPriceKopecks) : "Согласовывается отдельно, если потребуется по делу."}
            </p>
          </div>
          <div className="sm:col-span-2">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Дополнительный процессуальный блок
            </h2>
            <p className="text-sm">{extraBlockText}</p>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Внешние расходы (возмещаемые)
          </h2>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              На момент подготовки предложения возмещаемые внешние расходы не выставлены. Госпошлины и иные внешние
              расходы оплачиваются дополнительно по факту их возникновения.
            </p>
          ) : (
            <ul className="text-sm">
              {expenses.map((e) => (
                <li key={e.id} className="flex justify-between border-b border-border py-1 last:border-none">
                  <span>{e.category || "Внешний расход"}</span>
                  <span className="tabular-nums">{formatMoney(e.amountKopecks)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Срочность</h2>
          <p className="text-sm">
            {urgentStage
              ? `Услуга «${urgentStage.name}» выполняется в срочном порядке (в течение 24 часов) с надбавкой ${
                  urgentStage.urgencySurchargeBp / 100
                }% к стоимости этой услуги.`
              : "Услуги оказываются в обычном порядке. Срочное исполнение (в течение 24 часов) согласовывается отдельно и оплачивается с надбавкой."}
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            График платежей
          </h2>
          {plannedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">График платежей согласовывается индивидуально при заключении договора.</p>
          ) : (
            <ul className="text-sm">
              {plannedPayments.map((p) => (
                <li key={p.id} className="flex justify-between border-b border-border py-1 last:border-none">
                  <span>
                    {formatDateRu(p.paymentDate)} — {p.purpose || "платёж"}
                  </span>
                  <span className="tabular-nums">{formatMoney(p.amountKopecks)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-6 rounded-lg bg-primary/5 p-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Итого</span>
            <span className="tabular-nums">{formatMoney(financials.totalToClientKopecks)}</span>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Первоначальная стоимость относится только к перечисленному объёму работ. Дополнительные заседания,
          экспертиза и новый существенный процессуальный объём согласовываются и оплачиваются отдельно до начала
          соответствующего этапа. Если дополнительный этап не возникает, клиент его не оплачивает.
        </p>
      </div>
    </div>
  );
}
