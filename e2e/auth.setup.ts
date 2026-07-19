import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

const email = process.env.E2E_TEST_EMAIL ?? "e2e@test.local";
const password = process.env.E2E_TEST_PASSWORD ?? "testpassword123";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  // exact: avoid matching the show/hide toggle (aria-label "Show password")
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/planograms$/);
}

setup("authenticate", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  const registered = await page
    .waitForURL(/\/planograms$/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!registered) {
    await signIn(page);
  }

  await page.context().storageState({ path: authFile });
});
