import { expect, test } from "bun:test";
import {
  AUTH_EMAIL_RATE_LIMIT_MESSAGE,
  AUTH_REQUEST_RATE_LIMIT_MESSAGE,
  getSafeAuthErrorMessage,
} from "./errors";

test("maps Supabase email send rate limits to a specific safe message", () => {
  expect(
    getSafeAuthErrorMessage(
      { code: "over_email_send_rate_limit", message: "provider detail" },
      "fallback",
    ),
  ).toBe(AUTH_EMAIL_RATE_LIMIT_MESSAGE);

  expect(
    getSafeAuthErrorMessage(
      { code: "email_rate_limit_exceeded" },
      "fallback",
    ),
  ).toBe(AUTH_EMAIL_RATE_LIMIT_MESSAGE);
});

test("maps general auth request rate limits without leaking provider details", () => {
  expect(
    getSafeAuthErrorMessage(
      { code: "over_request_rate_limit", message: "sensitive provider text" },
      "fallback",
    ),
  ).toBe(AUTH_REQUEST_RATE_LIMIT_MESSAGE);
});

test("uses the caller fallback for unknown auth failures", () => {
  expect(
    getSafeAuthErrorMessage(
      { code: "user_already_exists", message: "provider account detail" },
      "Unable to create the account.",
    ),
  ).toBe("Unable to create the account.");

  expect(getSafeAuthErrorMessage(new Error("internal detail"), "Safe fallback")).toBe(
    "Safe fallback",
  );
});
