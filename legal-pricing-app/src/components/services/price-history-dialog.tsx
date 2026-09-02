"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKopecks, formatDateTime } from "@/lib/format";
import type { servicePriceHistory } from "@/db/schema";

type HistoryRow = typeof servicePriceHistory.$inferSelect;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  history: HistoryRow[];
}

export function PriceHistoryDialog({ open, onOpenChange, serviceName, history }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>История изменения цены — {serviceName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">Изменений ещё не было.</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="rounded-md border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground">{formatDateTime(h.changedAt)}</p>
              <p>
                Цена: {formatKopecks(h.oldPriceKopecks)} → {formatKopecks(h.newPriceKopecks)}
              </p>
              <p>
                Время: {(h.oldPlannedMinutes / 60).toFixed(1)} ч → {(h.newPlannedMinutes / 60).toFixed(1)} ч
              </p>
              {h.comment && <p className="mt-1 text-muted-foreground">Причина: {h.comment}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
