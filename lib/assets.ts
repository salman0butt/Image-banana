import { randomUUID } from "node:crypto";

import OpenAI, { toFile } from "openai";
import sharp from "sharp";

import { IMAGE_REFERENCE_TTL_SECONDS } from "@/lib/image-reference";
import { createAdminClient } from "@/lib/supabase/admin";

export const IMAGE_ASSET_BUCKET = "user-images";
export const MAX_SOURCE_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const SIGNED_IMAGE_URL_SECONDS = 24 * 60 * 60;
const OPENAI_REFRESH_SAFETY_SECONDS = 5 * 60;

type ImageAssetRow = {
  id: string;
  user_id: string;
  kind: "source" | "generated";
  status: "uploading" | "ready" | "failed";
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  openai_file_id: string | null;
  openai_expires_at: string | null;
  parent_asset_id: string | null;
  created_at: string;
};

type EditableAsset = {
  asset: ImageAssetRow;
  fileId: string;
  width: number;
  height: number;
  imageUrl: string;
};

function sanitizeFilename(filename: string): string {
  return (
    filename
      .replace(/[\\/\0-\x1f\x7f]+/g, "_")
      .trim()
      .slice(0, 180) || "image"
  );
}

function requireAsset(data: unknown, operation: string): ImageAssetRow {
  if (!data || typeof data !== "object") {
    throw new Error(`No image asset was returned for ${operation}.`);
  }

  return data as ImageAssetRow;
}

function openAIExpiry(): string {
  return new Date(
    Date.now() + IMAGE_REFERENCE_TTL_SECONDS * 1000,
  ).toISOString();
}

function isOpenAIFileFresh(asset: ImageAssetRow): boolean {
  if (!asset.openai_file_id || !asset.openai_expires_at) return false;

  const expiresAt = Date.parse(asset.openai_expires_at);
  return (
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now() + OPENAI_REFRESH_SAFETY_SECONDS * 1000
  );
}

async function createSignedAssetUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .createSignedUrl(storagePath, SIGNED_IMAGE_URL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(`Unable to create a private image URL: ${error?.message ?? "unknown error"}`);
  }

  return data.signedUrl;
}

async function downloadAssetBuffer(storagePath: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Unable to read the stored image: ${error?.message ?? "unknown error"}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  if (!buffer.length) {
    throw new Error("The stored image is empty.");
  }

  return buffer;
}

async function uploadOpenAIImage(
  client: OpenAI,
  buffer: Buffer,
  filename: string,
  signal?: AbortSignal,
): Promise<string> {
  const uploaded = await client.files.create(
    {
      file: await toFile(buffer, filename, { type: "image/png" }),
      purpose: "user_data",
      expires_after: {
        anchor: "created_at",
        seconds: IMAGE_REFERENCE_TTL_SECONDS,
      },
    },
    signal ? { signal } : undefined,
  );

  return uploaded.id;
}

export async function createSourceUploadIntent({
  userId,
  filename,
}: {
  userId: string;
  filename: string;
}): Promise<{ assetId: string; path: string; token: string }> {
  const admin = createAdminClient();
  const assetId = randomUUID();
  const path = `${userId}/sources/${assetId}/original`;

  const { error: insertError } = await admin.from("image_assets").insert({
    id: assetId,
    user_id: userId,
    kind: "source",
    status: "uploading",
    storage_path: path,
    original_filename: sanitizeFilename(filename),
  });

  if (insertError) {
    throw new Error(`Unable to create the image asset: ${insertError.message}`);
  }

  const { data, error } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data?.token) {
    await admin.from("image_assets").delete().eq("id", assetId).eq("user_id", userId);
    throw new Error(`Unable to create the image upload URL: ${error?.message ?? "unknown error"}`);
  }

  return { assetId, path, token: data.token };
}

