export const CASE_STATUS_LABELS: Record<string, string> = {
  lead: "Потенциальный клиент",
  proposal_sent: "Предложение направлено",
  contracted: "Договор заключён",
  active: "Активное",
  on_hold: "Приостановлено",
  completed: "Завершено",
  declined_by_client: "Отказ клиента",
  declined_by_lawyer: "Отказ юриста",
};

export const CASE_STATUS_BADGE: Record<string, "neutral" | "primary" | "accent" | "warning" | "danger"> = {
  lead: "neutral",
  proposal_sent: "primary",
  contracted: "primary",
  active: "accent",
  on_hold: "warning",
  completed: "accent",
  declined_by_client: "danger",
  declined_by_lawyer: "danger",
};

export const CASE_CLIENT_TYPE_LABELS: Record<string, string> = {
  individual: "Физическое лицо",
  ip: "ИП",
  organization: "Организация",
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  medical: "Медицинское дело",
  regular: "Обычное судебное дело",
  consultation: "Консультация",
  audit: "Аудит / комплаенс",
  subscription: "Абонентское обслуживание",
  other: "Иное",
};

export const STAGE_STATUS_LABELS: Record<string, string> = {
  planned: "Запланирован",
  in_progress: "В работе",
  done: "Завершён",
  cancelled: "Отменён",
};

export const MEETING_STATUS_LABELS: Record<string, string> = {
  scheduled: "Назначено",
  held: "Проведено",
  postponed: "Перенесено",
  cancelled: "Отменено",
};

export const PAYMENT_KIND_LABELS: Record<string, string> = {
  planned: "Плановый платёж",
  actual: "Фактически получен",
  refund: "Возврат",
  expense_reimbursement: "Возмещение расходов",
};

export const PAYER_TYPE_LABELS: Record<string, string> = {
  individual: "Физическое лицо",
  organization: "Организация / ИП",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Банковский перевод",
  card: "Карта",
  cash: "Наличные",
  other: "Другое",
};

export const TAX_REGIME_LABELS: Record<string, string> = {
  npd: "НПД (самозанятость)",
  usn: "УСН «Доходы»",
  custom: "Пользовательский режим",
};
