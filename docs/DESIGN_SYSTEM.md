# Planogram Design System

> Last updated: July 17, 2026  
> Scope: v0.5+ UI work (catalog, settings, inspector, multi-workspace chrome). Keep it simple — extend shadcn, don’t reinvent.

---

## 1. Principles

1. **Engine is truth, UI is thin** — Dimensions and placement logic live in the engine (mm). UI only displays and captures intent.
2. **Tool-first, not marketing** — Dense, functional layouts like a design tool (Figma/Linear), not a landing page.
3. **Semantic tokens only** — Use CSS variables / Tailwind theme tokens (`bg-primary`, `text-muted-foreground`). No raw `gray-200`, `blue-500`, etc.
4. **Sharp UI, soft canvas** — Chrome (panels, buttons) uses square corners; canvas items use slight rounding (`rx={2}`) for legibility.

---

## 2. Foundations

### Color

Built on shadcn OKLCH tokens in `app/globals.css`. Do not hardcode hex/rgb in components.

**Light / dark:** `:root` and `.dark` overrides live in `app/globals.css`. `next-themes` toggles the `dark` class on `<html>` (Light / Dark / System). Prefer semantic Tailwind classes so both modes stay correct.

| Token | Use |
|-------|-----|
| `background` / `foreground` | App shell, viewport backdrop |
| `card` / `card-foreground` | SKU cards, list tiles, form sections |
| `sidebar` / `sidebar-foreground` | Editor sidebar, SKU tray |
| `primary` / `primary-foreground` | Primary actions, canvas item fill |
| `secondary` | Secondary toolbar buttons (fit-to-view) |
| `muted` / `muted-foreground` | Hints, shelf labels, zoom hint |
| `accent` | Hover state on draggable cards |
| `destructive` | Invalid drop, delete danger |
| `border` | Dividers, canvas frame, item strokes |

**Canvas semantics** (use these names consistently):

| State | Tailwind / token | Notes |
|-------|------------------|-------|
| Shelf clearance band | `fill-muted/50` | Area above shelf line |
| Shelf content band | `fill-muted/20` | Drop target zone |
| Shelf line | `stroke-border` | 2px horizontal rule |
| Item default | `fill-primary/20 stroke-primary` | Committed placement |
| Item selected | `fill-primary/35 stroke-primary` + `strokeWidth={2}` | Active selection |
| Ghost valid | `fill-primary/30 stroke-[var(--canvas-valid)]` | Drop preview OK |
| Ghost invalid | `fill-destructive/15 stroke-destructive` + dashed | Drop preview blocked |
| Alignment guide | `stroke-[var(--canvas-guide)]` | Active snap edge during drag only |

Canvas tokens are defined in `app/globals.css` as `--canvas-valid`, `--canvas-guide`, and `--canvas-shelf-active`.

### Typography

| Role | Class | Font variable | Example |
|------|-------|---------------|---------|
| Body | `text-sm` | `--font-sans` (Inter) | Help text, form labels |
| Section label | `text-xs font-semibold uppercase tracking-widest` | sans | `"SKUs"` tray header |
| Panel title | `font-mono text-sm font-semibold` | `--font-geist-mono` | Planogram name in sidebar |
| Data / dimensions | `font-mono text-xs` | mono | Shelf labels, mm readouts |
| Hint / meta | `text-xs text-muted-foreground` | sans | Viewport hint, empty states |

**Scale:** stick to `text-xs`, `text-sm`, `text-base`. Avoid `text-lg+` except page titles on list views.

### Spacing

| Context | Pattern |
|---------|---------|
| App nav | `h-16 p-4` |
| Panel padding | `p-4` (content), `p-2` (toolbar row) |
| Panel gap | `gap-2` (tight), `gap-4` (sections) |
| Collapsed panel width | `w-11` (44px) — sidebar rail |
| Expanded sidebar | `w-72` (288px) |
| SKU tray row | `p-3`, horizontal scroll `gap-2` |
| Floating toolbar | `right-3 top-3`, `gap-2` |

Use Tailwind spacing scale (`1` = 4px). Prefer `2`, `3`, `4` for UI; avoid arbitrary values like `p-[13px]`.

### App chrome (multi-workspace)

| Pattern | Guidance |
|---------|----------|
| Navbar workspace switcher | Outline `sm` button; truncate name (`max-w-52`); menu uses `border-border bg-background` |
| Settings aside context | Uppercase “Settings” eyebrow (`text-xs … text-muted-foreground`) + truncated active workspace name on the next line |
| Destructive workspace actions | Confirm dialogs; type-name for delete (match account-delete pattern) |

