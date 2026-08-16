import { expect, test } from "bun:test";
import { POST } from "./route";

test("rejects corrupt base64 before calling OpenAI", async () => {
  const request = new Request("http://localhost/api/edit-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: "not-valid-base64",
      prompt: "Make it blue",
      webSearch: false,
    }),
  });

  const response = await POST(request);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "The image must contain valid base64 data.",
  });
});

test("reads image requests nested under a payload property", async () => {
  const request = new Request("http://localhost/api/edit-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: {
        imageBase64: "not-valid-base64",
        prompt: "Make it blue",
        webSearch: false,
      },
    }),
  });

  const response = await POST(request);

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "The image must contain valid base64 data.",
  });
});
