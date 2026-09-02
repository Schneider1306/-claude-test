import { Badge } from "@/components/ui/badge";
import type { RateStatus } from "@/domain/calculations";

const STATUS_LABEL: Record<RateStatus, string> = {
  green: "Ставка выше целевой",
  yellow: "Ниже целевой (до 15%)",
  red: "Ниже целевой (более 15%)",
  "no-data": "Нет данных",
};

const STATUS_VARIANT: Record<RateStatus, "success" | "warning" | "danger" | "secondary"> = {
  green: "success",
  yellow: "warning",
  red: "danger",
  "no-data": "secondary",
};

export function RateStatusBadge({ status }: { status: RateStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
