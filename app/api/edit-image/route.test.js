import { afterEach, expect, test } from "bun:test";
import { POST } from "./route";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});

test("returns 400 for a malformed mask before calling OpenAI", async () => {
  process.env.OPENAI_API_KEY = "test-openai-api-key";

  const formData = new FormData();
  formData.set("sourceAssetId", "11111111-1111-4111-8111-111111111111");
  formData.set("prompt", "Change the selected area");
  formData.set(
    "mask",
    new File([new Uint8Array([1, 2, 3, 4])], "mask.png", {
      type: "image/png",
    }),
  );

  const response = await POST(
    new Request("http://localhost/api/edit-image", {
      method: "POST",
      headers: { "x-forwarded-for": "qa-malformed-mask" },
      body: formData,
    }),
  );

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "The mask must be a valid PNG image with an alpha channel.",
  });
});
