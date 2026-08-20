const ASPECT_RATIO_SIZES = {
  "1:1": "1024x1024",
  "16:9": "1536x864",
  "4:3": "1536x1152",
  "3:2": "1536x1024",
  "21:9": "2016x864",
  "9:16": "864x1536",
  "4:5": "1024x1280",
  "2:3": "1024x1536",
} as const;

const STANDARD_IMAGE_SIZES = new Set([
  "1024x1024",
  "1536x1024",
  "1024x1536",
]);

export function normalizeAspectRatio(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error("Aspect ratio must be a string.");
  }

  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (!Object.prototype.hasOwnProperty.call(ASPECT_RATIO_SIZES, normalized)) {
    throw new Error(`Unsupported aspect ratio: ${normalized}.`);
  }

  return normalized;
}

export function resolveImageSize(
  aspectRatio: string | undefined,
  imageModel: string,
  fallbackSize: string,
): string {
  const normalizedAspectRatio = normalizeAspectRatio(aspectRatio);

  if (!normalizedAspectRatio) {
    return fallbackSize;
  }

  const size =
    ASPECT_RATIO_SIZES[
      normalizedAspectRatio as keyof typeof ASPECT_RATIO_SIZES
    ];

  if (
    imageModel !== "gpt-image-2" &&
    !imageModel.startsWith("gpt-image-2-") &&
    !STANDARD_IMAGE_SIZES.has(size)
  ) {
    throw new Error("Aspect-ratio expansion requires GPT Image 2.");
  }

  return size;
}
