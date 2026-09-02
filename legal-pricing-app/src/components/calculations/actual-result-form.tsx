"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { setActualResult } from "@/server/actions/calculations";
import { formatKopecks, formatBpsAsPercent } from "@/lib/format";
import { kopecksToRubles, rublesToKopecks, computeActualComparison } from "@/domain/calculations";

interface Props {
  calculationId: number;
  plannedMinutes: number;
  plannedPriceKopecks: number;
  actualPriceKopecks: number | null;
  actualMinutes: number | null;
}

export function ActualResultForm({
  calculationId,
  plannedMinutes,
  plannedPriceKopecks,
  actualPriceKopecks,
  actualMinutes,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [price, setPrice] = React.useState(
    actualPriceKopecks !== null ? String(kopecksToRubles(actualPriceKopecks)) : "",
  );
  const [minutes, setMinutes] = React.useState(actualMinutes !== null ? String(actualMinutes) : "");
  const [pending, startTransition] = React.useTransition();

  const comparison =
    actualPriceKopecks !== null && actualMinutes !== null
      ? computeActualComparison(
          { actualPriceKopecks, actualMinutes },
          plannedMinutes,
          plannedPriceKopecks,
        )
      : null;

  function handleSave() {
    startTransition(async () => {
      await setActualResult({
        calculationId,
        actualPriceKopecks: rublesToKopecks(Number(price) || 0),
        actualMinutes: Math.round(Number(minutes) || 0),
      });
      toast({ title: "Фактический результат сохранён", variant: "success" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Фактический результат</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actualPrice">Фактическая цена, ₽</Label>
            <Input
              id="actualPrice"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actualMinutes">Фактическое время, мин</Label>
            <Input
              id="actualMinutes"
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={pending} className="self-start">
          Сохранить факт
        </Button>

        {comparison && (
          <div className="grid grid-cols-1 gap-3 rounded-md border border-border p-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Фактическая ставка</p>
              <p className="font-medium tabular-nums">
                {comparison.actualRateKopecks !== null
                  ? `${formatKopecks(Math.round(comparison.actualRateKopecks))}/ч`
                  : "Нет данных"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Перерасход времени</p>
              <p className="font-medium tabular-nums">
                {comparison.timeOverrunMinutes >= 0 ? "+" : ""}
                {comparison.timeOverrunMinutes} мин ({formatBpsAsPercent(comparison.timeOverrunBps)})
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Отклонение цены от оценки</p>
              <p className="font-medium tabular-nums">
                {formatKopecks(comparison.priceDeviationKopecks)} (
                {formatBpsAsPercent(comparison.priceDeviationBps)})
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
