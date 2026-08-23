import { NextResponse } from "next/server";

import {
  isSupabaseConfigurationError,
  SUPABASE_CONFIGURATION_MESSAGE,
} from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  let supabase;

  try {
    supabase = await createClient();
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json(
        {
          error: {
            code: "SUPABASE_NOT_CONFIGURED",
            message: SUPABASE_CONFIGURATION_MESSAGE,
          },
        },
        { status: 503 },
      );
    }

    throw error;
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = !claimsError && typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: {
          code: "PROFILE_READ_FAILED",
          message: "Unable to load the profile.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile });
}
