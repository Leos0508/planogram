# Parametric SKU packaging (can / bottle)

Plan 02 S3–S4 (**Done**): optional **can** and **bottle** packaging specs on `SKU`, low-poly mesh, dedicated packaging editor with live 2D/3D preview, and read-only planogram 3D scaffold.

| Piece | Issue | Code |
| --- | --- | --- |
| Schema + face derivation | [PLA-88](https://linear.app/planogram/issue/PLA-88/parametric-canbottle-sku-schema) | `lib/skus/packaging.ts`, Prisma `SkuShape` + `packaging` JSON |
| Low-poly mesh + dialog preview | [PLA-87](https://linear.app/planogram/issue/PLA-87/low-poly-packaging-mesh-from-parametric-specs) | `lib/skus/packaging-mesh.ts`, `components/sku-packaging-mesh-preview.tsx` |
| Packaging editor (2D + 3D) | [PLA-91](https://linear.app/planogram/issue/PLA-91/sku-packaging-editor-with-2d3d-preview) | `/skus/[id]`, `components/sku-packaging-editor.tsx`, `components/sku-packaging-face-preview.tsx` |
| Planogram 3D scaffold | [PLA-9](https://linear.app/planogram/issue/PLA-9/3d-preview-scaffold) | `lib/planogram-3d/scene-from-layout.ts`, `components/planogram-3d-preview.tsx` |

## Model

- `SKU.shape`: `CAN` \| `BOTTLE` \| `null`
- `SKU.packaging`: shape-specific JSON (mm / optional ml), or `null` when `shape` is null
- `SKU.width` / `SKU.height`: **face-on mm** for the 2D placement engine

When packaging is set, face-on width×height are **derived** from body diameter × height (validated in `parseSkuPackaging` / `resolveSkuDimensions`). Flat SKUs (`shape` null) keep explicit width×height as today.

### Can fields

| Field | Required | Notes |
| --- | --- | --- |
| `bodyDiameterMm` | Yes | Body diameter |
| `heightMm` | Yes | Overall height |
| `endDiameterMm` | Yes | End / lid diameter |
| `baseDiameterMm` | Yes | Base diameter |
| `capacityMl` | No | Fill volume |

### Bottle fields

| Field | Required | Notes |
| --- | --- | --- |
| `bodyDiameterMm` | Yes | Body diameter |
| `heightMm` | Yes | Overall height |
| `neckDiameterMm` | Yes | Neck / finish diameter |
| `baseDiameterMm` | Yes | Base diameter |
| `capacityMl` | No | Fill volume |

## Mesh

`buildPackagingMesh` returns low-poly vertices/indices in **mm** (Y up, origin at base center). Default ~12 radial segments (preview uses 16). Used by the Three.js canvas (`PackagingMeshCanvas`) in the SKU list dialog and the packaging editor.

## Planogram 3D preview

Read-only shelf scene from `PlanogramLayout` ([PLA-9](https://linear.app/planogram/issue/PLA-9/3d-preview-scaffold)):

- Toggle via the **cube** button in the planogram editor toolbar (2D ↔ 3D)
- Parametric can/bottle SKUs use `buildPackagingMesh`; flat SKUs fall back to a simple box extrusion
- Does not change the placement engine API — `buildPlanogram3DScene` is a thin read adapter
- Orbit with drag; scroll to zoom; Fit reframes the camera

## Packaging editor

Route: **`/skus/[id]`** (`SkuPackagingEditor`).

- Entry from the SKU list (cuboid icon) for any SKU; flat SKUs can opt into can/bottle in the editor
- Left sidebar: identity + parametric fields (or flat W×H)
- Right viewport: live **2D face** footprint + **3D mesh** when packaging parses cleanly
- Save uses `updateSku` → `resolveSkuDimensions` / `parseSkuPackaging`; validation errors surface inline
- List CRUD on `/skus` remains for flat width×height (and quick inline create/edit)

Shared form helpers: `lib/skus/form-state.ts`.

## Out of scope (current)

- Batch import of parametric columns ([`docs/SKU_IMPORT.md`](SKU_IMPORT.md) stays face-on fields)
- Seed catalog parametric backfill ([`docs/SEED_SKU_SPECS.md`](SEED_SKU_SPECS.md))
- Mesh silhouette polish ([PLA-89](https://linear.app/planogram/issue/PLA-89/refine-canbottle-packaging-mesh-preview))
- Square packs / other shapes

## Related

- Seed face-on catalog: [`docs/SEED_SKU_SPECS.md`](SEED_SKU_SPECS.md)
- Batch import: [`docs/SKU_IMPORT.md`](SKU_IMPORT.md)
- Plan 02: [Linear doc](https://linear.app/planogram/document/development-plan-advanced-product-plan-02-45e4ae89a60f)
- UI audit screenshots (packaging + planogram 2D/3D): [`docs/UI_SCREENSHOT_AUDIT.md`](UI_SCREENSHOT_AUDIT.md)
