import Link from "next/link";
import { getDashboardData } from "@/server/queries/dashboard";
import { MetricTile } from "@/components/ui/metric-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDateRu,
  formatHours,
  formatMoney,
  formatPercent,
} from "@/domain/calculations";

export const dynamic = "force-dynamic";

const NPD_LEVEL_LABEL: Record<string, string> = {
  ok: "В пределах нормы",
  warning70: "Достигнуто 70% лимита",
  warning85: "Достигнуто 85% лимита — будьте внимательны",
  exceeded: "Лимит НПД превышен",
};

const NPD_LEVEL_TONE: Record<string, "accent" | "warning" | "danger"> = {
  ok: "accent",
  warning70: "warning",
  warning85: "warning",
  exceeded: "danger",
};

export default function DashboardPage() {
  const d = getDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Главная</h1>
        <p className="text-sm text-muted-foreground">
          Экономика практики на сегодня, {formatDateRu(new Date().toISOString())}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Получено за месяц"
          value={formatMoney(d.receivedThisMonthKopecks)}
          tone="accent"
          explanation="Сумма фактически полученных платежей (тип «фактический») с датой в текущем календарном месяце."
        />
        <MetricTile
          label="Выставлено за месяц"
          value={formatMoney(d.invoicedThisMonthKopecks)}
          explanation="Сумма плановых и фактических платежей с датой в текущем месяце — сколько выставлено клиентам к оплате."
        />
        <MetricTile
          label="Задолженность клиентов"
          value={formatMoney(d.debtTotalKopecks)}
          tone={d.debtTotalKopecks > 0 ? "danger" : "accent"}
          explanation="Сумма (согласованные начисления − полученные оплаты) по всем активным делам, только положительные значения."
        />
        <MetricTile
          label="Налоговый резерв за месяц"
          value={formatMoney(d.taxThisMonthKopecks)}
          explanation="Сумма налога, рассчитанного по фактически полученным платежам текущего месяца — отложите эту сумму на уплату налога."
        />
        <MetricTile
          label="Постоянные расходы"
          value={formatMoney(d.fixedExpensesKopecks)}
          explanation="Аренда + интернет + канцелярия + ИИ-помощники в месяц (без резерва практики). Настраивается в разделе «Настройки»."
        />
        <MetricTile
          label="Резерв практики"
          value={formatMoney(d.practiceReserveKopecks)}
          explanation="Ежемесячный резерв на непредвиденные расходы практики, заданный в настройках."
        />
        <MetricTile
          label="Прогноз личного дохода"
          value={formatMoney(d.personalIncomeForecastKopecks)}
          tone={d.personalIncomeForecastKopecks >= 0 ? "accent" : "danger"}
          explanation="Получено за месяц − налог с полученного − постоянные расходы − резерв практики. Скидки уже учтены в согласованных ценах и повторно не вычитаются."
        />
        <MetricTile
          label="Выполнение цели 450 000 ₽"
          value={formatPercent(Math.round(d.goalProgressFraction * 10000))}
          tone={d.goalProgressFraction >= 1 ? "accent" : d.goalProgressFraction >= 0.7 ? "warning" : "danger"}
          hint={`Цель: ${formatMoney(d.settings.desiredMonthlyIncomeKopecks)} в месяц`}
          explanation="Прогноз личного дохода за месяц, делённый на желаемый личный доход из настроек."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricTile
          label="Фактические часы (месяц)"
          value={formatHours(d.billableMinutesThisMonth)}
          hint={`Всего с внутренними: ${formatHours(d.allMinutesThisMonth)}`}
          explanation="Сумма оплачиваемых минут из учёта времени за текущий месяц."
        />
        <MetricTile
          label="Остаток месячной ёмкости"
          value={formatHours(d.capacityRemainingMinutes)}
          tone={d.workload.isOverloaded ? "danger" : "neutral"}
          hint={`Ёмкость: ${formatHours(d.capacityMinutes)} · занято ${formatPercent(
            Math.round(d.workload.usedFraction * 10000),
          )}`}
          explanation="Месячная оплачиваемая ёмкость (недели × дни × часы ÷ 12) минус фактически отработанные оплачиваемые часы за месяц."
        />
        <MetricTile
          label="Средняя эффективная ставка"
          value={d.avgEffectiveRateKopecksPerHour ? formatMoney(d.avgEffectiveRateKopecksPerHour) : "Нет данных"}
          hint={`Контрольная ставка: ${formatMoney(d.benchmark.controlRateKopecksPerHour)}/ч`}
          tone={
            d.avgEffectiveRateKopecksPerHour &&
            d.avgEffectiveRateKopecksPerHour >= d.benchmark.controlRateKopecksPerHour
              ? "accent"
              : "warning"
          }
          explanation="Средневзвешенная по фактическим часам эффективная ставка по всем делам с зафиксированным временем."
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Лимит НПД за {new Date().getFullYear()} год</CardTitle>
          <Badge variant={NPD_LEVEL_TONE[d.npdLimit.level]}>{NPD_LEVEL_LABEL[d.npdLimit.level]}</Badge>
        </CardHeader>
        <CardContent>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(d.npdLimit.usedFraction * 100, 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Получено {formatMoney(d.npdLimit.receivedThisYearKopecks)} из лимита{" "}
            {formatMoney(d.npdLimit.limitKopecks)} ({formatPercent(Math.round(d.npdLimit.usedFraction * 10000))})
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Активные дела</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{d.activeCasesCount}</div>
            <Link href="/cases?status=active" className="mt-2 inline-block text-sm text-primary hover:underline">
              Смотреть список →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ближайшие оплаты</CardTitle>
          </CardHeader>
          <CardContent>
            {d.upcomingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Плановых оплат не найдено.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {d.upcomingPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <Link href={`/cases/${p.caseId}?tab=payments`} className="hover:underline">
                      {formatDateRu(p.paymentDate)} — {p.purpose || "оплата"}
                    </Link>
                    <span className="font-medium tabular-nums">{formatMoney(p.amountKopecks)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Просроченные этапы</CardTitle>
          </CardHeader>
          <CardContent>
            {d.overdueStages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Просроченных этапов нет.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {d.overdueStages.slice(0, 6).map(({ stage, caseRow }) => (
                  <li key={stage.id} className="flex items-center justify-between text-sm">
                    <Link href={`/cases/${caseRow.id}?tab=stages`} className="hover:underline">
                      {caseRow.shortName} — {stage.name}
                    </Link>
                    <Badge variant="danger">{formatDateRu(stage.dueDate)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Дела с низкой эффективной ставкой</CardTitle>
        </CardHeader>
        <CardContent>
          {d.lowRateCases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Все активные дела со ставкой не ниже контрольной. Отлично!
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {d.lowRateCases.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <Link href={`/cases/${c.id}?tab=economics`} className="hover:underline">
                    №{c.internalNumber} — {c.name}
                  </Link>
                  <Badge variant="warning">{c.rate ? formatMoney(c.rate) + "/ч" : "Нет данных"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
