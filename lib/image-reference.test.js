import { expect, test } from "bun:test";
import {
  createImageReference,
  parseImageReference,
} from "./image-reference";

const apiKey = "test-api-key";

test("creates and verifies a signed image reference", () => {
  const reference = createImageReference(apiKey, "file_123", 1024, 768, 60);

  expect(parseImageReference(apiKey, reference)).toMatchObject({
    v: 1,
    fileId: "file_123",
    width: 1024,
    height: 768,
  });
});

test("rejects tampered image references", () => {
  const reference = createImageReference(apiKey, "file_123", 1024, 768, 60);
  const [body, signature] = reference.split(".");
  const tamperedBody = `${body.slice(0, -1)}${body.endsWith("A") ? "B" : "A"}`;

  expect(() =>
    parseImageReference(apiKey, `${tamperedBody}.${signature}`),
  ).toThrow("The image reference is invalid.");
});

test("rejects expired image references", () => {
  const reference = createImageReference(apiKey, "file_123", 1024, 768, -1);

  expect(() => parseImageReference(apiKey, reference)).toThrow(
    "The image reference has expired",
  );
});
