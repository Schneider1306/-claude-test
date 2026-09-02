"use client";

import { computeCalculationTotals } from "@/domain/calculations";
import { formatKopecks, formatHours, formatBpsAsPercent } from "@/lib/format";
import { RateStatusBadge } from "@/components/shared/rate-status-badge";
import { InfoHint } from "@/components/shared/info-hint";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WizardState } from "./types";

interface Props {
  state: WizardState;
  targetRateKopecks: number;
  travelMinutesCounted: number;
}

export function SummaryPanel({ state, targetRateKopecks, travelMinutesCounted }: Props) {
  const totals = computeCalculationTotals({
    lines: state.lines,
    expenses: state.expenses,
    discountBps: state.discountBps,
    travelMinutes: travelMinutesCounted,
    targetRateKopecks,
  });

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Итоги расчёта</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <Row label="Базовая сумма" value={formatKopecks(totals.baseAmountKopecks)} />
        <Row
          label="Надбавки"
          value={formatKopecks(totals.surchargeKopecks)}
          hint="Сумма коэффициентов сложности, срочности и ответственности по каждой строке (складываются, не перемножаются)."
        />
        <Row label="До скидки" value={formatKopecks(totals.professionalBeforeDiscountKopecks)} />
        <Row
          label={`Скидка${state.discountBps ? ` (${formatBpsAsPercent(state.discountBps).replace("+", "")})` : ""}`}
          value={`− ${formatKopecks(totals.discountAmountKopecks)}`}
        />
        <Row label="Внешние расходы" value={formatKopecks(totals.externalExpensesKopecks)} />
        <Separator />
        <div className="flex items-baseline justify-between">
          <span className="font-medium">Итог клиенту</span>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            {formatKopecks(totals.clientTotalKopecks)}
          </span>
        </div>
        <Separator />
        <Row
          label="Экономически обоснованная цена"
          value={formatKopecks(totals.economicMinimumKopecks)}
          hint="Плановые часы × целевая ставка. Внутренний ориентир, клиенту не показывается."
        />
        <Row label="Плановые часы" value={formatHours(totals.plannedHours)} />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Эффективная ставка{" "}
            <InfoHint>
              Профессиональная сумма после скидки ÷ плановые часы. Внешние расходы не влияют на
              ставку.
            </InfoHint>
          </span>
          <span className="font-medium tabular-nums">
            {totals.effectiveRateKopecks !== null
              ? `${formatKopecks(Math.round(totals.effectiveRateKopecks))}/ч`
              : "Нет данных"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Целевая ставка</span>
          <span className="font-medium tabular-nums">{formatKopecks(targetRateKopecks)}/ч</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Отклонение от целевой</span>
          <span className="font-medium tabular-nums">
            {formatBpsAsPercent(totals.deviationFromTargetBps)}
          </span>
        </div>
        <div className="pt-1">
          <RateStatusBadge status={totals.status} />
        </div>
        {totals.belowEconomicMinimumKopecks !== null && (
          <div className="rounded-md border border-warning bg-warning/10 p-3 text-warning">
            Цена клиенту ниже экономического минимума на{" "}
            <strong>{formatKopecks(totals.belowEconomicMinimumKopecks)}</strong>. Установить такую
            цену можно, но проверьте обоснованность.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">
        {label} {hint && <InfoHint>{hint}</InfoHint>}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
