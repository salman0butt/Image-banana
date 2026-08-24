import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SIGNUP_CREDITS = 25;
const PASSWORD = "Credits-e2e-password-2026!";
const IMAGE_BUCKET = "user-images";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for authenticated E2E tests.`);
  }
  return value;
}

const admin = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

let userId = "";
let email = "";
let storagePaths: string[] = [];

async function assertNoError(error: { message: string } | null, operation: string) {
  if (error) {
    throw new Error(`${operation}: ${error.message}`);
  }
}

async function createDisposableUser() {
  email = `credits-e2e-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });

  await assertNoError(error, "Unable to create disposable E2E user");
  if (!data.user) {
    throw new Error("Supabase returned no disposable E2E user.");
  }

  userId = data.user.id;
}

async function deleteDisposableUser() {
  if (storagePaths.length) {
    const { error } = await admin.storage.from(IMAGE_BUCKET).remove(storagePaths);
    await assertNoError(error, "Unable to remove disposable E2E images");
    storagePaths = [];
  }

  if (!userId) return;

  const currentUserId = userId;
  userId = "";
  email = "";

  const { error } = await admin.auth.admin.deleteUser(currentUserId);
  await assertNoError(error, "Unable to delete disposable E2E user");
}

async function ensureWallet() {
  const { error } = await admin.rpc("ensure_credit_wallet", {
    p_user_id: userId,
    p_signup_credits: SIGNUP_CREDITS,
  });
  await assertNoError(error, "Unable to provision E2E wallet");
}

async function createStoredAsset({
  kind = "source",
  openAIFileId = `file_e2e_${randomUUID()}`,
  parentAssetId = null,
}: {
  kind?: "source" | "generated";
  openAIFileId?: string;
  parentAssetId?: string | null;
} = {}) {
  const assetId = randomUUID();
  const image = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const storagePath = `${userId}/e2e/${assetId}.png`;

  const { error: uploadError } = await admin.storage
    .from(IMAGE_BUCKET)
    .upload(storagePath, image, {
      contentType: "image/png",
      upsert: false,
    });
  await assertNoError(uploadError, "Unable to upload E2E image asset");
  storagePaths.push(storagePath);

  const { error: insertError } = await admin.from("image_assets").insert({
    id: assetId,
    user_id: userId,
    kind,
    storage_path: storagePath,
    mime_type: "image/png",
    byte_size: image.length,
    width: 2,
    height: 2,
    openai_file_id: openAIFileId,
    openai_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    parent_asset_id: parentAssetId,
  });
  await assertNoError(insertError, "Unable to insert E2E image asset");

  return { assetId, image };
}

