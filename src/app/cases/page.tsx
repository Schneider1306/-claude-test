import Link from "next/link";
import { listCasesWithSummary } from "@/server/queries/cases";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { formatDateRu, formatHours, formatMoney } from "@/domain/calculations";
import { CASE_STATUS_BADGE, CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/domain/labels";
import { CASE_STATUSES, CASE_TYPES } from "@/db/schema";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = str(sp.q).trim().toLowerCase();
  const statusFilter = str(sp.status);
  const typeFilter = str(sp.type);
  const sortField = str(sp.sort) || "id";
  const sortDir = str(sp.dir) === "asc" ? "asc" : "desc";

  const all = listCasesWithSummary();

  let filtered = all.filter(({ case: c }) => {
    if (query) {
      const haystack = `${c.shortName} ${c.internalNumber} ${c.clientCode}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (statusFilter && c.status !== statusFilter) return false;
    if (typeFilter && c.caseType !== typeFilter) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sortField) {
      case "number":
        av = a.case.internalNumber;
        bv = b.case.internalNumber;
        break;
      case "name":
        av = a.case.shortName;
        bv = b.case.shortName;
        break;
      case "total":
        av = a.financials.totalToClientKopecks;
        bv = b.financials.totalToClientKopecks;
        break;
      case "paid":
        av = a.financials.receivedKopecks;
        bv = b.financials.receivedKopecks;
        break;
      case "debt":
        av = a.financials.debtKopecks;
        bv = b.financials.debtKopecks;
        break;
      case "planned":
        av = a.financials.plannedMinutesTotal;
        bv = b.financials.plannedMinutesTotal;
        break;
      case "actual":
        av = a.financials.actualMinutesTotal ?? 0;
        bv = b.financials.actualMinutesTotal ?? 0;
        break;
      case "rate":
        av = a.financials.effectiveRateKopecksPerHour ?? -1;
        bv = b.financials.effectiveRateKopecksPerHour ?? -1;
        break;
      default:
        av = a.case.id;
        bv = b.case.id;
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const sortLink = (field: string) => {
    const nextDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/cases?${params.toString()}`;
  };

  const csvParams = new URLSearchParams();
  if (query) csvParams.set("q", query);
  if (statusFilter) csvParams.set("status", statusFilter);
  if (typeFilter) csvParams.set("type", typeFilter);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Дела</h1>
        <div className="flex gap-2">
          <a href={`/api/export/cases-csv?${csvParams.toString()}`}>
            <Button variant="outline">Экспорт CSV</Button>
          </a>
          <Link href="/cases/new">
            <Button>+ Новое дело</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Поиск</label>
              <Input name="q" defaultValue={query} placeholder="Номер, название, код клиента…" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Статус</label>
              <Select name="status" defaultValue={statusFilter} className="min-w-48">
                <option value="">Все статусы</option>
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CASE_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Тип дела</label>
              <Select name="type" defaultValue={typeFilter} className="min-w-48">
                <option value="">Все типы</option>
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CASE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Применить
            </Button>
            {(query || statusFilter || typeFilter) && (
              <Link href="/cases" className="text-sm text-muted-foreground hover:underline">
                Сбросить
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th><a href={sortLink("number")}>Номер</a></Th>
              <Th><a href={sortLink("name")}>Название</a></Th>
              <Th>Тип</Th>
              <Th>Статус</Th>
              <Th className="text-right"><a href={sortLink("total")}>Согласовано</a></Th>
              <Th className="text-right"><a href={sortLink("paid")}>Оплачено</a></Th>
              <Th className="text-right"><a href={sortLink("debt")}>Долг</a></Th>
              <Th className="text-right"><a href={sortLink("planned")}>План, ч</a></Th>
              <Th className="text-right"><a href={sortLink("actual")}>Факт, ч</a></Th>
              <Th className="text-right"><a href={sortLink("rate")}>Ставка</a></Th>
              <Th>Дальнейшее действие</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map(({ case: c, financials }) => (
              <Tr key={c.id}>
                <Td>
                  <Link href={`/cases/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.internalNumber}
                  </Link>
                </Td>
                <Td className="max-w-56 truncate">{c.shortName}</Td>
                <Td className="text-muted-foreground">{CASE_TYPE_LABELS[c.caseType]}</Td>
                <Td>
                  <Badge variant={CASE_STATUS_BADGE[c.status]}>{CASE_STATUS_LABELS[c.status]}</Badge>
                </Td>
                <Td className="text-right tabular-nums">{formatMoney(financials.totalToClientKopecks)}</Td>
                <Td className="text-right tabular-nums">{formatMoney(financials.receivedKopecks)}</Td>
                <Td
                  className={`text-right tabular-nums font-medium ${
                    financials.debtKopecks > 0 ? "text-danger" : "text-accent"
                  }`}
                >
                  {formatMoney(financials.debtKopecks)}
                </Td>
                <Td className="text-right tabular-nums">{formatHours(financials.plannedMinutesTotal)}</Td>
                <Td className="text-right tabular-nums">
                  {financials.actualMinutesTotal ? formatHours(financials.actualMinutesTotal) : "—"}
                </Td>
                <Td className="text-right tabular-nums">
                  {financials.effectiveRateKopecksPerHour ? formatMoney(financials.effectiveRateKopecksPerHour) : "Нет данных"}
                </Td>
                <Td className="text-muted-foreground">{formatDateRu(c.nextActionDate)}</Td>
              </Tr>
            ))}
            {filtered.length === 0 && (
              <Tr>
                <Td colSpan={11} className="py-8 text-center text-muted-foreground">
                  Дела не найдены.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
