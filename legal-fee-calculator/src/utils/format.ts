// Форматирование денег, дат и чисел.

// «135000» -> «135 000 ₽». Деньги — целые рубли.
export function formatMoney(value: number): string {
  const rounded = Math.round(value || 0);
  const sign = rounded < 0 ? '−' : '';
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${grouped} ₽`;
}

// Число без знака рубля, с разделением тысяч.
export function formatNumber(value: number): string {
  const rounded = Math.round(value || 0);
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Часы: показываем дробные аккуратно (1.5 -> «1,5 ч»).
export function formatHours(value: number): string {
  const v = Math.round((value || 0) * 100) / 100;
  const text = Number.isInteger(v) ? v.toString() : v.toString().replace('.', ',');
  return `${text} ч`;
}

// Дата в формате ДД.ММ.ГГГГ из ISO-строки.
export function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// Дата и время для истории.
export function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hh}:${mm}`;
}

// Разбор пользовательского ввода денег: «135 000», «135000», «135 000 ₽» -> 135000.
export function parseMoney(text: string): number {
  const cleaned = (text || '').replace(/[^\d-]/g, '');
  const value = parseInt(cleaned, 10);
  return Number.isNaN(value) ? 0 : value;
}

// Разбор дробного числа: поддержка запятой и точки.
export function parseDecimal(text: string): number {
  const cleaned = (text || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

// Разбор целого числа.
export function parseInteger(text: string): number {
  const cleaned = (text || '').replace(/[^\d-]/g, '');
  const value = parseInt(cleaned, 10);
  return Number.isNaN(value) ? 0 : value;
}

// Первый и последний день текущего месяца (границы в ISO).
export function currentMonthRange(now: Date = new Date()): { start: number; end: number } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { start, end };
}

export function isInCurrentMonth(iso: string, now: Date = new Date()): boolean {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  const { start, end } = currentMonthRange(now);
  return t >= start && t < end;
}
