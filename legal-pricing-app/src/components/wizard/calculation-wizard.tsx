"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toaster";
import { saveDraftCalculation, finalizeCalculation } from "@/server/actions/calculations";
import type { CalculationStatus } from "@/db/schema";
import { CALCULATION_STATUS_LABELS } from "@/lib/status-labels";
import { SummaryPanel } from "./summary-panel";
import { toDraftInput, type ServiceRow, type WizardState } from "./types";
import {
  Step1Basics,
  Step2CaseType,
  Step3Services,
  Step4Hearings,
  Step5ExpertiseBlocks,
  Step6Time,
  Step7Coefficients,
  Step8Discount,
  Step9Expenses,
  Step10Review,
} from "./wizard-steps";

interface CoefficientOption {
  code: string;
  label: string;
  bps: number;
}

interface Props {
  services: ServiceRow[];
  targetRateKopecks: number;
  travelMinutesCountedRatioBps: number;
  complexityOptions: CoefficientOption[];
  urgencyOptions: CoefficientOption[];
  responsibilityOptions: CoefficientOption[];
  discountOptionsBps: number[];
  discountReasonRequiredThresholdBps: number;
  initialState: WizardState;
}

const STEPS = [
  "Название и код клиента",
  "Тип дела",
  "Выбор этапов",
  "Заседания",
  "Экспертиза и блоки",
  "Плановое время",
  "Коэффициенты",
  "Скидка",
  "Внешние расходы",
  "Проверка и сохранение",
];

export function CalculationWizard({
  services,
  targetRateKopecks,
  travelMinutesCountedRatioBps,
  complexityOptions,
  urgencyOptions,
  responsibilityOptions,
  discountOptionsBps,
  discountReasonRequiredThresholdBps,
  initialState,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [state, setState] = React.useState<WizardState>(initialState);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<CalculationStatus>("draft");

  const travelMinutesCounted = Math.round(
    (state.travelMinutesEntered * travelMinutesCountedRatioBps) / 10000,
  );

  const canGoNext = React.useMemo(() => {
    if (step === 0) return state.internalName.trim().length > 0 && state.clientCode.trim().length > 0;
    if (step === 7) {
      const requiresReason = state.discountBps > discountReasonRequiredThresholdBps;
      return !requiresReason || state.discountReason.trim().length > 0;
    }
    return true;
  }, [step, state, discountReasonRequiredThresholdBps]);

  async function persistDraft() {
    try {
      const result = await saveDraftCalculation(toDraftInput(state, travelMinutesCounted));
      setState((s) => ({ ...s, id: result.id }));
    } catch {
      toast({
        title: "Не удалось сохранить черновик",
        description: "Изменения останутся в форме, попробуйте продолжить.",
        variant: "warning",
      });
    }
  }

  async function goNext() {
    if (!canGoNext) return;
    await persistDraft();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSave(finalStatus: CalculationStatus) {
    setSaving(true);
    try {
      const result = await finalizeCalculation(
        toDraftInput(state, travelMinutesCounted),
        finalStatus,
      );
      toast({ title: "Расчёт сохранён", variant: "success" });
      router.push(`/calculations/${result.id}`);
    } catch {
      toast({
        title: "Не удалось сохранить расчёт",
        description: "Проверьте введённые данные и попробуйте снова.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <ol className="flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
                  index === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : index < step
                      ? "border-success bg-success/10 text-success"
                      : "border-border text-muted-foreground"
                }`}
              >
                {index < step ? <Check className="size-3" /> : <span>{index + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </button>
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="py-6">
            <h2 className="mb-4 text-lg font-semibold">{STEPS[step]}</h2>

            {step === 0 && <Step1Basics state={state} setState={setState} />}
            {step === 1 && <Step2CaseType state={state} setState={setState} />}
            {step === 2 && <Step3Services state={state} setState={setState} services={services} />}
            {step === 3 && <Step4Hearings state={state} setState={setState} services={services} />}
            {step === 4 && <Step5ExpertiseBlocks state={state} setState={setState} services={services} />}
            {step === 5 && <Step6Time state={state} setState={setState} />}
            {step === 6 && (
              <Step7Coefficients
                state={state}
                setState={setState}
                complexityOptions={complexityOptions}
                urgencyOptions={urgencyOptions}
                responsibilityOptions={responsibilityOptions}
              />
            )}
            {step === 7 && (
              <Step8Discount
                state={state}
                setState={setState}
                discountOptionsBps={discountOptionsBps}
                discountReasonRequiredThresholdBps={discountReasonRequiredThresholdBps}
              />
            )}
            {step === 8 && <Step9Expenses state={state} setState={setState} />}
            {step === 9 && <Step10Review state={state} setState={setState} />}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            <ChevronLeft /> Назад
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={!canGoNext}>
              Далее <ChevronRight />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <select
                className="h-10 rounded-md border border-input bg-transparent px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as CalculationStatus)}
              >
                {(["draft", "proposal_sent", "agreed"] as CalculationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {CALCULATION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <Button type="button" onClick={() => handleSave(status)} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <Check />} Сохранить расчёт
              </Button>
            </div>
          )}
        </div>
      </div>

      <SummaryPanel
        state={state}
        targetRateKopecks={targetRateKopecks}
        travelMinutesCounted={travelMinutesCounted}
      />
    </div>
  );
}
