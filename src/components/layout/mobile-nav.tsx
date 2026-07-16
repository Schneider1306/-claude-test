"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/cases", label: "Дела" },
  { href: "/cases/new", label: "Новое дело" },
  { href: "/payments", label: "Платежи" },
  { href: "/time", label: "Время" },
  { href: "/calendar", label: "Календарь" },
  { href: "/scenarios", label: "Сценарии" },
  { href: "/analytics", label: "Аналитика" },
  { href: "/settings", label: "Настройки" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2 md:hidden">
      {ITEMS.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
              isActive ? "bg-primary text-primary-foreground" : "bg-surface-muted text-muted-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
