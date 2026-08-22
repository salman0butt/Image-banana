type UploadImageResponse = {
  imageRef?: unknown;
  error?: unknown;
};

export async function uploadImage(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
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

  return data.imageRef;
}
