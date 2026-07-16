"use client";

import { logoutAction } from "@/server/actions/auth";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      >
        <LogOut className="h-3.5 w-3.5" />
        Выйти
      </button>
    </form>
  );
}
