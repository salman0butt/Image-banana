import { defineConfig, devices } from "@playwright/test";

function requiredEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  throw new Error(`${names.join(" or ")} is required for authenticated E2E tests.`);
}

const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabasePublishableKey = requiredEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (!supabaseServiceRoleKey && !supabaseSecretKey) {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY is required for authenticated E2E tests.",
  );
}

const openAiApiKey = "e2e-openai-api-key";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.auth.e2e.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-authenticated",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm exec next dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000/auth/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
      ...(supabaseServiceRoleKey
        ? { SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey }
        : {}),
      ...(supabaseSecretKey ? { SUPABASE_SECRET_KEY: supabaseSecretKey } : {}),
      SIGNUP_CREDITS: "25",
      OPENAI_API_KEY: openAiApiKey,
      OPENAI_MODEL: "gpt-5.6",
      OPENAI_IMAGE_SIZE: "1024x1024",
    },
  },
});
