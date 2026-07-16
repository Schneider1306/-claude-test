"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu, formatHours, formatMoney } from "@/domain/calculations";
import { setServiceActive } from "@/server/actions/services";
import { ServiceFormModal } from "./service-form-modal";
import type { Service } from "@/server/queries/services";

export function ServicesCatalogTab({ services }: { services: Service[] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end no-print">
        <ServiceFormModal trigger={<Button>+ Новая услуга</Button>} />
      </div>
      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Услуга</Th>
              <Th>Категория</Th>
              <Th className="text-right">Рыночная</Th>
              <Th className="text-right">Рабочая</Th>
              <Th className="text-right">Время</Th>
              <Th>Изменена</Th>
              <Th>Активна</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {services.map((s) => (
              <Tr key={s.id}>
                <Td className="max-w-64">
                  <div className="font-medium">{s.name}</div>
                  {s.description && <div className="max-w-64 truncate text-xs text-muted-foreground">{s.description}</div>}
                </Td>
                <Td>{s.category}</Td>
                <Td className="text-right tabular-nums">{formatMoney(s.marketPriceKopecks)}</Td>
                <Td className="text-right tabular-nums font-medium">{formatMoney(s.workPriceKopecks)}</Td>
                <Td className="text-right tabular-nums">{formatHours(s.plannedMinutes)}</Td>
                <Td className="text-muted-foreground">{formatDateRu(s.priceChangedAt)}</Td>
                <Td>
                  <Badge variant={s.isActive ? "accent" : "neutral"}>{s.isActive ? "Да" : "Нет"}</Badge>
                </Td>
                <Td className="no-print">
                  <div className="flex gap-1">
                    <ServiceFormModal
                      serviceId={s.id}
                      initial={{
                        name: s.name,
                        category: s.category,
                        marketPriceRubles: s.marketPriceKopecks / 100,
                        workPriceRubles: s.workPriceKopecks / 100,
                        plannedHours: s.plannedMinutes / 60,
                        description: s.description,
                        extraPaymentBasis: s.extraPaymentBasis,
                        isActive: s.isActive,
                        includedMeetings: s.includedMeetings,
                        monthlyLimitHours: s.monthlyLimitMinutes != null ? s.monthlyLimitMinutes / 60 : null,
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Изменить
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await setServiceActive(s.id, !s.isActive);
                        router.refresh();
                      }}
                    >
                      {s.isActive ? "Деактивировать" : "Активировать"}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
