"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Значок "i" с подсказкой "Как считается" — раскрывается по клику/наведению, доступен с клавиатуры. */
export function InfoTooltip({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="Как считается"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/50 text-[10px] leading-none text-muted-foreground hover:border-primary hover:text-primary"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-foreground shadow-lg"
        >
          <span className="mb-1 block font-medium text-muted-foreground">Как считается</span>
          {text}
        </span>
      )}
    </span>
  );
}
