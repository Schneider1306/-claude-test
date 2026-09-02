import { notFound } from "next/navigation";
import { CalculationWizard } from "@/components/wizard/calculation-wizard";
import { getActiveServices, getSettingsView, getCalculationDetail } from "@/server/queries";
import { detailToWizardState } from "@/server/wizard-mapper";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCalculationPage({ params }: Props) {
  const { id } = await params;
  const detail = getCalculationDetail(Number(id));
  if (!detail) notFound();

  const services = getActiveServices();
  const settingsView = getSettingsView();
  const initialState = detailToWizardState(detail);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">
          Изменение расчёта №{detail.calculation.number}
        </h1>
        <p className="text-sm text-muted-foreground">
          Изменения сохраняются в этот же расчёт. Чтобы сохранить историю, используйте «Новая
          версия» на странице расчёта.
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
