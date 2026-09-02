import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateStatusBadge } from "@/components/shared/rate-status-badge";
import { MonthlyRevenueChart } from "@/components/charts/monthly-revenue-chart";
import { getDashboardStats } from "@/server/queries";
import { formatKopecks, formatDate } from "@/lib/format";
import { CALCULATION_STATUS_LABELS } from "@/lib/status-labels";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Главная</h1>
          <p className="text-sm text-muted-foreground">
            Расчёт стоимости юридических услуг и контроль эффективной ставки
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/calculations/new">
            <Plus /> Новый расчёт
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Средний чек
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatKopecks(stats.averageCheckKopecks)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Средняя эффективная ставка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatKopecks(stats.averageRateKopecks)}
              <span className="text-sm font-normal text-muted-foreground">/ч</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего расчётов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{stats.totalCount}</p>
          </CardContent>
        </Card>
        <Card className={stats.belowMinimumCount > 0 ? "border-warning" : undefined}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ниже экономического минимума
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-warning">
              {stats.belowMinimumCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Стоимость по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={stats.monthlyRevenue} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Расчёты ниже минимума</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {stats.belowMinimum.length === 0 && (
              <p className="text-sm text-muted-foreground">Таких расчётов нет</p>
            )}
            {stats.belowMinimum.map((c) => (
              <Link
                key={c.id}
                href={`/calculations/${c.id}`}
                className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm hover:bg-secondary"
              >
                <span className="truncate">
                  №{c.number} {c.internalName}
                </span>
                <span className="shrink-0 font-medium text-warning">
                  {formatKopecks(c.economicMinimumKopecks! - c.professionalAfterDiscountKopecks)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние расчёты</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Пока нет ни одного расчёта. Нажмите «Новый расчёт», чтобы начать.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {stats.recent.map((c) => (
                <Link
                  key={c.id}
                  href={`/calculations/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-secondary/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      №{c.number} {c.internalName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.clientCode} · {formatDate(c.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">
                      {formatKopecks(c.clientTotalKopecks)}
                    </span>
                    <RateStatusBadge status={c.rateStatus} />
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {CALCULATION_STATUS_LABELS[c.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
