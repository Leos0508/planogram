# Workspace tenancy — manual test plan

Active workspace (PLA-43): resolved from cookie → `User.activeWorkspaceId` → oldest membership. Invite accept does **not** switch active (stay on previous workspace until switcher / `setActiveWorkspace`). Navbar switcher is **PLA-45**.

## Setup

1. Apply migrations and seed: `pnpm db:migrate && pnpm db:seed`
2. Register **User A** at `/register` → creates personal workspace + sets active
3. In another browser/profile, register **User B**

## Isolation checks

| Step | Expected |
|------|----------|
| User A creates planogram “Aisle A” and SKU `A-001` | Visible on A’s `/planograms` and `/skus` |
| User B opens `/planograms` and `/skus` | Empty (or only B’s own data); no “Aisle A” / `A-001` |
| User B opens `/planograms/<A’s planogram id>` | Not found UI (NOT_FOUND), not a 403 |
| User A places SKU on planogram | Works |
| User B cannot mutate A’s planogram via editor actions | Action returns “Planogram not found” / “SKU not found” |

## Active workspace (PLA-43 / PLA-45)

| Step | Expected |
|------|----------|
| User A accepts invite to User B’s workspace | Membership added; A’s catalogs still show A’s personal workspace |
| Navbar with one membership | Workspace name shown (no switcher menu) |
| Navbar with ≥2 memberships | Switcher control; pick other workspace → catalogs refresh |
| Switch while on `/planograms/[id]` | Redirects to `/planograms` for the new workspace |
| Clear cookie but keep `User.activeWorkspaceId` | Still resolves to that workspace |
| Invalid cookie / DB id (left a workspace) | Falls back to oldest remaining membership |

## Notes

- Legacy seed data lives on `legacy-workspace`; only users migrated as members of that workspace see it. New registrants get a fresh empty workspace.
- Query scoping: `getPlanograms`, `getPlanogram`, `getSkus`, `getSku`
- Write scoping: all planogram/SKU/editor actions via `requireWorkspace()` + `workspaceId` filters
- Preference write: `lib/workspaces/actions.ts` → `setActiveWorkspace`
