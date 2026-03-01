import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { APP_SESSION_COOKIE } from "@/lib/constants";
import type { SessionPayload } from "@/lib/types";
import { verifySessionToken } from "@/lib/session";

function getSecret() {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    throw new Error("APP_SESSION_SECRET is required");
  }
  return secret;
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getSecret());
}

export async function getServerSession(): Promise<SessionPayload | null> {
  const token = cookies().get(APP_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token, getSecret());
}
