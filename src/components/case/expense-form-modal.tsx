"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { addExpense } from "@/server/actions/expenses";
import type { ExpenseFormValues } from "@/domain/schemas";

export function ExpenseFormModal({ caseId, trigger }: { caseId: number; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<ExpenseFormValues>({
    defaultValues: {
      caseId,
      expenseDate: new Date().toISOString().slice(0, 10),
      amountRubles: 0,
      category: "",
      isReimbursable: true,
      isReimbursed: false,
      comment: "",
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await addExpense(data);
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title="Добавить расход">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Дата *</Label>
              <Input type="date" {...register("expenseDate", { required: true })} />
            </div>
            <div>
              <Label>Сумма, ₽ *</Label>
              <Input type="number" {...register("amountRubles", { required: true, valueAsNumber: true })} />
            </div>
          </div>
          <div>
            <Label>Категория</Label>
            <Input {...register("category")} placeholder="Госпошлина, экспертиза, нотариус…" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register("isReimbursable")} />
            Подлежит возмещению клиентом
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox {...register("isReimbursed")} />
            Уже возмещён
          </label>
          <div>
            <Label>Комментарий</Label>
            <Textarea rows={2} {...register("comment")} />
          </div>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
