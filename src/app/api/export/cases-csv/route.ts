import { NextResponse } from "next/server";
import { listCasesWithSummary } from "@/server/queries/cases";
import { toCsv } from "@/lib/csv";
import { formatDateRu, kopecksToRubles, minutesToHours } from "@/domain/calculations";
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/domain/labels";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  const status = url.searchParams.get("status") || "";
  const type = url.searchParams.get("type") || "";

  let rows = listCasesWithSummary();
  rows = rows.filter(({ case: c }) => {
    if (q) {
      const haystack = `${c.shortName} ${c.internalNumber} ${c.clientCode}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (status && c.status !== status) return false;
    if (type && c.caseType !== type) return false;
    return true;
  });

  const headers = [
    "Номер",
    "Название",
    "Тип дела",
    "Статус",
    "Согласовано, ₽",
    "Оплачено, ₽",
    "Долг, ₽",
    "План, ч",
    "Факт, ч",
    "Ставка, ₽/ч",
    "Дата обращения",
    "Ближайшее действие",
  ];

  const csvRows = rows.map(({ case: c, financials }) => [
    c.internalNumber,
    c.shortName,
    CASE_TYPE_LABELS[c.caseType] ?? c.caseType,
    CASE_STATUS_LABELS[c.status] ?? c.status,
    kopecksToRubles(financials.totalToClientKopecks),
    kopecksToRubles(financials.receivedKopecks),
    kopecksToRubles(financials.debtKopecks),
    minutesToHours(financials.plannedMinutesTotal),
    financials.actualMinutesTotal ? minutesToHours(financials.actualMinutesTotal) : "",
    financials.effectiveRateKopecksPerHour ? kopecksToRubles(financials.effectiveRateKopecksPerHour) : "",
    formatDateRu(c.inquiryDate),
    formatDateRu(c.nextActionDate),
  ]);

  const csv = toCsv(headers, csvRows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cases-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
