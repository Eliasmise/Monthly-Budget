import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { roleSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json();
  const parsed = roleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid role" }, { status: 400 });
  }

  if (authResult.session.userId === params.id && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "Cannot remove your own admin access" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .update({ role: parsed.data.role })
    .eq("id", params.id)
    .select("id, username, role, salary_amount, salary_currency, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update user" }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  if (authResult.session.userId === params.id) {
    return NextResponse.json({ error: "Cannot delete your own user" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: targetUser, error: targetError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", params.id)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ error: targetError.message }, { status: 500 });
  }

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.role === "admin") {
    const { count, error: countError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
    }
  }

  const { error } = await supabase.from("users").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
