import { NextResponse } from "next/server";

import { createSignedUrlsForAssets } from "@/lib/assets";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const HISTORY_LIMIT = 30;

type GenerationRow = {
  id: string;
  output_asset_id: string | null;
  model_id: string;
  credit_cost: number;
  prompt: string;
  created_at: string;
};

type AssetRow = {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
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
    .select("id, output_asset_id, model_id, credit_cost, prompt, created_at")
    .eq("user_id", userId)
    .eq("status", "succeeded")
    .not("output_asset_id", "is", null)
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

  if (!assetIds.length) {
    return NextResponse.json({ items: [] });
  }

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
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  try {
    const signedUrls = await createSignedUrlsForAssets(
      assets.map((asset) => asset.storage_path),
    );

    const items = jobs.flatMap((job) => {
      if (!job.output_asset_id) return [];
      const asset = assetsById.get(job.output_asset_id);
      if (!asset) return [];
      const imageUrl = signedUrls.get(asset.storage_path);
      if (!imageUrl) return [];

      return [
        {
          id: job.id,
          assetId: asset.id,
          imageUrl,
          width: asset.width,
          height: asset.height,
          modelId: job.model_id,
          creditCost: job.credit_cost,
          prompt: job.prompt,
          createdAt: job.created_at,
        },
      ];
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Unable to sign history image URLs:", error);
    return NextResponse.json(
      { error: { code: "HISTORY_SIGN_FAILED", message: "Unable to load private history images." } },
      { status: 500 },
    );
  }
}
