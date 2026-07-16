"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateSettings } from "@/server/actions/settings";
import type { SettingsFormValues } from "@/domain/schemas";
import type { Settings } from "@/server/queries/settings";
import { bpToFraction, formatHours, monthlyCapacityMinutes } from "@/domain/calculations";

export function GeneralSettingsForm({ settings }: { settings: Settings }) {
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

  const values = watch();
  const capacityMinutes = monthlyCapacityMinutes(
    values.workingWeeksPerYear || 0,
    values.workingDaysPerWeek || 0,
    values.billableHoursPerDay || 0,
  );

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
          <CardTitle>Цель по личному доходу и постоянные расходы</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Желаемый личный доход, ₽/мес">
            <Input type="number" {...register("desiredMonthlyIncomeRubles", { valueAsNumber: true })} />
          </Field>
          <Field label="Аренда, ₽/мес">
            <Input type="number" {...register("rentRubles", { valueAsNumber: true })} />
          </Field>
          <Field label="Интернет, ₽/мес">
            <Input type="number" {...register("internetRubles", { valueAsNumber: true })} />
          </Field>
          <Field label="Канцелярия, ₽/мес">
            <Input type="number" {...register("stationeryRubles", { valueAsNumber: true })} />
          </Field>
          <Field label="ИИ-помощники, ₽/мес">
            <Input type="number" {...register("aiToolsRubles", { valueAsNumber: true })} />
          </Field>
          <Field label="Резерв практики, ₽/мес">
            <Input type="number" {...register("practiceReserveRubles", { valueAsNumber: true })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Оплачиваемая ёмкость</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Рабочих недель в году">
            <Input type="number" {...register("workingWeeksPerYear", { valueAsNumber: true })} />
          </Field>
          <Field label="Рабочих дней в неделю">
            <Input type="number" {...register("workingDaysPerWeek", { valueAsNumber: true })} />
          </Field>
          <Field label="Оплачиваемых часов в день">
            <Input type="number" step="0.5" {...register("billableHoursPerDay", { valueAsNumber: true })} />
          </Field>
          <Field label="Средние потери от скидок / pro bono, %">
            <Input type="number" step="0.1" {...register("avgDiscountLossPercent", { valueAsNumber: true })} />
          </Field>
        </CardContent>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          Расчётная месячная ёмкость: <strong>{formatHours(capacityMinutes)}</strong>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Срочность и скидки по умолчанию</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Срочная надбавка по умолчанию, %">
            <Input type="number" {...register("standardUrgencySurchargePercent", { valueAsNumber: true })} />
          </Field>
          <Field label="Обычная скидка, %">
            <Input type="number" {...register("standardDiscountPercent", { valueAsNumber: true })} />
          </Field>
          <Field label="Максимальная скидка, %">
            <Input type="number" {...register("maxDiscountPercent", { valueAsNumber: true })} />
          </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
