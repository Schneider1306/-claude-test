"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { updateCase } from "@/server/actions/cases";
import type { CaseRow } from "@/server/queries/cases";
import { CASE_CLIENT_TYPES, CASE_STATUSES, CASE_TYPES } from "@/db/schema";
import { CASE_CLIENT_TYPE_LABELS, CASE_STATUS_LABELS, CASE_TYPE_LABELS } from "@/domain/labels";
import type { CaseFormValues } from "@/domain/schemas";

export function EditCaseModal({ caseRow }: { caseRow: CaseRow }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<CaseFormValues>({
    defaultValues: {
      shortName: caseRow.shortName,
      clientCode: caseRow.clientCode,
      clientType: caseRow.clientType,
      caseType: caseRow.caseType,
      status: caseRow.status,
      responsible: caseRow.responsible,
      comment: caseRow.comment,
      inquiryDate: caseRow.inquiryDate ?? "",
      contractDate: caseRow.contractDate ?? "",
      startDate: caseRow.startDate ?? "",
      endDate: caseRow.endDate ?? "",
      nextActionDate: caseRow.nextActionDate ?? "",
      initialEstimateRubles: caseRow.initialEstimateKopecks != null ? caseRow.initialEstimateKopecks / 100 : null,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    await updateCase(caseRow.id, data);
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Редактировать
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Редактирование дела" className="max-w-2xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Короткое название</Label>
              <Input {...register("shortName", { required: true })} />
            </div>
            <div>
              <Label>Код клиента</Label>
              <Input {...register("clientCode", { required: true })} />
            </div>
            <div>
              <Label>Тип клиента</Label>
              <Select {...register("clientType")}>
                {CASE_CLIENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CASE_CLIENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Тип дела</Label>
              <Select {...register("caseType")}>
                {CASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {CASE_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Статус</Label>
              <Select {...register("status")}>
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CASE_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Ответственный</Label>
              <Input {...register("responsible")} />
            </div>
            <div>
              <Label>Первоначальная оценка, ₽</Label>
              <Input type="number" {...register("initialEstimateRubles", { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Дата обращения</Label>
              <Input type="date" {...register("inquiryDate")} />
            </div>
            <div>
              <Label>Дата договора</Label>
              <Input type="date" {...register("contractDate")} />
            </div>
            <div>
              <Label>Дата начала</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div>
              <Label>Дата завершения</Label>
              <Input type="date" {...register("endDate")} />
            </div>
            <div>
              <Label>Дата ближайшего действия</Label>
              <Input type="date" {...register("nextActionDate")} />
            </div>
            <div className="col-span-2">
              <Label>Комментарий</Label>
              <Textarea rows={3} {...register("comment")} />
            </div>
          </div>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
