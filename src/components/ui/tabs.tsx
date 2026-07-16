"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
}

/** Простые вкладки, синхронизированные с query-параметром ?tab= — состояние переживает обновление страницы. */
export function QueryTabs({
  tabs,
  paramName = "tab",
  defaultValue,
}: {
  tabs: TabItem[];
  paramName?: string;
  defaultValue: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) ?? defaultValue;

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border no-print" role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === current;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set(paramName, tab.value);
              router.push(`?${params.toString()}`, { scroll: false });
            }}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function useActiveTab(defaultValue: string, paramName = "tab") {
  const searchParams = useSearchParams();
  return searchParams.get(paramName) ?? defaultValue;
}
