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
});