### Radius & borders

| Element | Radius | Border |
|---------|--------|--------|
| Buttons (shadcn) | `rounded-none` | `border-transparent` or `border-border` |
| Floating hints / badges | `rounded-md` | none or `shadow-sm` |
| SKU cards | `rounded-none` | `border` |
| Canvas item rects | SVG `rx={2}` | 1–2px stroke |
| Inputs (future) | `rounded-md` | `border-input` |

**Rule:** If it’s chrome → square. If it’s content on canvas → slight round.

### Elevation

Minimal shadows. Prefer borders and background contrast.

- Floating controls: `shadow-sm` + `bg-background/90`
- Drag preview (DOM): `shadow-md`
- No drop shadows on panels (use `border-r`, `border-t`, `border-b`)

### Motion

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Panel collapse | `duration-200 ease-out` | width transition |
| Button press | `active:translate-y-px` | built into Button |
| Canvas / drag | none | instant feedback |

Avoid animating layout during drag. Pan/zoom uses CSS transform only.

---

## 3. App layout

```
┌──────────────────────────────────────────────────────────┐
│  NavMenu (h-16, border-b)                                 │
├──────────┬───────────────────────────────────────────────┤
│ Sidebar  │  Viewport (flex-1, overflow hidden)           │
│ w-72 /   │    └─ canvas (checkered, inline-block)        │
│ w-11     │                                               │
│          ├───────────────────────────────────────────────┤
│          │  SKU tray (border-t, bg-sidebar)              │
└──────────┴───────────────────────────────────────────────┘
```

**Rules:**

- Root: `flex h-full min-h-0 flex-col overflow-hidden` — prevents double scrollbars.
- Editor split: sidebar `shrink-0`, main column `flex-1 min-h-0`.
- Lists (`/planograms`, `/skus`): use `CatalogPageLayout` — `p-4`, scrollable main column.

### Catalog pages (`/planograms`, future `/skus`)

Use `components/catalog-page-layout.tsx` for list/catalog routes (not the editor).

```
┌─────────────────────────────────────────────┐
│  Title (h1)                    [Primary CTA] │
├─────────────────────────────────────────────┤
│  [Search…………………]     [Filter controls]     │  ← optional toolbar
├─────────────────────────────────────────────┤
│  banner (inline form, etc.)                 │  ← optional
│  alert (errors)                             │  ← optional
├─────────────────────────────────────────────┤
│  content (grid, table, Empty)               │
└─────────────────────────────────────────────┘
```

| Slot | Prop | Notes |
|------|------|-------|
| Title | `title` | `font-heading text-base uppercase tracking-wider` |
| Primary action | `action` | Usually `Button size="sm"` in header right |
| Search | `search` | Debounced input; max width `sm:max-w-sm` on toolbar |
| Filters | `filters` | Sort/filter controls; wraps on narrow viewports |
| Inline panel | `banner` | Create/edit forms above list |
| Error | `alert` | `text-destructive text-sm`, `role="alert"` |
| List body | `children` | Grid, table, or `Empty` |

**Example:** `components/planograms-page-client.tsx`.

---

## 4. Components

### Use shadcn primitives

Import from `@/components/ui/*`. Add new shadcn components via CLI rather than one-off styling.

| Need | Component | Variant / size |
|------|-----------|----------------|
| Primary action | `Button` | `default` |
| Toolbar / toggle | `Button` | `ghost`, `icon-sm` |
| Secondary action | `Button` | `outline` or `secondary`, `sm` |
| Destructive confirm | `Button` | `destructive` |
| Empty list | `Empty` | existing pattern on planograms page |
| Future forms | `Input`, `Label`, `Dialog` | add when Phase 3 starts |

### Editor panels

Collapsible panels share one pattern:

```tsx
<aside className="flex shrink-0 flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out">
  <div className="flex shrink-0 items-center border-b p-2">
    {/* title + collapse Button ghost icon-sm */}
  </div>
  <div className="min-h-0 flex-1 overflow-y-auto p-4">
    {/* content */}
  </div>
</aside>
```

- Collapse control: `Button variant="ghost" size="icon-sm"` with `aria-expanded`.
- Section headers: `text-xs font-semibold uppercase tracking-widest`.

### SKU card (palette item)

```
w-[120px] shrink-0 cursor-grab border bg-card p-3
hover:bg-accent hover:text-accent-foreground
active:cursor-grabbing
```

