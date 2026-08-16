import { expect, test } from "bun:test";
import { normalizeImageInput } from "./image-data";

test("normalizes a browser image Data URL for Gemini", () => {
  expect(normalizeImageInput("data:image/png;base64,SGVsbG8=")).toEqual({
    data: "SGVsbG8=",
    mimeType: "image/png",
  });
});
