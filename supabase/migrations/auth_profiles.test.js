import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("./20260823010000_auth_profiles.sql", import.meta.url),
  "utf8",
);

test("profiles migration enables RLS", () => {
  expect(migration).toContain("alter table public.profiles enable row level security");
});

test("profiles migration limits browser access to own rows", () => {
  expect(migration).toContain("profiles_select_own");
  expect(migration).toContain("profiles_update_own");
  expect(migration).toContain("auth.uid()) = id");
});

test("profiles are provisioned from auth users instead of browser inserts", () => {
  expect(migration).toContain("after insert on auth.users");
  expect(migration).not.toMatch(/create policy[^;]+for insert/is);
});
