export const SUPABASE_CONFIGURATION_MESSAGE =
  "Supabase is not configured for this environment. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the application.";

export class SupabaseConfigurationError extends Error {
  readonly code = "SUPABASE_NOT_CONFIGURED";

  constructor() {
    super(SUPABASE_CONFIGURATION_MESSAGE);
    this.name = "SupabaseConfigurationError";
  }
}

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new SupabaseConfigurationError();
  }

  return config;
}

export function isSupabaseConfigurationError(
  error: unknown,
): error is SupabaseConfigurationError {
  return (
    error instanceof SupabaseConfigurationError ||
    (error instanceof Error &&
      "code" in error &&
      error.code === "SUPABASE_NOT_CONFIGURED")
  );
}
