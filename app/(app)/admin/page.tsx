import { redirect } from "next/navigation";

import { AdminPanel } from "@/components/admin/admin-panel";
import { getServerSession } from "@/lib/auth";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminPanel />;
}
