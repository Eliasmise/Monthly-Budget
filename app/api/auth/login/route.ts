import { NextRequest, NextResponse } from "next/server";

import { getSessionCookieConfig, createSessionToken } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = usernameSchema.safeParse(body.username);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message ?? "Invalid username" }, { status: 400 });
    }

    const username = parseResult.data;
    const supabase = getSupabaseServerClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, role")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const secret = process.env.APP_SESSION_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "APP_SESSION_SECRET is not configured" }, { status: 500 });
    }

    const token = await createSessionToken(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      secret
    );

    const { name, options } = getSessionCookieConfig();
    const response = NextResponse.json({ user });
    response.cookies.set(name, token, options);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected login error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
