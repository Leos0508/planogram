# Planogram — Development Status & Roadmap

> Last updated: July 12, 2026  
> Vision: **Figma-for-planograms** — engine-first 2D editor with future PDF / 3D export.

---

## Version milestones

| Milestone | Definition | Status |
|-----------|------------|--------|
| **v0 (editor MVP)** | Edit an existing planogram with real SKUs; place, move, delete items; changes persist after refresh | ✅ **Complete** |
| **v0.5 (self-serve)** | Create planograms + manage SKU catalog + basic settings | ✅ **Complete** |
| **v1 (product)** | Undo/redo, facings, export PDF, polished keyboard workflow | ✅ **Complete** |

**v0.5 exit criteria (met):** Create SKUs and planograms from the UI without seed data; edit planogram settings and shelves from the editor sidebar.

---

## 1. Project overview

| Layer | Stack |
|-------|-------|
| Framework | Next.js 16 (App Router), React 19 |
| Database | PostgreSQL + Prisma 7 |
| UI | Tailwind CSS 4, shadcn/ui, Lucide |
| Core logic | Pure TypeScript planogram engine (millimeters) |
| Tests | Vitest (engine) + Playwright (E2E smoke) + GitHub Actions CI |

**Units:** All placement math runs in **mm**. The UI converts via `PX_PER_MM = 0.5` (1 mm → 0.5 px).

---

## 2. Current progress

### ✅ Done — Data layer

- [x] Prisma schema: `SKU`, `Planogram`, `PlanogramShelf`, `PlanogramItem`
- [x] Initial migration (`20260704115228_init_planogram_schema`)
- [x] `stackIndex` migration (`20260709055620_add_stack_index_to_planogram_item`)
- [x] Seed script (3 demo SKUs + demo planogram with 3 shelves)
- [x] Read queries: `getPlanograms`, `getPlanogram`, `getSkus`
- [x] Write actions: `placePlanogramItem`, `removePlanogramItem`, `updatePlanogramItemPosition`
- [x] Catalog actions: planogram CRUD + shelves (`lib/planograms/actions.ts`); SKU CRUD (`lib/skus/actions.ts`)
- [x] `QueryResult<T>` + `ActionResult<T>` error pattern
- [x] `isOk()` type guard in `lib/result.ts`

### ✅ Done — Planogram engine (`lib/planogram-engine/`)

Pure TS, no React dependencies. Intended for 2D editor, PDF, and 3D preview.

| Module | Purpose |
|--------|---------|
| `types` | Domain types (`PlanogramState`, `PlanogramLayout`, …) |
| `constant` | Tunables (`PX_PER_MM`, snap threshold, min shelf sizes) |
| `coords` | Pointer px ↔ mm, planogram space conversion |
| `layout` | Dynamic shelf rows, item rects, bounds, content width |
| `drop-zone` | Shelf hit-testing for drops (Y-axis content band) |
| `snap` | Edge snap to sibling items on same shelf / stack |
| `placement` | Collision detection (same `stackIndex`) |
| `project-drop` | Pointer → shelf + x placement projection |
| `adapter` | `PlanogramDetail` → `PlanogramState` |

**Layout model (shelf row):**

```
[ topClearance band ]
[ item content area ]  ← min 500 mm height per row
[ shelf line ]
```

- Shelf **Y** is derived from stacked content (tallest item + `topClearance`).
- Shelf **width** grows with rightmost item (`contentWidthMm`); 200 mm minimum when empty.
- Items store `(shelfId, x, stackIndex)`; Y is computed from shelf line + stack.

### ✅ Done — Editor UI (v0)

