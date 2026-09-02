import Link from "next/link";
import { notFound } from "next/navigation";
import { getCalculationDetail } from "@/server/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { RateStatusBadge } from "@/components/shared/rate-status-badge";
import { CalculationActions } from "@/components/calculations/calculation-actions";
import { StatusControl } from "@/components/calculations/status-control";
import { ActualResultForm } from "@/components/calculations/actual-result-form";
import {
  formatKopecks,
  formatDateTime,
  formatHours,
  formatMinutesAsHours,
  formatBpsAsPercent,
} from "@/lib/format";
import {
  CALCULATION_STATUS_LABELS,
  EXPENSE_CATEGORY_LABELS,
  LINE_KIND_LABELS,
} from "@/lib/status-labels";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CalculationDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = getCalculationDetail(Number(id));
  if (!detail) notFound();

  const { calculation, lines, expenses, totals, changeLog, statusHistory, versions, actualComparison } =
    detail;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-primary">
              №{calculation.number} {calculation.internalName}
            </h1>
            {calculation.version > 1 && (
              <span className="text-sm text-muted-foreground">версия {calculation.version}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {calculation.clientCode} · {calculation.caseType || "Тип не указан"} ·{" "}
            {formatDateTime(calculation.createdAt)}
          </p>
        </div>
        <CalculationActions id={calculation.id} number={calculation.number} />
      </div>

      {versions.length > 1 && (
        <div className="no-print flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Версии этого расчёта:</span>
          {versions.map((v) => (
            <Link
              key={v.id}
              href={`/calculations/${v.id}`}
              className={`rounded-full border px-2.5 py-0.5 ${
                v.id === calculation.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              v{v.version}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Состав расчёта</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Строка</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead className="text-right">Цена, ед.</TableHead>
                    <TableHead className="text-right">Время, ед.</TableHead>
                    <TableHead className="text-right">Коэффициенты</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const overrides = JSON.parse(line.manualOverridesJson) as {
                      field: string;
                      original: string;
                      next: string;
                      reason: string;
                    }[];
                    const coeff = line.complexityBps + line.urgencyBps + line.responsibilityBps;
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="font-medium">{line.name}</p>
                          {line.comment && (
                            <p className="text-xs text-muted-foreground">{line.comment}</p>
                          )}
                          {overrides.length > 0 && (
                            <p className="mt-1 text-xs text-warning">
                              Изменено вручную:{" "}
                              {overrides
                                .map(
                                  (o) =>
                                    `${o.field} ${o.original} → ${o.next}${o.reason ? ` (${o.reason})` : ""}`,
                                )
                                .join("; ")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {LINE_KIND_LABELS[line.kind]}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatKopecks(line.basePriceKopecks)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMinutesAsHours(line.plannedMinutesPerUnit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {coeff > 0 ? formatBpsAsPercent(coeff) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatKopecks(
                            line.basePriceKopecks * line.quantity +
                              Math.round(
                                line.basePriceKopecks * line.quantity * (coeff / 10000),
                              ),
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                        Нет строк
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {expenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Внешние расходы</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Категория</TableHead>
                      <TableHead>Описание</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                        <TableCell className="text-muted-foreground">{e.description}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatKopecks(e.amountKopecks)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Статус</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Текущий статус:</span>
                <span className="font-medium">{CALCULATION_STATUS_LABELS[calculation.status]}</span>
              </div>
              <StatusControl id={calculation.id} status={calculation.status} />
              {statusHistory.length > 0 && (
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {statusHistory.map((h) => (
                    <p key={h.id}>
                      {formatDateTime(h.createdAt)} — {CALCULATION_STATUS_LABELS[h.status]}
                      {h.comment ? ` (${h.comment})` : ""}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ActualResultForm
            calculationId={calculation.id}
            plannedMinutes={totals.plannedMinutes}
            plannedPriceKopecks={totals.professionalAfterDiscountKopecks}
            actualPriceKopecks={calculation.actualPriceKopecks}
            actualMinutes={calculation.actualMinutes}
          />

          {changeLog.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Журнал изменений</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-xs text-muted-foreground">
                {changeLog.map((entry) => (
                  <p key={entry.id}>
                    {formatDateTime(entry.createdAt)} — {entry.field}: {entry.oldValue} →{" "}
                    {entry.newValue} {entry.reason ? `(${entry.reason})` : ""}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {calculation.comment && (
            <Card>
              <CardHeader>
                <CardTitle>Комментарий</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{calculation.comment}</CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Итоги</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Базовая сумма" value={formatKopecks(totals.baseAmountKopecks)} />
            <Row label="Надбавки" value={formatKopecks(totals.surchargeKopecks)} />
            <Row label="До скидки" value={formatKopecks(totals.professionalBeforeDiscountKopecks)} />
            <Row label="Скидка" value={`− ${formatKopecks(totals.discountAmountKopecks)}`} />
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
            />
            <Row label="Плановые часы" value={formatHours(totals.plannedHours)} />
            <Row
              label="Эффективная ставка"
              value={
                totals.effectiveRateKopecks !== null
                  ? `${formatKopecks(Math.round(totals.effectiveRateKopecks))}/ч`
                  : "Нет данных"
              }
            />
            <Row label="Целевая ставка (на момент создания)" value={`${formatKopecks(calculation.targetRateKopecksSnapshot)}/ч`} />
            <Row label="Отклонение от целевой" value={formatBpsAsPercent(totals.deviationFromTargetBps)} />
            <div className="pt-1">
              <RateStatusBadge status={totals.status} />
            </div>
            {totals.belowEconomicMinimumKopecks !== null && (
              <div className="rounded-md border border-warning bg-warning/10 p-3 text-warning">
                Ниже экономического минимума на{" "}
                <strong>{formatKopecks(totals.belowEconomicMinimumKopecks)}</strong>
              </div>
            )}
            {actualComparison && (
              <>
                <Separator />
                <p className="font-medium">Факт</p>
                <Row
                  label="Фактическая ставка"
                  value={
                    actualComparison.actualRateKopecks !== null
                      ? `${formatKopecks(Math.round(actualComparison.actualRateKopecks))}/ч`
                      : "Нет данных"
                  }
                />
                <Row
                  label="Перерасход времени"
                  value={formatBpsAsPercent(actualComparison.timeOverrunBps)}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
