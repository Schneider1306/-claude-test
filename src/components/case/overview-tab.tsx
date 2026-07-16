import type { CaseRow } from "@/server/queries/cases";
import type { CaseFinancials } from "@/domain/calculations";
import { formatDateRu, formatHours, formatMoney } from "@/domain/calculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CASE_CLIENT_TYPE_LABELS } from "@/domain/labels";
import { EditCaseModal } from "./edit-case-modal";

export function OverviewTab({ caseRow, financials }: { caseRow: CaseRow; financials: CaseFinancials }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Данные дела</CardTitle>
          <div className="no-print">
            <EditCaseModal caseRow={caseRow} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="Тип клиента" value={CASE_CLIENT_TYPE_LABELS[caseRow.clientType]} />
          <Field label="Ответственный" value={caseRow.responsible || "—"} />
          <Field
            label="Первоначальная оценка"
            value={caseRow.initialEstimateKopecks != null ? formatMoney(caseRow.initialEstimateKopecks) : "—"}
          />
          <Field label="Дата обращения" value={formatDateRu(caseRow.inquiryDate)} />
          <Field label="Дата договора" value={formatDateRu(caseRow.contractDate)} />
          <Field label="Дата начала" value={formatDateRu(caseRow.startDate)} />
          <Field label="Дата завершения" value={formatDateRu(caseRow.endDate)} />
          <Field label="Ближайшее действие" value={formatDateRu(caseRow.nextActionDate)} />
          <div className="col-span-2 sm:col-span-3">
            <div className="text-xs text-muted-foreground">Комментарий</div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{caseRow.comment || "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Экономика дела</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <Row label="Вознаграждение" value={formatMoney(financials.feeGrossKopecks)} />
          <Row label="Скидка" value={"−" + formatMoney(financials.discountTotalKopecks)} />
          <Row label="Срочная надбавка" value={formatMoney(financials.urgencySurchargeTotalKopecks)} />
          <Row label="Итог клиенту" value={formatMoney(financials.totalToClientKopecks)} strong />
          <Row label="Получено" value={formatMoney(financials.receivedKopecks)} />
          <Row
            label="Задолженность"
            value={formatMoney(financials.debtKopecks)}
            tone={financials.debtKopecks > 0 ? "danger" : "accent"}
          />
          <Row label="Плановое время" value={formatHours(financials.plannedMinutesTotal)} />
          <Row label="Фактическое время" value={financials.actualMinutesTotal ? formatHours(financials.actualMinutesTotal) : "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "danger" | "accent";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "accent" ? "text-accent" : "";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${strong ? "font-semibold" : ""} ${toneClass}`}>{value}</span>
    </div>
  );
}
