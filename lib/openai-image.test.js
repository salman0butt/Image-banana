import { expect, test } from "bun:test";
import { getGeneratedImage } from "./openai-image";

test("does not expose separate request builders", async () => {
  const openAIImage = await import("./openai-image");

  expect("buildImageInput" in openAIImage).toBe(false);
  expect("buildImageGenerationTool" in openAIImage).toBe(false);
});

test("extracts an image generation result as a renderable Data URL", () => {
  expect(
    getGeneratedImage({
      output: [
        { type: "message", content: [] },
        { type: "image_generation_call", result: "SGVsbG8=" },
      ],
    }),
  ).toBe("data:image/png;base64,SGVsbG8=");
});

test("returns null when the response has no generated image", () => {
  expect(getGeneratedImage({ output: [{ type: "message" }] })).toBeNull();
});

test("maps OpenAI quota errors to a safe HTTP response", async () => {
  const openAIImage = await import("./openai-image");

  expect(typeof openAIImage.mapOpenAIError).toBe("function");
  expect(
    openAIImage.mapOpenAIError(
      Object.assign(new Error("Your quota is exhausted."), { status: 429 }),
      false,
    ),
  ).toEqual({
    details: "Your quota is exhausted.",
    message: "OpenAI quota or rate limit exceeded.",
    status: 429,
  });
});

test("identifies authentication errors from OpenAI", async () => {
  const openAIImage = await import("./openai-image");

  expect(typeof openAIImage.mapOpenAIError).toBe("function");
  expect(
    openAIImage.mapOpenAIError(
      Object.assign(new Error("Unauthorized"), { status: 401 }),
      false,
    ),
  ).toEqual({
    details: "Unauthorized",
    message: "OpenAI API key is invalid or unauthorized.",
    status: 401,
  });
});

test("distinguishes failures that include web search", async () => {
  const openAIImage = await import("./openai-image");

  expect(typeof openAIImage.mapOpenAIError).toBe("function");
  expect(openAIImage.mapOpenAIError(new Error("Network failed"), true)).toEqual({
    details: "Network failed",
    message: "OpenAI web search or image editing failed.",
    status: 500,
  });
});
