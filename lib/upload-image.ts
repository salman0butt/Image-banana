import { IMAGE_ASSET_BUCKET } from "@/lib/assets";
import { createClient } from "@/lib/supabase/client";

type ApiError = {
  error?:
    | string
    | {
        message?: unknown;
      };
};

type UploadIntentResponse = {
  assetId?: unknown;
  path?: unknown;
  token?: unknown;
} & ApiError;

type FinalizeResponse = {
  assetId?: unknown;
  imageRef?: unknown;
  imageUrl?: unknown;
} & ApiError;

export type UploadedImage = {
  assetId: string;
  imageRef: string;
  imageUrl: string;
};

function readApiError(data: ApiError, fallback: string): string {
  if (typeof data.error === "string") return data.error;
  if (
    data.error &&
    typeof data.error === "object" &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }
  return fallback;
}

async function createUploadIntent(
  file: File,
  signal?: AbortSignal,
): Promise<{ assetId: string; path: string; token: string }> {
  const response = await fetch("/api/assets/upload-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "image",
      contentType: file.type || "image/*",
      size: file.size,
    }),
    signal,
  });
  const data = (await response.json()) as UploadIntentResponse;

  if (!response.ok) {
    throw new Error(readApiError(data, "Unable to prepare the image upload."));
  }

  if (
    typeof data.assetId !== "string" ||
    typeof data.path !== "string" ||
    typeof data.token !== "string" ||
    !data.assetId ||
    !data.path ||
    !data.token
  ) {
    throw new Error("The upload API returned an invalid signed upload intent.");
  }

  return {
    assetId: data.assetId,
    path: data.path,
    token: data.token,
  };
}

async function finalizeUpload(
  assetId: string,
  signal?: AbortSignal,
): Promise<UploadedImage> {
  const response = await fetch("/api/assets/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assetId }),
    signal,
  });
  const data = (await response.json()) as FinalizeResponse;

  if (!response.ok) {
    throw new Error(readApiError(data, "Unable to finalize the image upload."));
  }

  if (
    typeof data.assetId !== "string" ||
    typeof data.imageRef !== "string" ||
    typeof data.imageUrl !== "string" ||
    !data.assetId ||
    !data.imageRef ||
    !data.imageUrl
  ) {
    throw new Error("The finalize API returned an invalid image asset.");
  }

  return {
    assetId: data.assetId,
    imageRef: data.imageRef,
    imageUrl: data.imageUrl,
  };
}

export async function uploadImage(
  file: File,
  signal?: AbortSignal,
): Promise<UploadedImage> {
  const intent = await createUploadIntent(file, signal);

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(IMAGE_ASSET_BUCKET)
    .uploadToSignedUrl(intent.path, intent.token, file, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "0",
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return finalizeUpload(intent.assetId, signal);
}
