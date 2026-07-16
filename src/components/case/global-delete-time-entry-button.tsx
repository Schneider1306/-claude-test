"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteTimeEntry } from "@/server/actions/time-entries";

export function GlobalDeleteTimeEntryButton({ entryId, caseId }: { entryId: number; caseId: number }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm("Удалить запись времени?")) return;
        await deleteTimeEntry(entryId, caseId);
        router.refresh();
      }}
    >
      Удалить
    </Button>
  );
}
