"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu } from "@/domain/calculations";
import { MEETING_STATUS_LABELS } from "@/domain/labels";
import { deleteMeeting } from "@/server/actions/meetings";
import { MeetingFormModal } from "./meeting-form-modal";
import type { StageRow } from "@/server/queries/case-financials";
import type { caseMeetings } from "@/db/schema";

type Meeting = typeof caseMeetings.$inferSelect;

const STATUS_BADGE: Record<string, "neutral" | "primary" | "accent" | "warning" | "danger"> = {
  scheduled: "primary",
  held: "accent",
  postponed: "warning",
  cancelled: "danger",
};

export function MeetingsTab({ caseId, meetings, stages }: { caseId: number; meetings: Meeting[]; stages: StageRow[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end no-print">
        <MeetingFormModal caseId={caseId} stages={stages} trigger={<Button>+ Добавить заседание</Button>} />
      </div>
      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Дата</Th>
              <Th>Место</Th>
              <Th>Цель</Th>
              <Th>Статус</Th>
              <Th>Результат</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {meetings.map((m) => (
              <Tr key={m.id}>
                <Td>{formatDateRu(m.meetingDate)}</Td>
                <Td className="max-w-40 truncate">{m.location || "—"}</Td>
                <Td className="max-w-56 truncate">{m.purpose || "—"}</Td>
                <Td>
                  <Badge variant={STATUS_BADGE[m.status] ?? "neutral"}>{MEETING_STATUS_LABELS[m.status]}</Badge>
                </Td>
                <Td className="max-w-56 truncate text-muted-foreground">{m.resultComment || "—"}</Td>
                <Td className="no-print">
                  <div className="flex gap-1">
                    <MeetingFormModal
                      caseId={caseId}
                      stages={stages}
                      meetingId={m.id}
                      initial={{
                        caseId,
                        stageId: m.stageId,
                        meetingDate: m.meetingDate,
                        location: m.location,
                        purpose: m.purpose,
                        status: m.status,
                        resultComment: m.resultComment,
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Изменить
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm("Удалить заседание?")) return;
                        await deleteMeeting(m.id, caseId);
                        router.refresh();
                      }}
                    >
                      Удалить
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
            {meetings.length === 0 && (
              <Tr>
                <Td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Заседаний пока нет.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
