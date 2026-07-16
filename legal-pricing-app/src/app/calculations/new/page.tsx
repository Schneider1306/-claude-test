import { CalculationWizard } from "@/components/wizard/calculation-wizard";
import { getActiveServices, getSettingsView } from "@/server/queries";
import type { WizardState } from "@/components/wizard/types";

export const dynamic = "force-dynamic";

export default async function NewCalculationPage() {
  const services = getActiveServices();
  const settingsView = getSettingsView();

  const initialState: WizardState = {
    internalName: "",
    clientCode: "",
    caseType: "single",
    lines: [],
    discountBps: 0,
    discountPreset: "0",
    discountReason: "",
    travelMinutesEntered: 0,
    expenses: [],
    comment: "",
    totalHearings: 1,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Новый расчёт</h1>
        <p className="text-sm text-muted-foreground">
          Пройдите шаги мастера — итоги справа пересчитываются мгновенно
        </p>
      </div>
      <CalculationWizard
        services={services}
        targetRateKopecks={settingsView.targetRateKopecks}
        travelMinutesCountedRatioBps={settingsView.pricing.travelMinutesCountedRatioBps}
        complexityOptions={settingsView.complexityOptions}
        urgencyOptions={settingsView.urgencyOptions}
        responsibilityOptions={settingsView.responsibilityOptions}
        discountOptionsBps={settingsView.discountOptionsBps}
        discountReasonRequiredThresholdBps={settingsView.row.discountReasonRequiredThresholdBps}
        initialState={initialState}
      />
    </div>
  );
}
