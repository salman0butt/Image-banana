type UploadImageResponse = {
  fileId?: unknown;
  error?: unknown;
};

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file, file.name || "image");

  const response = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as UploadImageResponse;

  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Image upload failed.",
    );
  }

  if (typeof data.fileId !== "string" || !data.fileId) {
    throw new Error("The upload API returned no file ID.");
  }

  return data.fileId;
}
