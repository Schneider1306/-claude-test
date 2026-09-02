import { AppShell } from "@/components/layout/app-shell";
import { isAuthEnabled } from "@/lib/auth";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell showLogout={isAuthEnabled()}>{children}</AppShell>;
}
