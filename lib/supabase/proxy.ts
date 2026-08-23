import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

export type SessionRefreshResult = {
  response: NextResponse;
  userId: string | null;
};

export async function updateSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  const config = getSupabasePublicConfig();

  if (!config) {
    // Keep static builds and public auth pages usable before a Supabase project is
    // connected. Protected routes are treated as unauthenticated by the root proxy.
    return {
      response: NextResponse.next({ request }),
      userId: null,
    };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );

        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return {
    response,
    userId: !error && typeof claims?.sub === "string" ? claims.sub : null,
  };
}
