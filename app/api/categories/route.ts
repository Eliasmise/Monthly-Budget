import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, requireSession } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { categorySchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  const supabase = getSupabaseServerClient();
  let query = supabase.from("categories").select("id, name, is_active, created_at").order("name", { ascending: true });

  if (authResult.session.role !== "admin") {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid category" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: parsed.data.name })
    .select("id, name, is_active, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to add category" }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
