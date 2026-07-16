"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { createCaseWithStages } from "@/server/actions/cases";
import { addPayment } from "@/server/actions/payments";
import type { Service } from "@/server/queries/services";
import {
  additionalMeetingsCount,
  bpToFraction,
  computeCaseFinancials,
  formatHours,
  formatMoney,
  hoursToMinutes,
  rublesToKopecks,
  type StageLineInput,
} from "@/domain/calculations";
import { CASE_CLIENT_TYPE_LABELS, CASE_TYPE_LABELS } from "@/domain/labels";
import { CASE_CLIENT_TYPES, CASE_TYPES } from "@/db/schema";

type CaseType = (typeof CASE_TYPES)[number];

interface WizardValues {
  shortName: string;
  clientCode: string;
  clientType: (typeof CASE_CLIENT_TYPES)[number];
  responsible: string;
  comment: string;
  inquiryDate: string;
  caseType: CaseType;
  initialServiceId: number | null;
  initialName: string;
  initialAgreedPriceRubles: number;
  initialPlannedHours: number;
  initialIncludedMeetings: number;
  initialDeviationReason: string;
  totalMeetingsPlanned: number;
  meetingServiceId: number | null;
  needsExpertise: boolean;
  expertiseServiceId: number | null;
  expertiseAgreedPriceRubles: number;
  expertisePlannedHours: number;
  extraStages: {
    serviceId: number | null;
    name: string;
    agreedPriceRubles: number;
    plannedHours: number;
    quantity: number;
  }[];
  isUrgent: boolean;
  urgencySurchargePercent: number;
  discountPercent: number;
  payments: { paymentDate: string; amountRubles: number; payerType: "individual" | "organization"; purpose: string }[];
}

const STEP_TITLES = [
  "Основная информация",
  "Тип дела",
  "Начальный этап",
  "Планируемые заседания",
  "Экспертиза",
  "Дополнительные этапы",
  "Срочность и скидка",
  "График платежей",
  "Проверка итогового расчёта",
  "Сохранение",
];

function findServiceByName(services: Service[], name: string): Service | undefined {
  return services.find((s) => s.name === name);
}

function initialServiceForCaseType(services: Service[], caseType: CaseType): Service | undefined {
  const map: Record<CaseType, string | null> = {
    medical: "Медицинское дело — начальный этап",
    regular: "Обычное судебное дело — начальный этап",
    consultation: "Консультация",
    audit: "Юридический аудит клиники",
    subscription: "Абонентский пакет",
    other: null,
  };
  const name = map[caseType];
  return name ? findServiceByName(services, name) : undefined;
}

function meetingServiceForCaseType(services: Service[], caseType: CaseType): Service | undefined {
  const map: Record<CaseType, string | null> = {
    medical: "Медицинское дело — дополнительное заседание",
    regular: "Обычное дело — дополнительное заседание",
    consultation: null,
    audit: null,
    subscription: null,
    other: null,
  };
  const name = map[caseType];
  return name ? findServiceByName(services, name) : undefined;
}

function expertiseServiceForCaseType(services: Service[], caseType: CaseType): Service | undefined {
  if (caseType === "medical") return findServiceByName(services, "Медицинское дело — работа с экспертизой");
  return undefined;
}

