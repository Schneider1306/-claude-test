"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { addTimeEntry } from "@/server/actions/time-entries";
import type { TimeEntryFormValues } from "@/domain/schemas";
import type { StageRow } from "@/server/queries/case-financials";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function TimeEntryForm({ caseId, stages }: { caseId: number; stages: StageRow[] }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState } = useForm<TimeEntryFormValues>({
    defaultValues: {
      caseId,
      stageId: null,
      workDate: new Date().toISOString().slice(0, 10),
      workType: "",
      minutes: 0,
      isBillable: true,
      comment: "",
    },
  });

  const [running, setRunning] = React.useState(false);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const startRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (startRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const onSubmit = handleSubmit(async (data) => {
    await addTimeEntry(data);
    setElapsedSeconds(0);
    setValue("minutes", 0);
    setValue("comment", "");
    router.refresh();
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-muted p-3">
          <span className="font-mono text-lg tabular-nums">{formatElapsed(elapsedSeconds)}</span>
          {!running ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                startRef.current = Date.now() - elapsedSeconds * 1000;
                setRunning(true);
              }}
            >
              Старт таймера
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setRunning(false);
                setValue("minutes", Math.max(1, Math.round(elapsedSeconds / 60)));
              }}
            >
              Стоп и заполнить минуты
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            Таймер переносит время в поле «Минуты» ниже — проверьте и сохраните запись.
          </span>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-1">
            <Label>Дата *</Label>
            <Input type="date" {...register("workDate", { required: true })} />
          </div>
          <div className="sm:col-span-1">
            <Label>Этап</Label>
            <Select {...register("stageId", { setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)) })}>
              <option value="">Без привязки</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label>Вид работы</Label>
            <Input {...register("workType")} placeholder="Подготовка, суд…" />
          </div>
          <div className="sm:col-span-1">
            <Label>Минуты *</Label>
            <Input type="number" {...register("minutes", { required: true, valueAsNumber: true, min: 1 })} />
          </div>
          <div className="flex items-end sm:col-span-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...register("isBillable")} />
              Оплачиваемое
            </label>
          </div>
          <div className="sm:col-span-1">
            <Button type="submit" disabled={formState.isSubmitting} className="w-full">
              {formState.isSubmitting ? "…" : "Добавить"}
            </Button>
          </div>
          <div className="sm:col-span-6">
            <Label>Комментарий</Label>
            <Textarea rows={1} {...register("comment")} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
