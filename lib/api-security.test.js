import { expect, test } from "bun:test";
import {
  ApiRequestError,
  assertRequestContentLength,
} from "./api-security";

test("accepts requests below the declared content-length limit", () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Length": "1024" },
  });

  expect(() => assertRequestContentLength(request, 2048)).not.toThrow();
});

test("rejects requests above the declared content-length limit", () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Length": "4096" },
  });

  try {
    assertRequestContentLength(request, 2048);
    throw new Error("Expected request to be rejected.");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(413);
  }
});

test("rejects malformed content-length headers", () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Length": "invalid" },
  });

  expect(() => assertRequestContentLength(request, 2048)).toThrow(
    "Invalid Content-Length header.",
  );
});
