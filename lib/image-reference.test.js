import { expect, test } from "bun:test";
import {
  createImageReference,
  parseImageReference,
} from "./image-reference";

const apiKey = "test-api-key";
const userId = "user-123";

test("creates and verifies a signed user-bound image reference", () => {
  const reference = createImageReference(
    apiKey,
    userId,
    "file_123",
    1024,
    768,
    60,
  );

  expect(parseImageReference(apiKey, reference, userId)).toMatchObject({
    v: 2,
    userId,
    fileId: "file_123",
    width: 1024,
    height: 768,
  });
});

test("rejects an image reference owned by another user", () => {
  const reference = createImageReference(
    apiKey,
    "other-user",
    "file_123",
    1024,
    768,
    60,
  );

  expect(() => parseImageReference(apiKey, reference, userId)).toThrow(
    "The image reference is invalid.",
  );
});

test("rejects tampered image references", () => {
  const reference = createImageReference(
    apiKey,
    userId,
    "file_123",
    1024,
    768,
    60,
  );
  const [body, signature] = reference.split(".");
  const tamperedBody = `${body.slice(0, -1)}${body.endsWith("A") ? "B" : "A"}`;

  expect(() =>
    parseImageReference(apiKey, `${tamperedBody}.${signature}`, userId),
  ).toThrow("The image reference is invalid.");
});

test("rejects expired image references", () => {
  const reference = createImageReference(
    apiKey,
    userId,
    "file_123",
    1024,
    768,
    -1,
  );

  expect(() => parseImageReference(apiKey, reference, userId)).toThrow(
    "The image reference has expired",
  );
});
