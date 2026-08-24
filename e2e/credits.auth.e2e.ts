import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { createImageReference } from "@/lib/image-reference";

const SIGNUP_CREDITS = 25;
const OPENAI_E2E_API_KEY = "e2e-openai-api-key";
const PASSWORD = "Credits-e2e-password-2026!";

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

test("authenticated homepage exposes editor and account actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Open Editor" }).first()).toHaveAttribute(
    "href",
    "/editor",
  );
  await expect(page.getByRole("link", { name: "Account" }).first()).toHaveAttribute(
    "href",
    "/account",
  );
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

test("image references cannot be reused across authenticated users", async ({ page }) => {
  const foreignReference = createImageReference(
    OPENAI_E2E_API_KEY,
    randomUUID(),
    "file_e2e_foreign_owner",
    2,
    2,
  );

  const response = await page.request.post("/api/edit-image", {
    multipart: {
      imageRef: foreignReference,
      prompt: "Try to edit another user's image reference",
      modelId: "gpt-image-2-fast",
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "The image reference is invalid.",
  });

  const creditsResponse = await page.request.get("/api/credits");
  expect(creditsResponse.status()).toBe(200);
  await expect(creditsResponse.json()).resolves.toEqual({ balance: SIGNUP_CREDITS });
});

test("insufficient credits are enforced in both UI and edit API", async ({
  page,
}) => {
  await ensureWallet();

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
      imageRef: createImageReference(
        OPENAI_E2E_API_KEY,
        userId,
        "file_e2e_insufficient",
        2,
        2,
      ),
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
  const mask = await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();

  const response = await page.request.post("/api/edit-image", {
    multipart: {
      imageRef: createImageReference(
        OPENAI_E2E_API_KEY,
        userId,
        "file_e2e_refund",
        2,
        2,
      ),
      prompt: "Change the selected area",
      modelId: "gpt-image-2-fast",
      mask: {
        name: "mask.png",
        mimeType: "image/png",
        buffer: mask,
      },
    },
  });

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "The mask and source image must have the same dimensions.",
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
      body: JSON.stringify({ imageRef: "e2e-browser-source-ref" }),
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
