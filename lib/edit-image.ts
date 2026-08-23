import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models";
import type { EditorReferenceFile } from "@/types/editor";

const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_BYTES = 20 * 1024 * 1024;

type EditImageOptions = {
  imageRef: string;
  prompt: string;
  modelId?: string;
  webSearch?: boolean;
  userFiles?: EditorReferenceFile[];
  aspectRatio?: string;
  mask?: Blob | null;
  signal?: AbortSignal;
};

type EditImageErrorResponse = {
  details?: unknown;
  error?: unknown;
};

type EditImageResult = {
  imageUrl: string;
  imageRef: string;
  creditsRemaining: number | null;
};

async function readError(response: Response): Promise<EditImageErrorResponse> {
  try {
    return (await response.json()) as EditImageErrorResponse;
  } catch {
    return {};
  }
}

function safeFilename(filename: string | undefined, index: number): string {
  const sanitized = filename
    ?.replace(/[\\/\0-\x1f\x7f]+/g, "_")
    .trim()
    .slice(0, 120);

  return sanitized || `reference-${index + 1}`;
}

function readCreditsRemaining(response: Response): number | null {
  const raw = response.headers.get("x-credits-remaining");
  if (!raw) return null;

  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

async function appendReferenceFiles(
  formData: FormData,
  files: EditorReferenceFile[],
  signal?: AbortSignal,
): Promise<void> {
  if (files.length > MAX_REFERENCE_FILES) {
    throw new Error(`Attach at most ${MAX_REFERENCE_FILES} reference files.`);
  }

  await Promise.all(
    files.map(async (file, index) => {
      if (!file.url.startsWith("blob:") && !file.url.startsWith("data:")) {
        throw new Error("Reference attachments must be local uploads.");
      }

      const response = await fetch(file.url, { signal });
      if (!response.ok) {
        throw new Error(`Could not read reference file ${index + 1}.`);
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error(`Reference file ${index + 1} is empty.`);
      }

      if (blob.size > MAX_REFERENCE_FILE_BYTES) {
        throw new Error("Each reference file must be smaller than 20 MB.");
      }

      formData.append("referenceFile", blob, safeFilename(file.filename, index));
    }),
  );
}

export async function editImage({
  imageRef,
  prompt,
  modelId = DEFAULT_IMAGE_MODEL_ID,
  webSearch = false,
  userFiles = [],
  aspectRatio = "",
  mask = null,
  signal,
}: EditImageOptions): Promise<EditImageResult> {
  const formData = new FormData();
  formData.append("imageRef", imageRef);
  formData.append("prompt", prompt);
  formData.append("modelId", modelId);
  formData.append("webSearch", String(webSearch));
  formData.append("aspectRatio", aspectRatio);

  if (mask) {
    formData.append("mask", mask, "mask.png");
  }

  await appendReferenceFiles(formData, userFiles, signal);

  const response = await fetch("/api/edit-image", {
    method: "POST",
    body: formData,
    signal,
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

  const imageRefHeader = response.headers.get("x-image-reference");

  if (!imageRefHeader) {
    throw new Error("The API returned no image reference.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("The API returned an invalid image response.");
  }

  const imageBlob = await response.blob();

  if (!imageBlob.size) {
    throw new Error("The API returned no image.");
  }

  return {
    imageUrl: URL.createObjectURL(imageBlob),
    imageRef: imageRefHeader,
    creditsRemaining: readCreditsRemaining(response),
  };
}
