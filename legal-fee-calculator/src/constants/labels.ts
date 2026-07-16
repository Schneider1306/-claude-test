// Русские подписи для перечислений.

import type {
  CaseCategory,
  CaseStage,
  CaseStatus,
  ClientType,
  PaymentMethod,
} from '@/domain/types';

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: 'Физическое лицо',
  ip: 'ИП',
  organization: 'Организация',
};

export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  medical: 'Медицинское',
  civil: 'Гражданское',
  family: 'Семейное',
  consumer: 'Защита прав потребителей',
  administrative: 'Административное',
  consultation: 'Консультация',
  document: 'Документ',
  other: 'Другое',
};

export const STAGE_LABELS: Record<CaseStage, string> = {
  consultation: 'Консультация',
  pretrial: 'Досудебная работа',
  first_instance: 'Первая инстанция',
  appeal: 'Апелляция',
  cassation: 'Кассация',
  execution: 'Исполнение',
  other: 'Другое',
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: 'Черновик',
  proposal: 'Предложение',
  accepted: 'Принято',
  in_work: 'В работе',
  done: 'Завершено',
  declined: 'Отказ',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  transfer: 'Перевод',
  other: 'Другое',
};

// Цвета бейджей статусов (фон, текст).
export const STATUS_COLORS: Record<CaseStatus, { bg: string; color: string }> = {
  draft: { bg: '#ECEAE3', color: '#657084' },
  proposal: { bg: '#E1F1EF', color: '#159B8F' },
  accepted: { bg: '#E4F3EB', color: '#1E7D4F' },
  in_work: { bg: '#E4EDF7', color: '#1F3A5F' },
  done: { bg: '#E4F3EB', color: '#1E7D4F' },
  declined: { bg: '#FBE9E7', color: '#C0392B' },
};

export const CLIENT_TYPE_OPTIONS: ClientType[] = ['individual', 'ip', 'organization'];
export const CATEGORY_OPTIONS: CaseCategory[] = [
  'medical',
  'civil',
  'family',
  'consumer',
  'administrative',
  'consultation',
  'document',
  'other',
];
export const STAGE_OPTIONS: CaseStage[] = [
  'consultation',
  'pretrial',
  'first_instance',
  'appeal',
  'cassation',
  'execution',
  'other',
];
export const STATUS_OPTIONS: CaseStatus[] = [
  'draft',
  'proposal',
  'accepted',
  'in_work',
  'done',
  'declined',
];
export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];
