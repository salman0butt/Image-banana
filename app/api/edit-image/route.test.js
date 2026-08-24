import { expect, test } from "bun:test";
import {
  assertEditRequestEnvelope,
  readEditImageRequest,
} from "./route";

test("rejects an edit request without a declared content length", () => {
  const request = new Request("http://localhost/api/edit-image", {
    method: "POST",
  });

  expect(() => assertEditRequestEnvelope(request)).toThrow(
    "Content-Length header is required.",
  );
});

test("rejects a malformed mask before calling OpenAI", async () => {
  const formData = new FormData();
  formData.set("imageRef", "signed-source-reference");
  formData.set("prompt", "Change the selected area");
  formData.set(
    "mask",
    new File([new Uint8Array([1, 2, 3, 4])], "mask.png", {
      type: "image/png",
    }),
  );

  const request = new Request("http://localhost/api/edit-image", {
    method: "POST",
    body: formData,
  });

  await expect(readEditImageRequest(request)).rejects.toThrow(
    "The mask must be a valid PNG image with an alpha channel.",
  );
});
