# Seed SKU specs (Plan 01)

First-run catalog for new (or empty) workspaces. Values are **face-on width × height in mm** for the 2D editor (D07). Seed rows also store parametric can/bottle `shape` + `packaging` so packaging editor and planogram 3D show a mesh without manual opt-in ([PLA-97](https://linear.app/planogram/issue/PLA-97/seed-parametric-canbottle-packaging-payloads)).

Defined in `lib/skus/seed-catalog.ts` and applied by `seedCatalogForWorkspace` (workspace bootstrap + empty `/skus` load). Payload ratios come from `packagingFromFaceOn` in `lib/skus/packaging.ts`.

## Catalog

| Code | Name | W × H (mm) | Shape | Capacity |
| --- | --- | --- | --- | --- |
| `CAN-250-SLIM` | Slim can 250 ml | 53 × 134 | CAN | 250 ml |
| `CAN-250` | Standard can 250 ml | 58 × 104 | CAN | 250 ml |
| `CAN-330` | Standard can 330 ml | 66 × 115 | CAN | 330 ml |
| `CAN-355` | Standard can 355 ml | 66 × 122 | CAN | 355 ml |
| `CAN-500` | Tall can 500 ml | 67 × 168 | CAN | 500 ml |
| `PET-500` | PET bottle 500 ml | 65 × 210 | BOTTLE | 500 ml |
| `PET-1000` | PET bottle 1 L | 80 × 270 | BOTTLE | 1000 ml |
| `GLASS-330` | Glass bottle 330 ml | 60 × 230 | BOTTLE | 330 ml |

Parametric fields (derived from face-on W×H):

- **CAN:** `bodyDiameterMm = width`, `heightMm = height`, `endDiameterMm ≈ body−1`, `baseDiameterMm ≈ body−2`
- **BOTTLE:** same body/height; `neckDiameterMm = min(28, round(0.4×body))`, `baseDiameterMm ≈ body−5`

## Sources / notes

Dims are **industry-ish averages** for planogram facing (retail shelf face), rounded to whole mm:

- Beverage can diameters ~53–67 mm; heights scale with fill volume (250–500 ml).
- PET / glass heights are typical retail upright footprints, not ISO engineering drawings.
- No brand artwork: solid editor colors only until users upload images (persisted SKU color fills no-image SKUs — Plan 02 S2 / [PLA-82](https://linear.app/planogram/issue/PLA-82/persist-sku-color-for-no-image-differentiation)).
- Idempotent: seeding runs only when the workspace has **zero** SKUs. Existing workspaces are not migrated to parametric payloads.
- `pnpm db:seed` upserts face-on name/dims/color on create-or-update; **shape/packaging are set on create only** so re-seed does not overwrite legacy flat catalogs.

## Related

- Batch CSV/JSON import (user catalogs): [`docs/SKU_IMPORT.md`](SKU_IMPORT.md) · example [`docs/examples/sku-import-example.csv`](examples/sku-import-example.csv)
- Parametric can/bottle packaging + mesh preview: [`docs/SKU_PACKAGING.md`](SKU_PACKAGING.md) (Plan 02 S3 / [PLA-88](https://linear.app/planogram/issue/PLA-88/parametric-canbottle-sku-schema), [PLA-87](https://linear.app/planogram/issue/PLA-87/low-poly-packaging-mesh-from-parametric-specs))

## Out of scope

- Migrating already-seeded flat SKUs in production workspaces
- Mesh silhouette polish ([PLA-89](https://linear.app/planogram/issue/PLA-89/refine-canbottle-packaging-mesh-preview))
- Photoreal product images
