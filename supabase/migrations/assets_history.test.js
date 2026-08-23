import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("./20260823030000_assets_history.sql", import.meta.url),
  "utf8",
);

test("creates a private image-only storage bucket with a 50 MB limit", () => {
  expect(migration).toContain("'user-images'");
  expect(migration).toContain("public = false");
  expect(migration).toContain("52428800");
  expect(migration).toContain("array['image/*']::text[]");
});

test("asset and generation tables use own-row RLS", () => {
  expect(migration).toContain("alter table public.image_assets enable row level security");
  expect(migration).toContain("alter table public.generation_jobs enable row level security");
  expect(migration).toContain('"image_assets_select_own"');
  expect(migration).toContain('"generation_jobs_select_own"');
  expect(migration).toContain("auth.uid()) = user_id");
});

test("browser roles cannot mutate persistent asset metadata", () => {
  expect(migration).toContain(
    "revoke insert, update, delete, truncate on table public.image_assets from anon, authenticated",
  );
  expect(migration).toContain(
    "revoke insert, update, delete, truncate on table public.generation_jobs from anon, authenticated",
  );

  const policies = migration.match(/create policy[\s\S]*?;/gi) ?? [];
  expect(
    policies.some((statement) =>
      /on public\.(?:image_assets|generation_jobs)[\s\S]*?for (?:insert|update|delete)/i.test(
        statement,
      ),
    ),
  ).toBe(false);
});

test("does not grant ordinary authenticated storage object access", () => {
  expect(migration).not.toMatch(/create policy[\s\S]*?on storage\.objects/i);
});
