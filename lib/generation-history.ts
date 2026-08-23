import { randomUUID } from "node:crypto";

import OpenAI, { toFile } from "openai";

import {
  createImageReference,
  IMAGE_REFERENCE_TTL_SECONDS,
} from "@/lib/image-reference";
import { createAdminClient } from "@/lib/supabase/admin";

export const IMAGE_ASSET_BUCKET = "user-images";
const SIGNED_IMAGE_URL_SECONDS = 60 * 60;
const OPENAI_REFRESH_SAFETY_SECONDS = 5 * 60;
const JOB_COMPLETION_ATTEMPTS = 3;

type ImageAssetRow = {
  id: string;
  user_id: string;
  kind: "source" | "generated";
  storage_path: string;
  mime_type: string;
  byte_size: number;
  width: number;
  height: number;
  openai_file_id: string | null;
  openai_expires_at: string | null;
  parent_asset_id: string | null;
  created_at: string;
};

function openAIExpiry(): string {
  return new Date(Date.now() + IMAGE_REFERENCE_TTL_SECONDS * 1000).toISOString();
}

function isOpenAIFileFresh(asset: ImageAssetRow): boolean {
  if (!asset.openai_file_id || !asset.openai_expires_at) return false;
  const expiry = Date.parse(asset.openai_expires_at);
  return (
    Number.isFinite(expiry) &&
    expiry > Date.now() + OPENAI_REFRESH_SAFETY_SECONDS * 1000
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function safeJobErrorMessage(
  status: "failed" | "cancelled",
  errorCode: string,
  errorMessage: string,
): string {
  if (status === "cancelled" || errorCode === "request_cancelled") {
    return "Generation cancelled.";
  }
  if (errorCode === "insufficient_credits") {
    return "Insufficient credits for this generation.";
  }
  if (errorCode === "credit_reservation_failed") {
    return "Unable to reserve generation credits.";
  }
  if (errorCode === "invalid_edit_request") {
    return errorMessage.slice(0, 500);
  }
  return "Image generation failed.";
}

async function persistAsset({
  userId,
  kind,
  buffer,
  width,
  height,
  openAIFileId,
  parentAssetId = null,
}: {
  userId: string;
  kind: "source" | "generated";
  buffer: Buffer;
  width: number;
  height: number;
  openAIFileId: string;
  parentAssetId?: string | null;
}): Promise<ImageAssetRow> {
  const admin = createAdminClient();
  const assetId = randomUUID();
  const storagePath = `${userId}/${kind}/${assetId}.png`;

  const { error: uploadError } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Unable to persist ${kind} image: ${uploadError.message}`);
  }

  const { data, error } = await admin
    .from("image_assets")
    .insert({
      id: assetId,
      user_id: userId,
      kind,
      storage_path: storagePath,
      mime_type: "image/png",
      byte_size: buffer.length,
      width,
      height,
      openai_file_id: openAIFileId,
      openai_expires_at: openAIExpiry(),
      parent_asset_id: parentAssetId,
    })
    .select(
      "id, user_id, kind, storage_path, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
    )
    .single();

  if (error || !data) {
    await admin.storage.from(IMAGE_ASSET_BUCKET).remove([storagePath]);
    throw new Error(
      `Unable to record ${kind} image asset: ${error?.message ?? "unknown error"}`,
    );
  }

  return data as ImageAssetRow;
}

export function persistSourceAsset(args: {
  userId: string;
  buffer: Buffer;
  width: number;
  height: number;
  openAIFileId: string;
}) {
  return persistAsset({ ...args, kind: "source" });
}

export function persistGeneratedAsset(args: {
  userId: string;
  buffer: Buffer;
  width: number;
  height: number;
  openAIFileId: string;
  parentAssetId: string;
}) {
  return persistAsset({ ...args, kind: "generated" });
}

export async function getUserAsset(
  userId: string,
  assetId: string,
): Promise<ImageAssetRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("image_assets")
    .select(
      "id, user_id, kind, storage_path, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
    )
    .eq("id", assetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load image asset: ${error.message}`);
  return data ? (data as ImageAssetRow) : null;
}

export async function openEditableAsset({
  userId,
  assetId,
  client,
  apiKey,
  signal,
}: {
  userId: string;
  assetId: string;
  client: OpenAI;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<{ assetId: string; imageRef: string }> {
  let asset = await getUserAsset(userId, assetId);
  if (!asset) throw new Error("The image asset was not found.");

  if (!isOpenAIFileFresh(asset)) {
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

    const uploaded = await client.files.create(
      {
        file: await toFile(buffer, `${asset.kind}-${asset.id}.png`, {
          type: "image/png",
        }),
        purpose: "user_data",
        expires_after: {
          anchor: "created_at",
          seconds: IMAGE_REFERENCE_TTL_SECONDS,
        },
      },
      signal ? { signal } : undefined,
    );

    const { data, error } = await admin
      .from("image_assets")
      .update({
        openai_file_id: uploaded.id,
        openai_expires_at: openAIExpiry(),
      })
      .eq("id", asset.id)
      .eq("user_id", userId)
      .select(
        "id, user_id, kind, storage_path, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
      )
      .single();

    if (error || !data) {
      try {
        await client.files.delete(uploaded.id);
      } catch (cleanupError) {
        console.warn("Unable to clean up refreshed OpenAI file:", cleanupError);
      }
      throw new Error(
        `Unable to refresh editable image reference: ${error?.message ?? "unknown error"}`,
      );
    }
    asset = data as ImageAssetRow;
  }

  if (!asset.openai_file_id) {
    throw new Error("The image asset has no editable provider reference.");
  }

  return {
    assetId: asset.id,
    imageRef: createImageReference(
      apiKey,
      asset.openai_file_id,
      asset.width,
      asset.height,
    ),
  };
}

export async function createGenerationJob({
  id,
  userId,
  sourceAssetId,
  modelId,
  creditCost,
  prompt,
}: {
  id: string;
  userId: string;
  sourceAssetId: string;
  modelId: string;
  creditCost: number;
  prompt: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("generation_jobs").insert({
    id,
    user_id: userId,
    source_asset_id: sourceAssetId,
    model_id: modelId,
    credit_cost: creditCost,
    prompt,
    status: "running",
  });
  if (error) throw new Error(`Unable to create generation job: ${error.message}`);
}

export async function completeGenerationJob({
  id,
  userId,
  outputAssetId,
}: {
  id: string;
  userId: string;
  outputAssetId: string;
}): Promise<void> {
  let lastMessage = "unknown error";

  for (let attempt = 1; attempt <= JOB_COMPLETION_ATTEMPTS; attempt += 1) {
    const admin = createAdminClient();
    const { error } = await admin
      .from("generation_jobs")
      .update({
        output_asset_id: outputAssetId,
        status: "succeeded",
        completed_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (!error) return;
    lastMessage = error.message;

    if (attempt < JOB_COMPLETION_ATTEMPTS) {
      await delay(100 * attempt);
    }
  }

  throw new Error(`Unable to complete generation job: ${lastMessage}`);
}

export async function failGenerationJob({
  id,
  userId,
  status,
  errorCode,
  errorMessage,
}: {
  id: string;
  userId: string;
  status: "failed" | "cancelled";
  errorCode: string;
  errorMessage: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_code: errorCode.slice(0, 100),
      error_message: safeJobErrorMessage(status, errorCode, errorMessage),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) console.error("Unable to update generation job:", error.message);
}

export async function createSignedUrlsForAssets(
  storagePaths: string[],
): Promise<Map<string, string>> {
  if (!storagePaths.length) return new Map();
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .createSignedUrls(storagePaths, SIGNED_IMAGE_URL_SECONDS);

  if (error || !data) {
    throw new Error(
      `Unable to sign history images: ${error?.message ?? "unknown error"}`,
    );
  }

  const urls = new Map<string, string>();
  data.forEach((item, index) => {
    if (item.signedUrl) urls.set(storagePaths[index], item.signedUrl);
  });
  return urls;
}
