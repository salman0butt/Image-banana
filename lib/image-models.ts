export const DEFAULT_IMAGE_MODEL_ID = "gpt-image-2-fast" as const;

export const IMAGE_MODEL_PRESETS = [
  {
    id: "gpt-image-2-fast",
    label: "GPT Image 2 · Fast",
    description: "Fast, cost-conscious edits for everyday iteration.",
    providerModel: "gpt-image-2",
    quality: "low",
    creditCost: 2,
  },
  {
    id: "gpt-image-2-balanced",
    label: "GPT Image 2 · Balanced",
    description: "Higher detail with a balanced credit cost.",
    providerModel: "gpt-image-2",
    quality: "medium",
    creditCost: 4,
  },
  {
    id: "gpt-image-2-quality",
    label: "GPT Image 2 · Quality",
    description: "Maximum detail for final-quality image edits.",
    providerModel: "gpt-image-2",
    quality: "high",
    creditCost: 8,
  },
] as const;

export type ImageModelId = (typeof IMAGE_MODEL_PRESETS)[number]["id"];
export type ImageModelQuality = (typeof IMAGE_MODEL_PRESETS)[number]["quality"];
export type ImageModelPreset = (typeof IMAGE_MODEL_PRESETS)[number];

export type PublicImageModelPreset = Pick<
  ImageModelPreset,
  "id" | "label" | "description" | "creditCost"
>;

export function getImageModelPreset(value: unknown): ImageModelPreset | null {
  if (typeof value !== "string") return null;

  return (
    IMAGE_MODEL_PRESETS.find((preset) => preset.id === value) ?? null
  );
}

export function getDefaultImageModelPreset(): ImageModelPreset {
  return (
    getImageModelPreset(DEFAULT_IMAGE_MODEL_ID) ?? IMAGE_MODEL_PRESETS[0]
  );
}

export function getPublicImageModelPresets(): PublicImageModelPreset[] {
  return IMAGE_MODEL_PRESETS.map(({ id, label, description, creditCost }) => ({
    id,
    label,
    description,
    creditCost,
  }));
}
