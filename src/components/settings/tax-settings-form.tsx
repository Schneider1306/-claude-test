"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { updateSettings } from "@/server/actions/settings";
import type { SettingsFormValues } from "@/domain/schemas";
import type { Settings } from "@/server/queries/settings";
import { bpToFraction } from "@/domain/calculations";
import { TAX_REGIME_LABELS } from "@/domain/labels";

export function TaxSettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, watch, formState } = useForm<SettingsFormValues>({
    defaultValues: {
      desiredMonthlyIncomeRubles: settings.desiredMonthlyIncomeKopecks / 100,
      rentRubles: settings.rentKopecks / 100,
      internetRubles: settings.internetKopecks / 100,
      stationeryRubles: settings.stationeryKopecks / 100,
      aiToolsRubles: settings.aiToolsKopecks / 100,
      practiceReserveRubles: settings.practiceReserveKopecks / 100,
      workingWeeksPerYear: settings.workingWeeksPerYear,
      workingDaysPerWeek: settings.workingDaysPerWeek,
      billableHoursPerDay: settings.billableHoursPerDayX100 / 100,
      avgDiscountLossPercent: bpToFraction(settings.avgDiscountLossBp) * 100,
      taxRegime: settings.taxRegime,
      npdIndividualRatePercent: bpToFraction(settings.npdIndividualRateBp) * 100,
      npdOrgRatePercent: bpToFraction(settings.npdOrgRateBp) * 100,
      npdAnnualLimitRubles: settings.npdAnnualLimitKopecks / 100,
      usnRatePercent: bpToFraction(settings.usnRateBp) * 100,
      customTaxRatePercent: bpToFraction(settings.customTaxRateBp) * 100,
      standardUrgencySurchargePercent: bpToFraction(settings.standardUrgencySurchargeBp) * 100,
      standardDiscountPercent: bpToFraction(settings.standardDiscountBp) * 100,
      maxDiscountPercent: bpToFraction(settings.maxDiscountBp) * 100,
      theme: settings.theme,
    },
  });

  const regime = watch("taxRegime");

  const onSubmit = handleSubmit(async (data) => {
    await updateSettings(data);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Налоговый режим</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label>Режим</Label>
            <Select {...register("taxRegime")} className="max-w-sm">
              {(["npd", "usn", "custom"] as const).map((r) => (
                <option key={r} value={r}>
                  {TAX_REGIME_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>

          {regime === "npd" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Ставка НПД: платёж от физлица, %</Label>
                <Input type="number" step="0.1" {...register("npdIndividualRatePercent", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Ставка НПД: от организации/ИП, %</Label>
                <Input type="number" step="0.1" {...register("npdOrgRatePercent", { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Годовой лимит НПД, ₽</Label>
                <Input type="number" {...register("npdAnnualLimitRubles", { valueAsNumber: true })} />
              </div>
            </div>
          )}

          {regime === "usn" && (
            <div className="max-w-xs">
              <Label>Ставка УСН «Доходы», %</Label>
              <Input type="number" step="0.1" {...register("usnRatePercent", { valueAsNumber: true })} />
            </div>
          )}

          {regime === "custom" && (
            <div className="max-w-xs">
              <Label>Пользовательская ставка налога, %</Label>
              <Input type="number" step="0.1" {...register("customTaxRatePercent", { valueAsNumber: true })} />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Ставка налога применяется к каждому фактически полученному платежу с учётом типа плательщика и
            фиксируется в платеже как исторический снимок — изменение настроек не пересчитывает уже сохранённые
            платежи.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 no-print">
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Сохранение…" : "Сохранить настройки"}
        </Button>
        {saved && <span className="text-sm text-accent">Сохранено</span>}
      </div>
    </form>
  );
}
