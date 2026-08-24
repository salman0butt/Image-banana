type UploadImageResponse = {
  imageRef?: unknown;
  assetId?: unknown;
  error?: unknown;
};

export type UploadedImage = {
  imageRef: string;
  assetId: string;
};

export async function uploadImage(
  file: File,
  signal?: AbortSignal,
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("image", file, file.name || "image");

  const response = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
    signal,
  });

  const data = (await response.json()) as UploadImageResponse;

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Image upload failed.",
    );
  }

  if (typeof data.imageRef !== "string" || !data.imageRef) {
    throw new Error("The upload API returned no image reference.");
  }

  if (typeof data.assetId !== "string" || !data.assetId) {
    throw new Error("The upload API returned no persistent image asset.");
  }

  return { imageRef: data.imageRef, assetId: data.assetId };
}
