import type { CalculationStatus, ExpenseCategory } from "@/db/schema";

export const CALCULATION_STATUS_LABELS: Record<CalculationStatus, string> = {
  draft: "Черновик",
  proposal_sent: "Предложение направлено",
  agreed: "Согласовано",
  declined: "Отказ",
  in_progress: "Работа начата",
  completed: "Завершено",
  archived: "Архив",
};

export const CALCULATION_STATUS_ORDER: CalculationStatus[] = [
  "draft",
  "proposal_sent",
  "agreed",
  "in_progress",
  "completed",
  "declined",
  "archived",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  state_duty: "Госпошлина",
  expertise: "Экспертиза",
  notary: "Нотариус",
  travel_tickets: "Билеты",
  accommodation: "Проживание",
  taxi: "Такси",
  post: "Почта",
  specialist: "Специалист",
  other: "Другое",
};

export const LINE_KIND_LABELS: Record<string, string> = {
  standard: "Услуга",
  hearing: "Заседание",
  expertise: "Экспертиза",
  process_block: "Процессуальный блок",
  subscription: "Абонентское сопровождение",
  custom: "Произвольная строка",
};