| Feature | Status |
|---------|--------|
| Planogram list page (`/planograms`) | Create, list, delete |
| SKUs page (`/skus`) | List, create, edit, delete |
| Planogram settings (sidebar) | Name, topClearance, stackGap, add/remove shelves |
| Planogram editor (`/planograms/[id]`) | Functional |
| Collapsible sidebar + SKU bottom tray | Independent toggle |
| Checkered canvas background | Done |
| Pan / zoom viewport | Scroll zoom, middle-mouse pan, fit-to-view |
| Drag SKU from tray → shelf | Ghost preview, green/red validity |
| Move existing items on canvas | `projectHorizontalDrag` wired |
| Delete item | Select + Delete/Backspace |
| Selection state | Click item to select; click canvas to deselect |
| Horizontal item snap | Left/right/center edges, screen-space threshold |
| Shelf drop zones | Y content band; excludes `topClearance` |
| DB persistence | Optimistic updates + server actions; rollback on failure |
| Escape cancels drag | Done |

**Key components:**

- `PlanogramEditor` / `PlanogramEditorLayout` — shell + state + mutations
- `PlanogramCanvas` — SVG render (shelves, items, ghost, selection)
- `PlanogramViewport` — pan/zoom wrapper
- `usePlanogramDrag` — palette + item drag → `projectDrop` / `projectHorizontalDrag` → commit
- `useCanvasViewport` — transform + `clientToCanvasLocal`

### ✅ Done — Engine tests

Vitest suite in `lib/planogram-engine/__tests__/` (32 tests):

- [x] `snapXToShelfItems` determinism
- [x] `resolveShelfForDrop` content bands
- [x] `computePlanogramLayout` width + shelf positions
- [x] `computeShelfPositions` row stacking
- [x] `snapThresholdMm(viewportScale)` screen-space scaling
- [x] `canPlace`, `nudgeItemX`, `projectDrop` integration
- [x] Shelf layout helpers (compact, align, distribute)
- [x] `computePlanogramLayoutCached`

**Not yet covered:** facings collision edge cases, full PDF pipeline.

### ✅ Done — v1 polish

| Area | Status |
|------|--------|
| Autosave / debounced sync | ✅ Debounced nudge (400 ms); drag/move immediate |
| Item stacking UI (`stackIndex > 0`) | Engine + DB support it; UI always uses `0` |
| Facings wide | ✅ Schema, engine, inspector, keyboard `3` / `Shift+3`, undo |
| User-facing error toasts | ✅ Toast on failed server actions |
| SKU thumbnails | ✅ Optional `imageUrl` on SKU; canvas + SVG export |
| Shelf layout helpers | ✅ Compact, left, right, center, even (inspector) |
| SVG export scaffold | ✅ Download from viewport toolbar |
| Layout cache | ✅ `computePlanogramLayoutCached` shared by editor + drag |
| CI + E2E smoke | ✅ GitHub Actions (lint/typecheck/unit) + Playwright smoke |

### ❌ Not started

- Full PDF export (print-ready multi-page)
- Facings high/deep
- Auth / multi-user
- 3D preview

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js pages (RSC)                                     │
│    getPlanogram / getSkus → PlanogramEditorLayout        │
└───────────────────────────┬─────────────────────────────┘
                            │ planogramDetailToState()
