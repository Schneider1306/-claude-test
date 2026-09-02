import { getSettingsView } from "@/server/queries";
import { SettingsForm } from "@/components/settings/settings-form";
import { BackupPanel } from "@/components/settings/backup-panel";
import { getDatabaseStats } from "@/server/actions/backup";
import type { SettingsInputData } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const view = getSettingsView();
  const stats = await getDatabaseStats();

  const initial: SettingsInputData = {
    desiredMonthlyIncomeKopecks: view.row.desiredMonthlyIncomeKopecks,
    rentKopecks: view.row.rentKopecks,
    internetKopecks: view.row.internetKopecks,
    stationeryKopecks: view.row.stationeryKopecks,
    aiAssistantsKopecks: view.row.aiAssistantsKopecks,
    practiceReserveKopecks: view.row.practiceReserveKopecks,
    workWeeksPerYear: view.row.workWeeksPerYear,
    workDaysPerWeek: view.row.workDaysPerWeek,
    billableMinutesPerDay: view.row.billableMinutesPerDay,
    lossRateBps: view.row.lossRateBps,
    taxRateBps: view.row.taxRateBps,
    targetRateRoundingKopecks: view.row.targetRateRoundingKopecks,
    travelMinutesCountedRatioBps: view.row.travelMinutesCountedRatioBps,
    discountReasonRequiredThresholdBps: view.row.discountReasonRequiredThresholdBps,
    complexityOptions: view.complexityOptions,
    urgencyOptions: view.urgencyOptions,
    responsibilityOptions: view.responsibilityOptions,
    discountOptionsBps: view.discountOptionsBps,
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Настройки</h1>
        <p className="text-sm text-muted-foreground">
          Целевая ставка — внутренний ориентир. Изменение настроек не пересчитывает уже
          сохранённые расчёты.
        </p>
      </div>
      <SettingsForm initial={initial} />
      <BackupPanel stats={stats} />
    </div>
  );
}
