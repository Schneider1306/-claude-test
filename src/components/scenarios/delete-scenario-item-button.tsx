"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteScenarioItem } from "@/server/actions/scenarios";

export function DeleteScenarioItemButton({ itemId, scenarioId }: { itemId: number; scenarioId: number }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await deleteScenarioItem(itemId, scenarioId);
        router.refresh();
      }}
    >
      Удалить
    </Button>
  );
}
