/**
 * Capture full-page screenshots of public + authenticated app routes
 * (including every settings sub-route).
 *
 * Prerequisites:
 *   - App running at PLAYWRIGHT_BASE_URL (default http://127.0.0.1:3000)
 *   - Chromium installed: pnpm exec playwright install chromium
 *
 * Usage:
 *   pnpm screenshots
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm screenshots
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = path.resolve("e2e/screenshots");
const email = process.env.E2E_TEST_EMAIL ?? "e2e@test.local";
const password = process.env.E2E_TEST_PASSWORD ?? "testpassword123";

/** @type {{ path: string; name: string }[]} */
const publicRoutes = [
  { path: "/login", name: "login" },
  { path: "/register", name: "register" },
];

/** Catalog + settings shell (Workspace / Members / Account). */
/** @type {{ path: string; name: string }[]} */
const authenticatedRoutes = [
  { path: "/planograms", name: "planograms" },
  { path: "/skus", name: "skus" },
  { path: "/settings", name: "settings-workspace" },
  { path: "/settings/members", name: "settings-members" },
  { path: "/settings/account", name: "settings-account" },
];

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} routePath
 * @param {string} name
 */
async function capture(page, routePath, name) {
  const url = new URL(routePath, baseURL).toString();
  await page.goto(url, { waitUntil: "networkidle" });
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ✓ ${routePath} → ${path.relative(process.cwd(), file)}`);
}

/**
 * Register or sign in so authenticated routes load with app chrome.
 * @param {import('@playwright/test').Page} page
 */
async function ensureSignedIn(page) {
  await page.goto(new URL("/register", baseURL).toString(), {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  const registered = await page
    .waitForURL(/\/planograms$/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!registered) {
    await page.goto(new URL("/login", baseURL).toString(), {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/planograms$/, { timeout: 15_000 });
  }
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, ".gitignore"), "*\n!.gitignore\n");

  console.log(`Base URL: ${baseURL}`);
  console.log(`Output:   ${outDir}\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    console.log("Public routes");
    for (const route of publicRoutes) {
      await capture(page, route.path, route.name);
    }

    console.log("\nAuth");
    await ensureSignedIn(page);
    console.log("  ✓ signed in\n");

    console.log("Authenticated routes (incl. settings)");
    for (const route of authenticatedRoutes) {
      await capture(page, route.path, route.name);
    }

    console.log("\nDone.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
