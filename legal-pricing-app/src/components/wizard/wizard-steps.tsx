"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoHint } from "@/components/shared/info-hint";
import { formatKopecks } from "@/lib/format";
import { EXPENSE_CATEGORY_LABELS, LINE_KIND_LABELS } from "@/lib/status-labels";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/db/schema";
import { computeAdditionalHearings, rublesToKopecks, kopecksToRubles } from "@/domain/calculations";
import {
  CASE_TYPE_LABELS,
  customLine,
  serviceToLine,
  type CaseType,
  type ServiceRow,
  type WizardExpense,
  type WizardLine,
  type WizardState,
} from "./types";

type SetState = React.Dispatch<React.SetStateAction<WizardState>>;

// --- Step 1 -----------------------------------------------------------------

export function Step1Basics({ state, setState }: { state: WizardState; setState: SetState }) {
  return (
    <div className="flex flex-col gap-4 max-w-md">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="internalName">Внутреннее название расчёта</Label>
        <Input
          id="internalName"
          value={state.internalName}
          onChange={(e) => setState((s) => ({ ...s, internalName: e.target.value }))}
          placeholder="Например: Иванов — трудовой спор"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientCode">
          Обезличенный код клиента <InfoHint>Не используйте ФИО или другие персональные данные — только внутренний код (например, «К-2026-014»).</InfoHint>
        </Label>
        <Input
          id="clientCode"
          value={state.clientCode}
          onChange={(e) => setState((s) => ({ ...s, clientCode: e.target.value }))}
          placeholder="К-2026-014"
        />
      </div>
    </div>
  );
}

// --- Step 2 -----------------------------------------------------------------

export function Step2CaseType({ state, setState }: { state: WizardState; setState: SetState }) {
  return (
    <RadioGroup
      value={state.caseType}
      onValueChange={(v) => setState((s) => ({ ...s, caseType: v as CaseType }))}
      className="max-w-md"
    >
      {(Object.keys(CASE_TYPE_LABELS) as CaseType[]).map((key) => (
        <label
          key={key}
          className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-secondary"
        >
          <RadioGroupItem value={key} />
          {CASE_TYPE_LABELS[key]}
        </label>
      ))}
    </RadioGroup>
  );
}

// --- Step 3 -----------------------------------------------------------------

