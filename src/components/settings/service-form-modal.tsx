"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createService, updateService } from "@/server/actions/services";
import type { ServiceFormValues } from "@/domain/schemas";

export function ServiceFormModal({
  trigger,
  initial,
  serviceId,
}: {
  trigger: React.ReactNode;
  initial?: Partial<ServiceFormValues>;
  serviceId?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<ServiceFormValues>({
    defaultValues: {
      name: "",
      category: "",
      marketPriceRubles: 0,
      workPriceRubles: 0,
      plannedHours: 0,
      description: "",
      extraPaymentBasis: "",
      isActive: true,
      includedMeetings: 0,
      monthlyLimitHours: null,
      ...initial,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (serviceId) await updateService(serviceId, data);
    else await createService(data);
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title={serviceId ? "Изменить услугу" : "Новая услуга"} className="max-w-2xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Название *</Label>
              <Input {...register("name", { required: true })} />
            </div>
            <div>
              <Label>Категория *</Label>
              <Input {...register("category", { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Рыночная цена, ₽</Label>
              <Input type="number" {...register("marketPriceRubles", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Рабочая цена, ₽ *</Label>
              <Input type="number" {...register("workPriceRubles", { required: true, valueAsNumber: true })} />
            </div>
            <div>
              <Label>Плановое время, ч *</Label>
              <Input type="number" step="0.5" {...register("plannedHours", { required: true, valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Включено заседаний</Label>
              <Input type="number" {...register("includedMeetings", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Лимит часов в месяц (для абонемента)</Label>
              <Input
                type="number"
                step="0.5"
                {...register("monthlyLimitHours", {
                  setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
                })}
              />
            </div>
          </div>
          <div>
            <Label>Описание / что включено</Label>
            <Textarea rows={2} {...register("description")} />
          </div>
          <div>
            <Label>Основание для дополнительной оплаты</Label>
            <Textarea rows={2} {...register("extraPaymentBasis")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register("isActive")} />
            Активна (доступна для выбора в новых делах)
          </label>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
