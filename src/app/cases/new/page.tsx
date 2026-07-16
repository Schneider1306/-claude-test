import { listServices } from "@/server/queries/services";
import { getSettings } from "@/server/queries/settings";
import { NewCaseWizard } from "@/components/wizard/new-case-wizard";

export const dynamic = "force-dynamic";

export default function NewCasePage() {
  const services = listServices(false);
  const settings = getSettings();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Новое дело</h1>
        <p className="text-sm text-muted-foreground">
          Пошаговое создание дела с автоматическим расчётом первоначальной стоимости.
        </p>
      </div>
      <NewCaseWizard
        services={services}
        defaultIncludedMeetings={settings.defaultIncludedMeetings}
        standardDiscountBp={settings.standardDiscountBp}
        maxDiscountBp={settings.maxDiscountBp}
        standardUrgencySurchargeBp={settings.standardUrgencySurchargeBp}
      />
    </div>
  );
}
