"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { addStage, updateStage } from "@/server/actions/stages";
import type { StageFormValues } from "@/domain/schemas";
import { STAGE_STATUSES } from "@/db/schema";
import { STAGE_STATUS_LABELS } from "@/domain/labels";
import type { Service } from "@/server/queries/services";
import { bpToFraction, formatMoney, rublesToKopecks } from "@/domain/calculations";

export function StageFormModal({
  caseId,
  services,
  standardUrgencySurchargeBp,
  maxDiscountBp,
  trigger,
  initial,
  stageId,
}: {
  caseId: number;
  services: Service[];
  standardUrgencySurchargeBp: number;
  maxDiscountBp: number;
  trigger: React.ReactNode;
  initial?: Partial<StageFormValues>;
  stageId?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const { register, handleSubmit, watch, setValue, formState } = useForm<StageFormValues>({
    defaultValues: {
      caseId,
      name: "",
      serviceId: null,
      agreedPriceRubles: 0,
      quantity: 1,
      plannedHours: 0,
      includedMeetings: 0,
      status: "planned",
      isUrgent: false,
      urgencySurchargeBp: standardUrgencySurchargeBp,
      discountBp: 0,
      comment: "",
      ...initial,
    },
  });

  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    if (stageId) {
      await updateStage(stageId, data);
    } else {
      await addStage(data);
    }
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title={stageId ? "Изменить этап" : "Добавить этап"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Из справочника (необязательно)</Label>
            <Select
              defaultValue=""
              onChange={(e) => {
                const service = services.find((s) => s.id === Number(e.target.value));
                if (service) {
                  setValue("serviceId", service.id);
                  setValue("name", service.name);
                  setValue("agreedPriceRubles", service.workPriceKopecks / 100);
                  setValue("plannedHours", service.plannedMinutes / 60);
                  setValue("catalogPriceRubles", service.workPriceKopecks / 100);
                  setValue("catalogPlannedHours", service.plannedMinutes / 60);
                  setValue("includedMeetings", service.includedMeetings);
                }
              }}
            >
              <option value="">Выбрать услугу…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatMoney(s.workPriceKopecks)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Название этапа *</Label>
            <Input {...register("name", { required: true })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Цена, ₽ *</Label>
              <Input type="number" {...register("agreedPriceRubles", { required: true, valueAsNumber: true })} />
            </div>
            <div>
              <Label>Кол-во</Label>
              <Input type="number" {...register("quantity", { valueAsNumber: true, min: 1 })} />
            </div>
            <div>
              <Label>Время, ч *</Label>
              <Input type="number" step="0.5" {...register("plannedHours", { required: true, valueAsNumber: true })} />
            </div>
          </div>
          {values.catalogPriceRubles != null &&
            (values.agreedPriceRubles !== values.catalogPriceRubles || values.plannedHours !== values.catalogPlannedHours) && (
              <div>
                <Label className="text-warning">Отличается от каталога — укажите причину</Label>
                <Textarea rows={2} {...register("priceDeviationReason")} />
              </div>
            )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Включено заседаний</Label>
              <Input type="number" {...register("includedMeetings", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Статус</Label>
              <Select {...register("status")}>
                {STAGE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Согласован</Label>
              <Input type="date" {...register("agreedDate")} />
            </div>
            <div>
              <Label>Начало</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div>
              <Label>Срок</Label>
              <Input type="date" {...register("dueDate")} />
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox {...register("isUrgent")} />
              Срочный этап (24 часа)
            </label>
            {values.isUrgent && (
              <div className="mt-2">
                <Label>Срочная надбавка, %</Label>
                <Input
                  type="number"
                  defaultValue={bpToFraction(standardUrgencySurchargeBp) * 100}
                  onChange={(e) => setValue("urgencySurchargeBp", Math.round(Number(e.target.value) * 100))}
                />
              </div>
            )}
          </div>
          <div>
            <Label>Скидка, %</Label>
            <Input
              type="number"
              defaultValue={bpToFraction(values.discountBp) * 100}
              max={bpToFraction(maxDiscountBp) * 100}
              onChange={(e) => setValue("discountBp", Math.round(Number(e.target.value) * 100))}
            />
          </div>
          <div>
            <Label>Комментарий</Label>
            <Textarea rows={2} {...register("comment")} />
          </div>
          <div className="text-xs text-muted-foreground">
            Итого по этапу: {formatMoney(rublesToKopecks((values.agreedPriceRubles || 0) * (values.quantity || 1)))}
          </div>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
