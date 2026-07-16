import Link from "next/link";
import { listScenarios } from "@/server/queries/scenarios";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateRu } from "@/domain/calculations";
import { CreateScenarioForm } from "@/components/scenarios/create-scenario-form";
import { DeleteScenarioButton } from "@/components/scenarios/delete-scenario-button";

export const dynamic = "force-dynamic";

export default function ScenariosPage() {
  const scenarios = listScenarios();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Сценарии</h1>
      <p className="text-sm text-muted-foreground">
        Конструктор месяца — смоделируйте предполагаемые дела и услуги, чтобы увидеть прогноз выручки, часов,
        налогов и личного дохода до того, как дела реально появятся.
      </p>

      <Card>
        <CardContent className="p-4">
          <CreateScenarioForm />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-col gap-2 p-4">
              <Link href={`/scenarios/${s.id}`} className="text-base font-medium text-primary hover:underline">
                {s.name}
              </Link>
              <p className="text-sm text-muted-foreground">Месяц: {s.month}</p>
              <p className="text-xs text-muted-foreground">Создан {formatDateRu(s.createdAt)}</p>
              <div className="mt-2 flex justify-end no-print">
                <DeleteScenarioButton scenarioId={s.id} />
              </div>
            </CardContent>
          </Card>
        ))}
        {scenarios.length === 0 && (
          <p className="text-sm text-muted-foreground">Сценариев пока нет — создайте первый выше.</p>
        )}
      </div>
    </div>
  );
}
