import type { FileUIPart } from "ai";

type EditImageOptions = {
  imageBase64: string | null;
  prompt: string;
  webSearch?: boolean;
  userFiles?: FileUIPart[];
  aspectRatio?: string;
  maskBase64?: string | null;
};

type EditImageResponse = {
  imageBase64?: unknown;
  details?: unknown;
  error?: unknown;
};

export async function editImage({
  imageBase64,
  prompt,
  webSearch = false,
  userFiles = [],
  aspectRatio = '',
  maskBase64 = null
}: EditImageOptions): Promise<string> {
  const response = await fetch("/api/edit-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, prompt, webSearch, userFiles, aspectRatio, maskBase64 }),
  });

  const data = (await response.json()) as EditImageResponse;

  if (!response.ok) {
    const message =
      typeof data.details === "string"
        ? data.details
        : typeof data.error === "string"
          ? data.error
          : "OpenAI image editing failed.";
    throw new Error(message);
  }

  if (typeof data.imageBase64 !== "string" || !data.imageBase64) {
    throw new Error("The API returned no image.");
  }

  return data.imageBase64;
}
