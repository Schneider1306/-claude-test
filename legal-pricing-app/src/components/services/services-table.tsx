"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, History, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toaster";
import { formatKopecks } from "@/lib/format";
import { LINE_KIND_LABELS } from "@/lib/status-labels";
import {
  duplicateService,
  setServiceActive,
  getServicePriceHistoryAction,
} from "@/server/actions/services";
import { ServiceFormDialog } from "./service-form-dialog";
import { PriceHistoryDialog } from "./price-history-dialog";
import type { services, servicePriceHistory } from "@/db/schema";

type ServiceRow = typeof services.$inferSelect;
type HistoryRow = typeof servicePriceHistory.$inferSelect;

export function ServicesTable({ services: allServices }: { services: ServiceRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceRow | undefined>(undefined);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyService, setHistoryService] = React.useState<ServiceRow | undefined>(undefined);
  const [history, setHistory] = React.useState<HistoryRow[]>([]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    for (const s of allServices) {
      const arr = map.get(s.category) ?? [];
      arr.push(s);
      map.set(s.category, arr);
    }
    return map;
  }, [allServices]);

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(service: ServiceRow) {
    setEditing(service);
    setFormOpen(true);
  }
  async function openHistory(service: ServiceRow) {
    setHistoryService(service);
    const rows = await getServicePriceHistoryAction(service.id);
    setHistory(rows);
    setHistoryOpen(true);
  }
  async function handleDuplicate(service: ServiceRow) {
    await duplicateService(service.id);
    toast({ title: "Услуга дублирована", variant: "success" });
    router.refresh();
  }
  async function handleToggleActive(service: ServiceRow) {
    await setServiceActive(service.id, !service.isActive);
    toast({
      title: service.isActive ? "Услуга отключена" : "Услуга включена",
      variant: "default",
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={openCreate} className="self-start">
        <Plus /> Новая услуга
      </Button>

      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{category}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Цена</TableHead>
                <TableHead className="text-right">Ориентир рынка</TableHead>
                <TableHead className="text-right">Время</TableHead>
                <TableHead>Активна</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((service) => (
                <TableRow key={service.id} className={!service.isActive ? "opacity-50" : undefined}>
                  <TableCell>
                    <p className="font-medium">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{LINE_KIND_LABELS[service.kind]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatKopecks(service.basePriceKopecks)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {service.marketReferenceKopecks !== null
                      ? formatKopecks(service.marketReferenceKopecks)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(service.plannedMinutes / 60).toFixed(1)} ч
                  </TableCell>
                  <TableCell>
                    <Switch checked={service.isActive} onCheckedChange={() => handleToggleActive(service)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicate(service)}>
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openHistory(service)}>
                        <History className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}

      <ServiceFormDialog open={formOpen} onOpenChange={setFormOpen} service={editing} />
      {historyService && (
        <PriceHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          serviceName={historyService.name}
          history={history}
        />
      )}
    </div>
  );
}