async function signIn(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/editor");
  await expect(page.getByRole("heading", { name: "Start Creating" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await createDisposableUser();
  await signIn(page);
});

test.afterEach(async () => {
  await deleteDisposableUser();
});

test("authenticated homepage exposes editor, account, and paid plan selection", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Open Editor" }).first()).toHaveAttribute(
    "href",
    "/editor",
  );
  await expect(page.getByRole("link", { name: "Account" }).first()).toHaveAttribute(
    "href",
    "/account",
  );

  const creatorLink = page.locator("#pricing").getByRole("link", {
    name: "Choose Creator",
  });
  await expect(creatorLink).toHaveAttribute("href", "/account?plan=creator");
  await creatorLink.click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/account?plan=creator");
  await expect(
    page.getByRole("heading", { name: "Creator", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("300 monthly credits", { exact: true })).toBeVisible();
  await expect(page.getByText("$12", { exact: true })).toBeVisible();
});

test("authenticated user sees server-controlled models and initial credits", async ({
  page,
}) => {
  const modelSelect = page.getByLabel("Image model");
  await expect(modelSelect).toBeVisible();
  await expect(modelSelect.locator("option")).toHaveCount(3);
  await expect(page.getByTitle("Available generation credits")).toContainText(
    "25 credits",
  );

  await modelSelect.selectOption("gpt-image-2-quality");
  await expect(page.getByRole("button", { name: "Generate · 8" })).toBeVisible();

  const response = await page.request.get("/api/models");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    defaultModelId: string;
    models: Array<Record<string, unknown>>;
  };
  expect(body.defaultModelId).toBe("gpt-image-2-fast");
  expect(body.models).toHaveLength(3);
  for (const model of body.models) {
    expect(model).not.toHaveProperty("providerModel");
    expect(model).not.toHaveProperty("quality");
  }
});

test("insufficient credits are enforced in both UI and edit API", async ({
  page,
}) => {
  await ensureWallet();
  const source = await createStoredAsset({
    openAIFileId: "file_e2e_insufficient",
  });

  const { error: chargeError } = await admin.rpc("charge_generation_credits", {
    p_user_id: userId,
    p_amount: 24,
    p_idempotency_key: `e2e-insufficient:${randomUUID()}`,
    p_metadata: { source: "authenticated_e2e" },
  });
  await assertNoError(chargeError, "Unable to prepare insufficient-credit state");

  await page.reload();
  await expect(page.getByTitle("Available generation credits")).toContainText(
    "1 credits",
  );
  await page.getByLabel("Image edit instruction").fill("Make the image cinematic");
  await expect(page.getByRole("button", { name: "Need 2 credits" })).toBeDisabled();

  const response = await page.request.post("/api/edit-image", {
    multipart: {
      sourceAssetId: source.assetId,
      prompt: "Make the image cinematic",
      modelId: "gpt-image-2-fast",
    },
  });

  expect(response.status()).toBe(402);
  await expect(response.json()).resolves.toMatchObject({
    code: "INSUFFICIENT_CREDITS",
    balance: 1,
    required: 2,
  });
});

test("post-charge edit failure is refunded and appears in account ledger", async ({
  page,
}) => {
  const source = await createStoredAsset({
    openAIFileId: "file_e2e_refund",
  });

  const response = await page.request.post("/api/edit-image", {
    multipart: {
      sourceAssetId: source.assetId,
      prompt: "Change the selected area",
      modelId: "gpt-image-2-fast",
      referenceFile: {
        name: "invalid-reference.bin",
        mimeType: "application/octet-stream",
        buffer: Buffer.from([1, 2, 3, 4]),
      },
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Reference file 1 must be a supported image or PDF.",
  });

  const creditsResponse = await page.request.get("/api/credits");
  expect(creditsResponse.status()).toBe(200);
  await expect(creditsResponse.json()).resolves.toEqual({ balance: SIGNUP_CREDITS });

  await page.goto("/account");
  const chargeEntry = page
    .getByRole("listitem")
    .filter({ hasText: "Generation Charge" });
  await expect(chargeEntry).toContainText("-2");
  await expect(chargeEntry).toContainText("Balance 23");

  const refundEntry = page
    .getByRole("listitem")
    .filter({ hasText: "Generation Refund" });
  await expect(refundEntry).toContainText("+2");
  await expect(refundEntry).toContainText("Balance 25");
});

test("authenticated editor cancellation aborts the active browser request", async ({
  page,
}) => {
  await page.route("**/api/upload-image", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        imageRef: "e2e-browser-source-ref",
        assetId: "11111111-1111-4111-8111-111111111111",
      }),
    });
  });

  let markRequestStarted!: () => void;
  const requestStarted = new Promise<void>((resolve) => {
    markRequestStarted = resolve;
  });
  let releaseRequest!: () => void;
  const requestHold = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await page.route("**/api/edit-image", async (route) => {
    markRequestStarted();
    await requestHold;
    try {
      await route.abort("aborted");
    } catch {
      // The browser AbortController may terminate the request before Playwright does.
    }
  });

  const image = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  await page.getByLabel("Upload image").setInputFiles({
    name: "source.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(page.getByTitle("Available generation credits")).toContainText(
    "25 credits",
  );

  const prompt = page.getByLabel("Image edit instruction");
  await prompt.fill("Run a cancellable edit");
  await page.getByRole("button", { name: "Generate · 2" }).click();
  await requestStarted;

  const cancelButton = page.locator("form").getByRole("button", { name: "Cancel" });
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();
  releaseRequest();

  await expect(cancelButton).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Generate · 2" })).toBeVisible();
  await expect(prompt).toHaveValue("Run a cancellable edit");
});

test("persistent generation history renders and reopens a saved output", async ({
  page,
}) => {
  const source = await createStoredAsset({
    openAIFileId: "file_e2e_history_source",
  });
  const output = await createStoredAsset({
    kind: "generated",
    openAIFileId: "file_e2e_history_output",
    parentAssetId: source.assetId,
  });
  const prompt = "Turn this into a cinematic night scene";

  const { error } = await admin.from("generation_jobs").insert({
    id: randomUUID(),
    user_id: userId,
    source_asset_id: source.assetId,
    output_asset_id: output.assetId,
    model_id: "gpt-image-2-fast",
    credit_cost: 2,
    prompt,
    status: "succeeded",
    completed_at: new Date().toISOString(),
  });
  await assertNoError(error, "Unable to seed generation history");

  await page.getByRole("button", { name: "Open generation history" }).click();
  const historyPanel = page.getByRole("complementary", {
    name: "History sidebar",
  });
  await expect(historyPanel).toBeVisible();
  await expect(historyPanel.getByText(prompt)).toBeVisible();
  await expect(historyPanel.getByText("gpt-image-2-fast")).toBeVisible();
  await expect(historyPanel.getByText("Ready")).toBeVisible();

  await historyPanel
    .getByRole("button", { name: `Open saved generation: ${prompt}` })
    .click();

  await expect(page.getByLabel("Image edit instruction")).toHaveValue(prompt);
  await expect(page.locator("canvas").first()).toBeVisible();
});
