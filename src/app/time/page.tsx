import Link from "next/link";
import { listAllTimeEntries } from "@/server/queries/time";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateRu, formatHours } from "@/domain/calculations";
import { GlobalDeleteTimeEntryButton } from "@/components/case/global-delete-time-entry-button";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };
function str(v: string | string[] | undefined) {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function TimePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const from = str(sp.from);
  const to = str(sp.to);
  const billable = str(sp.billable);
  const q = str(sp.q).toLowerCase();

  let rows = listAllTimeEntries();
  rows = rows.filter(({ entry: e, caseRow: c }) => {
    if (from && e.workDate < from) return false;
    if (to && e.workDate > to) return false;
    if (billable === "yes" && !e.isBillable) return false;
    if (billable === "no" && e.isBillable) return false;
    if (q && !`${c.shortName} ${c.internalNumber} ${e.workType}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const totalMinutes = rows.reduce((sum, r) => sum + r.entry.minutes, 0);
  const billableMinutes = rows.filter((r) => r.entry.isBillable).reduce((sum, r) => sum + r.entry.minutes, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Учёт времени</h1>
      <p className="text-sm text-muted-foreground">
        Добавление записей времени выполняется на вкладке «Время» карточки конкретного дела — там же доступен таймер.
      </p>

      <Card>
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">С даты</label>
              <Input type="date" name="from" defaultValue={from} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">По дату</label>
              <Input type="date" name="to" defaultValue={to} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Тип</label>
              <Select name="billable" defaultValue={billable} className="min-w-40">
                <option value="">Всё</option>
                <option value="yes">Оплачиваемое</option>
                <option value="no">Внутреннее</option>
              </Select>
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <label className="text-xs text-muted-foreground">Поиск</label>
              <Input name="q" defaultValue={q} placeholder="Дело, вид работы…" />
            </div>
            <Button type="submit" variant="outline">
              Применить
            </Button>
            {(from || to || billable || q) && (
              <Link href="/time" className="text-sm text-muted-foreground hover:underline">
                Сбросить
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Всего: <strong>{formatHours(totalMinutes)}</strong> · Оплачиваемое:{" "}
        <strong>{formatHours(billableMinutes)}</strong>
      </p>

      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Дата</Th>
              <Th>Дело</Th>
              <Th>Вид работы</Th>
              <Th className="text-right">Время</Th>
              <Th>Тип</Th>
              <Th>Комментарий</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {rows.map(({ entry: e, caseRow: c }) => (
              <Tr key={e.id}>
                <Td>{formatDateRu(e.workDate)}</Td>
                <Td className="max-w-40 truncate">
                  <Link href={`/cases/${c.id}?tab=time`} className="text-primary hover:underline">
                    {c.shortName}
                  </Link>
                </Td>
                <Td>{e.workType || "—"}</Td>
                <Td className="text-right tabular-nums">{formatHours(e.minutes)}</Td>
                <Td>
                  <Badge variant={e.isBillable ? "accent" : "neutral"}>{e.isBillable ? "Оплачиваемое" : "Внутреннее"}</Badge>
                </Td>
                <Td className="max-w-56 truncate text-muted-foreground">{e.comment || "—"}</Td>
                <Td>
                  <GlobalDeleteTimeEntryButton entryId={e.id} caseId={c.id} />
                </Td>
              </Tr>
            ))}
            {rows.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Записей не найдено.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
