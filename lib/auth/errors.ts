const EMAIL_RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "email_rate_limit_exceeded",
]);

const REQUEST_RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "request_rate_limit_exceeded",
]);

export const AUTH_EMAIL_RATE_LIMIT_MESSAGE =
  "Too many authentication emails were sent recently. Please wait a few minutes and try again.";

export const AUTH_REQUEST_RATE_LIMIT_MESSAGE =
  "Too many authentication attempts were made recently. Please wait a few minutes and try again.";

function authErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return typeof error.code === "string" ? error.code : null;
}

export function getSafeAuthErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const code = authErrorCode(error);

  if (code && EMAIL_RATE_LIMIT_CODES.has(code)) {
    return AUTH_EMAIL_RATE_LIMIT_MESSAGE;
  }

  if (code && REQUEST_RATE_LIMIT_CODES.has(code)) {
    return AUTH_REQUEST_RATE_LIMIT_MESSAGE;
  }

  // Do not forward provider messages to the browser. They can expose implementation
  // details or turn authentication failures into an account-enumeration signal.
  return fallback;
}
