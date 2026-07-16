import type { getCalculationDetail } from "@/server/queries";
import type { CaseType, WizardLine, WizardState } from "@/components/wizard/types";

type CalculationDetail = NonNullable<ReturnType<typeof getCalculationDetail>>;

const CASE_TYPE_BY_LABEL: Record<string, CaseType> = {
  "Разовая услуга": "single",
  "Обычное дело": "ordinary_case",
  "Медицинское дело": "medical_case",
  "Абонентское сопровождение": "subscription",
  Иное: "other",
};

export function detailToWizardState(detail: CalculationDetail): WizardState {
  const { calculation, lines, expenses } = detail;

  const wizardLines: WizardLine[] = lines.map((l) => ({
    clientId: crypto.randomUUID(),
    serviceId: l.serviceId,
    kind: l.kind,
    name: l.name,
    basePriceKopecks: l.basePriceKopecks,
    quantity: l.quantity,
    plannedMinutesPerUnit: l.plannedMinutesPerUnit,
    complexityBps: l.complexityBps,
    urgencyBps: l.urgencyBps,
    responsibilityBps: l.responsibilityBps,
    comment: l.comment,
    manualOverrides: JSON.parse(l.manualOverridesJson),
    originalBasePriceKopecks: l.basePriceKopecks,
    originalPlannedMinutesPerUnit: l.plannedMinutesPerUnit,
    overrideReason: "",
  }));

  const discountBps = calculation.discountBps;
  const discountPreset: WizardState["discountPreset"] =
    discountBps === 0 ? "0" : discountBps === 1000 ? "10" : discountBps === 2000 ? "20" : "custom";

  return {
    id: calculation.id,
    internalName: calculation.internalName,
    clientCode: calculation.clientCode,
    caseType: CASE_TYPE_BY_LABEL[calculation.caseType] ?? "other",
    lines: wizardLines,
    discountBps,
    discountPreset,
    discountReason: calculation.discountReason,
    travelMinutesEntered: calculation.travelMinutes,
    expenses: expenses.map((e) => ({
      clientId: crypto.randomUUID(),
      category: e.category,
      description: e.description,
      amountKopecks: e.amountKopecks,
    })),
    comment: calculation.comment,
    totalHearings: 1,
  };
}
