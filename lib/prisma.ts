import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Runtime connection string for serverless (Vercel).
 * Prefer the pooled URL (`DATABASE_URL`); fall back to direct for local-only setups.
 */
function runtimeDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required (use a pooled Neon/PgBouncer URL on Vercel).",
    );
  }
  return url;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: runtimeDatabaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
