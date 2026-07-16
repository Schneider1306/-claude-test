// Доменные типы приложения «Стоимость юруслуг».
// Все денежные значения хранятся в целых рублях (integer). Часы могут быть дробными.

export type ClientType = 'individual' | 'ip' | 'organization';

export interface Client {
  id: string;
  type: ClientType;
  name: string; // ФИО или название организации
  phone?: string;
  inn?: string;
  note?: string;
  archived: boolean;
  createdAt: string; // ISO-строка
}

export type CaseCategory =
  | 'medical'
  | 'civil'
  | 'family'
  | 'consumer'
  | 'administrative'
  | 'consultation'
  | 'document'
  | 'other';

export type CaseStage =
  | 'consultation'
  | 'pretrial'
  | 'first_instance'
  | 'appeal'
  | 'cassation'
  | 'execution'
  | 'other';

export type CaseStatus =
  | 'draft'
  | 'proposal'
  | 'accepted'
  | 'in_work'
  | 'done'
  | 'declined';

export interface LegalCase {
  id: string;
  clientId: string;
  title: string;
  category: CaseCategory;
  stage: CaseStage;
  note?: string;
  startDate?: string; // ISO-дата
  status: CaseStatus;
  plannedHours: number;
  actualHours: number;
  contractPrice: number; // договорная цена, целые рубли
  archived: boolean;
  createdAt: string;
}

// Позиция каталога услуг (редактируемый справочник).
export interface CatalogItem {
  id: string;
  title: string;
  price: number; // цена за единицу, целые рубли
  plannedHours: number; // плановые часы за единицу (могут быть дробными)
  unit: string;
  archived: boolean;
  order: number;
}

// Позиция состава работ в конкретном расчёте (снимок значений).
export interface CalcLine {
  id: string;
  catalogItemId?: string;
  title: string;
  quantity: number; // количество (целое)
  unit: string;
  unitPrice: number; // цена за единицу, целые рубли
  hoursPerUnit: number; // часы за единицу (дробные разрешены)
}

// Вариант коэффициента (сложность / срочность / рассрочка / дорога).
export interface CoefficientOption {
  id: string;
  label: string;
  value: number;
}

export interface FinanceSettings {
  desiredIncome: number; // желаемый личный доход в месяц
  rent: number;
  internet: number;
  stationery: number;
  aiServices: number;
  reserve: number;
  workDaysPerWeek: number;
  billableHoursPerDay: number;
  workWeeksPerYear: number;
  baseHourlyRate: number; // рабочая внутренняя ставка, руб/час
  taxRate: number; // 0.04 или 0.06
}

export interface Thresholds {
  normalCase: number; // порог обычного дела, руб
  medicalCase: number; // порог медицинского дела, руб
}

export interface Settings {
  schemaVersion: number;
  finance: FinanceSettings;
  thresholds: Thresholds;
  catalog: CatalogItem[];
  complexityOptions: CoefficientOption[];
  urgencyOptions: CoefficientOption[];
  installmentOptions: CoefficientOption[];
  travelOptions: CoefficientOption[];
}

// Вход расчётного движка.
export interface CalcInput {
  lines: CalcLine[];
  extraLegalHours: number; // дополнительные юридические часы
  travelHours: number; // время в дороге, часы
  travelCoef: number; // коэффициент оплаты дороги: 0, 0.5 или 1
  directExpenses: number; // прямые расходы, целые рубли
  complexityCoef: number;
  urgencyCoef: number;
  installmentCoef: number;
  discountPercent: number; // 0..20
  isMedical: boolean; // категория дела — медицинское
  manualPrice?: number | null; // ручная итоговая цена, целые рубли
  manualPriceReason?: string;
}

export type WarningCode = 'below_economic_minimum' | 'below_threshold';

export interface CalcWarning {
  code: WarningCode;
  message: string;
}

export interface CalcResult {
  catalogCost: number; // каталожная стоимость работ
  legalHours: number; // юридические часы
  billableTravelHours: number; // оплачиваемые дорожные часы
  internalRate: number; // применяемая внутренняя ставка, руб/час
  timeCost: number; // стоимость времени
  feeBase: number; // база вознаграждения
  feeBeforeDiscount: number; // вознаграждение до скидки
  feeAfterDiscount: number; // вознаграждение после скидки
  effectiveFee: number; // фактическое вознаграждение с учётом ручной цены
  economicMinimum: number; // экономический минимум (= стоимость времени)
  recommendedPrice: number; // рекомендуемая цена
  finalPrice: number; // итоговая цена для клиента
  directExpenses: number;
  threshold: number; // применённый порог (обычный/медицинский)
  isManual: boolean;
  warnings: CalcWarning[];
}

// Неизменяемый снимок сохранённого расчёта.
export interface Calculation {
  id: string;
  version: number;
  createdAt: string;
  clientId: string;
  caseId: string;
  clientName: string;
  caseTitle: string;
  category: CaseCategory;
  status: CaseStatus;
  // Снимок использованных данных:
  input: CalcInput;
  financeSnapshot: FinanceSettings;
  thresholdsSnapshot: Thresholds;
  result: CalcResult;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

export interface Payment {
  id: string;
  caseId: string;
  clientId: string;
  date: string; // ISO-дата
  amount: number; // целые рубли, всегда > 0
  method: PaymentMethod;
  comment?: string;
  createdAt: string;
}

// Полный слепок данных для резервного копирования.
export interface BackupData {
  schemaVersion: number;
  exportedAt: string;
  appId: 'legal-fee-calculator';
  settings: Settings;
  clients: Client[];
  cases: LegalCase[];
  calculations: Calculation[];
  payments: Payment[];
}
