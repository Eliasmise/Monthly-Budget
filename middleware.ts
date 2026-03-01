import { NextRequest, NextResponse } from "next/server";

import { APP_SESSION_COOKIE } from "@/lib/constants";
import { verifySessionToken } from "@/lib/session";

const PUBLIC_PATHS = new Set(["/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const shouldProtect = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const token = req.cookies.get(APP_SESSION_COOKIE)?.value;

  if (!token) {
    if (shouldProtect) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(token, secret);

  if (!session) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.set(APP_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
