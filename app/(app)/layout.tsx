import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { getServerSession } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <AppNav username={session.username} role={session.role} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
