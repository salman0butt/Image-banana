import OpenAI from "openai";
import { NextResponse } from "next/server";

import {
  getUserAsset,
  IMAGE_ASSET_BUCKET,
  openEditableAsset,
} from "@/lib/generation-history";
import { createAdminClient } from "@/lib/supabase/admin";
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
    const asset = await getUserAsset(userId, assetId);
    if (!asset) {
      return NextResponse.json(
        { error: { code: "ASSET_NOT_FOUND", message: "The image asset is unavailable." } },
        { status: 404 },
      );
    }

    const client = new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
    const editable = await openEditableAsset({
      userId,
      assetId,
      client,
      apiKey,
      signal: request.signal,
    });

    const admin = createAdminClient();
    const { data: stored, error: downloadError } = await admin.storage
      .from(IMAGE_ASSET_BUCKET)
      .download(asset.storage_path);

    if (downloadError || !stored) {
      throw new Error(
        `Unable to read stored image: ${downloadError?.message ?? "unknown error"}`,
      );
    }

    const buffer = Buffer.from(await stored.arrayBuffer());
    if (!buffer.length) {
      throw new Error("The stored image is empty.");
    }

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Image-Reference": editable.imageRef,
        "X-Image-Asset-Id": editable.assetId,
      },
    });
  } catch (error) {
    console.error("Unable to open image asset:", error);
    return NextResponse.json(
      {
        error: {
          code: "ASSET_OPEN_FAILED",
          message: "Unable to open the stored image.",
        },
      },
      { status: 500 },
    );
  }
}
