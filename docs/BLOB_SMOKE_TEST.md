# Vercel Blob SKU image smoke checklist (S6 / PLA-62)

Manual verification that SKU image upload works end-to-end. Unit coverage lives under `lib/blob/__tests__/sku-image.test.ts`.

## Prerequisites

1. Create a **Blob store** in the Vercel project (Storage → Blob → Create).
2. Set in `.env` (see `.env.example`):
   - `BLOB_READ_WRITE_TOKEN` (from the store → `.env.local` tab)
3. Run `pnpm dev`.
4. **Vercel (preview/prod):** add `BLOB_READ_WRITE_TOKEN` in Project Settings → Environment Variables for Preview and Production. Redeploy after adding.

## Checklist

### Upload → render

1. Sign in as a workspace member with **write** access.
2. Open **SKUs** → **New**.
3. Fill name, code, width/height; choose a JPEG/PNG/WebP under **2 MB**.
4. Confirm preview appears; create the SKU.
5. Edit the SKU: preview shows the uploaded image.
6. Open a planogram; confirm the SKU tray card shows the image.
7. Place the SKU on a shelf; confirm canvas renders the image.
8. Export SVG (if available) and confirm the image URL is present.

### Replace / clear / delete

1. Edit the SKU; upload a different image → save. Old Blob object should be removed (optional: check Blob store file list).
2. Edit again → **Remove image** → save. Image gone from tray/canvas; owned Blob deleted.
3. Create a SKU with a paste URL (`https://…` external). Delete the SKU — app must **not** call Blob delete for external URLs.
4. Create with upload, then delete the SKU (unused on planograms). Owned Blob is deleted.

### Validation / access

1. Reject GIF or a file over 2 MB with a clear error.
2. As a **read-only** member: no New/Edit upload controls (or write actions fail).

## Notes

- Images are stored at `workspaces/{workspaceId}/skus/…` with **public** access so canvas/SVG can load them without auth.
- Paste URL remains supported alongside upload.
- Server Action body limit is raised to **3 MB** in `next.config.ts` so 2 MB files fit with multipart overhead (Next default is 1 MB).
