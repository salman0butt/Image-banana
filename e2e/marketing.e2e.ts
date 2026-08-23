import { expect, test } from "@playwright/test";

test("public homepage renders without authentication", async ({ page, request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Describe the change. Keep creating." }),
  ).toBeVisible();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#pricing")).toBeAttached();
  await expect(page.locator("#faq")).toBeAttached();
});

test("marketing navigation reaches Features, Pricing, and FAQ", async ({ page }) => {
  await page.goto("/");

  for (const [label, hash] of [
    ["Features", "#features"],
    ["Pricing", "#pricing"],
    ["FAQ", "#faq"],
  ] as const) {
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(page.locator(hash)).toBeInViewport();
  }
});

test("logged-out conversion links use the real auth routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Start Creating Free" }).first()).toHaveAttribute(
    "href",
    "/auth/register?next=%2Feditor",
  );
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/auth/login?next=%2Feditor",
  );
  await expect(page.getByRole("link", { name: "See How It Works" })).toHaveAttribute(
    "href",
    "#how-it-works",
  );
});

test("protected editor redirects logged-out users to login", async ({ page }) => {
  await page.goto("/editor");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Feditor$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("mobile navigation is accessible and the homepage has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(page.getByRole("button", { name: "Close navigation menu" })).toBeVisible();

  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation.getByRole("link", { name: "Pricing" })).toBeVisible();
  await mobileNavigation.getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/#pricing$/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("pricing reflects available Free access and disabled future subscriptions", async ({ page }) => {
  await page.goto("/#pricing");
  const pricing = page.locator("#pricing");

  await expect(pricing.getByRole("heading", { name: "Free" })).toBeVisible();
  await expect(pricing.getByRole("heading", { name: "Creator" })).toBeVisible();
  await expect(pricing.getByRole("heading", { name: "Pro" })).toBeVisible();
  await expect(pricing.getByRole("button", { name: "Coming soon" })).toHaveCount(2);
  await expect(pricing.getByRole("link", { name: "Start Free" })).toHaveAttribute(
    "href",
    "/auth/register?next=%2Feditor",
  );

  await expect(page.getByText("2 credits", { exact: true })).toBeVisible();
  await expect(page.getByText("4 credits", { exact: true })).toBeVisible();
  await expect(page.getByText("8 credits", { exact: true })).toBeVisible();
});
