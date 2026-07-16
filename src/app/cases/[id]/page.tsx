import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCaseById,
  getExpensesForCase,
  getMeetingsForCase,
  getPaymentsForCase,
  getTimeEntriesForCase,
} from "@/server/queries/cases";
import { getCaseFinancials } from "@/server/queries/case-financials";
import { getSettings } from "@/server/queries/settings";
import { listServices } from "@/server/queries/services";
import { db } from "@/db/client";
import { caseHistory } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { CaseHeader } from "@/components/case/case-header";
import { CaseTabNav } from "@/components/case/case-tab-nav";
import { OverviewTab } from "@/components/case/overview-tab";
import { StagesTab } from "@/components/case/stages-tab";
import { MeetingsTab } from "@/components/case/meetings-tab";
import { TimeTab } from "@/components/case/time-tab";
import { PaymentsTab } from "@/components/case/payments-tab";
import { ExpensesTab } from "@/components/case/expenses-tab";
import { EconomicsTab } from "@/components/case/economics-tab";
import { DocumentsTab } from "@/components/case/documents-tab";
import { HistoryTab } from "@/components/case/history-tab";

export const dynamic = "force-dynamic";

const TABS = [
  { value: "overview", label: "Обзор" },
  { value: "stages", label: "Этапы" },
  { value: "meetings", label: "Заседания" },
  { value: "time", label: "Время" },
  { value: "payments", label: "Оплаты" },
  { value: "expenses", label: "Расходы" },
  { value: "economics", label: "Экономика" },
  { value: "documents", label: "Документы" },
  { value: "history", label: "История" },
];

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const caseId = Number(id);
  if (!Number.isFinite(caseId)) notFound();

  const caseRow = getCaseById(caseId);
  if (!caseRow) notFound();

  const { tab } = await searchParams;
  const activeTab = tab ?? "overview";

  const financials = getCaseFinancials(caseId);
  const settings = getSettings();
  const services = listServices(false);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/cases" className="text-sm text-muted-foreground hover:underline no-print">
        ← Ко всем делам
      </Link>
      <CaseHeader caseRow={caseRow} financials={financials} />
      <CaseTabNav tabs={TABS} defaultValue="overview" />

      {activeTab === "overview" && <OverviewTab caseRow={caseRow} financials={financials} />}

      {activeTab === "stages" && (
        <StagesTab
          caseId={caseId}
          stages={financials.stages}
          actualMinutesByStage={financials.actualMinutesByStage}
          services={services}
          settings={settings}
        />
      )}

      {activeTab === "meetings" && (
        <MeetingsTab caseId={caseId} meetings={getMeetingsForCase(caseId)} stages={financials.stages} />
      )}

      {activeTab === "time" && (
        <TimeTab caseId={caseId} entries={getTimeEntriesForCase(caseId)} stages={financials.stages} />
      )}

      {activeTab === "payments" && (
        <PaymentsTab
          caseId={caseId}
          payments={getPaymentsForCase(caseId)}
          stages={financials.stages}
          defaultPayerType={caseRow.clientType === "individual" ? "individual" : "organization"}
        />
      )}

      {activeTab === "expenses" && <ExpensesTab caseId={caseId} expenses={getExpensesForCase(caseId)} />}

      {activeTab === "economics" && (
        <EconomicsTab financials={financials} settings={settings} />
      )}

      {activeTab === "documents" && <DocumentsTab caseId={caseId} />}

      {activeTab === "history" && (
        <HistoryTab
          entries={db
            .select()
            .from(caseHistory)
            .where(eq(caseHistory.caseId, caseId))
            .orderBy(desc(caseHistory.changedAt))
            .all()}
        />
      )}
    </div>
  );
}
