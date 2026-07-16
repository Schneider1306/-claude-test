import Link from "next/link";
import { Calculator, LayoutDashboard, ListChecks, BarChart3, Settings, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const NAV_ITEMS = [
  { href: "/", label: "Главная", icon: LayoutDashboard },
  { href: "/calculations/new", label: "Новый расчёт", icon: Calculator },
  { href: "/calculations", label: "Сохранённые расчёты", icon: ListChecks },
  { href: "/services", label: "Справочник услуг", icon: BookOpen },
  { href: "/analytics", label: "Аналитика", icon: BarChart3 },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-primary">
            <Calculator className="size-5" />
            <span className="hidden sm:inline">Калькулятор юридических услуг</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <item.icon className="size-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
