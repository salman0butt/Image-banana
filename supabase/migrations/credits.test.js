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

  const policyStatements = migration.match(/create policy[\s\S]*?;/gi) ?? [];
  expect(
    policyStatements.some((statement) =>
      /on public\.credit_(?:wallets|ledger)[\s\S]*?for (?:insert|update|delete)/i.test(
        statement,
      ),
    ),
  ).toBe(false);
});

test("authenticated users receive explicit read privileges while writes stay revoked", () => {
  expect(migration).toContain(
    "revoke all on table public.credit_wallets from anon, authenticated",
  );
  expect(migration).toContain(
    "revoke all on table public.credit_ledger from anon, authenticated",
  );
  expect(migration).toContain(
    "grant select on table public.credit_wallets to authenticated",
  );
  expect(migration).toContain(
    "grant select on table public.credit_ledger to authenticated",
  );
  expect(migration).not.toContain(
    "grant insert on table public.credit_wallets to authenticated",
  );
  expect(migration).not.toContain(
    "grant update on table public.credit_wallets to authenticated",
  );
  expect(migration).not.toContain(
    "grant delete on table public.credit_wallets to authenticated",
  );
  expect(migration).not.toContain(
    "grant insert on table public.credit_ledger to authenticated",
  );
  expect(migration).not.toContain(
    "grant update on table public.credit_ledger to authenticated",
  );
  expect(migration).not.toContain(
    "grant delete on table public.credit_ledger to authenticated",
  );
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
});

test("generation charging is atomic, idempotent, and prevents negative balances", () => {
  expect(migration).toContain("for update");
  expect(migration).toContain("INSUFFICIENT_CREDITS");
  expect(migration).toContain("unique (user_id, idempotency_key)");
  expect(migration).toContain("check (balance >= 0)");
  expect(migration).toContain("IDEMPOTENCY_KEY_CONFLICT");
  expect(migration).toContain("reason = 'generation_charge'");
});

test("a generation charge can be refunded at most once", () => {
  expect(migration).toContain("related_idempotency_key text");
  expect(migration).toContain(
    "create unique index if not exists credit_ledger_generation_refund_once_idx",
  );
  expect(migration).toContain(
    "and l.related_idempotency_key = p_charge_idempotency_key",
  );
  expect(migration).toContain(
    "p_refund_idempotency_key,\n    p_charge_idempotency_key",
  );
  expect(migration).toContain("REFUND_IDEMPOTENCY_KEY_CONFLICT");
});
