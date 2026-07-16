import Link from "next/link";
import type { CaseRow } from "@/server/queries/cases";
import type { CaseFinancials } from "@/domain/calculations";
import { formatMoney, formatDateRu } from "@/domain/calculations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CASE_TYPE_LABELS } from "@/domain/labels";
import { CaseStatusSelect } from "./case-status-select";
import { DeleteCaseButton } from "./delete-case-button";

export function CaseHeader({
  caseRow,
  financials,
}: {
  caseRow: CaseRow;
  financials: CaseFinancials;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>№ {caseRow.internalNumber}</span>
            <span>·</span>
            <span>{CASE_TYPE_LABELS[caseRow.caseType]}</span>
            <span>·</span>
            <span>Обращение: {formatDateRu(caseRow.inquiryDate)}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{caseRow.shortName}</h1>
          <p className="text-sm text-muted-foreground">Клиент: {caseRow.clientCode}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <CaseStatusSelect caseRow={caseRow} />
          <Link href={`/cases/${caseRow.id}/offer`} target="_blank">
            <Button variant="outline" size="sm">
              Коммерческое предложение
            </Button>
          </Link>
          <DeleteCaseButton caseId={caseRow.id} deleted={Boolean(caseRow.deletedAt)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
        <HeaderStat label="Итог клиенту" value={formatMoney(financials.totalToClientKopecks)} />
        <HeaderStat label="Получено" value={formatMoney(financials.receivedKopecks)} tone="accent" />
        <HeaderStat
          label="Задолженность"
          value={formatMoney(financials.debtKopecks)}
          tone={financials.debtKopecks > 0 ? "danger" : "accent"}
        />
        <HeaderStat
          label="Эффективная ставка"
          value={
            financials.effectiveRateKopecksPerHour
              ? formatMoney(financials.effectiveRateKopecksPerHour) + (financials.effectiveRateIsPlanned ? " (план)" : "")
              : "Нет данных"
          }
        />
      </div>

      {caseRow.deletedAt && (
        <Badge variant="danger" className="w-fit">
          Дело удалено (мягкое удаление) — {formatDateRu(caseRow.deletedAt)}
        </Badge>
      )}
    </div>
  );
}

function HeaderStat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "danger" }) {
  const toneClass = tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-foreground";
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
