# Workspace tenancy — manual test plan

Active workspace (PLA-43): resolved from cookie → `User.activeWorkspaceId` → oldest membership. Invite accept (PLA-48) **keeps** previous active and offers **Switch to this workspace** (does not auto-switch). Navbar switcher is **PLA-45**.

**Automated smoke (PLA-50):** `pnpm exec playwright test e2e/multi-workspace.spec.ts --workers=1` (CI uses `pnpm build` + `pnpm start`). Covers create → switch → settings context → sole-owner delete; invite + OWNER leave/delete gate; single-WS settings context.

Catalog planogram isolation across workspaces remains in the manual checklist below.

## S4 smoke checklist (manual)

Run after multi-workspace changes when not relying on Playwright alone:

1. Register / sign in (single membership) → settings aside shows that workspace name
2. Create second workspace → catalogs empty; create a planogram only there
3. Switch back → prior planograms return; second WS planograms hidden
4. Invite another user into the second WS → they keep their home active; optional switch works
5. As OWNER with that member present → Leave/Delete blocked with link to Members
6. Member leaves → OWNER can delete (type name) or leave-as-sole-owner deletes
7. Soft-cap: fourth owned workspace shows free-plan limit (optional)

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
| User A accepts invite to User B’s workspace | Membership added; stays on A’s active; optional **Switch to B** |
| Accept invite when already a member | Idempotent message; offer switch if B is not active |
| Accept with only one prior membership | Same stay + optional switch; no other memberships removed |
| Navbar workspace control | Menu lists memberships + **Create workspace** |
| Create workspace | Dialog → new empty OWNER workspace becomes active; catalogs empty |
| Soft-cap (3 owned) | Fourth create shows clear free-plan limit error |
| Leave as MEMBER (`/settings`) | Confirm → membership removed; switches to another WS |
| Leave as sole OWNER | Confirm → workspace deleted; personal/other WS becomes active |
| Leave as OWNER with others | Blocked; link to Members to transfer first |
| Delete as sole OWNER (`/settings`) | Type workspace name → cascade delete; other/personal WS active |
| Delete as OWNER with others | Blocked; link to Members first (no delete-for-everyone) |
| Delete last remaining membership | Allowed; bootstraps personal workspace (account delete is separate) |
| Switch while on `/planograms/[id]` or `/skus/[id]` | Redirects to `/planograms` for the new workspace |
| Switch while on `/settings` or `/settings/members` | Stay on route; side nav shows new WS name; members list remounts for new WS |
| Settings shell | Aside shows active workspace name under “Settings” |
| Clear cookie but keep `User.activeWorkspaceId` | Still resolves to that workspace |
| Invalid cookie / DB id (left a workspace) | Falls back to oldest remaining membership |

## Notes

- Legacy seed data lives on `legacy-workspace`; only users migrated as members of that workspace see it. New registrants get a fresh empty workspace.
- Query scoping: `getPlanograms`, `getPlanogram`, `getSkus`, `getSku`
- Write scoping: all planogram/SKU/editor actions via `requireWorkspace()` + `workspaceId` filters
- Preference write: `lib/workspaces/actions.ts` → `setActiveWorkspace`
