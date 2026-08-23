import { NextResponse } from "next/server";

import {
  createSourceUploadIntent,
  MAX_SOURCE_IMAGE_BYTES,
} from "@/lib/assets";
import { createClient } from "@/lib/supabase/server";

const MAX_FILENAME_LENGTH = 180;

type UploadIntentBody = {
  filename?: unknown;
  contentType?: unknown;
  size?: unknown;
};

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return !error && typeof claims?.sub === "string" ? claims.sub : null;
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  let body: UploadIntentBody;
  try {
    body = (await request.json()) as UploadIntentBody;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid request body." } },
      { status: 400 },
    );
  }

  const filename =
    typeof body.filename === "string" ? body.filename.trim() : "";
  const contentType =
    typeof body.contentType === "string" ? body.contentType.trim() : "";
  const size = typeof body.size === "number" ? body.size : Number.NaN;

  if (!filename || filename.length > MAX_FILENAME_LENGTH) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_FILENAME",
          message: `Image filenames must be between 1 and ${MAX_FILENAME_LENGTH} characters.`,
        },
      },
      { status: 400 },
    );
  }

  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CONTENT_TYPE",
          message: "Only image uploads are supported.",
        },
      },
      { status: 400 },
    );
  }

  if (!Number.isInteger(size) || size <= 0) {
    return NextResponse.json(
      { error: { code: "INVALID_SIZE", message: "The image file is empty." } },
      { status: 400 },
    );
  }

  if (size > MAX_SOURCE_IMAGE_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "The image must be smaller than 50 MB.",
        },
      },
      { status: 413 },
    );
  }

  try {
    const intent = await createSourceUploadIntent({ userId, filename });
    return NextResponse.json(intent, { status: 201 });
  } catch (error) {
    console.error("Unable to create image upload intent:", error);
    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_INTENT_FAILED",
          message: "Unable to prepare the image upload.",
        },
      },
      { status: 500 },
    );
  }
}
