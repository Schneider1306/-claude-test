"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu, formatHours } from "@/domain/calculations";
import { deleteTimeEntry } from "@/server/actions/time-entries";
import { TimeEntryForm } from "./time-entry-form";
import type { StageRow } from "@/server/queries/case-financials";
import type { timeEntries } from "@/db/schema";

type TimeEntry = typeof timeEntries.$inferSelect;

export function TimeTab({ caseId, entries, stages }: { caseId: number; entries: TimeEntry[]; stages: StageRow[] }) {
  const router = useRouter();
  const stageById = new Map(stages.map((s) => [s.id, s.name]));
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const billableMinutes = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.minutes, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="no-print">
        <TimeEntryForm caseId={caseId} stages={stages} />
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Всего: {formatHours(totalMinutes)}</span>
        <span>Оплачиваемое: {formatHours(billableMinutes)}</span>
      </div>
      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Дата</Th>
              <Th>Этап</Th>
              <Th>Вид работы</Th>
              <Th className="text-right">Время</Th>
              <Th>Тип</Th>
              <Th>Комментарий</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {entries.map((e) => (
              <Tr key={e.id}>
                <Td>{formatDateRu(e.workDate)}</Td>
                <Td className="max-w-40 truncate">{e.stageId ? (stageById.get(e.stageId) ?? "—") : "—"}</Td>
                <Td>{e.workType || "—"}</Td>
                <Td className="text-right tabular-nums">{formatHours(e.minutes)}</Td>
                <Td>
                  <Badge variant={e.isBillable ? "accent" : "neutral"}>
                    {e.isBillable ? "Оплачиваемое" : "Внутреннее"}
                  </Badge>
                </Td>
                <Td className="max-w-56 truncate text-muted-foreground">{e.comment || "—"}</Td>
                <Td className="no-print">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm("Удалить запись времени?")) return;
                      await deleteTimeEntry(e.id, caseId);
                      router.refresh();
                    }}
                  >
                    Удалить
                  </Button>
                </Td>
              </Tr>
            ))}
            {entries.length === 0 && (
              <Tr>
                <Td colSpan={7} className="py-8 text-center text-muted-foreground">
                  Записей времени пока нет.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
