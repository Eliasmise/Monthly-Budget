import { NextRequest, NextResponse } from "next/server";

import type { SessionPayload } from "@/lib/types";
import { getSessionFromRequest } from "@/lib/auth";

export async function requireSession(req: NextRequest): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return { ok: true, session };
}

export async function requireAdmin(req: NextRequest): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const authResult = await requireSession(req);
  if (!authResult.ok) return authResult;
  if (authResult.session.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  return authResult;
}
