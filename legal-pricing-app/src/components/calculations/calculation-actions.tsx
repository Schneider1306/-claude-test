"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, FileText, GitBranch, Pencil, Printer, Trash2 } from "lucide-react";
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
  createNewVersion,
  duplicateCalculation,
  deleteCalculation,
  exportCalculationJSON,
  exportCalculationCSV,
} from "@/server/actions/calculations";

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CalculationActions({ id, number }: { id: number; number: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  function handleNewVersion() {
    startTransition(async () => {
      const result = await createNewVersion(id);
      toast({ title: "Новая версия создана", variant: "success" });
      router.push(`/calculations/${result.id}/edit`);
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateCalculation(id);
      toast({ title: "Расчёт дублирован", variant: "success" });
      router.push(`/calculations/${result.id}`);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCalculation(id);
      toast({ title: "Расчёт удалён", variant: "default" });
      router.push("/calculations");
    });
  }

  async function handleExportJSON() {
    const json = await exportCalculationJSON(id);
    downloadText(json, `calculation-${number}.json`, "application/json");
  }

  async function handleExportCSV() {
    const csv = await exportCalculationCSV(id);
    downloadText(csv, `calculation-${number}.csv`, "text/csv;charset=utf-8");
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <Button variant="outline" asChild>
        <Link href={`/calculations/${id}/edit`}>
          <Pencil /> Изменить
        </Link>
      </Button>
      <Button variant="outline" onClick={handleNewVersion} disabled={pending}>
        <GitBranch /> Новая версия
      </Button>
      <Button variant="outline" onClick={handleDuplicate} disabled={pending}>
        <Copy /> Дублировать
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/calculations/${id}/proposal`} target="_blank">
          <Printer /> Предложение клиенту
        </Link>
      </Button>
      <Button variant="outline" onClick={handleExportJSON}>
        <Download /> JSON
      </Button>
      <Button variant="outline" onClick={handleExportCSV}>
        <FileText /> CSV
      </Button>
      <Button variant="destructive" onClick={() => setConfirmDelete(true)} disabled={pending}>
        <Trash2 /> Удалить
      </Button>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить расчёт №{number}?</DialogTitle>
            <DialogDescription>
              Действие необратимо. Все строки, расходы и история изменений будут удалены
              безвозвратно.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              Удалить безвозвратно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
