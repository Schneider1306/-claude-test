"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { addScenarioItem } from "@/server/actions/scenarios";
import type { ScenarioItemFormValues } from "@/domain/schemas";
import type { Service } from "@/server/queries/services";
import { formatMoney } from "@/domain/calculations";

export function ScenarioItemForm({ scenarioId, services }: { scenarioId: number; services: Service[] }) {
  const router = useRouter();
  const { register, handleSubmit, setValue, reset, formState } = useForm<ScenarioItemFormValues>({
    defaultValues: {
      scenarioId,
      serviceId: null,
      label: "",
      quantity: 1,
      unitPriceRubles: 0,
      unitHours: 0,
      expectedPaymentRubles: null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await addScenarioItem(data);
    reset({ scenarioId, serviceId: null, label: "", quantity: 1, unitPriceRubles: 0, unitHours: 0, expectedPaymentRubles: null });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <Label>Из каталога</Label>
        <Select
          defaultValue=""
          onChange={(e) => {
            const service = services.find((s) => s.id === Number(e.target.value));
            if (service) {
              setValue("serviceId", service.id);
              setValue("label", service.name);
              setValue("unitPriceRubles", service.workPriceKopecks / 100);
              setValue("unitHours", service.plannedMinutes / 60);
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
      <div className="sm:col-span-2">
        <Label>Название *</Label>
        <Input {...register("label", { required: true })} />
      </div>
      <div>
        <Label>Кол-во</Label>
        <Input type="number" {...register("quantity", { valueAsNumber: true, min: 1 })} />
      </div>
      <div>
        <Label>Цена, ₽</Label>
        <Input type="number" {...register("unitPriceRubles", { valueAsNumber: true })} />
      </div>
      <div>
        <Label>Часы</Label>
        <Input type="number" step="0.5" {...register("unitHours", { valueAsNumber: true })} />
      </div>
      <div>
        <Label>Ожид. оплата, ₽</Label>
        <Input
          type="number"
          {...register("expectedPaymentRubles", {
            setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
          })}
        />
      </div>
      <div className="flex items-end sm:col-span-6">
        <Button type="submit" disabled={formState.isSubmitting}>
          + Добавить позицию
        </Button>
      </div>
    </form>
  );
}
