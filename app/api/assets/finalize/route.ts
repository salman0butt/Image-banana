import OpenAI from "openai";
import { NextResponse } from "next/server";

import { finalizeSourceAsset } from "@/lib/assets";
import { createImageReference } from "@/lib/image-reference";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FinalizeBody = {
  assetId?: unknown;
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

  let body: FinalizeBody;
  try {
    body = (await request.json()) as FinalizeBody;
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Invalid request body." } },
      { status: 400 },
    );
  }

  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  if (!UUID_PATTERN.test(assetId)) {
    return NextResponse.json(
      { error: { code: "INVALID_ASSET_ID", message: "Invalid image asset ID." } },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: "OPENAI_NOT_CONFIGURED", message: "OPENAI_API_KEY is not configured." } },
      { status: 500 },
    );
  }

  try {
    const client = new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
    const editable = await finalizeSourceAsset({
      userId,
      assetId,
      client,
      signal: request.signal,
    });

    return NextResponse.json({
      assetId: editable.asset.id,
      imageUrl: editable.imageUrl,
      imageRef: createImageReference(
        apiKey,
        editable.fileId,
        editable.width,
        editable.height,
      ),
    });
  } catch (error) {
    console.error("Unable to finalize source image:", error);
    const message = error instanceof Error ? error.message : "Image finalization failed.";
    const clientError =
      message.includes("not supported") ||
      message.includes("smaller than 50 MB") ||
      message.includes("not found") ||
      message.includes("not ready") ||
      message.includes("cannot be finalized");

    return NextResponse.json(
      {
        error: {
          code: clientError ? "INVALID_IMAGE" : "IMAGE_FINALIZE_FAILED",
          message: clientError ? message : "Unable to finalize the image upload.",
        },
      },
      { status: clientError ? 400 : 500 },
    );
  }
}
