// Prefer the same env layering as Next.js: `.env` then `.env.local` (local wins).
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { defineConfig } from "prisma/config";

/**
 * Migrations / introspect need a **direct** (non-pooler) Postgres URL.
 * Runtime app traffic should use the pooled `DATABASE_URL` (see `lib/prisma.ts`).
 */
const migrateUrl =
  process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"];

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl,
  },
});
