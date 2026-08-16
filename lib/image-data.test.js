import { expect, test } from "bun:test";
import { toImageDataUrl } from "./image-data";

test("keeps a browser image Data URL intact", () => {
  expect(toImageDataUrl("data:image/png;base64,SGVsbG8=")).toBe(
    "data:image/png;base64,SGVsbG8=",
  );
});

test("keeps non-PNG and non-JPEG image Data URLs intact", () => {
  expect(toImageDataUrl("data:image/webp;base64,UklGRg==")).toBe(
    "data:image/webp;base64,UklGRg==",
  );
});

test("adds a JPEG Data URL to raw base64 image data", () => {
  expect(toImageDataUrl("SGVs bG8=")).toBe("data:image/jpeg;base64,SGVsbG8=");
});

test("rejects corrupt base64 before sending it to an image API", () => {
  expect(() => toImageDataUrl("not-valid-base64")).toThrow(
    "The image must contain valid base64 data.",
  );
});

test("accepts valid base64 without padding", () => {
  expect(toImageDataUrl("SGVsbG8")).toBe(
    "data:image/jpeg;base64,SGVsbG8=",
  );
});
