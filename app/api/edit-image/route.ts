import OpenAI, { toFile } from "openai";
import type { FileUIPart } from "ai";
import sharp from "sharp";
import {
  buildReferenceContent,
  parseReferenceFiles,
} from "@/lib/openai-files";
import { normalizeAspectRatio, resolveImageSize } from "@/lib/image-size";
import { getGeneratedImage, mapOpenAIError } from "@/lib/openai-image";

export const runtime = "nodejs";

const IMAGE_QUALITIES = ["low", "medium", "high", "auto"] as const;
const IMAGE_SIZES = ["1024x1024", "1536x1024", "1024x1536", "auto"] as const;
const INPUT_FIDELITIES = ["low", "high"] as const;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const FILE_TTL_SECONDS = 24 * 60 * 60;
const PNG_DATA_URL_PREFIX = "data:image/png;base64,";

function envOption<const T extends readonly string[]>(
  value: string | undefined,
  options: T,
  fallback: T[number],
): T[number] {
  return options.includes(value ?? "") ? (value as T[number]) : fallback;
}

type EditImageRequest = {
  imageFileId: string;
  mask: File | null;
  prompt: string;
  webSearch: boolean;
  userFiles: FileUIPart[];
  aspectRatio: string;
};

function parseJsonField(value: FormDataEntryValue | null, label: string): unknown {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${label}.`);
  }
}

export async function readEditImageRequest(
  request: Request,
): Promise<EditImageRequest> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw new Error("Invalid multipart request body.");
  }

  const imageFileId = formData.get("imageFileId");
  const promptValue = formData.get("prompt");
  const maskValue = formData.get("mask");
  const prompt = typeof promptValue === "string" ? promptValue.trim() : "";

  if (typeof imageFileId !== "string" || !imageFileId.trim()) {
    throw new Error("An uploaded image file ID is required.");
  }

  if (!prompt) {
    throw new Error("A prompt is required.");
  }

  if (maskValue && typeof maskValue !== "string") {
    if (!maskValue.size) {
      throw new Error("The mask is empty.");
    }

    if (maskValue.size > MAX_IMAGE_BYTES) {
      throw new Error("The mask must be smaller than 50 MB.");
    }
  }

  const userFiles = parseReferenceFiles(
    parseJsonField(formData.get("userFiles"), "reference files"),
  );
  const aspectRatio = normalizeAspectRatio(formData.get("aspectRatio"));

  return {
    imageFileId: imageFileId.trim(),
    mask: maskValue && typeof maskValue !== "string" ? maskValue : null,
    prompt,
    webSearch: formData.get("webSearch") === "true",
    userFiles,
    aspectRatio,
  };
}

async function uploadMask(client: OpenAI, mask: File): Promise<string> {
  const buffer = Buffer.from(await mask.arrayBuffer());
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height || metadata.format !== "png") {
    throw new Error("The mask must be a valid PNG image.");
  }

  if (metadata.hasAlpha !== true) {
    throw new Error("The mask must contain an alpha channel.");
  }

  const uploaded = await client.files.create({
    file: await toFile(buffer, "mask.png", { type: "image/png" }),
    purpose: "vision",
    expires_after: {
      anchor: "created_at",
      seconds: FILE_TTL_SECONDS,
    },
  });

  return uploaded.id;
}

async function uploadGeneratedImage(
  client: OpenAI,
  generatedImage: string,
): Promise<{ buffer: Buffer; fileId: string }> {
  if (!generatedImage.startsWith(PNG_DATA_URL_PREFIX)) {
    throw new Error("OpenAI returned an unsupported image format.");
  }

  const buffer = Buffer.from(
    generatedImage.slice(PNG_DATA_URL_PREFIX.length),
    "base64",
  );

  if (!buffer.length) {
    throw new Error("OpenAI returned an empty image.");
  }

  const uploaded = await client.files.create({
    file: await toFile(buffer, "generated.png", { type: "image/png" }),
    purpose: "vision",
    expires_after: {
      anchor: "created_at",
      seconds: FILE_TTL_SECONDS,
    },
  });

  return { buffer, fileId: uploaded.id };
}

export async function POST(request: Request) {
  let input: EditImageRequest;

  try {
    input = await readEditImageRequest(request);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid multipart request body.",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6";
  const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const configuredSize = envOption(
    process.env.OPENAI_IMAGE_SIZE,
    IMAGE_SIZES,
    "1024x1024",
  );
  let imageSize: string;

  try {
    imageSize = resolveImageSize(
      input.aspectRatio,
      imageModel,
      configuredSize,
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid image size.",
      },
      { status: 400 },
    );
  }

  let webResearch = "";
  let maskFileId: string | null = null;

  try {
    if (input.mask) {
      maskFileId = await uploadMask(client, input.mask);
    }

    if (input.webSearch) {
      const searchResponse = await client.responses.create({
        model,
        tools: [{ type: "web_search", search_context_size: "low" }],
        tool_choice: "required",
        input: `Search the web for current information that is relevant to this image-editing request. Return concise factual and visual references for the image model.\n\nUser request: ${input.prompt}`,
      });

      webResearch = searchResponse.output_text;
    }

    const research = webResearch.trim();
    const imageInstruction =
      `Edit the provided image according to this instruction:\n${input.prompt}` +
      (research
        ? `\n\nUse this current web research as additional context:\n${research}`
        : "") +
      (input.userFiles.length
        ? "\n\nUse the additional attached files as reference material for the edit."
        : "");
    const response = await client.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: imageInstruction },
            {
              type: "input_image",
              file_id: input.imageFileId,
              detail: "auto",
            },
            ...buildReferenceContent(input.userFiles),
          ],
        },
      ],
      tools: [
        {
          type: "image_generation",
          action: "edit",
          model: imageModel,
          quality: envOption(
            process.env.OPENAI_IMAGE_QUALITY,
            IMAGE_QUALITIES,
            "low",
          ),
          size: imageSize,
          ...(maskFileId
            ? { input_image_mask: { file_id: maskFileId } }
            : {}),
          ...(imageModel === "gpt-image-2" || imageModel.startsWith("gpt-image-2-")
            ? {}
            : {
                input_fidelity: envOption(
                  process.env.OPENAI_IMAGE_INPUT_FIDELITY,
                  INPUT_FIDELITIES,
                  "low",
                ),
              }),
        },
      ],
      tool_choice: { type: "image_generation" },
    });

    const generatedImage = getGeneratedImage(response);

    if (!generatedImage) {
      return Response.json(
        { error: "OpenAI did not return an edited image." },
        { status: 502 },
      );
    }

    const uploadedImage = await uploadGeneratedImage(client, generatedImage);

    return new Response(new Uint8Array(uploadedImage.buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(uploadedImage.buffer.length),
        "Cache-Control": "no-store",
        "X-Image-File-Id": uploadedImage.fileId,
      },
    });
  } catch (error) {
    const mappedError = mapOpenAIError(error, input.webSearch);

    console.error("OpenAI image edit failed:", error);

    return Response.json(
      {
        error: mappedError.message,
        details:
          process.env.NODE_ENV === "development"
            ? mappedError.details
            : undefined,
      },
      { status: mappedError.status },
    );
  } finally {
    if (maskFileId) {
      void client.files.delete(maskFileId).catch((error) => {
        console.warn("Failed to delete temporary OpenAI mask file:", error);
      });
    }
  }
}