export async function getUserAsset(
  userId: string,
  assetId: string,
): Promise<ImageAssetRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("image_assets")
    .select(
      "id, user_id, kind, status, storage_path, original_filename, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
    )
    .eq("id", assetId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load the image asset: ${error.message}`);
  }

  return data ? requireAsset(data, "asset lookup") : null;
}

export async function ensureEditableAsset({
  userId,
  assetId,
  client,
  signal,
}: {
  userId: string;
  assetId: string;
  client: OpenAI;
  signal?: AbortSignal;
}): Promise<EditableAsset> {
  let asset = await getUserAsset(userId, assetId);
  if (!asset || asset.status !== "ready") {
    throw new Error("The image asset is not ready for editing.");
  }

  if (!asset.width || !asset.height) {
    throw new Error("The stored image dimensions are missing.");
  }

  if (!isOpenAIFileFresh(asset)) {
    const buffer = await downloadAssetBuffer(asset.storage_path);
    const fileId = await uploadOpenAIImage(
      client,
      buffer,
      `${asset.kind}-${asset.id}.png`,
      signal,
    );
    const expiresAt = openAIExpiry();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("image_assets")
      .update({
        openai_file_id: fileId,
        openai_expires_at: expiresAt,
      })
      .eq("id", asset.id)
      .eq("user_id", userId)
      .select(
        "id, user_id, kind, status, storage_path, original_filename, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
      )
      .single();

    if (error) {
      throw new Error(`Unable to refresh the editable image reference: ${error.message}`);
    }

    asset = requireAsset(data, "OpenAI file refresh");
  }

  if (!asset.openai_file_id) {
    throw new Error("The image asset has no editable provider reference.");
  }

  return {
    asset,
    fileId: asset.openai_file_id,
    width: asset.width,
    height: asset.height,
    imageUrl: await createSignedAssetUrl(asset.storage_path),
  };
}

export async function finalizeSourceAsset({
  userId,
  assetId,
  client,
  signal,
}: {
  userId: string;
  assetId: string;
  client: OpenAI;
  signal?: AbortSignal;
}): Promise<EditableAsset> {
  const existing = await getUserAsset(userId, assetId);
  if (!existing || existing.kind !== "source") {
    throw new Error("The source image asset was not found.");
  }

  if (existing.status === "ready") {
    return ensureEditableAsset({ userId, assetId, client, signal });
  }

  if (existing.status !== "uploading") {
    throw new Error("The source image asset cannot be finalized.");
  }

  const sourceBuffer = await downloadAssetBuffer(existing.storage_path);
  if (sourceBuffer.length > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("The image must be smaller than 50 MB.");
  }

  let normalized: Awaited<ReturnType<ReturnType<typeof sharp>["toBuffer"]>>;
  try {
    normalized = await sharp(sourceBuffer, {
      animated: false,
      limitInputPixels: MAX_IMAGE_PIXELS,
    })
      .rotate()
      .png()
      .toBuffer({ resolveWithObject: true });
  } catch {
    const admin = createAdminClient();
    await admin
      .from("image_assets")
      .update({ status: "failed" })
      .eq("id", assetId)
      .eq("user_id", userId);
    throw new Error(
      "The uploaded file is not a supported image or exceeds the pixel limit.",
    );
  }

  if (normalized.data.length > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("The normalized image must be smaller than 50 MB.");
  }

  const finalPath = `${userId}/sources/${assetId}/image.png`;
  const admin = createAdminClient();
  const { error: storageError } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .upload(finalPath, normalized.data, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: true,
    });

  if (storageError) {
    throw new Error(`Unable to persist the normalized image: ${storageError.message}`);
  }

  const fileId = await uploadOpenAIImage(
    client,
    normalized.data,
    `source-${assetId}.png`,
    signal,
  );
  const expiresAt = openAIExpiry();

  const { data, error } = await admin
    .from("image_assets")
    .update({
      status: "ready",
      storage_path: finalPath,
      mime_type: "image/png",
      byte_size: normalized.data.length,
      width: normalized.info.width,
      height: normalized.info.height,
      openai_file_id: fileId,
      openai_expires_at: expiresAt,
    })
    .eq("id", assetId)
    .eq("user_id", userId)
    .select(
      "id, user_id, kind, status, storage_path, original_filename, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
    )
    .single();

  if (error) {
    throw new Error(`Unable to finalize the image asset: ${error.message}`);
  }

  if (existing.storage_path !== finalPath) {
    const { error: removeError } = await admin.storage
      .from(IMAGE_ASSET_BUCKET)
      .remove([existing.storage_path]);
    if (removeError) {
      console.warn("Unable to remove temporary source upload:", removeError.message);
    }
  }

  const asset = requireAsset(data, "source finalization");
  return {
    asset,
    fileId,
    width: normalized.info.width,
    height: normalized.info.height,
    imageUrl: await createSignedAssetUrl(finalPath),
  };
}

export async function persistGeneratedAsset({
  userId,
  parentAssetId,
  buffer,
  width,
  height,
  openAIFileId,
}: {
  userId: string;
  parentAssetId: string;
  buffer: Buffer;
  width: number;
  height: number;
  openAIFileId: string;
}): Promise<{ asset: ImageAssetRow; imageUrl: string }> {
  const admin = createAdminClient();
  const assetId = randomUUID();
  const storagePath = `${userId}/generated/${assetId}.png`;

  const { error: uploadError } = await admin.storage
    .from(IMAGE_ASSET_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Unable to persist the generated image: ${uploadError.message}`);
  }

  const { data, error } = await admin
    .from("image_assets")
    .insert({
      id: assetId,
      user_id: userId,
      kind: "generated",
      status: "ready",
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
      "id, user_id, kind, status, storage_path, original_filename, mime_type, byte_size, width, height, openai_file_id, openai_expires_at, parent_asset_id, created_at",
    )
    .single();

  if (error) {
    await admin.storage.from(IMAGE_ASSET_BUCKET).remove([storagePath]);
    throw new Error(`Unable to record the generated image: ${error.message}`);
  }

  return {
    asset: requireAsset(data, "generated image persistence"),
    imageUrl: await createSignedAssetUrl(storagePath),
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

  if (error) {
    throw new Error(`Unable to create the generation job: ${error.message}`);
  }
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
  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({
      output_asset_id: outputAssetId,
      status: "succeeded",
      completed_at: new Date().toISOString(),
      error_code: null,
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Unable to complete the generation job: ${error.message}`);
  }
}

export async function failGenerationJob({
  id,
  userId,
  status,
  errorCode,
}: {
  id: string;
  userId: string;
  status: "failed" | "cancelled";
  errorCode: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      error_code: errorCode.slice(0, 100),
    })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Unable to update failed generation job:", error.message);
  }
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
    throw new Error(`Unable to create history image URLs: ${error?.message ?? "unknown error"}`);
  }

  const result = new Map<string, string>();
  data.forEach((item, index) => {
    if (item.signedUrl) {
      result.set(storagePaths[index], item.signedUrl);
    }
  });
  return result;
}
