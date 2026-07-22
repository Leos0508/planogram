# UI screenshot audit (`pnpm screenshots`)

Evidence base for owner UI review ([PLA-94](https://linear.app/planogram/issue/PLA-94/expand-playwright-screenshot-capture-for-ui-audit), [PLA-95](https://linear.app/planogram/issue/PLA-95/owner-ui-screenshot-review-and-refinement-backlog)). Plan 02 S5 complete.

## Prerequisites

1. Local Postgres with migrations applied (`pnpm db:migrate`)
2. Optional seed for legacy demo data (`pnpm db:seed`) — not required; register seeds a personal catalog
3. Dev (or prod) server on the capture URL (default `http://localhost:3000`; must match `AUTH_URL`)
4. Chromium for Playwright: `pnpm exec playwright install chromium`

## Run

```bash
pnpm dev
# other terminal:
pnpm screenshots
```

Override URL or E2E credentials if needed:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 \
E2E_TEST_EMAIL=e2e@test.local \
E2E_TEST_PASSWORD=testpassword123 \
pnpm screenshots
```

If the app is bound to `127.0.0.1` (Playwright E2E webServer style), set `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000` and ensure `AUTH_URL` matches that host.

## Output

PNGs land in `e2e/screenshots/` (gitignored except `.gitignore`). Named captures include:

| Pattern | What |
| --- | --- |
| `login.png`, `register.png`, `forgot-password.png` | Public auth |
| `planograms-{light,dark}.png`, `skus-{light,dark}.png` | Catalog shells |
| `settings-*-{light,dark}.png` | Workspace, Members, Billing, Account |
| `sku-packaging-editor-{light,dark}.png` | `/skus/[id]` packaging editor |
| `planogram-editor-2d-{light,dark}.png` | Planogram editor 2D |
| `planogram-editor-3d-{light,dark}.png` | Planogram editor 3D (toolbar cube toggle) |

Themes use `next-themes` via `localStorage.theme` (`light` / `dark`).

## Notes

- Same E2E register/sign-in pattern as Playwright smoke (`e2e@test.local`).
- If the workspace has no planogram, the script creates **Screenshot audit**.
- This is a **review artifact** runner — not a visual-regression CI gate.
- Script: `scripts/capture-routes.mjs`.
