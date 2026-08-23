import { afterEach, beforeEach, expect, test } from "bun:test";

import {
  getSupabasePublicConfig,
  isSupabaseConfigurationError,
  requireSupabasePublicConfig,
  SUPABASE_CONFIGURATION_MESSAGE,
} from "./config";

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

afterEach(() => {
  if (originalUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  }

  if (originalKey === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

test("returns null when Supabase public configuration is incomplete", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

  expect(getSupabasePublicConfig()).toBeNull();
});

test("returns trimmed Supabase configuration when both values exist", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "  https://example.supabase.co  ";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "  publishable-key  ";

  expect(getSupabasePublicConfig()).toEqual({
    url: "https://example.supabase.co",
    publishableKey: "publishable-key",
  });
});

test("throws a typed, user-readable error when configuration is missing", () => {
  let thrown;

  try {
    requireSupabasePublicConfig();
  } catch (error) {
    thrown = error;
  }

  expect(isSupabaseConfigurationError(thrown)).toBe(true);
  expect(thrown?.message).toBe(SUPABASE_CONFIGURATION_MESSAGE);
});
