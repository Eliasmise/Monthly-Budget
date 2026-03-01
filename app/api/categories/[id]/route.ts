import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json();
  const isActive = body?.isActive;

  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive boolean is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ is_active: isActive })
    .eq("id", params.id)
    .select("id, name, is_active, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update category" }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await requireAdmin(req);
  if (!authResult.ok) return authResult.response;

  const supabase = getSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("category_id", params.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Category has expenses. Deactivate it instead of deleting." },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
