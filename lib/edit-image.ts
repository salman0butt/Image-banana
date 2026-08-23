import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/image-models";
import type { EditorReferenceFile } from "@/types/editor";

const MAX_REFERENCE_FILES = 5;
const MAX_REFERENCE_FILE_BYTES = 20 * 1024 * 1024;

type EditImageOptions = {
  sourceAssetId: string;
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

type EditImageSuccessResponse = {
  assetId?: unknown;
  imageUrl?: unknown;
  imageRef?: unknown;
  creditsRemaining?: unknown;
};

export type EditImageResult = {
  assetId: string;
  imageUrl: string;
  imageRef: string;
  creditsRemaining: number | null;
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function safeFilename(filename: string | undefined, index: number): string {
  const sanitized = filename
    ?.replace(/[\\/\0-\x1f\x7f]+/g, "_")
    .trim()
    .slice(0, 120);
  return sanitized || `reference-${index + 1}`;
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
  sourceAssetId,
  prompt,
  modelId = DEFAULT_IMAGE_MODEL_ID,
  webSearch = false,
  userFiles = [],
  aspectRatio = "",
  mask = null,
  signal,
}: EditImageOptions): Promise<EditImageResult> {
  const formData = new FormData();
  formData.append("sourceAssetId", sourceAssetId);
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
  const data = await readJson(response);

  if (!response.ok) {
    const errorData = (data ?? {}) as EditImageErrorResponse;
    const message =
      typeof errorData.details === "string"
        ? errorData.details
        : typeof errorData.error === "string"
          ? errorData.error
          : "OpenAI image editing failed.";
    throw new Error(message);
  }

  const result = (data ?? {}) as EditImageSuccessResponse;
  if (
    typeof result.assetId !== "string" ||
    typeof result.imageUrl !== "string" ||
    typeof result.imageRef !== "string" ||
    !result.assetId ||
    !result.imageUrl ||
    !result.imageRef
  ) {
    throw new Error("The API returned invalid generated image metadata.");
  }

  const creditsRemaining = Number(result.creditsRemaining);

  return {
    assetId: result.assetId,
    imageUrl: result.imageUrl,
    imageRef: result.imageRef,
    creditsRemaining:
      Number.isInteger(creditsRemaining) && creditsRemaining >= 0
        ? creditsRemaining
        : null,
  };
}
