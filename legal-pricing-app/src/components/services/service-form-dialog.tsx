"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toaster";
import { serviceInputSchema, type ServiceInputData } from "@/lib/schemas";
import { LINE_KIND_LABELS } from "@/lib/status-labels";
import { createService, updateService } from "@/server/actions/services";
import { kopecksToRubles, rublesToKopecks } from "@/domain/calculations";
import type { services } from "@/db/schema";

type ServiceRow = typeof services.$inferSelect;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceRow;
}

const KIND_OPTIONS = ["standard", "hearing", "expertise", "process_block", "subscription", "custom"] as const;

export function ServiceFormDialog({ open, onOpenChange, service }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(service);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInputData>({
    resolver: zodResolver(serviceInputSchema),
    defaultValues: defaultsFromService(service),
  });

  React.useEffect(() => {
    reset(defaultsFromService(service));
  }, [service, reset, open]);

  async function onSubmit(data: ServiceInputData) {
    try {
      if (isEdit && service) {
        await updateService(service.id, data);
        toast({ title: "Услуга обновлена", variant: "success" });
      } else {
        await createService(data);
        toast({ title: "Услуга добавлена", variant: "success" });
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      toast({ title: "Не удалось сохранить услугу", variant: "destructive" });
    }
  }

  const kind = useWatch({ control, name: "kind" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Изменить услугу" : "Новая услуга"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Название</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Категория</Label>
            <Input id="category" {...register("category")} />
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Тип строки</Label>
            <Select value={kind} onValueChange={(v) => setValue("kind", v as ServiceInputData["kind"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {LINE_KIND_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="basePriceRubles">Базовая цена, ₽</Label>
              <Input
                id="basePriceRubles"
                type="number"
                min={0}
                defaultValue={kopecksToRubles(service?.basePriceKopecks ?? 0)}
                onChange={(e) => setValue("basePriceKopecks", rublesToKopecks(Number(e.target.value) || 0))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="marketRubles">Рыночный ориентир, ₽</Label>
              <Input
                id="marketRubles"
                type="number"
                min={0}
                defaultValue={
                  service?.marketReferenceKopecks !== null && service?.marketReferenceKopecks !== undefined
                    ? kopecksToRubles(service.marketReferenceKopecks)
                    : ""
                }
                onChange={(e) =>
                  setValue(
                    "marketReferenceKopecks",
                    e.target.value === "" ? null : rublesToKopecks(Number(e.target.value)),
                  )
                }
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plannedHours">Плановое время, часов</Label>
            <Input
              id="plannedHours"
              type="number"
              min={0}
              step={0.25}
              defaultValue={service ? service.plannedMinutes / 60 : 0}
              onChange={(e) => setValue("plannedMinutes", Math.round((Number(e.target.value) || 0) * 60))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Описание включённых работ</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="extraPaymentTerms">Условия дополнительной оплаты</Label>
            <Textarea id="extraPaymentTerms" {...register("extraPaymentTerms")} />
          </div>
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="changeComment">Причина изменения цены/времени (для истории)</Label>
              <Textarea id="changeComment" {...register("changeComment")} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultsFromService(service?: ServiceRow): ServiceInputData {
  return {
    name: service?.name ?? "",
    category: service?.category ?? "",
    basePriceKopecks: service?.basePriceKopecks ?? 0,
    marketReferenceKopecks: service?.marketReferenceKopecks ?? null,
    plannedMinutes: service?.plannedMinutes ?? 0,
    description: service?.description ?? "",
    extraPaymentTerms: service?.extraPaymentTerms ?? "",
    kind: service?.kind ?? "standard",
    isActive: service?.isActive ?? true,
    changeComment: "",
  };
}
