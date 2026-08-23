import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("./20260824010000_generation_history.sql", import.meta.url),
  "utf8",
);

test("creates a private PNG-only storage bucket with a 50 MB limit", () => {
  expect(migration).toContain("'user-images'");
  expect(migration).toContain("public = false");
  expect(migration).toContain("52428800");
  expect(migration).toContain("array['image/png']::text[]");
});

test("creates durable image assets and generation jobs", () => {
  expect(migration).toContain("create table if not exists public.image_assets");
  expect(migration).toContain("create table if not exists public.generation_jobs");
  expect(migration).toContain("source_asset_id uuid not null");
  expect(migration).toContain("output_asset_id uuid");
  expect(migration).toContain("error_message text");
  expect(migration).toContain("status in ('running', 'succeeded', 'failed', 'cancelled')");
});

test("authenticated users get read-only own-row access", () => {
  expect(migration).toContain("alter table public.image_assets enable row level security");
  expect(migration).toContain("alter table public.generation_jobs enable row level security");
  expect(migration).toContain("revoke all on table public.image_assets from anon, authenticated");
  expect(migration).toContain("revoke all on table public.generation_jobs from anon, authenticated");
  expect(migration).toContain("grant select on table public.image_assets to authenticated");
  expect(migration).toContain("grant select on table public.generation_jobs to authenticated");
  expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)[^;]*to authenticated/i);
  expect(migration).toContain('"image_assets_select_own"');
  expect(migration).toContain('"generation_jobs_select_own"');
  expect(migration).toContain("auth.uid()) = user_id");
});

test("trusted service role can persist and update assets and jobs", () => {
  expect(migration).toContain(
    "grant select, insert, update, delete on table public.image_assets to service_role",
  );
  expect(migration).toContain(
    "grant select, insert, update, delete on table public.generation_jobs to service_role",
  );
});

test("does not grant browser storage-object policies", () => {
  expect(migration).not.toMatch(/create policy[\s\S]*?on storage\.objects/i);
});
