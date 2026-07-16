import { kopecksToRubles } from "@/domain/calculations";

const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const rubleFormatterFraction = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 2,
});

export function formatKopecks(kopecks: number | null | undefined): string {
  if (kopecks === null || kopecks === undefined) return "—";
  return rubleFormatter.format(kopecksToRubles(kopecks));
}

export function formatKopecksPrecise(kopecks: number | null | undefined): string {
  if (kopecks === null || kopecks === undefined) return "—";
  return rubleFormatterFraction.format(kopecksToRubles(kopecks));
}

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "Нет данных";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(hours)} ч`;
}

export function formatMinutesAsHours(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "Нет данных";
  return formatHours(minutes / 60);
}

export function formatBpsAsPercent(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "—";
  const percent = bps / 100;
  const sign = percent > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(percent)}%`;
}

export function formatPercent(bps: number): string {
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(bps / 100)}%`;
}

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.replace(" ", "T") + "Z") : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value.replace(" ", "T") + "Z") : value;
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}
