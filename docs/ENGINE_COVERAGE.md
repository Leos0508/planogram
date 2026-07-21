# Planogram engine coverage (PLA-10)

Snapshot of unit-test coverage for `lib/planogram-engine` (Vitest + `@vitest/coverage-v8`).

**Command:**

```bash
./node_modules/.bin/vitest run --coverage lib/planogram-engine
```

Or after `pnpm install` succeeds: `pnpm test -- --coverage lib/planogram-engine`.

## Latest report (2026-07-21)

| Scope | Stmts | Branch | Funcs | Lines |
| --- | ---: | ---: | ---: | ---: |
| **All `lib/planogram-engine`** | **81.55%** | 71.33% | 82.17% | 83.96% |
| `layout.ts` | 90.24% | 88.23% | 93.75% | 92.1% |
| `placement.ts` | 92.59% | 87.5% | 100% | 91.66% |
| `snap.ts` | 98.27% | 92.85% | 100% | 98.14% |
| `project-drop.ts` | 77.55% | 64% | 62.5% | 79.54% |
| `shelf-helpers.ts` | 51.42% | 14.28% | 58.33% | 56.25% |
| `coords.ts` | 50% | 0% | 50% | 50% |

**Target:** ≥80% statement awareness on placement/layout — **met** (`layout` / `placement` both ≥90%; package overall ≥80%).

**Gaps (not blocking):** lower coverage in `shelf-helpers.ts`, `coords.ts`, and some `project-drop` branches. No critical bugs filed from this pass.

## Manual: multi-item canvas width regression

Use an empty or demo planogram with write access:

1. Set **Fixture width** in settings to **800 mm** (or drag the shelf right edge) → empty shelves render at ~800 mm, not stuck at 200 mm.
2. Place two+ SKUs on one shelf near the right edge → canvas width grows with content when items exceed min width.
3. Try to place past the fixture band → drop rejected (`OUT_OF_BAND`); widen fixture → placement succeeds.
4. Multi-shelf: shared fixture width stays in sync after settings save or width drag.
5. Reload the planogram → width persists.

Related: [PLA-8](https://linear.app/planogram/issue/PLA-8/per-shelf-fixed-fixture-width) (settings + `minContentWidthMm`).
