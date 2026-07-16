import { cn } from "@/lib/utils";
import { InfoTooltip } from "./info-tooltip";
import { Card, CardContent } from "./card";

export function MetricTile({
  label,
  value,
  hint,
  explanation,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  explanation?: string;
  tone?: "neutral" | "accent" | "warning" | "danger";
  className?: string;
}) {
  const toneClass = {
    neutral: "text-foreground",
    accent: "text-accent",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <Card className={className}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
          {explanation && <InfoTooltip text={explanation} />}
        </div>
        <div className={cn("mt-1.5 text-2xl font-semibold tabular-nums sm:text-3xl", toneClass)}>
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
