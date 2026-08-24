import { NextResponse } from "next/server";

import { createSignedUrlsForAssets } from "@/lib/generation-history";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 30;

type GenerationRow = {
  id: string;
  output_asset_id: string | null;
  model_id: string;
  credit_cost: number;
  prompt: string;
  status: "running" | "succeeded" | "failed" | "cancelled";
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

type AssetRow = {
  id: string;
  storage_path: string;
  width: number;
  height: number;
};

export async function GET() {
  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = !claimsError && typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required." } },
      { status: 401 },
    );
  }

  const { data: jobsData, error: jobsError } = await supabase
    .from("generation_jobs")
    .select(
      "id, output_asset_id, model_id, credit_cost, prompt, status, error_message, created_at, completed_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (jobsError) {
    console.error("Unable to load generation history:", jobsError);
    return NextResponse.json(
      { error: { code: "HISTORY_READ_FAILED", message: "Unable to load generation history." } },
      { status: 500 },
    );
  }

  const jobs = (jobsData ?? []) as GenerationRow[];
  const assetIds = jobs
    .map((job) => job.output_asset_id)
    .filter((id): id is string => Boolean(id));

  let assetsById = new Map<string, AssetRow>();
  let signedUrls = new Map<string, string>();

  if (assetIds.length) {
    const { data: assetsData, error: assetsError } = await supabase
      .from("image_assets")
      .select("id, storage_path, width, height")
      .eq("user_id", userId)
      .in("id", assetIds);

    if (assetsError) {
      console.error("Unable to load history assets:", assetsError);
      return NextResponse.json(
        { error: { code: "HISTORY_ASSET_READ_FAILED", message: "Unable to load generation images." } },
        { status: 500 },
      );
    }

    const assets = (assetsData ?? []) as AssetRow[];
    assetsById = new Map(assets.map((asset) => [asset.id, asset]));

    try {
      signedUrls = await createSignedUrlsForAssets(
        assets.map((asset) => asset.storage_path),
      );
    } catch (error) {
      console.error("Unable to sign history image URLs:", error);
      return NextResponse.json(
        { error: { code: "HISTORY_SIGN_FAILED", message: "Unable to load private history images." } },
        { status: 500 },
      );
    }
  }

  const items = jobs.map((job) => {
    const asset = job.output_asset_id
      ? assetsById.get(job.output_asset_id) ?? null
      : null;

    return {
      id: job.id,
      assetId: asset?.id ?? null,
      imageUrl: asset ? signedUrls.get(asset.storage_path) ?? null : null,
      width: asset?.width ?? null,
      height: asset?.height ?? null,
      modelId: job.model_id,
      creditCost: job.credit_cost,
      prompt: job.prompt,
      status: job.status,
      errorMessage: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    };
  });

  return NextResponse.json({ items });
}