┌───────────────────────────▼─────────────────────────────┐
│  React editor (thin)                                     │
│    pointer → projectDrop → optimistic setState + action  │
│    computePlanogramLayout → PlanogramCanvas render       │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  Planogram engine (pure TS, mm)                          │
│    layout → drop-zone → snap → placement → projectDrop   │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  PostgreSQL (Prisma)                                     │
│    place / move / delete via server actions              │
└─────────────────────────────────────────────────────────┘
```

**Design principle:** Keep React thin. All placement rules live in the engine so PDF/3D can reuse the same math.

---

## 4. Schema vs engine

| Engine field | DB | Notes |
|--------------|----|-------|
| `PlanogramItem.stackIndex` | ✅ | Migration applied; UI still defaults to `0` |
| `PlanogramShelf.yMm` | ❌ Not stored | Derived at runtime (OK for now) |
| Item `width` / `height` | ✅ Stored | Snapshot from SKU at placement time |
| `PlanogramItem.x` | ✅ | Horizontal position in mm |
| `facingsWide` | ✅ | Migration `20260710100000`; unit width × facings = footprint |
| `SKU.imageUrl` | ✅ | Migration `20260710120000`; optional thumbnail URL |

---

## 5. Known issues & tech debt

### Editor / canvas

- [ ] **Canvas width regression** — Phantom margin / cropping fixes landed; needs manual regression on multi-item shelves.
- [x] ~~Active shelf not highlighted~~ — Content band highlight during drag-over.
- [ ] **Drag cursor vs ghost position** — Drop zone uses pointer ± half SKU height; edge cases near shelf boundaries may remain.
- [x] ~~fitToView on every width change~~ — Fixed: refit only on mount + panel toggle.
- [x] ~~Snap threshold world-space only~~ — Fixed: `snapThresholdMm(viewportScale)`.

### Code quality

- [x] ~~No `isOk()` guard~~ — Added to `lib/result.ts`.
- [ ] `isNotFound()` still does not narrow TypeScript types — prefer `if (!result.ok)` or `isOk()`.
- [x] ~~Duplicate layout computation per drag frame~~ — `computePlanogramLayoutCached` shared by editor and `projectDrop`.
- [x] ~~Engine test coverage incomplete~~ — Shelf positions, helpers, layout cache added; facings/projectDrop covered.
- [ ] Seed uses `upsert` with fixed planogram id comment but may fail without explicit id.

### Product

- [x] ~~Refresh loses placed items~~ — Persistence via server actions.
- [x] ~~Cannot edit or remove items~~ — Move + delete implemented.
- [ ] Empty planogram forced to 200 mm width (intentional minimum, may feel wide).
- [x] ~~No user-facing error toast~~ — `toast-provider` on failed actions.

---

## 6. Development plan

### Phase 1 — Persistence & core CRUD ✅ **Complete**

Goal: Editor changes survive refresh; minimal viable product.

1. [x] **Schema:** Add `stackIndex` to `PlanogramItem`.
2. [x] **Server actions:** place, remove, update position.
3. [x] **Wire editor:** Optimistic update + server sync in `onCommit`.
4. [x] **Load state from DB** on page load (round-trip verified).
5. [x] **Type guards:** `isOk(result)` in `lib/result.ts`.

**Exit criteria:** Place items, refresh page, items remain. ✅

---

### Phase 2 — Editor UX polish — **Mostly complete**

Goal: Feel like a real design tool.

1. [x] **Move existing items** — `projectHorizontalDrag` + canvas pointer handlers.
2. [x] **Delete item** — Select + Delete/Backspace.
3. [x] **Screen-space snap** — Viewport scale passed into snap threshold.
4. [x] **Undo / redo** — History stack with server sync (place, move, delete).
5. [x] **Autosave** — Debounced server sync for arrow-key nudge (400 ms); drag/move immediate.
6. [x] **Keyboard shortcuts** — Middle-mouse pan, Escape cancel drag, Delete remove, Ctrl+Z/Y, arrows, `3` facings.
7. [x] **Arrow-key nudge** — ±1 mm / ±10 mm (Shift) for selected item.
8. [x] **Active shelf highlight** — Content band highlight during drag-over.
9. [x] **Inspector panel** — Selected item properties overlay.

**Exit criteria:** Full edit loop without SKU tray for repositioning. ✅

---

### Phase 3 — Catalog & planogram management ✅ **Complete**

1. [x] **SKUs page** — List, create, edit footprint (width/height in mm).
2. [x] **Planogram list** — Create / delete planograms.
3. [x] **Planogram settings panel** — Edit `topClearance`, `stackGap`, name; add/remove shelves.
4. [x] **Validation** — SKU footprint required for placement; shelf min/max bounds.

**Exit criteria:** User can create a planogram and SKU catalog without touching seed data. ✅

---

### Phase 4 — Engine hardening (priority: **medium**) — **Mostly complete**

1. [x] Vitest setup + initial suite (snap, drop-zone, layout, constant).
2. [x] `canPlace` + `nudgeItemX` + `projectDrop` tests.
3. [x] Expand coverage: `computeShelfPositions`, shelf helpers, layout cache.
4. [x] **Layout cache** — `computePlanogramLayoutCached` in editor + `projectDrop`.
5. [x] **Export adapter** — `lib/planogram-export/render-svg.ts` (SVG scaffold for PDF).

---

### Phase 5 — Retail domain & output (priority: **low**)

1. [x] **Facings wide** — `facingsWide` on items; engine footprint; inspector + keyboard.
2. **Facings high/deep** — extend model (future).
3. [x] **Shelf helpers** — Compact, align left/right/center, distribute even (inspector).
4. [x] **SKU thumbnails** — Optional `imageUrl` on SKU, render in canvas + SVG export.
5. [x] **SVG export scaffold** — Download from viewport; foundation for PDF.
5. **3D preview** — Extrude items from engine layout (Three.js or similar).
6. **Multi-stack placement UI** — Shift+drop or inspector for `stackIndex > 0`.
7. **Alignment guides** — Visual snap lines (Figma-style).
8. **Per-shelf width** — Optional fixed fixture width vs content-driven.
9. **Collaboration** — Real-time or locking (far future).

---

## 7. Suggested next sprint (post-v1)

| # | Task | Effort | Phase |
|---|------|--------|-------|
| 1 | Multi-stack placement UI (`stackIndex > 0`) | M | 5 |
| 2 | Alignment guides (Figma-style snap lines) | M | 5 |
| 3 | Full PDF export (multi-page, dimensions) | L | 5 |
| 4 | Per-shelf fixed fixture width | M | 5 |
| 5 | 3D preview scaffold | L | 5 |

---

## 8. Completed sprint (July 2026) — CI + E2E hygiene

| # | Task | Status |
|---|------|--------|
| 1 | GitHub Actions CI (`lint`, `typecheck`, unit tests) | ✅ |
| 2 | Playwright E2E smoke (home / planograms / SKUs) | ✅ |
| 3 | `pnpm typecheck` + `pnpm test:e2e` scripts | ✅ |
| 4 | Docs + lockfile hygiene (`pnpm-workspace.yaml` fix) | ✅ |

---

## 9. Completed sprint (July 2026) — v1 export + shelf tools

| # | Task | Status |
|---|------|--------|
| 1 | SKU thumbnails (`imageUrl` + canvas render) | ✅ |
| 2 | SVG export scaffold (download button) | ✅ |
| 3 | Shelf helpers (compact, align, even) | ✅ |
| 4 | Debounced autosave for nudge | ✅ |
| 5 | `computeShelfPositions` tests | ✅ |
| 6 | Layout cache | ✅ |

---

## 10. Completed sprint (July 2026) — v1 facings + polish

| # | Task | Status |
|---|------|--------|
| 1 | Facings wide (schema, engine, UI, undo) | ✅ |
| 2 | Error toasts for failed actions | ✅ |
| 3 | `projectDrop` integration tests | ✅ |
| 4 | Collapsible commands panel | ✅ |
| 5 | Middle-mouse-only canvas pan | ✅ |

---

## 11. Completed sprint (July 2026) — v1 editor polish

| # | Task | Status |
|---|------|--------|
| 1 | Undo/redo with server sync | ✅ |
| 2 | Active shelf highlight during drag | ✅ |
| 3 | Arrow-key nudge (1 mm / 10 mm Shift) | ✅ |
| 4 | Selection inspector panel | ✅ |
| 5 | `canPlace` + nudge engine tests | ✅ |

---

## 12. Completed sprint (July 2026) — v0.5

| # | Task | Status |
|---|------|--------|
| 1 | Planogram create action + wire + button | ✅ |
| 2 | SKU list + create/edit (width/height mm) | ✅ |
| 3 | Planogram settings panel (topClearance, stackGap, shelves) | ✅ |
| 4 | SKU footprint validation on placement | ✅ |
| 5 | Input/Label UI primitives | ✅ |

---

## 13. Completed sprint (July 2026) — v0

| # | Task | Status |
|---|------|--------|
| 1 | Add `stackIndex` migration + update adapter | ✅ |
| 2 | `placePlanogramItem` server action + wire `onCommit` | ✅ |
| 3 | Engine tests for snap + drop-zone + layout | ✅ |
| 4 | Move existing items (horizontal drag on canvas) | ✅ |
| 5 | Delete item + basic selection state | ✅ |
| 6 | Fix fitToView / width-change jitter | ✅ |
| 7 | Screen-space snap threshold | ✅ |

---

## 14. File map (quick reference)

```
app/
  page.tsx                     Homepage
  planograms/page.tsx          List + create/delete
  planograms/[id]/page.tsx     Editor entry
  skus/page.tsx                SKU catalog CRUD
