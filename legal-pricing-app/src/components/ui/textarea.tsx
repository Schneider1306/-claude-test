import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({
  className,
  editable,
  ...props
}: React.ComponentProps<"textarea"> & { editable?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        editable && "bg-editable border-editable-border",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
