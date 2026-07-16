"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { addMeeting, updateMeeting } from "@/server/actions/meetings";
import type { MeetingFormValues } from "@/domain/schemas";
import { MEETING_STATUSES } from "@/db/schema";
import { MEETING_STATUS_LABELS } from "@/domain/labels";
import type { StageRow } from "@/server/queries/case-financials";

export function MeetingFormModal({
  caseId,
  stages,
  trigger,
  initial,
  meetingId,
}: {
  caseId: number;
  stages: StageRow[];
  trigger: React.ReactNode;
  initial?: Partial<MeetingFormValues>;
  meetingId?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<MeetingFormValues>({
    defaultValues: {
      caseId,
      stageId: null,
      meetingDate: new Date().toISOString().slice(0, 10),
      location: "",
      purpose: "",
      status: "scheduled",
      resultComment: "",
      ...initial,
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    if (meetingId) await updateMeeting(meetingId, data);
    else await addMeeting(data);
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Modal open={open} onClose={() => setOpen(false)} title={meetingId ? "Изменить заседание" : "Добавить заседание"}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Дата и время *</Label>
              <Input type="datetime-local" {...register("meetingDate", { required: true })} />
            </div>
            <div>
              <Label>Статус</Label>
              <Select {...register("status")}>
                {MEETING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MEETING_STATUS_LABELS[s]}
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
            <Label>Место / формат</Label>
            <Input {...register("location")} placeholder="Суд, адрес, онлайн…" />
          </div>
          <div>
            <Label>Цель заседания</Label>
            <Input {...register("purpose")} />
          </div>
          <div>
            <Label>Результат / комментарий</Label>
            <Textarea rows={2} {...register("resultComment")} />
          </div>
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
