import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL("./20260823020000_credits.sql", import.meta.url),
  "utf8",
);

test("credit tables enable RLS and expose only own rows", () => {
  expect(migration).toContain(
    "alter table public.credit_wallets enable row level security",
  );
  expect(migration).toContain(
    "alter table public.credit_ledger enable row level security",
  );
  expect(migration).toContain('"credit_wallets_select_own"');
  expect(migration).toContain('"credit_ledger_select_own"');
  expect(migration).toContain("auth.uid()) = user_id");
});

test("credit mutation RPCs are restricted to the service role", () => {
  expect(migration).toContain(
    "revoke all on function public.charge_generation_credits(uuid, integer, text, jsonb) from public, anon, authenticated",
  );
  expect(migration).toContain(
    "grant execute on function public.charge_generation_credits(uuid, integer, text, jsonb) to service_role",
  );
  expect(migration).toContain(
    "grant execute on function public.refund_generation_credits(uuid, text, text, jsonb) to service_role",
  );
  expect(migration).not.toMatch(/create policy[^;]+for (insert|update|delete)/is);
});

test("generation charging is atomic, idempotent, and prevents negative balances", () => {
  expect(migration).toContain("for update");
  expect(migration).toContain("INSUFFICIENT_CREDITS");
  expect(migration).toContain("unique (user_id, idempotency_key)");
  expect(migration).toContain("check (balance >= 0)");
  expect(migration).toContain("reason = 'generation_charge'");
});
