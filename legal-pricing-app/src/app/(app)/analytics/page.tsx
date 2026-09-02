import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalytics, getServiceTimeAdjustmentSuggestions } from "@/server/queries";
import { formatKopecks, formatBpsAsPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = getAnalytics();
  const suggestions = getServiceTimeAdjustmentSuggestions();

  const maxRevenue = Math.max(1, ...analytics.topServices.map((s) => s.revenueKopecks));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Аналитика</h1>
        <p className="text-sm text-muted-foreground">
          На основе расчётов, не находящихся в статусе «черновик» или «отказ»
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Средний чек" value={formatKopecks(analytics.averageCheckKopecks)} />
        <Stat
          label="Плановая ставка (среднее)"
          value={
            analytics.averagePlannedRateKopecks !== null
              ? `${formatKopecks(analytics.averagePlannedRateKopecks)}/ч`
              : "Нет данных"
          }
        />
        <Stat
          label="Фактическая ставка (среднее)"
          value={
            analytics.averageActualRateKopecks !== null
              ? `${formatKopecks(analytics.averageActualRateKopecks)}/ч`
              : "Нет данных"
          }
        />
        <Stat
          label="Средняя скидка"
          value={
            analytics.averageDiscountBps !== null
              ? formatBpsAsPercent(analytics.averageDiscountBps)
              : "Нет данных"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Точность оценки времени</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.averageTimeOverrunBps === null ? (
            <p className="text-sm text-muted-foreground">
              Пока нет завершённых расчётов с внесённым фактическим временем.
            </p>
          ) : (
            <p className="text-sm">
              По {analytics.timeAccuracySampleSize} завершённым расчётам среднее отклонение
              фактического времени от планового:{" "}
              <span className="font-semibold">
                {formatBpsAsPercent(analytics.averageTimeOverrunBps)}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Наиболее доходные услуги</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {analytics.topServices.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет данных</p>
            )}
            {analytics.topServices.map((s) => (
              <div key={s.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="tabular-nums font-medium">{formatKopecks(s.revenueKopecks)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(s.revenueKopecks / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Услуги с перерасходом времени</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {analytics.overrunServices.length === 0 && (
              <p className="text-sm text-muted-foreground">Перерасхода не выявлено</p>
            )}
            {analytics.overrunServices.map((s) => (
              <Link
                key={s.id}
                href={`/calculations/${s.id}`}
                className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm hover:bg-secondary"
              >
                <span className="truncate">
                  №{s.number} {s.internalName}
                </span>
                <span className="font-medium text-warning tabular-nums">
                  {formatBpsAsPercent(s.overrunBps)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Предложения по норме времени</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              На основе завершённых расчётов фактическое время заметно отличается от плановой
              нормы услуги. Справочник не изменяется автоматически — обновите норму вручную, если
              согласны с предложением.
            </p>
            {suggestions.map((s) => (
              <div
                key={s.serviceId}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{s.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    Выборка: {s.sampleSize} расчётов
                  </p>
                </div>
                <div className="text-right">
                  <p>
                    Плановая норма: {(s.averagePlannedMinutes / 60).toFixed(1)} ч → фактическая:{" "}
                    {(s.averageActualMinutes / 60).toFixed(1)} ч
                  </p>
                  <Link href="/services" className="text-xs text-primary hover:underline">
                    Открыть справочник услуг
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
