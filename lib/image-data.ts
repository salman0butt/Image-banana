export type NormalizedImageInput = {
  data: string;
  mimeType: string;
};

export function normalizeImageInput(imageInput: unknown): NormalizedImageInput {
  if (typeof imageInput !== "string" || imageInput.trim().length === 0) {
    throw new Error("An image is required.");
  }

  const input = imageInput.trim();

  if (input.startsWith("data:")) {
    const match = /^data:([^;,]+);base64,([\s\S]*)$/.exec(input);

    if (!match || match[2].length === 0) {
      throw new Error("The image must be a valid base64 Data URL.");
    }

    return {
      data: match[2].replace(/\s/g, ""),
      mimeType: match[1],
    };
  }

  return {
    data: input.replace(/\s/g, ""),
    mimeType: "image/jpeg",
  };
}
