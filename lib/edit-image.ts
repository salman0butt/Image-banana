import type { FileUIPart } from "ai";

type EditImageOptions = {
  imageFileId: string;
  prompt: string;
  webSearch?: boolean;
  userFiles?: FileUIPart[];
  aspectRatio?: string;
  mask?: Blob | null;
};

type EditImageErrorResponse = {
  details?: unknown;
  error?: unknown;
};

type EditImageResult = {
  imageUrl: string;
  fileId: string;
};

async function readError(response: Response): Promise<EditImageErrorResponse> {
  try {
    return (await response.json()) as EditImageErrorResponse;
  } catch {
    return {};
  }
}

export async function editImage({
  imageFileId,
  prompt,
  webSearch = false,
  userFiles = [],
  aspectRatio = "",
  mask = null,
}: EditImageOptions): Promise<EditImageResult> {
  const formData = new FormData();
  formData.append("imageFileId", imageFileId);
  formData.append("prompt", prompt);
  formData.append("webSearch", String(webSearch));
  formData.append("userFiles", JSON.stringify(userFiles));
  formData.append("aspectRatio", aspectRatio);

  if (mask) {
    formData.append("mask", mask, "mask.png");
  }

  const response = await fetch("/api/edit-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const data = await readError(response);
    const message =
      typeof data.details === "string"
        ? data.details
        : typeof data.error === "string"
          ? data.error
          : "OpenAI image editing failed.";
    throw new Error(message);
  }

  const fileId = response.headers.get("x-image-file-id");

  if (!fileId) {
    throw new Error("The API returned no image file ID.");
  }

  const imageBlob = await response.blob();

  if (!imageBlob.size) {
    throw new Error("The API returned no image.");
  }

  return {
    imageUrl: URL.createObjectURL(imageBlob),
    fileId,
  };
}
