import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

test("locks Dark Reader out of the server-rendered dark app", () => {
  expect(layoutSource).toMatch(/other:\s*{[\s\S]*"darkreader-lock":\s*"true"/);
});
