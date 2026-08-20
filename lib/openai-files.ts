import type { FileUIPart } from "ai";
import type { ResponseInputContent } from "openai/resources/responses/responses";

const INVALID_FILE_ERROR = "Each user file must include a media type and URL.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSupportedReferenceUrl(value: string): boolean {
  if (value.startsWith("data:")) {
    return true;
  }

  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function parseReferenceFiles(value: unknown): FileUIPart[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("userFiles must be an array.");
  }

  return value.map((file) => {
    if (!isRecord(file) || file.type !== "file") {
      throw new Error(INVALID_FILE_ERROR);
    }

    const mediaType =
      typeof file.mediaType === "string" ? file.mediaType.trim() : "";
    const url = typeof file.url === "string" ? file.url.trim() : "";

    if (!mediaType || !url) {
      throw new Error(INVALID_FILE_ERROR);
    }

    if (!isSupportedReferenceUrl(url)) {
      throw new Error("Each user file URL must be a data URL or an http(s) URL.");
    }

    const filename =
      typeof file.filename === "string" ? file.filename.trim() : "";

    return {
      type: "file",
      mediaType,
      url,
      ...(filename ? { filename } : {}),
    };
  });
}

export function buildReferenceContent(
  files: FileUIPart[],
): ResponseInputContent[] {
  return files.map((file) => {
    if (file.mediaType.startsWith("image/")) {
      return {
        type: "input_image",
        image_url: file.url,
        detail: "auto",
      };
    }

    return {
      type: "input_file" as const,
      ...(file.filename ? { filename: file.filename } : {}),
      ...(file.url.startsWith("data:")
        ? { file_data: file.url }
        : { file_url: file.url }),
    };
  });
}