e2e/
  smoke.spec.ts                Playwright smoke (home / planograms / SKUs)
.github/workflows/
  ci.yml                       Lint, typecheck, unit + E2E
components/
  planogram-editor.tsx         Editor state + mutations
  planogram-editor-layout.tsx  Sidebar + editor split
  planogram-settings-panel.tsx Sidebar settings + shelves
  planograms-page-client.tsx   Planogram list actions
  sku-manager.tsx              SKU catalog UI
  planogram-canvas.tsx         SVG render + selection
  planogram-viewport.tsx       Pan/zoom shell
  editor-commands-panel.tsx    Collapsible shortcut list
  toast-provider.tsx           Error toasts
  editor-sidebar.tsx           Collapsible sidebar
  editor-bottom-menu.tsx       SKU tray
  ui/input.tsx, ui/label.tsx   Form primitives
hooks/
  use-planogram-drag.ts        Palette + item drag lifecycle
  use-canvas-viewport.ts       Transform + fit
lib/
  planogram-engine/            Pure placement engine
  planogram-engine/__tests__/  Vitest unit tests (32)
  planogram-export/render-svg.ts  SVG export scaffold
  planogram-engine/shelf-helpers.ts  Compact / align / distribute
  planogram-engine/layout-cache.ts   Memoized layout pass
  planograms/queries.ts        Read queries
  planograms/actions.ts        Write server actions
  skus/queries.ts              Read queries
  skus/actions.ts              SKU write actions
  validation/sku.ts            Footprint validation
  result.ts                    QueryResult + ActionResult helpers
