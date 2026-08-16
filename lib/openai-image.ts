type OpenAIError = {
  details: string;
  message: string;
  status: number;
};

export function getGeneratedImage(response: unknown): string | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const output = (response as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return null;
  }

  const imageCall = output.find((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as { type?: unknown; result?: unknown };
    return candidate.type === "image_generation_call" &&
      typeof candidate.result === "string" &&
      candidate.result.length > 0;
  }) as { result?: string } | undefined;

  return imageCall?.result ? `data:image/png;base64,${imageCall.result}` : null;
}

export function mapOpenAIError(
  error: unknown,
  webSearchEnabled: boolean,
): OpenAIError {
  const details = error instanceof Error ? error.message : String(error);
  const apiStatus =
    error && typeof error === "object" && "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  if (apiStatus === 429 || /(?:429|quota|rate limit)/i.test(details)) {
    return {
      details,
      message: "OpenAI quota or rate limit exceeded.",
      status: 429,
    };
  }

  if (apiStatus === 401 || apiStatus === 403) {
    return {
      details,
      message: "OpenAI API key is invalid or unauthorized.",
      status: apiStatus,
    };
  }

  return {
    details,
    message: webSearchEnabled
      ? "OpenAI web search or image editing failed."
      : "OpenAI image editing failed.",
    status: 500,
  };
}
