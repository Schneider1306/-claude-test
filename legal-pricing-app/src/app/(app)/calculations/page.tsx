import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RateStatusBadge } from "@/components/shared/rate-status-badge";
import { listCalculations } from "@/server/queries";
import { formatKopecks, formatDate, formatHours } from "@/lib/format";
import { CALCULATION_STATUS_LABELS, CALCULATION_STATUS_ORDER } from "@/lib/status-labels";
import type { CalculationStatus } from "@/db/schema";
import { CalculationsFilterBar } from "@/components/calculations/filter-bar";

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sortBy?: string;
    sortDir?: string;
  }>;
}

export default async function CalculationsListPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = (params.status as CalculationStatus | "all" | undefined) ?? "all";
  const sortBy = (params.sortBy as
    | "createdAt"
    | "clientTotalKopecks"
    | "effectiveRateKopecks"
    | "plannedMinutes"
    | undefined) ?? "createdAt";
  const sortDir = (params.sortDir as "asc" | "desc" | undefined) ?? "desc";

  const calculations = listCalculations({ search: params.q, status, sortBy, sortDir });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Сохранённые расчёты</h1>
          <p className="text-sm text-muted-foreground">Найдено: {calculations.length}</p>
        </div>
        <Button asChild>
          <Link href="/calculations/new">
            <Plus /> Новый расчёт
          </Link>
        </Button>
      </div>

      <CalculationsFilterBar
        q={params.q ?? ""}
        status={status}
        sortBy={sortBy}
        sortDir={sortDir}
        statuses={CALCULATION_STATUS_ORDER}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>№ / Название</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Часы</TableHead>
                <TableHead className="text-right">Ставка</TableHead>
                <TableHead className="text-right">Итог клиенту</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Ничего не найдено
                  </TableCell>
                </TableRow>
              )}
              {calculations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/calculations/${c.id}`} className="font-medium hover:underline">
                      №{c.number}
                      {c.version > 1 ? ` (v${c.version})` : ""} {c.internalName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.clientCode}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  <TableCell>
                    <span className="text-xs">{CALCULATION_STATUS_LABELS[c.status]}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatHours(c.plannedMinutes / 60)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.effectiveRateKopecks !== null ? formatKopecks(c.effectiveRateKopecks) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatKopecks(c.clientTotalKopecks)}
                  </TableCell>
                  <TableCell>
                    <RateStatusBadge status={c.rateStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
