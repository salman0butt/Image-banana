import { expect, test } from "@playwright/test";

import { SUPABASE_CONFIGURATION_MESSAGE } from "@/lib/supabase/config";

test("login page is accessible and sanitizes external next redirects", async ({
  page,
}) => {
  await page.goto("/auth/login?next=https://evil.example/phish");

  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.locator('input[name="next"]')).toHaveValue("/editor");
  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toBeVisible();
});

test("registration shows a controlled setup error when Supabase is not configured", async ({
  page,
}) => {
  await page.goto("/auth/register");

  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/auth\/register\?error=/);
  await expect(page.getByText(SUPABASE_CONFIGURATION_MESSAGE)).toBeVisible();
});

test("registration validates display-name length on the server", async ({ page }) => {
  await page.goto("/auth/register");

  await page.getByLabel("Display name").evaluate((input) => {
    const field = input as HTMLInputElement;
    field.value = "x".repeat(81);
  });
  await page.getByLabel("Email").fill("qa@example.com");
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/auth\/register\?error=/);
  await expect(
    page.getByText("Display name must be 80 characters or fewer."),
  ).toBeVisible();
});

test("protected account routes redirect unauthenticated users to login", async ({
  page,
}) => {
  await page.goto("/account");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Faccount$/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("protected APIs return a structured unauthorized response", async ({
  request,
}) => {
  for (const path of ["/api/auth/me", "/api/credits", "/api/models"]) {
    const response = await request.get(path);

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
  }

  for (const path of ["/api/upload-image", "/api/edit-image"]) {
    const response = await request.post(path, {
      multipart: { probe: "unauthenticated" },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
  }
});

test("public responses include baseline browser security headers", async ({ request }) => {
  const response = await request.get("/");

  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["content-security-policy"]).toContain("object-src 'none'");
  expect(response.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});
