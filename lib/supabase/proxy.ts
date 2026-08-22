import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export type SessionRefreshResult = {
  response: NextResponse;
  userId: string | null;
};

export async function updateSession(
  request: NextRequest,
): Promise<SessionRefreshResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    // Keep static builds usable before a Supabase project is connected. At request
    // time protected routes will still be treated as unauthenticated.
    return {
      response: NextResponse.next({ request }),
      userId: null,
    };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
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

  const {
    data: { claims },
  } = await supabase.auth.getClaims();

  return {
    response,
    userId: typeof claims?.sub === "string" ? claims.sub : null,
  };
}
