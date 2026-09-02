"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toaster";
import {
  runManualBackup,
  exportDatabaseJSON,
  validateRestoreFile,
  restoreFromJSON,
  type RestoreValidationResult,
} from "@/server/actions/backup";
import type { DatabaseStats } from "./types";

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BackupPanel({ stats }: { stats: DatabaseStats }) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, startTransition] = React.useTransition();
  const [pendingRestore, setPendingRestore] = React.useState<{
    text: string;
    validation: RestoreValidationResult;
  } | null>(null);

  function handleManualBackup() {
    startTransition(async () => {
      const result = await runManualBackup();
      toast({ title: "Резервная копия создана", description: result.path, variant: "success" });
    });
  }

  async function handleExportJSON() {
    const json = await exportDatabaseJSON();
    downloadText(json, `legal-pricing-export-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const validation = await validateRestoreFile(text);
    setPendingRestore({ text, validation });
    e.target.value = "";
  }

  function confirmRestore() {
    if (!pendingRestore) return;
    startTransition(async () => {
      const result = await restoreFromJSON(pendingRestore.text);
      if (result.valid) {
        toast({ title: "База данных восстановлена", variant: "success" });
        window.location.reload();
      } else {
        toast({ title: "Не удалось восстановить базу", description: result.error, variant: "destructive" });
      }
      setPendingRestore(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Резервное копирование и восстановление</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {Object.entries(stats).map(([table, count]) => (
            <div key={table}>
              <p className="text-xs text-muted-foreground">{TABLE_LABELS[table] ?? table}</p>
              <p className="font-medium tabular-nums">{count}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleManualBackup} disabled={pending}>
            Создать резервную копию
          </Button>
          <Button variant="outline" onClick={handleExportJSON}>
            Экспорт базы в JSON
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Восстановить из файла
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          При каждом запуске приложение автоматически создаёт резервную копию базы данных и
          хранит последние 10 копий в data/backups. Восстановление возможно только после проверки
          структуры файла.
        </p>
      </CardContent>

      <Dialog open={pendingRestore !== null} onOpenChange={(open) => !open && setPendingRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановить базу данных из файла?</DialogTitle>
            <DialogDescription>
              {pendingRestore?.validation.valid
                ? "Текущие данные будут полностью заменены содержимым файла. Перед восстановлением автоматически создаётся резервная копия текущей базы."
                : pendingRestore?.validation.error}
            </DialogDescription>
          </DialogHeader>
          {pendingRestore?.validation.valid && pendingRestore.validation.summary && (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {Object.entries(pendingRestore.validation.summary).map(([table, count]) => (
                <div key={table}>
                  <p className="text-xs text-muted-foreground">{TABLE_LABELS[table] ?? table}</p>
                  <p className="font-medium tabular-nums">{count}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRestore(null)}>
              Отмена
            </Button>
            {pendingRestore?.validation.valid && (
              <Button variant="destructive" onClick={confirmRestore} disabled={pending}>
                Восстановить и заменить текущие данные
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const TABLE_LABELS: Record<string, string> = {
  settings: "Настройки",
  services: "Услуги",
  service_price_history: "История цен",
  calculations: "Расчёты",
  calculation_lines: "Строки расчётов",
  calculation_expenses: "Расходы",
  calculation_change_log: "Журнал изменений",
  calculation_status_history: "История статусов",
};
