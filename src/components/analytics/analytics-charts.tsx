"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { kopecksToRubles, minutesToHours } from "@/domain/calculations";
import type { MonthlyRevenuePoint, CapacityUsagePoint } from "@/server/queries/analytics";

const COLORS = {
  primary: "#10254e",
  accent: "#0f9b8e",
  warning: "#c8860d",
  grid: "#dde3ee",
  text: "#5a6478",
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${m}.${y.slice(2)}`;
}

const rub = (v: number) => Math.round(kopecksToRubles(v)).toLocaleString("ru-RU");

export function MonthlyRevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const chartData = data.map((d) => ({
    month: monthLabel(d.month),
    Начислено: Math.round(kopecksToRubles(d.invoicedKopecks)),
    Получено: Math.round(kopecksToRubles(d.receivedKopecks)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.text }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: COLORS.text }} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString("ru-RU")} ₽`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Начислено" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Получено" fill={COLORS.accent} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CapacityUsageChart({ data }: { data: CapacityUsagePoint[] }) {
  const chartData = data.map((d) => ({
    month: monthLabel(d.month),
    "Фактические часы": Math.round(minutesToHours(d.billableMinutes) * 10) / 10,
    Ёмкость: Math.round(minutesToHours(d.capacityMinutes) * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: COLORS.text }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: COLORS.text }} axisLine={false} tickLine={false} width={50} />
        <Tooltip formatter={(v) => `${v} ч`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Фактические часы" stroke={COLORS.accent} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Ёмкость" stroke={COLORS.warning} strokeWidth={2} strokeDasharray="4 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CaseTypeBarChart({
  data,
}: {
  data: { label: string; totalToClientKopecks: number; receivedKopecks: number }[];
}) {
  const chartData = data.map((d) => ({
    type: d.label,
    Начислено: Math.round(kopecksToRubles(d.totalToClientKopecks)),
    Получено: Math.round(kopecksToRubles(d.receivedKopecks)),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 50)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 12, fill: COLORS.text }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="type" width={160} tick={{ fontSize: 12, fill: COLORS.text }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString("ru-RU")} ₽`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Начислено" fill={COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={20} />
        <Bar dataKey="Получено" fill={COLORS.accent} radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export { rub };
