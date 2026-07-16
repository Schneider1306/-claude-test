"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "./mobile-nav";

export function MobileHeaderBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur no-print md:hidden">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-primary">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
            ⚖
          </span>
          Экономика практики
        </Link>
        <ThemeToggle />
      </header>
      <MobileNav />
    </>
  );
}
