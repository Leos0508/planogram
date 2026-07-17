import { expect, test } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage loads with brand and primary actions", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Planogram" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Planograms" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "SKUs" }).first()).toBeVisible();
  });

  test("unauthenticated users are redirected to login from planograms", async ({
    page,
  }) => {
    await page.goto("/planograms");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("nav planograms link redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Planograms" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated users are redirected to login from settings", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page has no app navbar", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });
});

test.describe("authenticated smoke", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("planograms page is reachable from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Planograms" }).click();
    await expect(page).toHaveURL(/\/planograms$/);
    await expect(
      page.getByRole("heading", { name: /planograms/i }),
    ).toBeVisible();
  });

  test("skus page is reachable from nav", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "SKUs" }).click();
    await expect(page).toHaveURL(/\/skus$/);
    await expect(page.getByRole("heading", { name: /skus/i })).toBeVisible();
  });

  test("planograms page loads when signed in", async ({ page }) => {
    await page.goto("/planograms");
    await expect(
      page.getByRole("heading", { name: /planograms/i }),
    ).toBeVisible();
  });

  test("skus page loads when signed in", async ({ page }) => {
    await page.goto("/skus");
    await expect(page.getByRole("heading", { name: /skus/i })).toBeVisible();
  });

  test("settings pages are reachable from user menu", async ({ page }) => {
    await page.goto("/planograms");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: /E2E User|e2e@test\.local|Account/ })
      .click();
    await page.getByRole("menuitem", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Workspace", exact: true }),
    ).toBeVisible();
    await page.getByRole("complementary").getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Create invite link|Copy link/ }),
    ).toBeVisible();
    await page.getByRole("complementary").getByRole("link", { name: "Account" }).click();
    await expect(page).toHaveURL(/\/settings\/account$/);
    await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();
  });

  test("owner can create an invite link on members settings", async ({
    page,
  }) => {
    await page.goto("/settings/members");
    await expect(page.getByRole("heading", { level: 1, name: "Members" })).toBeVisible();

    const createButton = page.getByRole("button", { name: "Create invite link" });
    const copyButton = page.getByRole("button", { name: "Copy link" });

    if (await createButton.isVisible()) {
      await createButton.click();
    }

    await expect(copyButton).toBeVisible();
    await expect(page.locator("code")).toContainText("/invite/");
  });

  test("account settings shows delete account danger zone", async ({
    page,
  }) => {
    await page.goto("/settings/account");
    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Danger zone" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Delete account" }),
    ).toBeVisible();
  });
});
