import OpenAI, { toFile } from "openai";
import sharp from "sharp";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const FILE_TTL_SECONDS = 24 * 60 * 60;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart request body." }, { status: 400 });
  }

  const image = formData.get("image");

  if (!image || typeof image === "string") {
    return Response.json({ error: "An image file is required." }, { status: 400 });
  }

  if (!image.size) {
    return Response.json({ error: "The image file is empty." }, { status: 400 });
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "The image must be smaller than 50 MB." },
      { status: 413 },
    );
  }

  let pngBuffer: Buffer;

  try {
    const sourceBuffer = Buffer.from(await image.arrayBuffer());
    pngBuffer = await sharp(sourceBuffer, { animated: false })
      .rotate()
      .png()
      .toBuffer();
  } catch {
    return Response.json(
      { error: "The uploaded file is not a supported image." },
      { status: 400 },
    );
  }

  try {
    const client = new OpenAI({ apiKey });
    const uploaded = await client.files.create({
      file: await toFile(pngBuffer, "source.png", { type: "image/png" }),
      purpose: "vision",
      expires_after: {
        anchor: "created_at",
        seconds: FILE_TTL_SECONDS,
      },
    });

    return Response.json({ fileId: uploaded.id });
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
      { status: 500 },
    );
  }
}
