const RATE_LIMIT_STATE_KEY = Symbol.for("image-banana.rate-limit-state");
const MAX_RATE_LIMIT_BUCKETS = 5_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type GlobalWithRateLimits = typeof globalThis & {
  [RATE_LIMIT_STATE_KEY]?: Map<string, RateLimitBucket>;
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function getRateLimitStore(): Map<string, RateLimitBucket> {
  const globalState = globalThis as GlobalWithRateLimits;
  globalState[RATE_LIMIT_STATE_KEY] ??= new Map<string, RateLimitBucket>();
  return globalState[RATE_LIMIT_STATE_KEY];
}

function pruneRateLimitStore(store: Map<string, RateLimitBucket>, now: number) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }

  while (store.size > MAX_RATE_LIMIT_BUCKETS) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

function getClientAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function assertRequestContentLength(
  request: Request,
  maxBytes: number,
  requireHeader = false,
): void {
  const rawLength = request.headers.get("content-length");

  if (!rawLength) {
    if (requireHeader) {
      throw new ApiRequestError("Content-Length header is required.", 411);
    }
    return;
  }

  const length = Number(rawLength);
  if (!Number.isFinite(length) || length < 0) {
    throw new ApiRequestError("Invalid Content-Length header.", 400);
  }

  if (length > maxBytes) {
    throw new ApiRequestError("Request body is too large.", 413);
  }
}

/**
 * Best-effort per-instance abuse protection. This protects a warm Node process,
 * but production deployments with multiple instances should also enforce a
 * shared rate limit at the platform/gateway layer.
 */
export function assertRateLimit(
  request: Request,
  namespace: string,
  limit: number,
  windowMs = 60_000,
): void {
  const now = Date.now();
  const store = getRateLimitStore();

  if (store.size >= MAX_RATE_LIMIT_BUCKETS) {
    pruneRateLimitStore(store, now);
  }

  const key = `${namespace}:${getClientAddress(request)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new ApiRequestError("Too many requests. Please try again shortly.", 429);
  }

  current.count += 1;
}

export function getApiErrorResponse(
  error: unknown,
  fallbackMessage: string,
  fallbackStatus = 400,
): Response {
  if (error instanceof ApiRequestError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  return Response.json({ error: fallbackMessage }, { status: fallbackStatus });
}
