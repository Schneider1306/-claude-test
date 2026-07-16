"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CALCULATION_STATUS_LABELS } from "@/lib/status-labels";
import type { CalculationStatus } from "@/db/schema";

interface Props {
  q: string;
  status: CalculationStatus | "all";
  sortBy: string;
  sortDir: string;
  statuses: CalculationStatus[];
}

const SORT_OPTIONS = [
  { value: "createdAt", label: "По дате" },
  { value: "clientTotalKopecks", label: "По цене" },
  { value: "effectiveRateKopecks", label: "По ставке" },
  { value: "plannedMinutes", label: "По часам" },
];

export function CalculationsFilterBar({ q, status, sortBy, sortDir, statuses }: Props) {
  const router = useRouter();
  const [search, setSearch] = React.useState(q);

  function updateParams(patch: Record<string, string>) {
    const params = new URLSearchParams({ q, status, sortBy, sortDir, ...patch });
    if (!params.get("q")) params.delete("q");
    if (params.get("status") === "all") params.delete("status");
    router.push(`/calculations?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Поиск по названию, коду клиента, номеру…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParams({ q: search });
        }}
        onBlur={() => updateParams({ q: search })}
        className="max-w-xs"
      />
      <Select value={status} onValueChange={(v) => updateParams({ status: v })}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {CALCULATION_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v) => updateParams({ sortBy: v })}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sortDir} onValueChange={(v) => updateParams({ sortDir: v })}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="desc">По убыванию</SelectItem>
          <SelectItem value="asc">По возрастанию</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
