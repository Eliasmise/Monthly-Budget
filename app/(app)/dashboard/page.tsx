import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getServerSession } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) return null;

  const supabase = getSupabaseServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, is_active, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return <DashboardTabs initialCategories={categories ?? []} username={session.username} role={session.role} />;
}