export function Step3Services({
  state,
  setState,
  services,
}: {
  state: WizardState;
  setState: SetState;
  services: ServiceRow[];
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    for (const s of services) {
      if (s.kind === "hearing" || s.kind === "expertise" || s.kind === "process_block") continue;
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return map;
  }, [services]);

  function toggleService(service: ServiceRow) {
    setState((s) => {
      const exists = s.lines.some((l) => l.serviceId === service.id);
      if (exists) {
        return { ...s, lines: s.lines.filter((l) => l.serviceId !== service.id) };
      }
      return { ...s, lines: [...s.lines, serviceToLine(service)] };
    });
  }

  function addCustomLine() {
    setState((s) => ({ ...s, lines: [...s.lines, customLine()] }));
  }

  return (
    <div className="flex flex-col gap-4">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          <p className="mb-2 text-sm font-medium text-muted-foreground">{category}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((service) => {
              const checked = state.lines.some((l) => l.serviceId === service.id);
              return (
                <label
                  key={service.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-secondary"
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggleService(service)} />
                  <span className="flex-1">
                    <span className="block font-medium">{service.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatKopecks(service.basePriceKopecks)} · {(service.plannedMinutes / 60).toFixed(1)} ч
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" className="self-start" onClick={addCustomLine}>
        <Plus /> Произвольная строка
      </Button>
    </div>
  );
}

// --- Step 4 -----------------------------------------------------------------

const HEARING_SERVICE_NAME: Record<string, string> = {
  ordinary_case: "Обычное дело — дополнительное заседание",
  medical_case: "Медицинское дело — дополнительное заседание",
};

const INCLUDED_HEARINGS = 1;

export function Step4Hearings({
  state,
  setState,
  services,
}: {
  state: WizardState;
  setState: SetState;
  services: ServiceRow[];
}) {
  if (state.caseType !== "ordinary_case" && state.caseType !== "medical_case") {
    return (
      <p className="text-sm text-muted-foreground">
        Этот шаг применяется только для судебных дел (обычное или медицинское).
      </p>
    );
  }

  const hearingServiceName = HEARING_SERVICE_NAME[state.caseType];
  const hearingService = services.find((s) => s.name === hearingServiceName);
  const additional = computeAdditionalHearings(state.totalHearings, INCLUDED_HEARINGS);

  function setTotalHearings(total: number) {
    setState((s) => {
      const nextAdditional = computeAdditionalHearings(total, INCLUDED_HEARINGS);
      let lines = s.lines.filter((l) => l.serviceId !== hearingService?.id);
      if (nextAdditional > 0 && hearingService) {
        lines = [...lines, { ...serviceToLine(hearingService, nextAdditional) }];
      }
      return { ...s, totalHearings: total, lines };
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="totalHearings">
          Общее количество заседаний{" "}
          <InfoHint>
            Первое заседание уже включено в начальный этап. Дополнительные = общее − включённое
            (не может быть отрицательным).
          </InfoHint>
        </Label>
        <Input
          id="totalHearings"
          type="number"
          min={1}
          value={state.totalHearings}
          onChange={(e) => setTotalHearings(Math.max(1, Number(e.target.value) || 1))}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Включено в начальный этап: {INCLUDED_HEARINGS}. Дополнительных заседаний: {additional}.
      </p>
      {!hearingService && (
        <p className="text-sm text-warning">
          В справочнике нет активной услуги «{hearingServiceName}» — добавьте её вручную на шаге
          «Выбор этапов».
        </p>
      )}
    </div>
  );
}

// --- Step 5 -----------------------------------------------------------------

export function Step5ExpertiseBlocks({
  state,
  setState,
  services,
}: {
  state: WizardState;
  setState: SetState;
  services: ServiceRow[];
}) {
  const caseCategory = CASE_TYPE_LABELS[state.caseType];
  const isCourtCase = state.caseType === "ordinary_case" || state.caseType === "medical_case";
  const extras = services.filter(
    (s) =>
      (s.kind === "expertise" || s.kind === "process_block") &&
      (!isCourtCase || s.category === caseCategory),
  );

  function setQuantity(service: ServiceRow, quantity: number) {
    setState((s) => {
      const withoutIt = s.lines.filter((l) => l.serviceId !== service.id);
      if (quantity <= 0) return { ...s, lines: withoutIt };
      return { ...s, lines: [...withoutIt, serviceToLine(service, quantity)] };
    });
  }

  if (extras.length === 0) {
    return <p className="text-sm text-muted-foreground">В справочнике нет услуг этого типа.</p>;
  }

  return (
    <div className="flex flex-col gap-3 max-w-lg">
      {extras.map((service) => {
        const line = state.lines.find((l) => l.serviceId === service.id);
        return (
          <div
            key={service.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <div>
              <p className="font-medium">{service.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatKopecks(service.basePriceKopecks)} · {(service.plannedMinutes / 60).toFixed(1)} ч за единицу
              </p>
            </div>
            <Input
              type="number"
              min={0}
              className="w-20"
              value={line?.quantity ?? 0}
              onChange={(e) => setQuantity(service, Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- Step 6 -----------------------------------------------------------------

export function Step6Time({ state, setState }: { state: WizardState; setState: SetState }) {
  function updateLine(clientId: string, patch: Partial<WizardLine>) {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.clientId === clientId ? { ...l, ...patch } : l)),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {state.lines.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Сначала выберите этапы на предыдущих шагах.
          </p>
        )}
        {state.lines.map((line) => (
          <div key={line.clientId} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <p className="font-medium">{line.name || "Без названия"}</p>
              <p className="text-xs text-muted-foreground">{LINE_KIND_LABELS[line.kind]}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Кол-во</Label>
              <Input
                type="number"
                min={1}
                className="w-20"
                value={line.quantity}
                onChange={(e) => updateLine(line.clientId, { quantity: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Плановое время, мин / ед.</Label>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={line.plannedMinutesPerUnit}
                onChange={(e) =>
                  updateLine(line.clientId, {
                    plannedMinutesPerUnit: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                editable={line.plannedMinutesPerUnit !== line.originalPlannedMinutesPerUnit}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="max-w-sm">
        <Label htmlFor="travelMinutes">
          Время в дороге, мин{" "}
          <InfoHint>
            Учитывается согласно правилу из настроек (доля засчитываемого времени в дороге).
          </InfoHint>
        </Label>
        <Input
          id="travelMinutes"
          type="number"
          min={0}
          className="mt-1.5"
          value={state.travelMinutesEntered}
          onChange={(e) =>
            setState((s) => ({ ...s, travelMinutesEntered: Math.max(0, Number(e.target.value) || 0) }))
          }
        />
      </div>
    </div>
  );
}

// --- Step 7 -----------------------------------------------------------------

interface CoefficientOption {
  code: string;
  label: string;
  bps: number;
}

export function Step7Coefficients({
  state,
  setState,
  complexityOptions,
  urgencyOptions,
  responsibilityOptions,
}: {
  state: WizardState;
  setState: SetState;
  complexityOptions: CoefficientOption[];
  urgencyOptions: CoefficientOption[];
  responsibilityOptions: CoefficientOption[];
}) {
  function updateLine(clientId: string, patch: Partial<WizardLine>) {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.clientId === clientId ? { ...l, ...patch } : l)),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        Коэффициенты складываются, а не перемножаются. Срочность применяется только к строке, к
        которой относится — не ко всему делу.
      </p>
      {state.lines.map((line) => (
        <Card key={line.clientId}>
          <CardContent className="flex flex-col gap-3 py-4">
            <p className="font-medium">{line.name || "Без названия"}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CoefficientSelect
                label="Сложность"
                options={complexityOptions}
                value={line.complexityBps}
                onChange={(bps) => updateLine(line.clientId, { complexityBps: bps })}
              />
              <CoefficientSelect
                label="Срочность"
                options={urgencyOptions}
                value={line.urgencyBps}
                onChange={(bps) => updateLine(line.clientId, { urgencyBps: bps })}
              />
              <CoefficientSelect
                label="Ответственность"
                options={responsibilityOptions}
                value={line.responsibilityBps}
                onChange={(bps) => updateLine(line.clientId, { responsibilityBps: bps })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Комментарий к строке</Label>
              <Textarea
                className="mt-1"
                value={line.comment}
                onChange={(e) => updateLine(line.clientId, { comment: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CoefficientSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: CoefficientOption[];
  value: number;
  onChange: (bps: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.code} value={String(o.bps)}>
              {o.label} ({(o.bps / 100).toFixed(0)}%)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// --- Step 8 -----------------------------------------------------------------

export function Step8Discount({
  state,
  setState,
  discountOptionsBps,
  discountReasonRequiredThresholdBps,
}: {
  state: WizardState;
  setState: SetState;
  discountOptionsBps: number[];
  discountReasonRequiredThresholdBps: number;
}) {
  const requiresReason = state.discountBps > discountReasonRequiredThresholdBps;

  return (
    <div className="flex max-w-md flex-col gap-4">
      <RadioGroup
        value={state.discountPreset}
        onValueChange={(preset) => {
          setState((s) => {
            if (preset === "custom") return { ...s, discountPreset: "custom" };
            const bps = Number(preset);
            return { ...s, discountPreset: preset as "0" | "10" | "20", discountBps: bps, discountReason: bps === 0 ? "" : s.discountReason };
          });
        }}
      >
        {discountOptionsBps.map((bps) => (
          <label
            key={bps}
            className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-secondary"
          >
            <RadioGroupItem value={String(bps)} />
            {(bps / 100).toFixed(0)}%
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-secondary">
          <RadioGroupItem value="custom" />
          Другое значение
        </label>
      </RadioGroup>
      {state.discountPreset === "custom" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customDiscount">Скидка, %</Label>
          <Input
            id="customDiscount"
            type="number"
            min={0}
            max={100}
            value={state.discountBps / 100}
            onChange={(e) =>
              setState((s) => ({ ...s, discountBps: Math.round(Math.max(0, Number(e.target.value) || 0) * 100) }))
            }
          />
        </div>
      )}
      {requiresReason && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discountReason">
            Причина скидки свыше {(discountReasonRequiredThresholdBps / 100).toFixed(0)}%
            (обязательно)
          </Label>
          <Textarea
            id="discountReason"
            value={state.discountReason}
            onChange={(e) => setState((s) => ({ ...s, discountReason: e.target.value }))}
          />
        </div>
      )}
    </div>
  );
}

// --- Step 9 -----------------------------------------------------------------

export function Step9Expenses({ state, setState }: { state: WizardState; setState: SetState }) {
  function addExpense() {
    setState((s) => ({
      ...s,
      expenses: [
        ...s.expenses,
        { clientId: crypto.randomUUID(), category: "other", description: "", amountKopecks: 0 },
      ],
    }));
  }
  function updateExpense(clientId: string, patch: Partial<WizardExpense>) {
    setState((s) => ({
      ...s,
      expenses: s.expenses.map((e) => (e.clientId === clientId ? { ...e, ...patch } : e)),
    }));
  }
  function removeExpense(clientId: string) {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.clientId !== clientId) }));
  }

  return (
    <div className="flex flex-col gap-3">
      {state.expenses.map((expense) => (
        <div
          key={expense.clientId}
          className="grid grid-cols-1 items-end gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_2fr_1fr_auto]"
        >
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Категория</Label>
            <Select
              value={expense.category}
              onValueChange={(v) => updateExpense(expense.clientId, { category: v as ExpenseCategory })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EXPENSE_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Описание</Label>
            <Input
              value={expense.description}
              onChange={(e) => updateExpense(expense.clientId, { description: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Сумма, ₽</Label>
            <Input
              type="number"
              min={0}
              value={kopecksToRubles(expense.amountKopecks)}
              onChange={(e) =>
                updateExpense(expense.clientId, {
                  amountKopecks: rublesToKopecks(Math.max(0, Number(e.target.value) || 0)),
                })
              }
            />
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(expense.clientId)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="self-start" onClick={addExpense}>
        <Plus /> Добавить расход
      </Button>
    </div>
  );
}

// --- Step 10 ------------------------------------------------------------

export function Step10Review({ state, setState }: { state: WizardState; setState: SetState }) {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Внутреннее название</Label>
        <Input
          value={state.internalName}
          onChange={(e) => setState((s) => ({ ...s, internalName: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Код клиента</Label>
        <Input
          value={state.clientCode}
          onChange={(e) => setState((s) => ({ ...s, clientCode: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Комментарий к расчёту</Label>
        <Textarea
          value={state.comment}
          onChange={(e) => setState((s) => ({ ...s, comment: e.target.value }))}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Состав расчёта</p>
        <div className="flex flex-col divide-y divide-border rounded-md border border-border">
          {state.lines.map((line) => (
            <div key={line.clientId} className="flex items-center justify-between p-2.5 text-sm">
              <span>
                {line.name} × {line.quantity}
              </span>
              <span className="tabular-nums">{formatKopecks(line.basePriceKopecks * line.quantity)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
