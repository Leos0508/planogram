# Workspace tenancy — manual test plan (PLA-30)

Single-workspace v1: current workspace is the newest membership (so invite accept surfaces the shared workspace). No switcher (Plan 02).

## Setup

1. Apply migrations and seed: `pnpm db:migrate && pnpm db:seed`
2. Register **User A** at `/register` → creates personal workspace
3. In another browser/profile, register **User B**

## Isolation checks

| Step | Expected |
|------|----------|
| User A creates planogram “Aisle A” and SKU `A-001` | Visible on A’s `/planograms` and `/skus` |
| User B opens `/planograms` and `/skus` | Empty (or only B’s own data); no “Aisle A” / `A-001` |
| User B opens `/planograms/<A’s planogram id>` | Not found UI (NOT_FOUND), not a 403 |
| User A places SKU on planogram | Works |
| User B cannot mutate A’s planogram via editor actions | Action returns “Planogram not found” / “SKU not found” |

## Notes

- Legacy seed data lives on `legacy-workspace`; only users migrated as members of that workspace see it. New registrants get a fresh empty workspace.
- Query scoping: `getPlanograms`, `getPlanogram`, `getSkus`, `getSku`
- Write scoping: all planogram/SKU/editor actions via `requireWorkspace()` + `workspaceId` filters
