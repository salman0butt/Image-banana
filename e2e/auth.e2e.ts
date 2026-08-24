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

test("auth handoff links preserve the requested local destination", async ({
  page,
}) => {
  await page.goto("/auth/login?next=%2Faccount");

  await expect(
    page.getByRole("link", { name: "Create account" }),
  ).toHaveAttribute("href", "/auth/register?next=%2Faccount");
  await expect(page.getByRole("link", { name: "Start free" })).toHaveAttribute(
    "href",
    "/auth/register?next=%2Faccount",
  );

  await page.goto("/auth/register?next=%2Faccount");

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/auth/login?next=%2Faccount",
  );
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/auth/login?next=%2Faccount",
  );
});

test("login and registration use the branded responsive auth shell", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/auth/login");

  await expect(
    page.getByRole("navigation", { name: "Authentication page navigation" }),
  ).toBeVisible();
  await expect(
    page.getByAltText(
      "Original yellow lounge chair studio scene used in the Image's Banana editor",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Authentication footer" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to homepage" })).toHaveAttribute(
    "href",
    "/",
  );

  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow, `login horizontal overflow at ${width}px`).toBe(
      false,
    );
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/auth/register");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
  ).toBe(false);
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
  const paths = [
    "/api/auth/me",
    "/api/credits",
    "/api/models",
    "/api/history",
    "/api/assets/open?assetId=11111111-1111-4111-8111-111111111111",
  ];

  for (const path of paths) {
    const response = await request.get(path);

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
  }
});
