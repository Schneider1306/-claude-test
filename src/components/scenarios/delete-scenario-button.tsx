"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteScenario } from "@/server/actions/scenarios";

export function DeleteScenarioButton({ scenarioId }: { scenarioId: number }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!confirm("Удалить сценарий?")) return;
        await deleteScenario(scenarioId);
        router.refresh();
      }}
    >
      Удалить
    </Button>
  );
}
