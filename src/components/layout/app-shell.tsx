import { isAuthEnabled } from "@/lib/auth";
import { DesktopNavAside } from "./desktop-nav-aside";
import { MobileHeaderBar } from "./mobile-header-bar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const authEnabled = isAuthEnabled();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
      <DesktopNavAside authEnabled={authEnabled} />

      <div className="flex min-h-screen flex-1 flex-col">
        <MobileHeaderBar />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
