import { NextResponse, type NextRequest } from "next/server";

import { getSafeNextPath } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = new Set([
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/confirm",
  "/auth/error",
]);

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (!userId && !isPublicPath) {
    if (pathname.startsWith("/api/")) {
      return copySessionCookies(
        response,
        NextResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
          { status: 401 },
        ),
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", getSafeNextPath(`${pathname}${search}`));

    return copySessionCookies(response, NextResponse.redirect(loginUrl));
  }

  if (
    userId &&
    (pathname === "/auth/login" || pathname === "/auth/register")
  ) {
    const appUrl = request.nextUrl.clone();
    appUrl.pathname = "/editor";
    appUrl.search = "";
    return copySessionCookies(response, NextResponse.redirect(appUrl));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
