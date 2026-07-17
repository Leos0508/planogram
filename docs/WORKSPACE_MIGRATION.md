# Workspace migration (PLA-31)

## What changed

- Added `Workspace` and `WorkspaceMember` (roles: `OWNER` | `MEMBER`; tiers: `FREE` | `UNLIMITED`).
- `Planogram.workspaceId` and `SKU.workspaceId` are required FKs.
- SKU code uniqueness is per workspace: `@@unique([workspaceId, sku])`.
- New registrations create a personal FREE workspace + OWNER membership via `createWorkspaceForUser`.

## Existing data strategy

Migration `20260716100000_add_workspace_tenancy`:

1. Creates tables/enums.
2. Inserts a fixed **Legacy workspace** (`id = legacy-workspace`, `slug = legacy`).
3. Backfills all existing `SKU` and `Planogram` rows to that workspace.
4. Adds every existing `User` as an `OWNER` member of the legacy workspace.
5. Makes `workspaceId` NOT NULL and adds FKs/indexes.

## Local / CI

```bash
pnpm db:migrate   # or prisma migrate deploy in CI
pnpm db:seed      # seeds catalog into the legacy workspace
```

New users from `/register` get their own workspace; they are not added to legacy.

## Follow-up

Query/action scoping by current workspace is **PLA-30** (Done). Active workspace preference is **PLA-43** (`User.activeWorkspaceId` + cookie; see `lib/workspaces/active.ts`). Multi-workspace UX (**PLA-44**–**51**, smoke **PLA-50**) is Done — switcher, create (soft-cap 3), leave/delete, invite stay + optional switch, settings context. Per-workspace billing remains **S5**.
