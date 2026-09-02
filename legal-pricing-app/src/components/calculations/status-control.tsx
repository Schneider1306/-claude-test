"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { updateCalculationStatus, archiveCalculation } from "@/server/actions/calculations";
import { CALCULATION_STATUS_LABELS, CALCULATION_STATUS_ORDER } from "@/lib/status-labels";
import type { CalculationStatus } from "@/db/schema";

export function StatusControl({ id, status }: { id: number; status: CalculationStatus }) {
  const router = useRouter();
  const { toast } = useToast();
  const [next, setNext] = React.useState<CalculationStatus>(status);
  const [pending, startTransition] = React.useTransition();

  function apply() {
    if (next === status) return;
    startTransition(async () => {
      if (next === "archived") {
        await archiveCalculation(id);
      } else {
        await updateCalculationStatus(id, next);
      }
      toast({ title: `Статус изменён на «${CALCULATION_STATUS_LABELS[next]}»`, variant: "success" });
      router.refresh();
    });
  }

  return (
    <div className="no-print flex items-center gap-2">
      <Select value={next} onValueChange={(v) => setNext(v as CalculationStatus)}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CALCULATION_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {CALCULATION_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={apply} disabled={pending || next === status} size="sm">
        Изменить статус
      </Button>
    </div>
  );
}
