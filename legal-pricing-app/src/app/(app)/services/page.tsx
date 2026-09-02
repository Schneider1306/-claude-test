import { getAllServices } from "@/server/queries";
import { ServicesTable } from "@/components/services/services-table";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const services = getAllServices();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Справочник услуг</h1>
        <p className="text-sm text-muted-foreground">
          Изменение цен и времени не влияет на уже сохранённые расчёты
        </p>
      </div>
      <ServicesTable services={services} />
    </div>
  );
}
