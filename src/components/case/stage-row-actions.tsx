"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { deleteStage, markStagePaid } from "@/server/actions/stages";

export function StagePaidCheckbox({ stageId, caseId, isPaid }: { stageId: number; caseId: number; isPaid: boolean }) {
  const router = useRouter();
  return (
    <Checkbox
      defaultChecked={isPaid}
      onChange={async (e) => {
        await markStagePaid(stageId, caseId, e.target.checked);
        router.refresh();
      }}
    />
  );
}

export function DeleteStageButton({ stageId, caseId }: { stageId: number; caseId: number }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm("Удалить этап?")) return;
        await deleteStage(stageId, caseId);
        router.refresh();
      }}
    >
      Удалить
    </Button>
  );
}
