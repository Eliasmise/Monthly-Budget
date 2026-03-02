import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  const body = await req.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const supabase = getSupabaseServerClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, password_hash")
    .eq("id", authResult.session.userId)
    .maybeSingle();

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!verifyPassword(currentPassword, user.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ password_hash: hashPassword(newPassword) })
    .eq("id", authResult.session.userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
