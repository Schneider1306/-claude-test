// Начальные настройки, каталог услуг и коэффициенты.
// Все значения редактируются в разделе «Настройки».

import type { CatalogItem, CoefficientOption, Settings } from '@/domain/types';

// Текущая версия схемы данных. Увеличивается при изменении структуры.
export const SCHEMA_VERSION = 1;

export const DEFAULT_CATALOG: CatalogItem[] = [
  {
    id: 'cat_consultation',
    title: 'Консультация',
    price: 9000,
    plannedHours: 1.5,
    unit: 'консультация',
    archived: false,
    order: 0,
  },
  {
    id: 'cat_civil_base',
    title: 'Обычное гражданское дело: базовое ведение первой инстанции',
    price: 90000,
    plannedHours: 12,
    unit: 'пакет',
    archived: false,
    order: 1,
  },
  {
    id: 'cat_medical_base',
    title: 'Медицинское дело: базовое ведение первой инстанции',
    price: 135000,
    plannedHours: 16,
    unit: 'пакет',
    archived: false,
    order: 2,
  },
  {
    id: 'cat_extra_hearing',
    title: 'Дополнительное судебное заседание',
    price: 25000,
    plannedHours: 2.5,
    unit: 'заседание',
    archived: false,
    order: 3,
  },
  {
    id: 'cat_med_expertise',
    title: 'Работа с медицинской экспертизой',
    price: 45000,
    plannedHours: 3.5,
    unit: 'этап',
    archived: false,
    order: 4,
  },
  {
    id: 'cat_extra_block',
    title: 'Дополнительный процессуальный блок',
    price: 35000,
    plannedHours: 4.5,
    unit: 'этап',
    archived: false,
    order: 5,
  },
  {
    id: 'cat_document',
    title: 'Подготовка отдельного процессуального документа',
    price: 25000,
    plannedHours: 3,
    unit: 'документ',
    archived: false,
    order: 6,
  },
  {
    id: 'cat_travel',
    title: 'Выезд в другой город',
    price: 0,
    plannedHours: 0,
    unit: 'выезд',
    archived: false,
    order: 7,
  },
];

export const DEFAULT_COMPLEXITY: CoefficientOption[] = [
  { id: 'cx_simple', label: 'Простая', value: 0.9 },
  { id: 'cx_normal', label: 'Обычная', value: 1.0 },
  { id: 'cx_hard', label: 'Сложная', value: 1.2 },
  { id: 'cx_very_hard', label: 'Особо сложная', value: 1.4 },
];

export const DEFAULT_URGENCY: CoefficientOption[] = [
  { id: 'ur_normal', label: 'Обычная', value: 1.0 },
  { id: 'ur_7', label: 'До 7 дней', value: 1.15 },
  { id: 'ur_3', label: 'До 3 дней', value: 1.3 },
  { id: 'ur_24', label: 'В течение 24 часов', value: 1.5 },
];

export const DEFAULT_INSTALLMENT: CoefficientOption[] = [
  { id: 'in_none', label: 'Нет', value: 1.0 },
  { id: 'in_2', label: '2 месяца', value: 1.05 },
  { id: 'in_3', label: '3 месяца', value: 1.1 },
];

export const DEFAULT_TRAVEL: CoefficientOption[] = [
  { id: 'tr_0', label: '0%', value: 0 },
  { id: 'tr_50', label: '50%', value: 0.5 },
  { id: 'tr_100', label: '100%', value: 1.0 },
];

export function createDefaultSettings(): Settings {
  return {
    schemaVersion: SCHEMA_VERSION,
    finance: {
      desiredIncome: 450000,
      rent: 22250,
      internet: 3000,
      stationery: 500,
      aiServices: 20000,
      reserve: 30000,
      workDaysPerWeek: 5,
      billableHoursPerDay: 4,
      workWeeksPerYear: 43,
      baseHourlyRate: 8200,
      taxRate: 0.04,
    },
    thresholds: {
      normalCase: 80000,
      medicalCase: 120000,
    },
    catalog: DEFAULT_CATALOG.map((item) => ({ ...item })),
    complexityOptions: DEFAULT_COMPLEXITY.map((o) => ({ ...o })),
    urgencyOptions: DEFAULT_URGENCY.map((o) => ({ ...o })),
    installmentOptions: DEFAULT_INSTALLMENT.map((o) => ({ ...o })),
    travelOptions: DEFAULT_TRAVEL.map((o) => ({ ...o })),
  };
}
