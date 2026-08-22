import sharp from "sharp";

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;

type ImageBuffer = {
  buffer: Buffer;
  mimeType: string;
};

function decodeDataUrl(dataUrl: string, label: string): ImageBuffer {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl);

  if (!match) {
    throw new Error(`The ${label} must be a base64 image data URL.`);
  }

  const [, mimeType, encoded] = match;
  const buffer = Buffer.from(encoded, "base64");

  if (!buffer.length) {
    throw new Error(`The ${label} is empty.`);
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`The ${label} must be smaller than 50 MB.`);
  }

  return { buffer, mimeType };
}

async function readMetadata(data: ImageBuffer, label: string) {
  const metadata = await sharp(data.buffer).metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error(`Could not read the ${label} dimensions.`);
  }

  return metadata;
}

export async function validateMaskPair(
  imageDataUrl: string,
  maskDataUrl: string,
): Promise<void> {
  const image = decodeDataUrl(imageDataUrl, "image");
  const mask = decodeDataUrl(maskDataUrl, "mask");
  const [imageMetadata, maskMetadata] = await Promise.all([
    readMetadata(image, "image"),
    readMetadata(mask, "mask"),
  ]);

  if (
    imageMetadata.format !== maskMetadata.format ||
    image.mimeType.toLowerCase() !== mask.mimeType.toLowerCase()
  ) {
    throw new Error("The image and mask must use the same format.");
  }

  if (
    imageMetadata.width !== maskMetadata.width ||
    imageMetadata.height !== maskMetadata.height
  ) {
    throw new Error("The image and mask must have the same dimensions.");
  }

  if (maskMetadata.hasAlpha !== true) {
    throw new Error("The mask must contain an alpha channel.");
  }
}
