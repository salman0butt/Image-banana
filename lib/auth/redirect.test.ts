import { expect, test } from "bun:test";

import { getSafeNextPath } from "./redirect";

test("accepts local application paths", () => {
  expect(getSafeNextPath("/history?page=2")).toBe("/history?page=2");
});

test("rejects absolute and protocol-relative redirects", () => {
  expect(getSafeNextPath("https://evil.example")).toBe("/");
  expect(getSafeNextPath("//evil.example")).toBe("/");
  expect(getSafeNextPath("/\\evil.example")).toBe("/");
});

test("uses an explicit fallback for missing values", () => {
  expect(getSafeNextPath(null, "/account")).toBe("/account");
});
