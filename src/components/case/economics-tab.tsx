import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { CaseFinancials } from "@/domain/calculations";
import {
  billableHoursPerDay,
  fixedExpensesNoReserveKopecks,
  type Settings,
} from "@/server/queries/settings";
import {
  computeBenchmark,
  evaluateBenchmarkStatus,
  formatHours,
  formatMoney,
  resolveBenchmarkTaxRateBp,
} from "@/domain/calculations";

const STATUS_LABEL: Record<string, string> = {
  green: "Ставка на уровне или выше контрольной",
  yellow: "Ставка ниже контрольной не более чем на 15%",
  red: "Ставка существенно ниже контрольной (более 15%) — дело убыточно относительно цели",
};

const STATUS_BADGE: Record<string, "accent" | "warning" | "danger"> = {
  green: "accent",
  yellow: "warning",
  red: "danger",
};

export function EconomicsTab({
  financials,
  settings,
}: {
  financials: CaseFinancials;
  settings: Settings;
}) {
  const taxRateBp = resolveBenchmarkTaxRateBp(settings);

  const benchmark = computeBenchmark({
    desiredMonthlyIncomeKopecks: settings.desiredMonthlyIncomeKopecks,
    fixedExpensesNoReserveKopecks: fixedExpensesNoReserveKopecks(settings),
    practiceReserveKopecks: settings.practiceReserveKopecks,
    taxRateBp,
    avgDiscountLossBp: settings.avgDiscountLossBp,
    workingWeeksPerYear: settings.workingWeeksPerYear,
    workingDaysPerWeek: settings.workingDaysPerWeek,
    billableHoursPerDay: billableHoursPerDay(settings),
  });

  const status = evaluateBenchmarkStatus(financials.effectiveRateKopecksPerHour, benchmark.controlRateKopecksPerHour);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Расчёт стоимости</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Row label="Профессиональное вознаграждение" value={formatMoney(financials.feeGrossKopecks)} />
          <Row label="Срочная надбавка" value={formatMoney(financials.urgencySurchargeTotalKopecks)} />
          <Row label="Скидка" value={"−" + formatMoney(financials.discountTotalKopecks)} />
          <Row label="Возмещаемые внешние расходы" value={formatMoney(financials.reimbursableExpensesKopecks)} />
          <Row label="Итог клиенту" value={formatMoney(financials.totalToClientKopecks)} strong />
          <Row label="Получено" value={formatMoney(financials.receivedKopecks)} />
          <Row label="Задолженность" value={formatMoney(financials.debtKopecks)} tone={financials.debtKopecks > 0 ? "danger" : "accent"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <CardTitle>Эффективная ставка и контроль</CardTitle>
          <InfoTooltip text="Эффективная ставка = вознаграждение после скидки ÷ фактические часы (или плановые, если фактических ещё нет). Внешние расходы не влияют на ставку. Контрольная ставка — внутренний ориентир, рассчитанный из целей по личному доходу, и не заменяет согласованные цены." />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Эффективная ставка{financials.effectiveRateIsPlanned ? " (плановая)" : ""}
            </span>
            <span className="text-xl font-semibold tabular-nums">
              {financials.effectiveRateKopecksPerHour ? formatMoney(financials.effectiveRateKopecksPerHour) + "/ч" : "Нет данных"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Контрольная ставка</span>
            <span className="text-sm font-medium tabular-nums">{formatMoney(benchmark.controlRateKopecksPerHour)}/ч</span>
          </div>
          <Badge variant={STATUS_BADGE[status]} className="w-fit">
            {STATUS_LABEL[status]}
          </Badge>
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
            <Row label="Плановое время" value={formatHours(financials.plannedMinutesTotal)} />
            <Row label="Фактическое время" value={financials.actualMinutesTotal ? formatHours(financials.actualMinutesTotal) : "—"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "danger" | "accent";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}
