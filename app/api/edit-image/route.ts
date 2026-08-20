import OpenAI from "openai";
import { toImageDataUrl } from "@/lib/image-data";
import { getGeneratedImage, mapOpenAIError } from "@/lib/openai-image";

export const runtime = "nodejs";

const IMAGE_QUALITIES = ["low", "medium", "high", "auto"] as const;
const IMAGE_SIZES = ["1024x1024", "1536x1024", "1024x1536", "auto"] as const;
const INPUT_FIDELITIES = ["low", "high"] as const;

function envOption<const T extends readonly string[]>(
  value: string | undefined,
  options: T,
  fallback: T[number],
): T[number] {
  return options.includes(value ?? "") ? (value as T[number]) : fallback;
}

type EditImageRequest = {
  imageDataUrl: string;
  prompt: string;
  webSearch: boolean;
};

async function readEditImageRequest(request: Request): Promise<EditImageRequest> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON request body.");
  }

  if (!body || typeof body !== "object") {
    throw new Error("Invalid JSON request body.");
  }

  const requestBody = body as Record<string, unknown>;
  const payload =
    requestBody.payload && typeof requestBody.payload === "object"
      ? (requestBody.payload as Record<string, unknown>)
      : requestBody;
  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";

  if (!prompt) {
    throw new Error("A prompt is required.");
  }

  return {
    imageDataUrl: toImageDataUrl(payload.imageBase64),
    prompt,
    webSearch: payload.webSearch === true,
  };
}

export async function POST(request: Request) {
  let input: EditImageRequest;

  try {
    input = await readEditImageRequest(request);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid JSON request body.",
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
  let webResearch = "";

  try {
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
    const imageInstruction = research
      ? `Edit the provided image according to this instruction:\n${input.prompt}\n\nUse this current web research as additional context:\n${research}`
      : `Edit the provided image according to this instruction:\n${input.prompt}`;
    const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";

    const response = await client.responses.create({
      model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: imageInstruction },
            {
              type: "input_image",
              image_url: input.imageDataUrl,
              detail: "auto",
            },
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
          size: envOption(
            process.env.OPENAI_IMAGE_SIZE,
            IMAGE_SIZES,
            "1024x1024",
          ),
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

    const outputImage = getGeneratedImage(response);

    if (!outputImage) {
      return Response.json(
        { error: "OpenAI did not return an edited image." },
        { status: 502 },
      );
    }

    return Response.json({
      imageBase64: outputImage,
      prompt: input.prompt,
      webSearchUsed: input.webSearch,
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
  }
}
