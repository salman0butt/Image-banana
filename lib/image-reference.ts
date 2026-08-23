import { createHmac, timingSafeEqual } from "node:crypto";

const IMAGE_REFERENCE_VERSION = 1 as const;
export const IMAGE_REFERENCE_TTL_SECONDS = 24 * 60 * 60;

type ImageReferencePayload = {
  v: typeof IMAGE_REFERENCE_VERSION;
  fileId: string;
  width: number;
  height: number;
  expiresAt: number;
};

function deriveSigningKey(apiKey: string): Buffer {
  return createHmac("sha256", apiKey)
    .update("image-banana:image-reference:v1")
    .digest();
}

function signBody(apiKey: string, body: string): Buffer {
  return createHmac("sha256", deriveSigningKey(apiKey)).update(body).digest();
}

function isValidPayload(value: unknown): value is ImageReferencePayload {
  if (!value || typeof value !== "object") return false;

  const payload = value as Record<string, unknown>;

  return (
    payload.v === IMAGE_REFERENCE_VERSION &&
    typeof payload.fileId === "string" &&
    payload.fileId.length > 0 &&
    Number.isInteger(payload.width) &&
    Number(payload.width) > 0 &&
    Number.isInteger(payload.height) &&
    Number(payload.height) > 0 &&
    Number.isInteger(payload.expiresAt) &&
    Number(payload.expiresAt) > 0
  );
}

export function createImageReference(
  apiKey: string,
  fileId: string,
  width: number,
  height: number,
  ttlSeconds = IMAGE_REFERENCE_TTL_SECONDS,
): string {
  const payload: ImageReferencePayload = {
    v: IMAGE_REFERENCE_VERSION,
    fileId,
    width,
    height,
    expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signBody(apiKey, body).toString("base64url");

  return `${body}.${signature}`;
}

export function parseImageReference(
  apiKey: string,
  reference: string,
): ImageReferencePayload {
  const [body, encodedSignature, extra] = reference.split(".");

  if (!body || !encodedSignature || extra !== undefined) {
    throw new Error("The image reference is invalid.");
  }

  let suppliedSignature: Buffer;

  try {
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    throw new Error("The image reference is invalid.");
  }

  const expectedSignature = signBody(apiKey, body);

  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new Error("The image reference is invalid.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("The image reference is invalid.");
  }

  if (!isValidPayload(parsed)) {
    throw new Error("The image reference is invalid.");
  }

  if (parsed.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error("The image reference has expired. Upload the image again.");
  }

  return parsed;
}
