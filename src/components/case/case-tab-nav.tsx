"use client";

import { QueryTabs, type TabItem } from "@/components/ui/tabs";

export function CaseTabNav({ tabs, defaultValue }: { tabs: TabItem[]; defaultValue: string }) {
  return <QueryTabs tabs={tabs} defaultValue={defaultValue} />;
}
