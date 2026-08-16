const BASE64_CHARACTERS = /^[A-Za-z0-9+/]+$/;

function normalizeBase64(value: string): string {
  const data = value.replace(/\s/g, "");
  const unpadded = data.replace(/=+$/, "");
  const suppliedPadding = data.length - unpadded.length;
  const remainder = unpadded.length % 4;
  const requiredPadding = remainder === 0 ? 0 : 4 - remainder;

  if (
    !unpadded ||
    !BASE64_CHARACTERS.test(unpadded) ||
    remainder === 1 ||
    suppliedPadding > 2 ||
    (suppliedPadding > 0 && suppliedPadding !== requiredPadding)
  ) {
    throw new Error("The image must contain valid base64 data.");
  }

  return `${unpadded}${"=".repeat(requiredPadding)}`;
}

export function toImageDataUrl(imageInput: unknown): string {
  if (typeof imageInput !== "string" || imageInput.trim() === "") {
    throw new Error("An image is required.");
  }

  const input = imageInput.trim();

  if (!input.startsWith("data:")) {
    return `data:image/jpeg;base64,${normalizeBase64(input)}`;
  }

  const comma = input.indexOf(",");
  const header = input.slice(0, comma);

  if (!/^data:image\/[a-z0-9][a-z0-9.+-]*;base64$/i.test(header)) {
    throw new Error("The image must be a valid base64 Data URL.");
  }

  return `${header},${normalizeBase64(input.slice(comma + 1))}`;
}
