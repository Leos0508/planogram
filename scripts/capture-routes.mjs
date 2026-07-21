/**
 * Capture full-page screenshots for Plan 02 S5 UI audit.
 *
 * Covers public auth pages, catalog shells, settings sub-routes (incl. billing),
 * SKU packaging editor, and planogram editor 2D + 3D. Authenticated surfaces
 * are captured in both light and dark themes (next-themes `theme` localStorage).
 *
 * Prerequisites:
 *   - App running at PLAYWRIGHT_BASE_URL (default http://localhost:3000;
 *     must match AUTH_URL — use 127.0.0.1 only if the server was started on that host)
 *   - Local DB migrated (`pnpm db:migrate`); catalog auto-seeds on register
 *   - Chromium installed: `pnpm exec playwright install chromium`
 *   - E2E user can register/sign in (defaults below)
 *
 * Usage:
 *   pnpm screenshots
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm screenshots
 *
 * Output: e2e/screenshots/*.png (gitignored except .gitignore)
 *
 * See docs/UI_SCREENSHOT_AUDIT.md
 */

import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const outDir = path.resolve("e2e/screenshots");
const email = process.env.E2E_TEST_EMAIL ?? "e2e@test.local";
const password = process.env.E2E_TEST_PASSWORD ?? "testpassword123";

/** Clear prior PNG artifacts so review folders stay current. */
function resetOutDir() {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, ".gitignore"), "*\n!.gitignore\n");
  for (const entry of readdirSync(outDir)) {
    if (entry.endsWith(".png")) {
      unlinkSync(path.join(outDir, entry));
    }
  }
}
/** @typedef {"light" | "dark"} ColorTheme */

/** @type {{ path: string; name: string }[]} */
const publicRoutes = [
  { path: "/login", name: "login" },
  { path: "/register", name: "register" },
  { path: "/forgot-password", name: "forgot-password" },
];

/** Catalog + settings shells (Workspace / Members / Billing / Account). */
/** @type {{ path: string; name: string }[]} */
const authenticatedShellRoutes = [
  { path: "/planograms", name: "planograms" },
  { path: "/skus", name: "skus" },
  { path: "/settings", name: "settings-workspace" },
  { path: "/settings/members", name: "settings-members" },
  { path: "/settings/billing", name: "settings-billing" },
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
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function captureCurrent(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const pathname = new URL(page.url()).pathname;
  console.log(`  ✓ ${pathname} → ${path.relative(process.cwd(), file)}`);
}

/**
 * Apply next-themes preference and wait for the `dark` class to match.
 * @param {import('@playwright/test').Page} page
 * @param {ColorTheme} theme
 */
async function setTheme(page, theme) {
  await page.evaluate((value) => {
    localStorage.setItem("theme", value);
  }, theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    (value) => {
      const isDark = document.documentElement.classList.contains("dark");
      return value === "dark" ? isDark : !isDark;
    },
    theme,
    { timeout: 10_000 },
  );
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
  // exact: avoid matching the show/hide toggle (aria-label "Show password")
  await page.getByLabel("Password", { exact: true }).fill(password);
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
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/planograms$/, { timeout: 15_000 });
  }
}

/**
 * Open the first SKU packaging editor (seed catalog on register).
 * @param {import('@playwright/test').Page} page
 */
async function openPackagingEditor(page) {
  await page.goto(new URL("/skus", baseURL).toString(), {
    waitUntil: "networkidle",
  });
  const editorLink = page
    .getByRole("link", { name: /Open packaging editor/i })
    .first();
  await editorLink.waitFor({ state: "visible", timeout: 15_000 });
  await editorLink.click();
  await page.waitForURL(/\/skus\/[^/]+$/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

/**
 * Open an existing planogram or create one for editor captures.
 * @param {import('@playwright/test').Page} page
 */
async function openPlanogramEditor(page) {
  await page.goto(new URL("/planograms", baseURL).toString(), {
    waitUntil: "networkidle",
  });

  const existing = page.locator('a[href^="/planograms/"]').first();
  if ((await existing.count()) > 0) {
    await existing.click();
    await page.waitForURL(/\/planograms\/[^/]+$/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    return;
  }

  await page.getByRole("button", { name: "New planogram" }).click();
  await page.locator("#planogram-name").fill("Screenshot audit");
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/planograms\/[^/]+$/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {"2d" | "3d"} mode
 */
async function setPlanogramViewMode(page, mode) {
  if (mode === "3d") {
    const open3d = page.getByRole("button", { name: "Open 3D preview" });
    if (await open3d.isVisible().catch(() => false)) {
      await open3d.click();
      await page
        .getByRole("button", { name: "Switch to 2D editor" })
        .waitFor({ state: "visible", timeout: 10_000 });
      // Allow WebGL canvas a beat to paint.
      await page.waitForTimeout(500);
    }
    return;
  }

  const back2d = page.getByRole("button", { name: "Switch to 2D editor" });
  if (await back2d.isVisible().catch(() => false)) {
    await back2d.click();
    await page
      .getByRole("button", { name: "Open 3D preview" })
      .waitFor({ state: "visible", timeout: 10_000 });
  }
}

async function main() {
  resetOutDir();

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

    /** @type {ColorTheme[]} */
    const themes = ["light", "dark"];

    for (const theme of themes) {
      console.log(`Authenticated shells (${theme})`);
      await setTheme(page, theme);
      for (const route of authenticatedShellRoutes) {
        await capture(page, route.path, `${route.name}-${theme}`);
      }
      console.log("");
    }

    for (const theme of themes) {
      console.log(`Editors (${theme})`);
      await setTheme(page, theme);

      await openPackagingEditor(page);
      await captureCurrent(page, `sku-packaging-editor-${theme}`);

      await openPlanogramEditor(page);
      await setPlanogramViewMode(page, "2d");
      await captureCurrent(page, `planogram-editor-2d-${theme}`);

      await setPlanogramViewMode(page, "3d");
      await captureCurrent(page, `planogram-editor-3d-${theme}`);
      console.log("");
    }

    console.log("Done.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
