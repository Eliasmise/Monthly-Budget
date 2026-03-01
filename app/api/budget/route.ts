import { NextRequest, NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { getUserBudgetConfig } from "@/lib/budget";

export async function GET(req: NextRequest) {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult.response;

  try {
    const budget = await getUserBudgetConfig(authResult.session.userId);
    if (!budget) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ budget });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load budget";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
