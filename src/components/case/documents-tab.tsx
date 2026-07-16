import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DocumentsTab({ caseId }: { caseId: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Документы дела</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="font-medium">Коммерческое предложение</div>
            <p className="text-sm text-muted-foreground">
              Печатная страница для клиента: услуги, стоимость, график платежей — без внутренней контрольной ставки.
            </p>
          </div>
          <Link href={`/cases/${caseId}/offer`} target="_blank">
            <Button variant="outline">Открыть</Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Хранение файлов на диске в этой версии не предусмотрено — не загружайте сюда медицинские и иные
          персональные документы. Используйте обезличенный код клиента и внешнее защищённое хранилище для
          исходных файлов дела.
        </p>
      </CardContent>
    </Card>
  );
}
