import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

/** Orphan names left by failed/retried creates under the free owned-workspace cap. */
const TEMP_WORKSPACE_NAME = /^(Smoke B|Invite Host)\b/i;

function namePattern(name: string): RegExp {
  return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

async function activeWorkspaceName(page: Page): Promise<string> {
  const switcher = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Switch workspace" });
  const label = switcher.locator("span").first();
  return ((await label.textContent()) ?? "").trim();
}

async function expectActiveWorkspace(page: Page, name: string) {
  await expect(
    page
      .getByRole("navigation", { name: "Main" })
      .getByRole("button", { name: "Switch workspace" }),
  ).toContainText(name, { ignoreCase: true });
}

async function openWorkspaceMenu(page: Page) {
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Switch workspace" })
    .click();
  await expect(page.getByRole("menu", { name: "Workspaces" })).toBeVisible();
}

async function closeWorkspaceMenu(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Workspaces" })).toBeHidden();
}

/**
 * Delete leftover Smoke/Invite Host workspaces so retries do not hit the free
 * owned-workspace hard cap (3).
 */
async function pruneTempOwnedWorkspaces(page: Page, keepName: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.goto("/planograms");
    await openWorkspaceMenu(page);
    const createItem = page.getByRole("menuitem", { name: "Create workspace" });
    if (await createItem.isEnabled()) {
      await closeWorkspaceMenu(page);
      return;
    }

    const radios = page.getByRole("menuitemradio");
    const count = await radios.count();
    let target: string | null = null;
    for (let i = 0; i < count; i++) {
      const label = ((await radios.nth(i).textContent()) ?? "").trim();
      if (
        TEMP_WORKSPACE_NAME.test(label) &&
        !label.toLowerCase().includes(keepName.toLowerCase())
      ) {
        target = label;
        break;
      }
    }

    if (!target) {
      await closeWorkspaceMenu(page);
      throw new Error(
        "Create workspace is disabled and no temporary workspaces remain to prune",
      );
    }

    await page.getByRole("menuitemradio", { name: namePattern(target) }).click();
    await expectActiveWorkspace(page, target);
    await deleteActiveWorkspace(page, target);
  }
}

async function createWorkspace(page: Page, name: string) {
  await pruneTempOwnedWorkspaces(page, name);
  await openWorkspaceMenu(page);
  const createItem = page.getByRole("menuitem", { name: "Create workspace" });
  await expect(createItem).toBeEnabled();
  await createItem.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expectActiveWorkspace(page, name);
}

async function switchToWorkspace(page: Page, name: string) {
  await openWorkspaceMenu(page);
  await page.getByRole("menuitemradio", { name: namePattern(name) }).click();
  await expectActiveWorkspace(page, name);
}

