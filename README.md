# Planogram

Retail shelf layout editor — place SKUs on shelves in millimeters, adjust facings, and export SVG.

## Stack

- Next.js 16 (App Router) + React 19
- PostgreSQL + Prisma 7
- Tailwind CSS 4 + shadcn/ui
- Pure TypeScript placement engine (`lib/planogram-engine`)

## Getting started

```bash
pnpm install
cp .env.example .env   # set DATABASE_URL
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript (`tsc --noEmit`) |
| `pnpm test` | Vitest unit tests (engine) |
| `pnpm test:e2e` | Playwright smoke (home / planograms / SKUs) |
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

- Roadmap: [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md)
- Design system: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
