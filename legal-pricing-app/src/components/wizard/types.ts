import type { CalculationDraftInput, CalculationLineInputData, ExpenseInputData } from "@/lib/schemas";
import type { services } from "@/db/schema";

export type ServiceRow = typeof services.$inferSelect;

export interface WizardLine extends CalculationLineInputData {
  originalBasePriceKopecks: number;
  originalPlannedMinutesPerUnit: number;
  overrideReason: string;
}

export type WizardExpense = ExpenseInputData;

export interface WizardState {
  id?: number;
  internalName: string;
  clientCode: string;
  caseType: CaseType;
  lines: WizardLine[];
  discountBps: number;
  discountPreset: "0" | "10" | "20" | "custom";
  discountReason: string;
  travelMinutesEntered: number;
  expenses: WizardExpense[];
  comment: string;
  totalHearings: number;
}

export type CaseType = "single" | "ordinary_case" | "medical_case" | "subscription" | "other";

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  single: "Разовая услуга",
  ordinary_case: "Обычное дело",
  medical_case: "Медицинское дело",
  subscription: "Абонентское сопровождение",
  other: "Иное",
};

export function serviceToLine(service: ServiceRow, quantity = 1): WizardLine {
  return {
    clientId: crypto.randomUUID(),
    serviceId: service.id,
    kind: service.kind,
    name: service.name,
    basePriceKopecks: service.basePriceKopecks,
    quantity,
    plannedMinutesPerUnit: service.plannedMinutes,
    complexityBps: 0,
    urgencyBps: 0,
    responsibilityBps: 0,
    comment: "",
    manualOverrides: [],
    originalBasePriceKopecks: service.basePriceKopecks,
    originalPlannedMinutesPerUnit: service.plannedMinutes,
    overrideReason: "",
  };
}

export function customLine(): WizardLine {
  return {
    clientId: crypto.randomUUID(),
    serviceId: null,
    kind: "custom",
    name: "",
    basePriceKopecks: 0,
    quantity: 1,
    plannedMinutesPerUnit: 0,
    complexityBps: 0,
    urgencyBps: 0,
    responsibilityBps: 0,
    comment: "",
    manualOverrides: [],
    originalBasePriceKopecks: 0,
    originalPlannedMinutesPerUnit: 0,
    overrideReason: "",
  };
}

export function toDraftInput(state: WizardState, travelMinutesCounted: number): CalculationDraftInput {
  return {
    id: state.id,
    internalName: state.internalName,
    clientCode: state.clientCode,
    caseType: CASE_TYPE_LABELS[state.caseType],
    discountBps: state.discountBps,
    discountReason: state.discountReason,
    travelMinutes: travelMinutesCounted,
    comment: state.comment,
    lines: state.lines.map((line) => {
      const overrides = [...line.manualOverrides];
      if (line.basePriceKopecks !== line.originalBasePriceKopecks) {
        overrides.push({
          field: "basePriceKopecks",
          original: String(line.originalBasePriceKopecks),
          next: String(line.basePriceKopecks),
          reason: line.overrideReason,
        });
      }
      if (line.plannedMinutesPerUnit !== line.originalPlannedMinutesPerUnit) {
        overrides.push({
          field: "plannedMinutesPerUnit",
          original: String(line.originalPlannedMinutesPerUnit),
          next: String(line.plannedMinutesPerUnit),
          reason: line.overrideReason,
        });
      }
      return {
        clientId: line.clientId,
        serviceId: line.serviceId,
        kind: line.kind,
        name: line.name,
        basePriceKopecks: line.basePriceKopecks,
        quantity: line.quantity,
        plannedMinutesPerUnit: line.plannedMinutesPerUnit,
        complexityBps: line.complexityBps,
        urgencyBps: line.urgencyBps,
        responsibilityBps: line.responsibilityBps,
        comment: line.comment,
        manualOverrides: overrides,
      };
    }),
    expenses: state.expenses,
  };
}
