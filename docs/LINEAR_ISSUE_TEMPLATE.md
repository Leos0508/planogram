# Linear issue template

Copy into new Linear issues (also stored as project doc **Issue template** in Linear). Keep tickets PR-sized.

Conventions for titles, branches, commits, and PRs: [Delivery conventions](https://linear.app/planogram/document/delivery-conventions-issues-branches-commits-prs-001627bba3a5) (Linear project doc).

## Title

Imperative phrase, ≤72 chars, no trailing period. Example: `Manual shelf height resize (drag top border)`.

## Goal

One sentence: what outcome this delivers.

## Acceptance criteria

- [ ] Observable result 1
- [ ] Observable result 2
- [ ] Persistence / undo / tests if relevant

## Out of scope

What we are explicitly not doing.

## Links

- Related Linear issues / project docs
- Key files / design notes (`docs/DESIGN_SYSTEM.md` for UI)

## Branch (when coding)

`pla-<N>-<short-kebab-slug>` — e.g. `pla-15-manual-shelf-height-resize` for PLA-15.

## Labels

Use one of: **feature**, **bug**, **chore**, **debt**

## Status guidance

| Status | Meaning |
|--------|---------|
| Backlog | Not this sprint |
| Todo | Committed this sprint |
| In Progress | Actively coding |
| In Review | PR open |
| Done | Merged to `main` |