prisma/
  schema.prisma
  migrations/
  seed.ts
```

---

## 15. Success metrics

### v0.5 (self-serve) — ✅ met

- [x] User can create SKUs with width/height in mm from `/skus`.
- [x] User can create and delete planograms from `/planograms`.
- [x] User can edit planogram name, clearance, gap, and shelves from editor sidebar.
- [x] Invalid SKU footprints are blocked from the placement tray and server actions.

### v0 (editor MVP) — ✅ met

- [x] User can build a 3-shelf planogram from SKU tray and reload without data loss.
- [x] User can reposition and remove items.
- [x] Editor usable at different zoom levels with consistent snap feel (screen-space threshold).

### v1 (product) — ✅ mostly met

- [x] User can create planograms and SKUs without seed data.
- [x] Undo/redo for all edit operations (place, move, delete, facings).
- [x] Facings wide supported (minimum retail feature set).
- [x] CI runs lint, typecheck, unit tests, and E2E smoke.
- [ ] Engine has ≥80% coverage on placement/layout modules.
- [ ] No canvas width regression (content fits items exactly, no phantom margin or clipping).

---

## 16. References

- **Design system:** `docs/DESIGN_SYSTEM.md`
- Engine pipeline: `lib/planogram-engine/index.ts` module map comment
- Tunables: `lib/planogram-engine/constant.ts`
- CI: `.github/workflows/ci.yml`
- E2E smoke: `e2e/smoke.spec.ts`
- Prisma conventions: workspace rule `schema-conventions.mdc`
- Industry comparison: GoJS planogram sample, GoPlanogram docs (facings, keyboard workflow)
