import OpenAI from "openai";
import { NextResponse } from "next/server";

import { openEditableAsset } from "@/lib/generation-history";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return !error && typeof claims?.sub === "string" ? claims.sub : null;
}

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  const assetId = new URL(request.url).searchParams.get("assetId")?.trim() ?? "";
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
    const editable = await openEditableAsset({
      userId,
      assetId,
      client,
      apiKey,
      signal: request.signal,
    });
    return NextResponse.json(editable);
  } catch (error) {
    console.error("Unable to open image asset:", error);
    const message = error instanceof Error ? error.message : "Unable to open image.";
    const missing = message.includes("not found");
    return NextResponse.json(
      {
        error: {
          code: missing ? "ASSET_NOT_FOUND" : "ASSET_OPEN_FAILED",
          message: missing ? "The image asset is unavailable." : "Unable to open the stored image.",
        },
      },
      { status: missing ? 404 : 500 },
    );
  }
}
