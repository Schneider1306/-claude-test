"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "./logout-button";

export function DesktopNavAside({ authEnabled }: { authEnabled: boolean }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2 text-lg font-semibold text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          ⚖
        </span>
        Экономика практики
      </Link>
      <Sidebar className="flex-1" />
      <div className="mt-4 flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Тема</span>
          <ThemeToggle />
        </div>
        {authEnabled && <LogoutButton />}
      </div>
    </aside>
  );
}
