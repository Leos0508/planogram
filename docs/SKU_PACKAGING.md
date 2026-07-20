# Parametric SKU packaging (can / bottle)

Plan 02 S3 added optional **can** and **bottle** packaging specs on `SKU`, plus a low-poly mesh preview in the SKU manager.

| Piece | Issue | Code |
| --- | --- | --- |
| Schema + face derivation | [PLA-88](https://linear.app/planogram/issue/PLA-88/parametric-canbottle-sku-schema) | `lib/skus/packaging.ts`, Prisma `SkuShape` + `packaging` JSON |
| Low-poly mesh + preview | [PLA-87](https://linear.app/planogram/issue/PLA-87/low-poly-packaging-mesh-from-parametric-specs) | `lib/skus/packaging-mesh.ts`, `components/sku-packaging-mesh-preview.tsx` |

## Model

- `SKU.shape`: `CAN` \| `BOTTLE` \| `null`
- `SKU.packaging`: shape-specific JSON (mm / optional ml), or `null` when `shape` is null
- `SKU.width` / `SKU.height`: **face-on mm** for the 2D placement engine

When packaging is set, face-on width×height are **derived** from body diameter × height (validated in `parseSkuPackaging` / `resolveSkuFootprint`). Flat SKUs (`shape` null) keep explicit width×height as today.

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

`buildPackagingMesh` returns low-poly vertices/indices in **mm** (Y up, origin at base center). Default ~12 radial segments. Used by the read-only Three.js preview when creating/editing a can or bottle in the SKU manager.

Planogram shelf 3D is **not** in S3 — see [PLA-9](https://linear.app/planogram/issue/PLA-9/3d-preview-scaffold) (S4).

## Out of scope (current)

- Batch import of parametric columns ([`docs/SKU_IMPORT.md`](SKU_IMPORT.md) stays face-on fields)
- Seed catalog parametric backfill ([`docs/SEED_SKU_SPECS.md`](SEED_SKU_SPECS.md))
- Mesh silhouette polish ([PLA-89](https://linear.app/planogram/issue/PLA-89/refine-canbottle-packaging-mesh-preview))
- Dedicated SKU packaging editor ([PLA-91](https://linear.app/planogram/issue/PLA-91/sku-packaging-editor-with-2d3d-preview))
- Square packs / other shapes

## Related

- Seed face-on catalog: [`docs/SEED_SKU_SPECS.md`](SEED_SKU_SPECS.md)
- Batch import: [`docs/SKU_IMPORT.md`](SKU_IMPORT.md)
- Plan 02: [Linear doc](https://linear.app/planogram/document/development-plan-advanced-product-plan-02-45e4ae89a60f)
