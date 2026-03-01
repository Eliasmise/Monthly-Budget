import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { userSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, salary_amount, salary_currency, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json();
  const parsed = userSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .insert({
      username: parsed.data.username,
      role: parsed.data.role
    })
    .select("id, username, role, salary_amount, salary_currency, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}
