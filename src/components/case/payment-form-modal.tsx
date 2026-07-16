"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { addPayment } from "@/server/actions/payments";
import type { PaymentFormValues } from "@/domain/schemas";
import { PAYER_TYPES, PAYMENT_KINDS, PAYMENT_METHODS } from "@/db/schema";
import { PAYER_TYPE_LABELS, PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS } from "@/domain/labels";
import type { StageRow } from "@/server/queries/case-financials";

export function PaymentFormModal({
  caseId,
  stages,
  defaultPayerType,
  trigger,
}: {
  caseId: number;
  stages: StageRow[];
  defaultPayerType: "individual" | "organization";
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<PaymentFormValues>({
    defaultValues: {
      caseId,
      stageId: null,
      paymentDate: new Date().toISOString().slice(0, 10),
      amountRubles: 0,
      payerType: defaultPayerType,
      purpose: "",
      kind: "planned",
      paymentMethod: "bank_transfer",
      comment: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await addPayment(data);
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Добавить платёж">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Тип платежа *</Label>
            <Select {...register("kind", { required: true })}>
              {PAYMENT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {PAYMENT_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Дата *</Label>
              <Input type="date" {...register("paymentDate", { required: true })} />
            </div>
            <div>
              <Label>Сумма, ₽ *</Label>
              <Input type="number" {...register("amountRubles", { required: true, valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Плательщик</Label>
              <Select {...register("payerType")}>
                {PAYER_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {PAYER_TYPE_LABELS[p]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Способ оплаты</Label>
              <Select {...register("paymentMethod")}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>Связанный этап</Label>
            <Select {...register("stageId", { setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)) })}>
              <option value="">Без привязки</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Назначение</Label>
            <Input {...register("purpose")} placeholder="Аванс, доплата…" />
          </div>
          <div>
            <Label>Комментарий</Label>
            <Textarea rows={2} {...register("comment")} />
          </div>
          <p className="text-xs text-muted-foreground">
            Налог рассчитывается автоматически только для фактически полученных платежей, исходя из текущего
            налогового режима и типа плательщика, и фиксируется как исторический снимок.
          </p>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
