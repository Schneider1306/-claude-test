import {
  getAverageCheckKopecks,
  getCapacityUsage,
  getCaseTypeProfitability,
  getDiscountImpact,
  getMonthlyRevenue,
  getOverBudgetCases,
  getPlannedVsActualTotals,
  getServiceProfitability,
  getTaxBurden,
  getTotalDebtKopecks,
} from "@/server/queries/analytics";
import { getSettings, billableHoursPerDay } from "@/server/queries/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import Link from "next/link";
import { formatHours, formatMoney, formatPercent, monthlyCapacityMinutes } from "@/domain/calculations";
import { MonthlyRevenueChart, CapacityUsageChart, CaseTypeBarChart } from "@/components/analytics/analytics-charts";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  const settings = getSettings();
  const capacityMinutes = monthlyCapacityMinutes(
    settings.workingWeeksPerYear,
    settings.workingDaysPerWeek,
    billableHoursPerDay(settings),
  );

  const monthlyRevenue = getMonthlyRevenue(12);
  const capacityUsage = getCapacityUsage(capacityMinutes, 6);
  const caseTypeStats = getCaseTypeProfitability();
  const overBudget = getOverBudgetCases();
  const discountImpact = getDiscountImpact();
  const averageCheck = getAverageCheckKopecks();
  const taxBurden = getTaxBurden();
  const totalDebt = getTotalDebtKopecks();
  const serviceStats = getServiceProfitability();
  const plannedVsActual = getPlannedVsActualTotals();

  const bestServices = serviceStats.filter((s) => s.effectiveRateKopecksPerHour !== null).slice(0, 5);
  const worstServices = [...serviceStats]
    .filter((s) => s.effectiveRateKopecksPerHour !== null)
    .sort((a, b) => (a.effectiveRateKopecksPerHour ?? 0) - (b.effectiveRateKopecksPerHour ?? 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Аналитика</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Средний чек" value={formatMoney(averageCheck)} />
        <MetricTile label="Задолженность клиентов" value={formatMoney(totalDebt)} tone={totalDebt > 0 ? "danger" : "accent"} />
        <MetricTile
          label="Налоговая нагрузка"
          value={formatPercent(Math.round(taxBurden.burdenFraction * 10000))}
          hint={`Уплачено: ${formatMoney(taxBurden.taxKopecks)}`}
        />
        <MetricTile
          label="Влияние скидок"
          value={formatMoney(discountImpact.totalDiscountKopecks)}
          hint={`${discountImpact.casesWithDiscount} из ${discountImpact.totalCases} дел со скидкой`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Начислено и получено по месяцам</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyRevenueChart data={monthlyRevenue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Использование рабочей ёмкости</CardTitle>
        </CardHeader>
        <CardContent>
          <CapacityUsageChart data={capacityUsage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Прибыльность по типам дел</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTypeBarChart data={caseTypeStats} />
          <Table className="mt-4">
            <Thead>
              <tr>
                <Th>Тип дела</Th>
                <Th className="text-right">Кол-во</Th>
                <Th className="text-right">Начислено</Th>
                <Th className="text-right">Получено</Th>
                <Th className="text-right">Средняя ставка</Th>
              </tr>
            </Thead>
            <Tbody>
              {caseTypeStats.map((s) => (
                <Tr key={s.caseType}>
                  <Td>{s.label}</Td>
                  <Td className="text-right tabular-nums">{s.count}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(s.totalToClientKopecks)}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(s.receivedKopecks)}</Td>
                  <Td className="text-right tabular-nums">
                    {s.avgEffectiveRateKopecksPerHour ? formatMoney(s.avgEffectiveRateKopecksPerHour) : "—"}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Плановые часы против фактических</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Плановые часы (все дела)</span>
              <span className="tabular-nums font-medium">{formatHours(plannedVsActual.plannedMinutes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Фактические часы (все дела)</span>
              <span className="tabular-nums font-medium">{formatHours(plannedVsActual.actualMinutes)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Дела с перерасходом времени</CardTitle>
          </CardHeader>
          <CardContent>
            {overBudget.length === 0 ? (
              <p className="text-sm text-muted-foreground">Перерасхода времени не выявлено.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {overBudget.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <Link href={`/cases/${c.id}?tab=economics`} className="text-primary hover:underline">
                      {c.internalNumber} — {c.name}
                    </Link>
                    <span className="text-danger tabular-nums">+{formatHours(c.overrunMinutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Самые выгодные услуги</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceList items={bestServices} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Самые слабые услуги</CardTitle>
          </CardHeader>
          <CardContent>
            <ServiceList items={worstServices} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServiceList({
  items,
}: {
  items: { name: string; effectiveRateKopecksPerHour: number | null; totalRevenueKopecks: number }[];
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Недостаточно данных.</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {items.map((s, i) => (
        <li key={i} className="flex justify-between">
          <span className="max-w-56 truncate">{s.name}</span>
          <span className="tabular-nums font-medium">
            {s.effectiveRateKopecksPerHour ? formatMoney(s.effectiveRateKopecksPerHour) + "/ч" : "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}
