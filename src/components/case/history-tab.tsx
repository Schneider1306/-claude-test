import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateRu } from "@/domain/calculations";
import type { caseHistory } from "@/db/schema";

type HistoryEntry = typeof caseHistory.$inferSelect;

const ACTION_LABELS: Record<string, string> = {
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  restore: "Восстановление",
};

const ACTION_BADGE: Record<string, "accent" | "primary" | "danger" | "warning"> = {
  create: "accent",
  update: "primary",
  delete: "danger",
  restore: "warning",
};

function formatDateTimeRu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDateRu(iso);
  return `${formatDateRu(iso)} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

export function HistoryTab({ entries }: { entries: HistoryEntry[] }) {
  return (
    <Card className="p-4 sm:p-5">
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Изменений пока не зафиксировано.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.id} className="flex gap-3 border-b border-border pb-3 last:border-none">
              <Badge variant={ACTION_BADGE[e.action] ?? "primary"} className="mt-0.5 h-fit shrink-0">
                {ACTION_LABELS[e.action] ?? e.action}
              </Badge>
              <div>
                <p className="text-sm">{e.summary}</p>
                <p className="text-xs text-muted-foreground">{formatDateTimeRu(e.changedAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
