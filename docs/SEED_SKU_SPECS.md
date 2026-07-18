# Seed SKU specs (Plan 01)

First-run catalog for new (or empty) workspaces. Values are **face-on width × height in mm** for the 2D editor — not parametric packaging models (Plan 02).

Defined in `lib/skus/seed-catalog.ts` and applied by `seedCatalogForWorkspace` (workspace bootstrap + empty `/skus` load).

## Catalog

| Code | Name | W × H (mm) | Packaging cue |
| --- | --- | --- | --- |
| `CAN-250-SLIM` | Slim can 250 ml | 53 × 134 | Slim energy / RTD can |
| `CAN-250` | Standard can 250 ml | 58 × 104 | Short European 250 ml |
| `CAN-330` | Standard can 330 ml | 66 × 115 | Common EU soft-drink can |
| `CAN-355` | Standard can 355 ml | 66 × 122 | US 12 fl oz (~355 ml) |
| `CAN-500` | Tall can 500 ml | 67 × 168 | Tall 500 ml can |
| `PET-500` | PET bottle 500 ml | 65 × 210 | Typical still-water PET |
| `PET-1000` | PET bottle 1 L | 80 × 270 | Typical 1 L PET |
| `GLASS-330` | Glass bottle 330 ml | 60 × 230 | Long-neck beer / mixer |

## Sources / notes

Dims are **industry-ish averages** for planogram facing (retail shelf face), rounded to whole mm:

- Beverage can diameters ~53–67 mm; heights scale with fill volume (250–500 ml).
- PET / glass heights are typical retail upright footprints, not ISO engineering drawings.
- No brand artwork: solid editor colors only until users upload images.
- Idempotent: seeding runs only when the workspace has **zero** SKUs.

## Out of scope

- Parametric can/bottle JSON schema (Plan 02)
- Batch CSV import
- Photoreal product images
