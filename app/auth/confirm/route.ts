import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { getSafeNextPath } from "@/lib/auth/redirect";
import {
  isSupabaseConfigurationError,
  SUPABASE_CONFIGURATION_MESSAGE,
} from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeNextPath(request.nextUrl.searchParams.get("next"), "/");

  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set(
      "message",
      isSupabaseConfigurationError(error)
        ? SUPABASE_CONFIGURATION_MESSAGE
        : "Authentication is temporarily unavailable.",
    );
    return NextResponse.redirect(errorUrl);
  }

  let error: Error | null = null;

  if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else {
    error = new Error("Missing authentication confirmation token.");
  }

  if (!error) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const errorUrl = new URL("/auth/error", request.url);
  errorUrl.searchParams.set(
    "message",
    "The authentication link is invalid or has expired.",
  );
  return NextResponse.redirect(errorUrl);
}
