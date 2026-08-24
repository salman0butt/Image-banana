import { expect, test } from "@playwright/test";

test("public homepage renders without authentication and without browser errors", async ({
  page,
  request,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (failedRequest) => {
    failedRequests.push(`${failedRequest.method()} ${failedRequest.url()}`);
  });

  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Describe the change. Keep creating." }),
  ).toBeVisible();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
  await expect(
    page.getByAltText("Original studio scene with a yellow lounge chair shown inside the editor preview"),
  ).toBeVisible();
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#pricing")).toBeAttached();
  await expect(page.locator("#faq")).toBeAttached();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("marketing navigation reaches Features, Pricing, and FAQ", async ({ page }) => {
  await page.goto("/");

  for (const [label, hash] of [
    ["Features", "#features"],
    ["Pricing", "#pricing"],
    ["FAQ", "#faq"],
  ] as const) {
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: label })
      .click();
    await expect(page).toHaveURL(new RegExp(`${hash}$`));
    await expect(page.locator(hash)).toBeInViewport();
  }
});

test("logged-out conversion links use the real auth routes", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("link", { name: "Start Creating Free" }).first(),
  ).toHaveAttribute("href", "/auth/register?next=%2Feditor");
  await expect(page.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/auth/login?next=%2Feditor",
  );
  await expect(
    page.getByRole("link", { name: "See How It Works" }),
  ).toHaveAttribute("href", "#how-it-works");
});

test("protected editor redirects logged-out users to login", async ({ page }) => {
  await page.goto("/editor");

  await expect(page).toHaveURL(/\/auth\/login\?next=%2Feditor$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("mobile navigation is accessible and supported widths avoid horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(
    page.getByRole("button", { name: "Close navigation menu" }),
  ).toBeVisible();

  const mobileNavigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  await expect(
    mobileNavigation.getByRole("link", { name: "Pricing" }),
  ).toBeVisible();
  await mobileNavigation.getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/#pricing$/);

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(false);
  }
});

test("Free, Creator, and Pro are fully defined and selectable", async ({ page }) => {
  await page.goto("/#pricing");
  const pricing = page.locator("#pricing");

  for (const plan of ["Free", "Creator", "Pro"] as const) {
    await expect(
      pricing.getByRole("heading", { name: plan, exact: true }),
    ).toBeVisible();
  }

  await expect(pricing.getByText("$0", { exact: true })).toBeVisible();
  await expect(pricing.getByText("$12", { exact: true })).toBeVisible();
  await expect(pricing.getByText("$29", { exact: true })).toBeVisible();
  await expect(pricing.getByText("300 credits each month")).toBeVisible();
  await expect(pricing.getByText("1,000 credits each month")).toBeVisible();
  await expect(pricing.getByText(/Coming soon/i)).toHaveCount(0);

  await expect(
    pricing.getByRole("link", { name: "Start Free" }),
  ).toHaveAttribute("href", "/auth/register?next=%2Feditor");
  await expect(
    pricing.getByRole("link", { name: "Choose Creator" }),
  ).toHaveAttribute(
    "href",
    "/auth/register?next=%2Faccount%3Fplan%3Dcreator",
  );
  await expect(
    pricing.getByRole("link", { name: "Choose Pro" }),
  ).toHaveAttribute(
    "href",
    "/auth/register?next=%2Faccount%3Fplan%3Dpro",
  );

  await expect(
    page.getByRole("heading", { name: "Fast", exact: true }).locator(".."),
  ).toContainText("2 credits");
  await expect(
    page.getByRole("heading", { name: "Balanced", exact: true }).locator(".."),
  ).toContainText("4 credits");
  await expect(
    page.getByRole("heading", { name: "Quality", exact: true }).locator(".."),
  ).toContainText("8 credits");
});
