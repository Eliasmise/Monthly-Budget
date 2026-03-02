import Link from "next/link";

import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { LogoutButton } from "@/components/logout-button";

interface AppNavProps {
  username: string;
  role: "admin" | "user";
}

export function AppNav({ username, role }: AppNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link className="font-[var(--font-serif)] text-xl text-primary" href="/dashboard">
            Monthly Budget
          </Link>
          {role === "admin" ? (
            <Link className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary" href="/admin">
              Admin
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Logged in as <span className="font-semibold text-foreground">{username}</span>
          </div>
          <ChangePasswordDialog />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
