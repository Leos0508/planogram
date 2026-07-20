# Planogram

Retail shelf layout editor — place SKUs on shelves in millimeters, adjust facings, and export SVG/PDF.

## Stack

- Next.js 16 (App Router) + React 19
- PostgreSQL + Prisma 7
- Tailwind CSS 4 + shadcn/ui
- Pure TypeScript placement engine (`lib/planogram-engine`)
- Auth.js · Stripe · Resend · Vercel Blob · Sentry (optional DSN)

## Getting started

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL and AUTH_SECRET
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm test` | Vitest unit tests (engine) |
| `pnpm test:e2e` | Playwright smoke (auth, catalogs, settings) + multi-workspace (`e2e/multi-workspace.spec.ts`) |
| `pnpm build` / `pnpm start` | Production build |

First E2E run installs Chromium via Playwright:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

1. **Quality** — `prisma generate`, lint, typecheck, unit tests
2. **E2E** — Postgres service, migrate, seed, build, Playwright smoke

## Docs

- Roadmap: [Linear — Planogram](https://linear.app/planogram/project/planogram) · [Plan 01 (complete)](https://linear.app/planogram/document/development-plan-product-ux-and-platform-plan-01-bfde90020196) · [Plan 02 (advanced)](https://linear.app/planogram/document/development-plan-advanced-product-plan-02-45e4ae89a60f)
- Design system: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- Email: [`docs/EMAIL_SETUP.md`](docs/EMAIL_SETUP.md) · [`docs/EMAIL_SMOKE_TEST.md`](docs/EMAIL_SMOKE_TEST.md)
- Billing (test): [`docs/BILLING_SMOKE_TEST.md`](docs/BILLING_SMOKE_TEST.md)
- Stripe live cutover: [`docs/STRIPE_LIVE_GO_LIVE.md`](docs/STRIPE_LIVE_GO_LIVE.md)
- Sentry: [`docs/SENTRY_SETUP.md`](docs/SENTRY_SETUP.md)
- Seed SKUs: [`docs/SEED_SKU_SPECS.md`](docs/SEED_SKU_SPECS.md)
- SKU batch import: [`docs/SKU_IMPORT.md`](docs/SKU_IMPORT.md) · [`docs/examples/sku-import-example.csv`](docs/examples/sku-import-example.csv)
- Parametric can/bottle packaging: [`docs/SKU_PACKAGING.md`](docs/SKU_PACKAGING.md)
- Blob: [`docs/BLOB_SMOKE_TEST.md`](docs/BLOB_SMOKE_TEST.md)
- Workspace: [`docs/WORKSPACE_MIGRATION.md`](docs/WORKSPACE_MIGRATION.md) · [`docs/WORKSPACE_TENANCY_TEST.md`](docs/WORKSPACE_TENANCY_TEST.md)
