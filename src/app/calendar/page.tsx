import Link from "next/link";
import { getCalendarEvents, type CalendarEventType } from "@/server/queries/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateRu } from "@/domain/calculations";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<CalendarEventType, string> = {
  meeting: "Заседание",
  stage_due: "Срок этапа",
  payment: "Плановая оплата",
  next_action: "Контрольная дата",
};

const TYPE_BADGE: Record<CalendarEventType, "primary" | "warning" | "accent" | "neutral"> = {
  meeting: "primary",
  stage_due: "warning",
  payment: "accent",
  next_action: "neutral",
};

export default function CalendarPage() {
  const events = getCalendarEvents();
  const overdue = events.filter((e) => e.overdue);
  const upcoming = events.filter((e) => !e.overdue);

  const grouped = new Map<string, typeof upcoming>();
  for (const e of upcoming) {
    const list = grouped.get(e.date) ?? [];
    list.push(e);
    grouped.set(e.date, list);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Календарь</h1>
      <p className="text-sm text-muted-foreground">
        Заседания, сроки этапов, плановые оплаты и контрольные даты по всем активным делам.
      </p>

      {overdue.length > 0 && (
        <Card className="border-danger/40">
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-danger">Просрочено ({overdue.length})</h2>
            <ul className="flex flex-col gap-2">
              {overdue.map((e, i) => (
                <EventRow key={i} event={e} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {[...grouped.entries()].map(([date, list]) => (
        <Card key={date}>
          <CardContent className="p-4">
            <h2 className="mb-2 text-sm font-semibold">{formatDateRu(date)}</h2>
            <ul className="flex flex-col gap-2">
              {list.map((e, i) => (
                <EventRow key={i} event={e} />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {events.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Событий пока нет.</CardContent>
        </Card>
      )}
    </div>
  );
}

function EventRow({
  event,
}: {
  event: { type: CalendarEventType; title: string; caseId: number; caseName: string; overdue: boolean };
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant={event.overdue ? "danger" : TYPE_BADGE[event.type]}>{TYPE_LABELS[event.type]}</Badge>
        <span>{event.title}</span>
      </div>
      <Link href={`/cases/${event.caseId}`} className="text-primary hover:underline">
        {event.caseName}
      </Link>
    </li>
  );
}
