"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { softDeleteCase, restoreCase } from "@/server/actions/cases";

export function DeleteCaseButton({ caseId, deleted }: { caseId: number; deleted: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  if (deleted) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await restoreCase(caseId);
          router.refresh();
          setPending(false);
        }}
      >
        Восстановить дело
      </Button>
    );
  }

  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={async () => {
        if (!confirm("Удалить дело? Это мягкое удаление — данные сохранятся и дело можно будет восстановить.")) {
          return;
        }
        setPending(true);
        await softDeleteCase(caseId);
        router.refresh();
        router.push("/cases");
        setPending(false);
      }}
    >
      Удалить дело
    </Button>
  );
}
