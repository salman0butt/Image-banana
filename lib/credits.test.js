import { expect, test } from "bun:test";
import {
  isRetryableCreditRefundError,
  withCreditRefundRetry,
} from "./credits";

test("retries transient refund failures and returns the eventual result", async () => {
  let attempts = 0;
  const waits = [];

  const result = await withCreditRefundRetry(
    async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("temporary network failure");
      }
      return { balance: 25, applied: true };
    },
    async (milliseconds) => {
      waits.push(milliseconds);
    },
  );

  expect(result).toEqual({ balance: 25, applied: true });
  expect(attempts).toBe(3);
  expect(waits).toEqual([100, 200]);
});

test("does not retry permanent refund business-rule failures", async () => {
  let attempts = 0;

  const operation = withCreditRefundRetry(
    async () => {
      attempts += 1;
      throw new Error("Unable to refund generation credits: GENERATION_CHARGE_NOT_FOUND");
    },
    async () => {},
  );

  await expect(operation).rejects.toThrow("GENERATION_CHARGE_NOT_FOUND");
  expect(attempts).toBe(1);
});

test("classifies transport errors as retryable and validation errors as permanent", () => {
  expect(isRetryableCreditRefundError(new Error("fetch failed"))).toBe(true);
  expect(
    isRetryableCreditRefundError(
      new Error("Unable to refund generation credits: INVALID_REFUND_IDEMPOTENCY_KEY"),
    ),
  ).toBe(false);
});
