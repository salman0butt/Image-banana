import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SIGNUP_CREDITS = 25;
const MAX_SIGNUP_CREDITS = 100_000;

export class InsufficientCreditsError extends Error {
  readonly code = "INSUFFICIENT_CREDITS";

  constructor(
    public readonly balance: number,
    public readonly required: number,
  ) {
    super(`This generation needs ${required} credits, but only ${balance} remain.`);
    this.name = "InsufficientCreditsError";
  }
}

type CreditRpcRow = {
  balance?: unknown;
  applied?: unknown;
  created?: unknown;
};

function readSignupCredits(): number {
  const raw = process.env.SIGNUP_CREDITS?.trim();
  if (!raw) return DEFAULT_SIGNUP_CREDITS;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > MAX_SIGNUP_CREDITS) {
    throw new Error(
      `SIGNUP_CREDITS must be an integer from 0 to ${MAX_SIGNUP_CREDITS.toLocaleString()}.`,
    );
  }

  return value;
}

function readRpcRow(data: unknown, operation: string): CreditRpcRow {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    throw new Error(`Supabase returned no credit result for ${operation}.`);
  }

  return row as CreditRpcRow;
}

function readBalance(row: CreditRpcRow, operation: string): number {
  const balance = row.balance;
  if (!Number.isInteger(balance) || Number(balance) < 0) {
    throw new Error(`Supabase returned an invalid credit balance for ${operation}.`);
  }

  return Number(balance);
}

export async function ensureCreditWallet(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("ensure_credit_wallet", {
    p_user_id: userId,
    p_signup_credits: readSignupCredits(),
  });

  if (error) {
    throw new Error(`Unable to provision the credit wallet: ${error.message}`);
  }

  return readBalance(readRpcRow(data, "wallet provisioning"), "wallet provisioning");
}

export async function getCreditBalance(userId: string): Promise<number> {
  return ensureCreditWallet(userId);
}

export async function chargeGenerationCredits({
  userId,
  amount,
  idempotencyKey,
  metadata,
}: {
  userId: string;
  amount: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
}): Promise<{ balance: number; applied: boolean }> {
  await ensureCreditWallet(userId);

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("charge_generation_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) {
      throw new InsufficientCreditsError(await getCreditBalance(userId), amount);
    }

    throw new Error(`Unable to charge generation credits: ${error.message}`);
  }

  const row = readRpcRow(data, "generation charge");
  return {
    balance: readBalance(row, "generation charge"),
    applied: row.applied === true,
  };
}

export async function refundGenerationCredits({
  userId,
  chargeIdempotencyKey,
  refundIdempotencyKey,
  metadata,
}: {
  userId: string;
  chargeIdempotencyKey: string;
  refundIdempotencyKey: string;
  metadata: Record<string, unknown>;
}): Promise<{ balance: number; applied: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("refund_generation_credits", {
    p_user_id: userId,
    p_charge_idempotency_key: chargeIdempotencyKey,
    p_refund_idempotency_key: refundIdempotencyKey,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(`Unable to refund generation credits: ${error.message}`);
  }

  const row = readRpcRow(data, "generation refund");
  return {
    balance: readBalance(row, "generation refund"),
    applied: row.applied === true,
  };
}
