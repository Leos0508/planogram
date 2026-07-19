import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

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

async function createWorkspace(page: Page, name: string) {
  await openWorkspaceMenu(page);
  await page.getByRole("menuitem", { name: "Create workspace" }).click();
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

    await page.goto("/settings/members");
    await expect(page.getByLabel("Settings")).toContainText(hostWorkspace, {
      ignoreCase: true,
    });

    const createButton = page.getByRole("button", { name: "Create invite link" });
    if (await createButton.isVisible()) {
      await createButton.click();
    }
    await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
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
      guestPage.getByRole("button", { name: namePattern(`Switch to ${hostWorkspace}`) }),
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
