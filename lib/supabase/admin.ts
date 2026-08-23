import { createClient } from "@supabase/supabase-js";

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("The Supabase admin client is server-only.");
  }
}

export function createAdminClient() {
  assertServerRuntime();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
