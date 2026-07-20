# SKU batch import (CSV / JSON)

Workspace write members can import multiple SKUs from **CSV** or **JSON** via the Import control on `/skus` (SKU manager).

Shipped in Plan 02 S2 ([PLA-81](https://linear.app/planogram/issue/PLA-81/batch-sku-import-csvjson)). Parser: `lib/skus/import-parse.ts`; action: `importSkus` in `lib/skus/actions.ts`.

## Formats

| Format | Notes |
| --- | --- |
| CSV | First row is a header. Columns are case-insensitive. |
| JSON | Top-level array of objects with the same field names. |

Example CSV: [`docs/examples/sku-import-example.csv`](examples/sku-import-example.csv).

## Fields

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Yes | Non-empty string |
| `sku` | Yes | Code; unique per workspace |
| `width` | Yes | Positive integer (mm) |
| `height` | Yes | Positive integer (mm) |
| `color` | No | Valid hex (normalized); omitted → server default/random |
| `imageUrl` | No | `http`/`https` URL; invalid → treated as missing |

## Behavior

- **Partial success:** valid rows create SKUs; invalid rows are listed with row-level errors.
- **Duplicates:** if `sku` already exists in the workspace (or appears twice in the file), that row is **rejected** (no upsert / overwrite in v1).
- **Scope:** creates are workspace-scoped; requires write access (same as manual create).

## Out of scope (v1)

- Excel `.xlsx`
- Upsert by code
- Uploading image files during import (URLs only)
- Parametric packaging columns (can/bottle `shape` + dims — set in the SKU manager; see [`docs/SKU_PACKAGING.md`](SKU_PACKAGING.md))
