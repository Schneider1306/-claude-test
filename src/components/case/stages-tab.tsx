import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatDateRu, formatHours, formatMoney, stageLineTotalKopecks } from "@/domain/calculations";
import { STAGE_STATUS_LABELS } from "@/domain/labels";
import type { StageRow } from "@/server/queries/case-financials";
import type { Service } from "@/server/queries/services";
import type { Settings } from "@/server/queries/settings";
import { StageFormModal } from "./stage-form-modal";
import { StagePaidCheckbox, DeleteStageButton } from "./stage-row-actions";

export function StagesTab({
  caseId,
  stages,
  actualMinutesByStage,
  services,
  settings,
}: {
  caseId: number;
  stages: StageRow[];
  actualMinutesByStage: Map<number, number>;
  services: Service[];
  settings: Settings;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end no-print">
        <StageFormModal
          caseId={caseId}
          services={services}
          standardUrgencySurchargeBp={settings.standardUrgencySurchargeBp}
          maxDiscountBp={settings.maxDiscountBp}
          trigger={<Button>+ Добавить этап</Button>}
        />
      </div>
      <Card>
        <Table>
          <Thead>
            <tr>
              <Th>Этап</Th>
              <Th>Статус</Th>
              <Th className="text-right">Цена × кол-во</Th>
              <Th className="text-right">Итого</Th>
              <Th className="text-right">План, ч</Th>
              <Th className="text-right">Факт, ч</Th>
              <Th>Срок</Th>
              <Th>Срочно / скидка</Th>
              <Th>Оплачен</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {stages.map((s) => {
              const actual = actualMinutesByStage.get(s.id) ?? 0;
              return (
                <Tr key={s.id}>
                  <Td className="max-w-56">
                    <div className="font-medium">{s.name}</div>
                    {s.priceDeviationReason && (
                      <div className="text-xs text-warning">Отклонение: {s.priceDeviationReason}</div>
                    )}
                  </Td>
                  <Td>
                    <Badge variant={s.status === "done" ? "accent" : s.status === "cancelled" ? "danger" : "neutral"}>
                      {STAGE_STATUS_LABELS[s.status]}
                    </Badge>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatMoney(s.agreedPriceKopecks)} × {s.quantity}
                  </Td>
                  <Td className="text-right tabular-nums font-medium">
                    {formatMoney(
                      stageLineTotalKopecks({
                        agreedPriceKopecks: s.agreedPriceKopecks,
                        quantity: s.quantity,
                        plannedMinutes: s.plannedMinutes,
                        discountBp: s.discountBp,
                        isUrgent: s.isUrgent,
                        urgencySurchargeBp: s.urgencySurchargeBp,
                        isCancelled: s.status === "cancelled",
                      }),
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{formatHours(s.plannedMinutes * s.quantity)}</Td>
                  <Td className="text-right tabular-nums">{actual > 0 ? formatHours(actual) : "—"}</Td>
                  <Td>{formatDateRu(s.dueDate)}</Td>
                  <Td className="text-xs text-muted-foreground">
                    {s.isUrgent && <div>+{s.urgencySurchargeBp / 100}% срочно</div>}
                    {s.discountBp > 0 && <div>−{s.discountBp / 100}% скидка</div>}
                    {!s.isUrgent && s.discountBp === 0 && "—"}
                  </Td>
                  <Td>
                    <StagePaidCheckbox stageId={s.id} caseId={caseId} isPaid={s.isPaidFlag} />
                  </Td>
                  <Td className="no-print">
                    <div className="flex gap-1">
                      <StageFormModal
                        caseId={caseId}
                        services={services}
                        standardUrgencySurchargeBp={settings.standardUrgencySurchargeBp}
                        maxDiscountBp={settings.maxDiscountBp}
                        stageId={s.id}
                        initial={{
                          caseId,
                          name: s.name,
                          serviceId: s.serviceId,
                          catalogPriceRubles: s.catalogPriceKopecks != null ? s.catalogPriceKopecks / 100 : null,
                          catalogPlannedHours: s.catalogPlannedMinutes != null ? s.catalogPlannedMinutes / 60 : null,
                          priceDeviationReason: s.priceDeviationReason,
                          agreedPriceRubles: s.agreedPriceKopecks / 100,
                          quantity: s.quantity,
                          plannedHours: s.plannedMinutes / 60,
                          includedMeetings: s.includedMeetings,
                          agreedDate: s.agreedDate,
                          startDate: s.startDate,
                          dueDate: s.dueDate,
                          status: s.status,
                          isUrgent: s.isUrgent,
                          urgencySurchargeBp: s.urgencySurchargeBp,
                          discountBp: s.discountBp,
                          comment: s.comment,
                        }}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Изменить
                          </Button>
                        }
                      />
                      <DeleteStageButton stageId={s.id} caseId={caseId} />
                    </div>
                  </Td>
                </Tr>
              );
            })}
            {stages.length === 0 && (
              <Tr>
                <Td colSpan={10} className="py-8 text-center text-muted-foreground">
                  Этапов пока нет.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Card>
    </div>
  );
}
