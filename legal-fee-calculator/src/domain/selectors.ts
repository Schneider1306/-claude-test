// Производные вычисления поверх данных: финансы дела, статистика, текст предложения.

import { CATEGORY_LABELS, STAGE_LABELS } from '@/constants/labels';
import { formatHours, formatMoney, isInCurrentMonth } from '@/utils/format';
import type {
  Calculation,
  CalcResult,
  LegalCase,
  Payment,
} from './types';

export interface CaseFinance {
  price: number; // договорная цена
  paid: number; // оплачено
  remaining: number; // остаток (не отрицательный)
}

export function caseFinance(
  legalCase: LegalCase,
  payments: Payment[]
): CaseFinance {
  const paid = payments
    .filter((p) => p.caseId === legalCase.id)
    .reduce((sum, p) => sum + Math.max(0, p.amount), 0);
  const price = Math.max(0, legalCase.contractPrice);
  const remaining = Math.max(0, price - paid);
  return { price, paid, remaining };
}

export interface DashboardStats {
  clientsCount: number;
  activeCasesCount: number;
  proposalsThisMonth: number; // сумма предложений за месяц
  paymentsThisMonth: number; // фактически полученные платежи за месяц
}

const ACTIVE_STATUSES = new Set(['proposal', 'accepted', 'in_work']);

export function dashboardStats(params: {
  clients: { archived: boolean }[];
  cases: LegalCase[];
  calculations: Calculation[];
  payments: Payment[];
  now?: Date;
}): DashboardStats {
  const { clients, cases, calculations, payments, now } = params;
  const clientsCount = clients.filter((c) => !c.archived).length;
  const activeCasesCount = cases.filter(
    (c) => !c.archived && ACTIVE_STATUSES.has(c.status)
  ).length;

  const proposalsThisMonth = calculations
    .filter((c) => isInCurrentMonth(c.createdAt, now))
    .reduce((sum, c) => sum + c.result.finalPrice, 0);

  const paymentsThisMonth = payments
    .filter((p) => isInCurrentMonth(p.date, now))
    .reduce((sum, p) => sum + Math.max(0, p.amount), 0);

  return {
    clientsCount,
    activeCasesCount,
    proposalsThisMonth,
    paymentsThisMonth,
  };
}

// Короткий текст предложения для отправки клиенту.
export function buildProposalText(params: {
  clientName: string;
  caseTitle: string;
  category: LegalCase['category'];
  stage?: LegalCase['stage'];
  result: CalcResult;
  lines: { title: string; quantity: number; unit: string }[];
  installmentLabel?: string;
}): string {
  const { clientName, caseTitle, category, stage, result, lines } = params;
  const parts: string[] = [];
  parts.push('Предложение по юридическим услугам');
  if (clientName) parts.push(`Клиент: ${clientName}`);
  parts.push(`Дело: ${caseTitle || CATEGORY_LABELS[category]}`);
  parts.push(`Категория: ${CATEGORY_LABELS[category]}`);
  if (stage) parts.push(`Стадия: ${STAGE_LABELS[stage]}`);
  parts.push('');
  parts.push('Состав работ:');
  for (const line of lines) {
    parts.push(`• ${line.title} — ${line.quantity} ${line.unit}`);
  }
  parts.push('');
  if (result.directExpenses > 0) {
    parts.push(`Прямые расходы: ${formatMoney(result.directExpenses)}`);
  }
  parts.push(`Плановые часы: ${formatHours(result.legalHours)}`);
  parts.push(`Итоговая цена: ${formatMoney(result.finalPrice)}`);
  return parts.join('\n');
}

// Простой график платежей на N месяцев.
export function buildPaymentSchedule(total: number, months: number): number[] {
  if (months <= 1) return [Math.max(0, Math.round(total))];
  const base = Math.floor(total / months / 1000) * 1000;
  const result: number[] = [];
  let acc = 0;
  for (let i = 0; i < months - 1; i++) {
    result.push(base);
    acc += base;
  }
  result.push(Math.max(0, total - acc));
  return result;
}