export function NewCaseWizard({
  services,
  defaultIncludedMeetings,
  standardDiscountBp,
  maxDiscountBp,
  standardUrgencySurchargeBp,
}: {
  services: Service[];
  defaultIncludedMeetings: number;
  standardDiscountBp: number;
  maxDiscountBp: number;
  standardUrgencySurchargeBp: number;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { register, control, watch, setValue, handleSubmit, trigger, getValues } = useForm<WizardValues>({
    defaultValues: {
      shortName: "",
      clientCode: "",
      clientType: "individual",
      responsible: "",
      comment: "",
      inquiryDate: new Date().toISOString().slice(0, 10),
      caseType: "regular",
      initialServiceId: null,
      initialName: "",
      initialAgreedPriceRubles: 0,
      initialPlannedHours: 0,
      initialIncludedMeetings: defaultIncludedMeetings,
      initialDeviationReason: "",
      totalMeetingsPlanned: defaultIncludedMeetings,
      meetingServiceId: null,
      needsExpertise: false,
      expertiseServiceId: null,
      expertiseAgreedPriceRubles: 0,
      expertisePlannedHours: 0,
      extraStages: [],
      isUrgent: false,
      urgencySurchargePercent: bpToFraction(standardUrgencySurchargeBp) * 100,
      discountPercent: 0,
      payments: [],
    },
  });

  const extraStagesArray = useFieldArray({ control, name: "extraStages" });
  const paymentsArray = useFieldArray({ control, name: "payments" });

  const values = watch();

  // Автоподстановка начального этапа при выборе типа дела (шаг 2 -> шаг 3)
  const applyCaseTypeDefaults = (caseType: CaseType) => {
    const initial = initialServiceForCaseType(services, caseType);
    const meeting = meetingServiceForCaseType(services, caseType);
    const expertise = expertiseServiceForCaseType(services, caseType);
    if (initial) {
      setValue("initialServiceId", initial.id);
      setValue("initialName", initial.name);
      setValue("initialAgreedPriceRubles", initial.workPriceKopecks / 100);
      setValue("initialPlannedHours", initial.plannedMinutes / 60);
      setValue("initialIncludedMeetings", initial.includedMeetings || defaultIncludedMeetings);
      setValue("totalMeetingsPlanned", initial.includedMeetings || defaultIncludedMeetings);
    } else {
      setValue("initialServiceId", null);
      setValue("initialName", "");
      setValue("initialAgreedPriceRubles", 0);
      setValue("initialPlannedHours", 0);
      setValue("initialIncludedMeetings", 0);
      setValue("totalMeetingsPlanned", 0);
    }
    setValue("meetingServiceId", meeting ? meeting.id : null);
    setValue("expertiseServiceId", expertise ? expertise.id : null);
    if (expertise) {
      setValue("expertiseAgreedPriceRubles", expertise.workPriceKopecks / 100);
      setValue("expertisePlannedHours", expertise.plannedMinutes / 60);
    }
  };

  const additionalMeetings = additionalMeetingsCount(
    values.totalMeetingsPlanned || 0,
    values.initialIncludedMeetings || 0,
  );
  const meetingService = values.meetingServiceId
    ? services.find((s) => s.id === values.meetingServiceId)
    : undefined;

  // Собираем итоговый список этапов для предпросмотра и сохранения
  const buildStages = React.useCallback((): {
    payload: {
      name: string;
      serviceId: number | null;
      catalogPriceRubles: number | null;
      catalogPlannedHours: number | null;
      priceDeviationReason: string | null;
      agreedPriceRubles: number;
      quantity: number;
      plannedHours: number;
      includedMeetings: number;
      isUrgent: boolean;
      urgencySurchargeBp: number;
      discountBp: number;
      status: "planned";
      comment: string;
    }[];
    lines: StageLineInput[];
  } => {
    const discountBp = Math.round((values.discountPercent || 0) * 100);
    const urgencyBp = Math.round((values.urgencySurchargePercent || 0) * 100);
    const payload: ReturnType<typeof buildStages>["payload"] = [];

    if (values.initialName) {
      const initialService = services.find((s) => s.id === values.initialServiceId);
      payload.push({
        name: values.initialName,
        serviceId: values.initialServiceId,
        catalogPriceRubles: initialService ? initialService.workPriceKopecks / 100 : null,
        catalogPlannedHours: initialService ? initialService.plannedMinutes / 60 : null,
        priceDeviationReason: values.initialDeviationReason || null,
        agreedPriceRubles: values.initialAgreedPriceRubles || 0,
        quantity: 1,
        plannedHours: values.initialPlannedHours || 0,
        includedMeetings: values.initialIncludedMeetings || 0,
        isUrgent: values.isUrgent,
        urgencySurchargeBp: urgencyBp,
        discountBp,
        status: "planned",
        comment: "",
      });
    }

    if (additionalMeetings > 0 && meetingService) {
      payload.push({
        name: meetingService.name,
        serviceId: meetingService.id,
        catalogPriceRubles: meetingService.workPriceKopecks / 100,
        catalogPlannedHours: meetingService.plannedMinutes / 60,
        priceDeviationReason: null,
        agreedPriceRubles: meetingService.workPriceKopecks / 100,
        quantity: additionalMeetings,
        plannedHours: meetingService.plannedMinutes / 60,
        includedMeetings: 0,
        isUrgent: false,
        urgencySurchargeBp: 0,
        discountBp,
        status: "planned",
        comment: "",
      });
    }

    if (values.needsExpertise && values.expertiseAgreedPriceRubles > 0) {
      const expertiseService = services.find((s) => s.id === values.expertiseServiceId);
      payload.push({
        name: expertiseService?.name ?? "Экспертиза",
        serviceId: values.expertiseServiceId,
        catalogPriceRubles: expertiseService ? expertiseService.workPriceKopecks / 100 : null,
        catalogPlannedHours: expertiseService ? expertiseService.plannedMinutes / 60 : null,
        priceDeviationReason: null,
        agreedPriceRubles: values.expertiseAgreedPriceRubles,
        quantity: 1,
        plannedHours: values.expertisePlannedHours || 0,
        includedMeetings: 0,
        isUrgent: false,
        urgencySurchargeBp: 0,
        discountBp,
        status: "planned",
        comment: "",
      });
    }

    for (const extra of values.extraStages || []) {
      if (!extra.name) continue;
      const service = services.find((s) => s.id === extra.serviceId);
      payload.push({
        name: extra.name,
        serviceId: extra.serviceId,
        catalogPriceRubles: service ? service.workPriceKopecks / 100 : null,
        catalogPlannedHours: service ? service.plannedMinutes / 60 : null,
        priceDeviationReason: null,
        agreedPriceRubles: extra.agreedPriceRubles || 0,
        quantity: extra.quantity || 1,
        plannedHours: extra.plannedHours || 0,
        includedMeetings: 0,
        isUrgent: false,
        urgencySurchargeBp: 0,
        discountBp,
        status: "planned",
        comment: "",
      });
    }

    const lines: StageLineInput[] = payload.map((p) => ({
      agreedPriceKopecks: rublesToKopecks(p.agreedPriceRubles),
      quantity: p.quantity,
      plannedMinutes: hoursToMinutes(p.plannedHours),
      discountBp: p.discountBp,
      isUrgent: p.isUrgent,
      urgencySurchargeBp: p.urgencySurchargeBp,
    }));

    return { payload, lines };
  }, [values, services, additionalMeetings, meetingService]);

  const { payload: stagePayload, lines } = buildStages();
  const reimbursableExpensesKopecks = 0;
  const preview = computeCaseFinancials({
    stages: lines,
    reimbursableExpensesKopecks,
    actualMinutes: null,
    actualPaymentsReceivedKopecks: 0,
    refundsKopecks: 0,
    expenseReimbursementsReceivedKopecks: 0,
  });

  const stepFieldsToValidate: (keyof WizardValues)[][] = [
    ["shortName", "clientCode", "clientType"],
    ["caseType"],
    ["initialName", "initialAgreedPriceRubles", "initialPlannedHours"],
    ["totalMeetingsPlanned"],
    [],
    [],
    [],
    [],
    [],
    [],
  ];

  const goNext = async () => {
    const fields = stepFieldsToValidate[step];
    if (fields.length > 0) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    if (step === 1) {
      applyCaseTypeDefaults(getValues("caseType"));
    }
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await createCaseWithStages({
        caseForm: {
          shortName: data.shortName,
          clientCode: data.clientCode,
          clientType: data.clientType,
          caseType: data.caseType,
          status: "lead",
          responsible: data.responsible,
          comment: data.comment,
          inquiryDate: data.inquiryDate || null,
        },
        stages: stagePayload.map((p) => ({
          name: p.name,
          serviceId: p.serviceId,
          catalogPriceRubles: p.catalogPriceRubles,
          catalogPlannedHours: p.catalogPlannedHours,
          priceDeviationReason: p.priceDeviationReason,
          agreedPriceRubles: p.agreedPriceRubles,
          quantity: p.quantity,
          plannedHours: p.plannedHours,
          includedMeetings: p.includedMeetings,
          isUrgent: p.isUrgent,
          urgencySurchargeBp: p.urgencySurchargeBp,
          discountBp: p.discountBp,
          status: p.status,
          comment: p.comment,
        })),
      });

      for (const payment of data.payments) {
        if (!payment.amountRubles) continue;
        await addPayment({
          caseId: result.id,
          paymentDate: payment.paymentDate,
          amountRubles: payment.amountRubles,
          payerType: payment.payerType,
          purpose: payment.purpose,
          kind: "planned",
          paymentMethod: "bank_transfer",
          comment: "",
        });
      }

      router.push(`/cases/${result.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить дело.");
      setSubmitting(false);
    }
  });

  const discountBpClamped = Math.min(values.discountPercent || 0, bpToFraction(maxDiscountBp) * 100);

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap gap-1.5 text-xs">
        {STEP_TITLES.map((title, i) => (
          <li key={title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-2.5 py-1 ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-accent/20 text-accent"
                    : "bg-surface-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {title}
            </button>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          {step === 0 && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Короткое название дела *</Label>
                <Input {...register("shortName", { required: true })} placeholder="Напр. «Иванов — врачебная ошибка»" />
              </div>
              <div>
                <Label>Обезличенный код клиента *</Label>
                <Input {...register("clientCode", { required: true })} placeholder="Напр. КЛ-014" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Не указывайте ФИО и медицинские данные напрямую — используйте код.
                </p>
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
                <Label>Ответственный</Label>
                <Input {...register("responsible")} placeholder="Кто ведёт дело" />
              </div>
              <div>
                <Label>Дата обращения</Label>
                <Input type="date" {...register("inquiryDate")} />
              </div>
              <div>
                <Label>Комментарий</Label>
                <Textarea {...register("comment")} rows={2} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-3">
              <Label>Тип дела</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {CASE_TYPES.map((t) => (
                  <label
                    key={t}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${
                      values.caseType === t ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input type="radio" value={t} {...register("caseType")} className="accent-[color:var(--primary)]" />
                    {CASE_TYPE_LABELS[t]}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Для медицинского и обычного судебного дела на следующем шаге автоматически подставится начальный этап из каталога услуг.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Название этапа *</Label>
                <Input {...register("initialName", { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Согласованная цена, ₽ *</Label>
                  <Input type="number" step="1" {...register("initialAgreedPriceRubles", { required: true, valueAsNumber: true })} />
                </div>
                <div>
                  <Label>Плановое время, ч *</Label>
                  <Input type="number" step="0.5" {...register("initialPlannedHours", { required: true, valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <Label>Включено заседаний в этот этап</Label>
                <Input type="number" step="1" {...register("initialIncludedMeetings", { valueAsNumber: true })} />
              </div>
              {values.initialServiceId &&
                services.find((s) => s.id === values.initialServiceId) &&
                (values.initialAgreedPriceRubles !==
                  (services.find((s) => s.id === values.initialServiceId)?.workPriceKopecks ?? 0) / 100 ||
                  values.initialPlannedHours !==
                    (services.find((s) => s.id === values.initialServiceId)?.plannedMinutes ?? 0) / 60) && (
                  <div>
                    <Label className="text-warning">Цена/время отличаются от каталога — укажите причину</Label>
                    <Textarea {...register("initialDeviationReason")} rows={2} />
                  </div>
                )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <div>
                <Label>Сколько всего заседаний ожидается по делу?</Label>
                <Input type="number" step="1" {...register("totalMeetingsPlanned", { valueAsNumber: true })} />
              </div>
              <p className="text-sm text-muted-foreground">
                Включено в начальный этап: {values.initialIncludedMeetings || 0}. Дополнительных заседаний:{" "}
                <strong>{additionalMeetings}</strong>.
              </p>
              {additionalMeetings > 0 && !meetingService && (
                <p className="text-sm text-warning">
                  В каталоге не найдена услуга «дополнительное заседание» для этого типа дела — добавьте её вручную на шаге «Дополнительные этапы».
                </p>
              )}
              {additionalMeetings > 0 && meetingService && (
                <p className="text-sm">
                  Будет добавлена строка «{meetingService.name}» × {additionalMeetings} ={" "}
                  {formatMoney(rublesToKopecks((meetingService.workPriceKopecks / 100) * additionalMeetings))}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox {...register("needsExpertise")} />
                По делу потребуется экспертиза
              </label>
              {values.needsExpertise && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Стоимость экспертизы, ₽</Label>
                    <Input type="number" step="1" {...register("expertiseAgreedPriceRubles", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label>Время, ч</Label>
                    <Input type="number" step="0.5" {...register("expertisePlannedHours", { valueAsNumber: true })} />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Дополнительные процессуальные блоки, юридический аудит и прочие позиции сверх начального этапа.
              </p>
              {extraStagesArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 rounded-lg border border-border p-3">
                  <div className="col-span-12 sm:col-span-4">
                    <Label>Название</Label>
                    <Input {...register(`extraStages.${index}.name` as const)} />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Label>Цена, ₽</Label>
                    <Input type="number" {...register(`extraStages.${index}.agreedPriceRubles` as const, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Label>Время, ч</Label>
                    <Input type="number" step="0.5" {...register(`extraStages.${index}.plannedHours` as const, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Label>Кол-во</Label>
                    <Input type="number" {...register(`extraStages.${index}.quantity` as const, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-6 flex items-end sm:col-span-1">
                    <Button type="button" variant="ghost" onClick={() => extraStagesArray.remove(index)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  extraStagesArray.append({ serviceId: null, name: "", agreedPriceRubles: 0, plannedHours: 0, quantity: 1 })
                }
              >
                + Добавить этап
              </Button>
              <div>
                <Label>Или выбрать из каталога</Label>
                <Select
                  defaultValue=""
                  onChange={(e) => {
                    const service = services.find((s) => s.id === Number(e.target.value));
                    if (service) {
                      extraStagesArray.append({
                        serviceId: service.id,
                        name: service.name,
                        agreedPriceRubles: service.workPriceKopecks / 100,
                        plannedHours: service.plannedMinutes / 60,
                        quantity: 1,
                      });
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">Выбрать услугу из справочника…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {formatMoney(s.workPriceKopecks)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox {...register("isUrgent")} />
                  Начальный этап нужно выполнить в течение 24 часов (срочность)
                </label>
                {values.isUrgent && (
                  <div className="mt-2">
                    <Label>Срочная надбавка, %</Label>
                    <Input type="number" step="1" {...register("urgencySurchargePercent", { valueAsNumber: true })} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Надбавка применяется только к начальному этапу, а не ко всему делу.
                    </p>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-border p-3">
                <Label>Скидка на профессиональное вознаграждение, %</Label>
                <Input
                  type="number"
                  step="1"
                  {...register("discountPercent", { valueAsNumber: true, max: bpToFraction(maxDiscountBp) * 100 })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Обычная скидка — {bpToFraction(standardDiscountBp) * 100}%, максимальная — {bpToFraction(maxDiscountBp) * 100}%.
                  Скидка не уменьшает возмещаемые внешние расходы.
                </p>
                {discountBpClamped !== values.discountPercent && (
                  <p className="mt-1 text-xs text-danger">Скидка ограничена максимумом {bpToFraction(maxDiscountBp) * 100}%.</p>
                )}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Плановые платежи, которые ожидаются от клиента. Их можно будет изменить позже в карточке дела.
              </p>
              {paymentsArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 rounded-lg border border-border p-3">
                  <div className="col-span-4 sm:col-span-3">
                    <Label>Дата</Label>
                    <Input type="date" {...register(`payments.${index}.paymentDate` as const)} />
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <Label>Сумма, ₽</Label>
                    <Input type="number" {...register(`payments.${index}.amountRubles` as const, { valueAsNumber: true })} />
                  </div>
                  <div className="col-span-4 sm:col-span-3">
                    <Label>Плательщик</Label>
                    <Select {...register(`payments.${index}.payerType` as const)}>
                      <option value="individual">Физлицо</option>
                      <option value="organization">Организация/ИП</option>
                    </Select>
                  </div>
                  <div className="col-span-9 sm:col-span-2">
                    <Label>Назначение</Label>
                    <Input {...register(`payments.${index}.purpose` as const)} />
                  </div>
                  <div className="col-span-3 flex items-end sm:col-span-1">
                    <Button type="button" variant="ghost" onClick={() => paymentsArray.remove(index)}>
                      Удалить
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  paymentsArray.append({
                    paymentDate: new Date().toISOString().slice(0, 10),
                    amountRubles: 0,
                    payerType: values.clientType === "individual" ? "individual" : "organization",
                    purpose: "Аванс",
                  })
                }
              >
                + Добавить плановый платёж
              </Button>
            </div>
          )}

          {step === 8 && (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Этап</th>
                      <th className="px-3 py-2 text-right">Цена</th>
                      <th className="px-3 py-2 text-right">Кол-во</th>
                      <th className="px-3 py-2 text-right">Время</th>
                      <th className="px-3 py-2 text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stagePayload.map((s, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{s.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(rublesToKopecks(s.agreedPriceRubles))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatHours(hoursToMinutes(s.plannedHours * s.quantity))}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          {formatMoney(rublesToKopecks(s.agreedPriceRubles * s.quantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <SummaryTile label="Вознаграждение" value={formatMoney(preview.feeGrossKopecks)} />
                <SummaryTile label="Срочная надбавка" value={formatMoney(preview.urgencySurchargeTotalKopecks)} />
                <SummaryTile label="Скидка" value={"−" + formatMoney(preview.discountTotalKopecks)} />
                <SummaryTile label="Плановое время" value={formatHours(preview.plannedMinutesTotal)} />
                <SummaryTile label="Плановая ставка" value={preview.effectiveRateKopecksPerHour ? formatMoney(preview.effectiveRateKopecksPerHour) + "/ч" : "Нет данных"} />
                <SummaryTile label="Итог клиенту" value={formatMoney(preview.totalToClientKopecks)} highlight />
              </div>
            </div>
          )}

          {step === 9 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Дело «{values.shortName}» будет сохранено со статусом «Потенциальный клиент» и итоговой суммой{" "}
                <strong>{formatMoney(preview.totalToClientKopecks)}</strong>. Статус можно изменить сразу после
                сохранения.
              </p>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button onClick={onSubmit} disabled={submitting} size="lg">
                {submitting ? "Сохранение…" : "Сохранить дело"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between no-print">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
          ← Назад
        </Button>
        {step < STEP_TITLES.length - 1 && (
          <Button type="button" onClick={goNext}>
            Далее →
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-3 ${highlight ? "bg-primary/5" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${highlight ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
