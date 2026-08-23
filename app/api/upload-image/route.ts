import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import {
  assertRateLimit,
  assertRequestContentLength,
  getApiErrorResponse,
} from "@/lib/api-security";
import {
  createImageReference,
  IMAGE_REFERENCE_TTL_SECONDS,
} from "@/lib/image-reference";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const UPLOADS_PER_MINUTE = 20;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    assertRequestContentLength(request, MAX_REQUEST_BYTES, true);
    assertRateLimit(request, "upload-image", UPLOADS_PER_MINUTE);
  } catch (error) {
    return getApiErrorResponse(error, "Invalid upload request.");
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Invalid multipart request body." },
      { status: 400 },
    );
  }

  const image = formData.get("image");

  if (!image || typeof image === "string") {
    return Response.json(
      { error: "An image file is required." },
      { status: 400 },
    );
  }

  if (!image.size) {
    return Response.json(
      { error: "The image file is empty." },
      { status: 400 },
    );
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "The image must be smaller than 50 MB." },
      { status: 413 },
    );
  }

  let pngBuffer: Buffer;
  let width: number;
  let height: number;

  try {
    const sourceBuffer = Buffer.from(await image.arrayBuffer());
    const normalized = await sharp(sourceBuffer, {
      animated: false,
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .rotate()
      .png()
      .toBuffer({ resolveWithObject: true });

    pngBuffer = normalized.data;
    width = normalized.info.width;
    height = normalized.info.height;
  } catch {
    return Response.json(
      {
        error:
          "The uploaded file is not a supported image or exceeds the pixel limit.",
      },
      { status: 400 },
    );
  }

  if (pngBuffer.length > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "The normalized image must be smaller than 50 MB." },
      { status: 413 },
    );
  }

  try {
    const client = new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
    const uploaded = await client.files.create(
      {
        file: await toFile(pngBuffer, "source.png", { type: "image/png" }),
        purpose: "user_data",
        expires_after: {
          anchor: "created_at",
          seconds: IMAGE_REFERENCE_TTL_SECONDS,
        },
      },
      { signal: request.signal },
    );

    return Response.json({
      imageRef: createImageReference(apiKey, uploaded.id, width, height),
    });
  } catch (error) {
    console.error("OpenAI image upload failed:", error);
    return Response.json(
      {
        error: "Image upload failed.",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 502 },
    );
  }
}
