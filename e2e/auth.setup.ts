import { expect, test as setup } from "@playwright/test";
import { hash } from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const authFile = "e2e/.auth/user.json";

const email = process.env.E2E_TEST_EMAIL ?? "e2e@test.local";
const password = process.env.E2E_TEST_PASSWORD ?? "testpassword123";

setup("authenticate", async ({ page }) => {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const passwordHash = await hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "E2E User",
      passwordHash,
    },
  });
  await prisma.$disconnect();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/planograms$/);

  await page.context().storageState({ path: authFile });
});
