import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const LEGACY_WORKSPACE_ID = "legacy-workspace";

async function main() {
  console.log("Seeding database...");

  const workspace = await prisma.workspace.upsert({
    where: { id: LEGACY_WORKSPACE_ID },
    update: {
      name: "Legacy workspace",
      slug: "legacy",
    },
    create: {
      id: LEGACY_WORKSPACE_ID,
      name: "Legacy workspace",
      slug: "legacy",
    },
  });

  // --- SKUs (Phase 0: hardcoded footprints) ---
  const skus = [
    {
      sku: "COKE-355",
      name: "Coca-Cola 355ml Can",
      width: 65,
      height: 122,
    },
    {
      sku: "WATER-500",
      name: "Water Bottle 500ml",
      width: 70,
      height: 210,
    },
    {
      sku: "CHIPS-150",
      name: "Potato Chips 150g",
      width: 180,
      height: 280,
    },
  ];

  for (const data of skus) {
    await prisma.sKU.upsert({
      where: {
        workspaceId_sku: {
          workspaceId: workspace.id,
          sku: data.sku,
        },
      },
      update: {
        name: data.name,
        width: data.width,
        height: data.height,
      },
      create: {
        workspaceId: workspace.id,
        ...data,
      },
    });
  }

  // --- Optional: demo planogram for editor dev ---
  const demo = await prisma.planogram.upsert({
    where: { id: "demo-planogram" },
    update: {
      workspaceId: workspace.id,
    },
    create: {
      id: "demo-planogram",
      workspaceId: workspace.id,
      name: "Demo Planogram",
      topClearance: 8,
      stackGap: 2,
      shelves: {
        create: [{ index: 0 }, { index: 1 }, { index: 2 }],
      },
    },
    include: { shelves: true },
  });

  console.log(`Seeded workspace ${workspace.slug}`);
  console.log(`Seeded ${skus.length} SKUs`);
  console.log(`Demo planogram: ${demo.name} (${demo.shelves.length} shelves)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
