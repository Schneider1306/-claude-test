"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toaster";
import { updateSettings } from "@/server/actions/settings";
import {
  computeTargetRateKopecks,
  computeFixedCostsKopecks,
  computeMonthlyBillableCapacityHours,
  computeRequiredPriceRevenueKopecks,
  kopecksToRubles,
  rublesToKopecks,
  type PricingSettings,
} from "@/domain/calculations";
import { formatKopecks, formatHours } from "@/lib/format";
import type { SettingsInputData } from "@/lib/schemas";

interface CoefficientOption {
  code: string;
  label: string;
  bps: number;
}

interface Props {
  initial: SettingsInputData;
}

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = React.useState<SettingsInputData>(initial);
  const [saving, setSaving] = React.useState(false);

  const pricing: PricingSettings = {
    desiredMonthlyIncomeKopecks: form.desiredMonthlyIncomeKopecks,
    rentKopecks: form.rentKopecks,
    internetKopecks: form.internetKopecks,
    stationeryKopecks: form.stationeryKopecks,
    aiAssistantsKopecks: form.aiAssistantsKopecks,
    practiceReserveKopecks: form.practiceReserveKopecks,
    workWeeksPerYear: form.workWeeksPerYear,
    workDaysPerWeek: form.workDaysPerWeek,
    billableMinutesPerDay: form.billableMinutesPerDay,
    lossRateBps: form.lossRateBps,
    taxRateBps: form.taxRateBps,
    targetRateRoundingKopecks: form.targetRateRoundingKopecks,
    travelMinutesCountedRatioBps: form.travelMinutesCountedRatioBps,
  };

  const fixedCosts = computeFixedCostsKopecks(pricing);
  const capacityHours = computeMonthlyBillableCapacityHours(pricing);
  const requiredRevenue = computeRequiredPriceRevenueKopecks(pricing);
  const targetRate = computeTargetRateKopecks(pricing);

  function money(field: keyof SettingsInputData) {
    return {
      value: kopecksToRubles(form[field] as number),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [field]: rublesToKopecks(Number(e.target.value) || 0) })),
    };
  }

  function number(field: keyof SettingsInputData) {
    return {
      value: form[field] as number,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [field]: Number(e.target.value) || 0 })),
    };
  }

  function percent(field: keyof SettingsInputData) {
    return {
      value: (form[field] as number) / 100,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [field]: Math.round((Number(e.target.value) || 0) * 100) })),
    };
  }

  function updateOptionList(
    key: "complexityOptions" | "urgencyOptions" | "responsibilityOptions",
    index: number,
    patch: Partial<CoefficientOption>,
  ) {
    setForm((f) => ({
      ...f,
      [key]: f[key].map((o, i) => (i === index ? { ...o, ...patch } : o)),
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings(form);
      toast({ title: "Настройки сохранены", variant: "success" });
      router.refresh();
    } catch {
      toast({ title: "Не удалось сохранить настройки", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Цели и расходы</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Желаемый личный доход, ₽/мес" input={<Input type="number" {...money("desiredMonthlyIncomeKopecks")} />} />
          <Field label="Аренда, ₽/мес" input={<Input type="number" {...money("rentKopecks")} />} />
          <Field label="Интернет, ₽/мес" input={<Input type="number" {...money("internetKopecks")} />} />
          <Field label="Канцелярия, ₽/мес" input={<Input type="number" {...money("stationeryKopecks")} />} />
          <Field label="ИИ-помощники, ₽/мес" input={<Input type="number" {...money("aiAssistantsKopecks")} />} />
          <Field label="Резерв практики, ₽/мес" input={<Input type="number" {...money("practiceReserveKopecks")} />} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ёмкость и налоги</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Рабочих недель в году" input={<Input type="number" {...number("workWeeksPerYear")} />} />
          <Field label="Рабочих дней в неделе" input={<Input type="number" {...number("workDaysPerWeek")} />} />
          <Field
            label="Оплачиваемых часов в день"
            input={
              <Input
                type="number"
                step={0.25}
                value={form.billableMinutesPerDay / 60}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    billableMinutesPerDay: Math.round((Number(e.target.value) || 0) * 60),
                  }))
                }
              />
            }
          />
          <Field label="Потери от скидок и pro bono, %" input={<Input type="number" step={0.1} {...percent("lossRateBps")} />} />
          <Field label="Налоговая ставка, %" input={<Input type="number" step={0.1} {...percent("taxRateBps")} />} />
          <Field
            label="Округление целевой ставки, ₽"
            input={<Input type="number" {...money("targetRateRoundingKopecks")} />}
          />
          <Field
            label="Учитываемая доля времени в дороге, %"
            input={<Input type="number" step={1} {...percent("travelMinutesCountedRatioBps")} />}
          />
          <Field
            label="Порог скидки, требующий причину, %"
            input={<Input type="number" step={1} {...percent("discountReasonRequiredThresholdBps")} />}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-secondary/40">
        <CardHeader>
          <CardTitle>Предпросмотр целевой ставки</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Preview label="Постоянные расходы" value={formatKopecks(fixedCosts)} />
          <Preview label="Оплачиваемая ёмкость" value={formatHours(capacityHours)} />
          <Preview label="Требуемая выручка" value={formatKopecks(Math.round(requiredRevenue))} />
          <Preview label="Целевая ставка" value={`${formatKopecks(targetRate)}/ч`} emphasize />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Коэффициенты сложности</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <OptionEditor
            options={form.complexityOptions}
            onChange={(i, patch) => updateOptionList("complexityOptions", i, patch)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Коэффициенты срочности</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <OptionEditor
            options={form.urgencyOptions}
            onChange={(i, patch) => updateOptionList("urgencyOptions", i, patch)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Коэффициенты ответственности</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <OptionEditor
            options={form.responsibilityOptions}
            onChange={(i, patch) => updateOptionList("responsibilityOptions", i, patch)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Скидки</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Label className="text-xs text-muted-foreground">Готовые значения скидки, % (через запятую)</Label>
          <Input
            value={form.discountOptionsBps.map((b) => b / 100).join(", ")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                discountOptionsBps: e.target.value
                  .split(",")
                  .map((v) => Math.round((Number(v.trim()) || 0) * 100))
                  .filter((v) => !Number.isNaN(v)),
              }))
            }
          />
        </CardContent>
      </Card>

      <Separator />
      <Button onClick={handleSave} disabled={saving} size="lg" className="self-start">
        Сохранить настройки
      </Button>
    </div>
  );
}

function Field({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {input}
    </div>
  );
}

function Preview({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={emphasize ? "text-xl font-semibold text-primary tabular-nums" : "font-medium tabular-nums"}>
        {value}
      </p>
    </div>
  );
}

function OptionEditor({
  options,
  onChange,
}: {
  options: CoefficientOption[];
  onChange: (index: number, patch: Partial<CoefficientOption>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => (
        <div key={option.code} className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
          <Input
            value={option.label}
            onChange={(e) => onChange(index, { label: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={1}
              value={option.bps / 100}
              onChange={(e) => onChange(index, { bps: Math.round((Number(e.target.value) || 0) * 100) })}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
