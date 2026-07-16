import { notFound } from "next/navigation";
import Link from "next/link";
import { getScenario, getScenarioItems } from "@/server/queries/scenarios";
import { listServices } from "@/server/queries/services";
import { getSettings, fixedExpensesNoReserveKopecks, billableHoursPerDay } from "@/server/queries/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { MetricTile } from "@/components/ui/metric-tile";
import {
  evaluateWorkload,
  formatHours,
  formatMoney,
  formatPercent,
  forecastPersonalIncomeKopecks,
  monthlyCapacityMinutes,
  resolveTaxRateBp,
} from "@/domain/calculations";
import { ScenarioItemForm } from "@/components/scenarios/scenario-item-form";
import { DeleteScenarioItemButton } from "@/components/scenarios/delete-scenario-item-button";

export const dynamic = "force-dynamic";

export default async function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scenarioId = Number(id);
  const scenario = getScenario(scenarioId);
  if (!scenario) notFound();

  const items = getScenarioItems(scenarioId);
  const services = listServices(false);
  const settings = getSettings();

  const revenueKopecks = items.reduce((sum, i) => sum + i.unitPriceKopecks * i.quantity, 0);
  const plannedMinutes = items.reduce((sum, i) => sum + i.unitMinutes * i.quantity, 0);
  const expectedPaymentsKopecks = items.reduce(
    (sum, i) => sum + (i.expectedPaymentKopecks ?? i.unitPriceKopecks * i.quantity),
    0,
  );

  const taxRateBp = resolveTaxRateBp(settings, "individual");
  const fixedExpenses = fixedExpensesNoReserveKopecks(settings);
  const personalIncome = forecastPersonalIncomeKopecks({
    priceRevenueKopecks: revenueKopecks,
    avgDiscountLossBp: settings.avgDiscountLossBp,
    taxRateBp,
    fixedExpensesNoReserveKopecks: fixedExpenses,
    practiceReserveKopecks: settings.practiceReserveKopecks,
  });
  const taxEstimateKopecks = Math.round((revenueKopecks * taxRateBp) / 10000);

  const capacityMinutes = monthlyCapacityMinutes(
    settings.workingWeeksPerYear,
    settings.workingDaysPerWeek,
    billableHoursPerDay(settings),
  );
  const workload = evaluateWorkload(plannedMinutes, capacityMinutes);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/scenarios" className="text-sm text-muted-foreground hover:underline">
        ← Ко всем сценариям
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{scenario.name}</h1>
        <p className="text-sm text-muted-foreground">Месяц: {scenario.month}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добавить позицию</CardTitle>
        </CardHeader>
        <CardContent>
          <ScenarioItemForm scenarioId={scenarioId} services={services} />
        </CardContent>
      </Card>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Позиция</Th>
              <Th className="text-right">Кол-во</Th>
              <Th className="text-right">Цена</Th>
              <Th className="text-right">Часы</Th>
              <Th className="text-right">Итого</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {items.map((i) => (
              <Tr key={i.id}>
                <Td>{i.label}</Td>
                <Td className="text-right tabular-nums">{i.quantity}</Td>
                <Td className="text-right tabular-nums">{formatMoney(i.unitPriceKopecks)}</Td>
                <Td className="text-right tabular-nums">{formatHours(i.unitMinutes * i.quantity)}</Td>
                <Td className="text-right tabular-nums font-medium">{formatMoney(i.unitPriceKopecks * i.quantity)}</Td>
                <Td>
                  <DeleteScenarioItemButton itemId={i.id} scenarioId={scenarioId} />
                </Td>
              </Tr>
            ))}
            {items.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Позиций пока нет — добавьте выше.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Прайсовая выручка" value={formatMoney(revenueKopecks)} />
        <MetricTile label="Ожидаемые оплаты" value={formatMoney(expectedPaymentsKopecks)} />
        <MetricTile label="Плановые часы" value={formatHours(plannedMinutes)} hint={`Ёмкость: ${formatHours(capacityMinutes)}`} />
        <MetricTile
          label="Загрузка"
          value={formatPercent(Math.round(workload.usedFraction * 10000))}
          tone={workload.isOverloaded ? "danger" : "neutral"}
          hint={workload.isOverloaded ? "Перегрузка по ёмкости" : undefined}
        />
        <MetricTile
          label="Налог (оценка)"
          value={formatMoney(taxEstimateKopecks)}
          explanation="Оценочный налог по текущей налоговой ставке от прайсовой выручки. Реальный налог считается по фактическим платежам."
        />
        <MetricTile label="Постоянные расходы" value={formatMoney(fixedExpenses)} />
        <MetricTile label="Резерв практики" value={formatMoney(settings.practiceReserveKopecks)} />
        <MetricTile
          label="Прогноз личного дохода"
          value={formatMoney(personalIncome)}
          tone={personalIncome >= 0 ? "accent" : "danger"}
          explanation="Прайсовая выручка × (1 − средние потери от скидок) × (1 − налог) − постоянные расходы − резерв практики."
        />
      </div>
    </div>
  );
}
