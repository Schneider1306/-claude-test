"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createScenario } from "@/server/actions/scenarios";
import type { ScenarioFormValues } from "@/domain/schemas";

export function CreateScenarioForm() {
  const router = useRouter();
  const { register, handleSubmit, reset, formState } = useForm<ScenarioFormValues>({
    defaultValues: { name: "", month: new Date().toISOString().slice(0, 7), comment: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    const id = await createScenario(data);
    reset();
    router.push(`/scenarios/${id}`);
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <Label>Название сценария</Label>
        <Input {...register("name", { required: true })} placeholder="Напр. «Август — план»" />
      </div>
      <div>
        <Label>Месяц</Label>
        <Input type="month" {...register("month", { required: true })} />
      </div>
      <Button type="submit" disabled={formState.isSubmitting}>
        + Новый сценарий
      </Button>
    </form>
  );
}
