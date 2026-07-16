import { getSettings } from "@/server/queries/settings";
import { listServices } from "@/server/queries/services";
import { CaseTabNav } from "@/components/case/case-tab-nav";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { TaxSettingsForm } from "@/components/settings/tax-settings-form";
import { ServicesCatalogTab } from "@/components/settings/services-catalog-tab";
import { DataBackupTab } from "@/components/settings/data-backup-tab";
import { listBackups } from "@/db/backup";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "general", label: "Цели и расходы" },
  { value: "taxes", label: "Налоги" },
  { value: "services", label: "Справочник услуг" },
  { value: "data", label: "Данные и резервные копии" },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const activeTab = tab ?? "general";
  const settings = getSettings();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <CaseTabNav tabs={TABS} defaultValue="general" />

      {activeTab === "general" && <GeneralSettingsForm settings={settings} />}
      {activeTab === "taxes" && <TaxSettingsForm settings={settings} />}
      {activeTab === "services" && <ServicesCatalogTab services={listServices(true)} />}
      {activeTab === "data" && <DataBackupTab backups={listBackups()} />}
    </div>
  );
}