- Thumbnail: `size-10 rounded-md bg-muted` (not `gray-200` / `rounded-full`).
- Name: `line-clamp-1 text-center text-sm`.
- Show dimensions in mono below name when Phase 3 adds detail: `font-mono text-xs text-muted-foreground`.

### List cards (planograms, SKUs)

Follow existing planogram link tile:

```
px-4 py-3 bg-card border
hover:bg-primary hover:text-primary-foreground
```

Future: extract to `<ResourceCard>` if duplicated.

### Viewport overlay

Floating hints sit `absolute right-3 top-3`:

```tsx
<span className="rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm">
```

Toolbar buttons: `pointer-events-auto` on the button, parent `pointer-events-none`.

---

## 5. Canvas & interaction

### Coordinate systems

| Space | Unit | Used by |
|-------|------|---------|
| Engine | mm | placement, snap, DB |
| Canvas local | px (÷ viewport scale) | pointer → engine |
| Screen | px | drag preview follower |

Never mix mm and px in React layout outside `mmToPx` / `pxToMm`.

### Cursors

| Context | Cursor |
|---------|--------|
| SKU card / canvas item | `cursor-grab` / `active:cursor-grabbing` |
| Viewport pan | default (Space+drag handled in hook) |
| During drag | `document.body.style.cursor = "none"` |

### Selection

- Click item → select (stronger stroke).
- Click canvas background → deselect.
- Delete / Backspace → remove selected (when not in input).

### Validity feedback

Always show two distinct states during drag:

- **Valid** — solid green stroke (`--canvas-valid`), filled ghost.
- **Invalid** — dashed red destructive stroke, lighter fill.

Do not rely on color alone — dashed vs solid distinguishes invalid.

---

## 6. Icons

Use **Lucide** only (`lucide-react`). Default size in buttons: `size-4` (16px).

| Action | Icon |
|--------|------|
| Collapse sidebar | `PanelLeftClose` / `PanelLeftOpen` |
| Collapse tray | `ChevronDown` / `ChevronUp` |
| Fit to view | `Maximize2` |
| Add | `Plus` |
| Filter | `Filter` |

Always set `title` on icon-only buttons for accessibility.

---

## 7. Accessibility

- Icon buttons: `title` + `aria-expanded` where toggle.
- Canvas SVG: `role="img"` + `aria-label="Planogram canvas"`.
- Keyboard: document global shortcuts in sidebar help text as they’re added.
- Focus: use shadcn `focus-visible:ring-*` on interactive elements; don’t strip outlines.

---

## 8. Do / Don’t

| Do | Don’t |
|----|-------|
| `bg-muted`, `text-muted-foreground` | `bg-gray-200`, `text-gray-500` |
| `cn()` for conditional classes | String concatenation |
| `Button` for clicks | Raw `<button className="...">` with custom styles |
| `min-h-0` on flex children that scroll | Forget overflow chain → clipped content |
| Semantic canvas states (valid/invalid) | Random green/red hex |
| `font-mono` for mm / shelf index | Proportional font for numeric data |
| Reuse panel collapse pattern | One-off panel layouts per feature |

---

## 9. New screen checklist (Phase 3+)

Before shipping a new page or panel:

- [ ] Uses theme tokens only (no raw palette colors)
- [ ] Spacing matches §2 (`p-4` content, `gap-2`/`gap-4`)
- [ ] Actions use `Button` with correct variant/size
- [ ] Empty state uses `Empty` component
- [ ] Loading/error states use `text-muted-foreground` + concise copy
- [ ] Flex layout includes `min-h-0` / `overflow-hidden` where needed
- [ ] Icon-only controls have `title`
- [ ] Forms (future): label + input from shadcn, widths in mm with `font-mono`

---

## 10. File reference

| Concern | Location |
|---------|----------|
| Theme tokens | `app/globals.css` |
| Button variants | `components/ui/button.tsx` |
| Route error / loading / not-found | `components/route-status.tsx`, `app/(app)/{error,not-found}.tsx`, `app/(app)/planograms/loading.tsx`, `app/(app)/skus/loading.tsx` |
| Canvas checkered bg | `.canvas-checkered` in `globals.css` |
| Utils | `lib/utils.ts` (`cn`) |
| Roadmap / backlog | [Linear — Planogram](https://linear.app/planogram/project/planogram) |

---

## 11. Future tokens (when needed)

Add to `:root` in `globals.css` — do not scatter in components:

```css
--canvas-valid: oklch(...);        /* valid drop stroke */
--canvas-shelf-active: oklch(...); /* drag-over shelf highlight */
```

Until a feature needs them, use the Tailwind mappings in §2.