async function deleteActiveWorkspace(page: Page, workspaceName: string) {
  await page.goto("/settings");
  await expect(page.getByLabel("Settings")).toContainText(workspaceName, {
    ignoreCase: true,
  });
  await page.getByRole("button", { name: "Delete workspace", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Workspace name").fill(workspaceName);
  await dialog
    .getByRole("button", { name: "Delete workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/\/planograms$/);
}

async function ensureInviteLink(page: Page) {
  const createButton = page.getByRole("button", { name: "Create invite link" });
  const copyButton = page.getByRole("button", { name: "Copy link" });

  if (await copyButton.isVisible().catch(() => false)) {
    return;
  }

  await expect(createButton).toBeVisible();
  await createButton.click();
  await expect(copyButton).toBeVisible({ timeout: 15_000 });
}

test.describe("multi-workspace smoke", () => {
  test.use({ storageState: "e2e/.auth/user.json" });
  test.describe.configure({ timeout: 90_000 });

  test("create → switch → settings context → sole-owner delete", async ({
    page,
  }) => {
    const stamp = Date.now();
    const workspaceB = `Smoke B ${stamp}`;

    await page.goto("/planograms");
    const homeWorkspace = await activeWorkspaceName(page);

    await createWorkspace(page, workspaceB);
    try {
      await expect(page).toHaveURL(/\/planograms$/);
      await expect(page.getByText("No planograms yet")).toBeVisible();

      await page.goto("/settings");
      await expect(page.getByLabel("Settings")).toContainText(workspaceB, {
        ignoreCase: true,
      });
      await expect(
        page.getByRole("heading", { level: 1, name: "Workspace", exact: true }),
      ).toBeVisible();

      await switchToWorkspace(page, homeWorkspace);
      await page.goto("/settings");
      await expect(page.getByLabel("Settings")).toContainText(homeWorkspace, {
        ignoreCase: true,
      });

      await switchToWorkspace(page, workspaceB);
      await deleteActiveWorkspace(page, workspaceB);
      await expectActiveWorkspace(page, homeWorkspace);
    } catch (error) {
      await page.goto("/planograms").catch(() => undefined);
      const active = await activeWorkspaceName(page).catch(() => "");
      if (TEMP_WORKSPACE_NAME.test(active)) {
        await deleteActiveWorkspace(page, active).catch(() => undefined);
      }
      throw error;
    }
  });

  test("invite second user; OWNER leave/delete blocked until sole", async ({
    page,
    browser,
  }) => {
    const stamp = Date.now();
    const hostWorkspace = `Invite Host ${stamp}`;
    const guestEmail = `e2e-guest-${stamp}@test.local`;
    const guestPassword = "testpassword123";

    await page.goto("/planograms");
    const homeWorkspace = await activeWorkspaceName(page);

    await createWorkspace(page, hostWorkspace);
    try {
      await page.goto("/settings/members");
      await expect(page.getByLabel("Settings")).toContainText(hostWorkspace, {
        ignoreCase: true,
      });

      await ensureInviteLink(page);
      const invitePath = (await page.locator("code").innerText()).trim();
      expect(invitePath).toContain("/invite/");

      const guest = await browser.newContext();
      const guestPage = await guest.newPage();
      await guestPage.goto("/register");
      await guestPage.getByLabel("Name").fill(`Guest ${stamp}`);
      await guestPage.getByLabel("Email").fill(guestEmail);
      await guestPage.getByLabel("Password", { exact: true }).fill(guestPassword);
      await guestPage.getByRole("button", { name: "Create account" }).click();
      await expect(guestPage).toHaveURL(/\/planograms$/);

      await guestPage.goto(invitePath);
      await guestPage.getByRole("button", { name: "Accept invite" }).click();
      await expect(
        guestPage.getByRole("button", {
          name: namePattern(`Switch to ${hostWorkspace}`),
        }),
      ).toBeVisible();
      await guestPage
        .getByRole("button", { name: namePattern(`Switch to ${hostWorkspace}`) })
        .click();
      await expect(guestPage).toHaveURL(/\/planograms$/);
      await expectActiveWorkspace(guestPage, hostWorkspace);

      await page.goto("/settings");
      await expect(page.getByRole("link", { name: "Go to Members" }).first()).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Leave workspace", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Delete workspace", exact: true }),
      ).toHaveCount(0);

      await guestPage.goto("/settings");
      await guestPage.getByRole("button", { name: "Leave workspace", exact: true }).click();
      await guestPage
        .getByRole("dialog")
        .getByRole("button", { name: "Leave workspace", exact: true })
        .click();
      await expect(guestPage).toHaveURL(/\/planograms$/);

      await guest.close();

      await deleteActiveWorkspace(page, hostWorkspace);
      await expectActiveWorkspace(page, homeWorkspace);
    } catch (error) {
      await page.goto("/planograms").catch(() => undefined);
      const active = await activeWorkspaceName(page).catch(() => "");
      if (TEMP_WORKSPACE_NAME.test(active)) {
        await deleteActiveWorkspace(page, active).catch(() => undefined);
      }
      throw error;
    }
  });

  test("single active workspace still shows settings context", async ({
    page,
  }) => {
    await page.goto("/settings");
    const activeName = await activeWorkspaceName(page);
    await expect(page.getByLabel("Settings")).toContainText(activeName, {
      ignoreCase: true,
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Workspace", exact: true }),
    ).toBeVisible();
  });
});
