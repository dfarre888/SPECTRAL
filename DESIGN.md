# Spectral design system: Obsidian

Deep glossy black for content, Liquid Glass for controls. Colour belongs to the data.
All classes below live in `app/globals.css`. Build pages from them; do not restyle them per page.

## The two materials (Apple HIG, Materials)

| Layer | Material | Where | Class |
|---|---|---|---|
| Control | Liquid Glass (regular variant): blur + saturation + top specular edge | Sidebar, top bar, toolbars floating over content, segmented controls, table headers, popovers, map overlays | `.lg-glass`, `.glass-popover`, `.seg`, `.shell-*`, `.dt thead th` |
| Content | Lacquer: piano-black enamel lit from above, no blur | Panels, table frames, cards, inspector panes | `.store-panel`, `.dt-frame`, `.store-panel-inner` |

Never put glass on content (a panel of text is lacquer, not glass). Never nest panels more than one deep.

## Tokens

- Ground `#000`. Ambient light on the shell only (`--ambient`), never on panels.
- Ink: `--store-ink` #F5F5F7 (primary), `--store-ink-soft` #A1A1A6 (body), `--store-ink-mute` #86868B (meta, min 11px). `--store-ink-faint` is large text only.
- Lines: `--lacquer-line` on content, `--glass-line` on glass, `--store-line` for hairline dividers.
- Accent: `--wb-blue` #2997FF is the only chrome accent (selection, focus, primary action).
- Data hues: `--wb-red` (Red force / threat), `--wb-blue` (Blue force), cyan #06B6D4 (GNSS, data link), amber #FBBF24 (caution, contested), green #4ADE80 (nominal, confirmed), violet #A78BFA (EO/IR, optical). Orange #F97316 = IR band only. **No orange chrome.**
- Fonts: Geist (UI), Space Grotesk via `.store-display` / `.page-title` (headings), JetBrains Mono (`font-mono`) for every data value.

## Type scale

| Use | Size |
|---|---|
| Page title | `.page-title` (26 to 34px) |
| Page lede | `.page-lede` 14px, max 72ch |
| Section / pane title | 15 to 16px semibold, or `.wb-pane-title` 13px |
| Body, table cells, controls | 13px |
| Meta, column headers, captions | 11.5 to 12px |
| Absolute floor | **11px**. Nothing smaller, ever. No 8px, 9px, 10px, 10.5px. |

No uppercase-tracked eyebrow above every section. At most one kicker per page.

## Page anatomy

The shell (`components/layout/AppChrome.tsx`) gives every non-full-bleed page a scroller with `px-4 md:px-7 lg:px-10 pt-[72px] pb-16`. The 56px glass top bar floats over the top of the page; the page's own large title scrolls under it and reappears in the bar. So:

1. Page head: `<h1 className="page-title">` then one `<p className="page-lede">`. Nothing above the title except an optional breadcrumb.
2. One row of instruments (`.fc-inst`) if the page has headline numbers.
3. One row of controls: a `.seg` segmented control for views, `.btn-e` / `.btn-glass` for actions, `.fc-action` for quiet text actions.
4. The data.

Do not use negative margins to escape main's padding. Full-bleed pages (map, spectrum) use `fullBleed` in their layout.

## Controls

- `.seg` segmented control (glass track, lit lens for the selection). Children are `<button aria-pressed>` or `aria-selected`. `.seg.accent` makes the selection blue. `.seg.sm` for dense toolbars. Use for any mutually exclusive choice: Table / Heat map, Blue / Red, view tabs.
- `.btn-e` (+ `.sm`, `.xs`): outline at rest, blue glow when `aria-pressed="true"`. Toggle chips and filter chips.
- `.btn-glass` and `.btn-glass.primary`: real buttons (Run analysis, New scenario, Generate). One primary per view.
- `.fc-tab` / `.hub-tab-*`: legacy tab styles, already variant E. Prefer `.seg` for new work.
- `.glass-field`: text inputs and selects.
- `.tag` + `.blue|.red|.green|.amber|.violet`: status and category labels. Text plus hairline; never a filled slab.

## Tables (the part that matters in a demo)

Use `components/ui/DataTable.tsx` for any list of records with more than ~8 rows or more than 3 columns. It gives:
- one scroller sized to the viewport (`--dt-max`, default `calc(100vh - 240px)`), so the page never grows a second scrollbar
- sticky glass header, optional sticky first column (`sticky: true` on the column)
- alternating rows, hover and `aria-selected` row states
- click-to-sort headers (`sortValue`), blanks sort last
- right-aligned tabular mono numbers (`align: 'right'`)
- scroll-edge fades that appear only when more content is off-screen

For custom grids (virtualised matrices) use `components/ui/ScrollArea.tsx` plus the `.dt` classes directly.

Rules:
- Row height 36 to 44px. Cell text 13px, meta line 11.5px. Truncate with an ellipsis and put the full value in `title`.
- Column headers: nouns, title case, no punctuation, 12px, never smaller.
- Numbers: right-aligned, mono, units in the header not the cell where possible.
- Colour a value, not a cell. No coloured row fills, no coloured underline stripes. Status uses `.tag` or coloured text.
- A table never pushes the page wider than the viewport. Wide tables scroll inside their frame with the first column pinned.
- Long lists of cards are a smell. If a list has more than ~24 items and each item has comparable fields, it is a table (with a Gallery view as an option if images matter).

## Motion

State feedback only, 150 to 250ms ease-out (`--ease-out`). One signature move per surface. Every transition has a `prefers-reduced-motion` fallback. Nothing moves unless the user acted, except live data. Scroll-linked effects are allowed (scroll is an action): top bar glass, title hand-off.

## Accessibility

- Text contrast AA on #000 and #030304: body `--store-ink-soft` or brighter; `--store-ink-mute` only for 11px+ meta.
- Focus ring: 2px `--wb-blue`, 2px offset (global `:focus-visible`).
- Interactive rows are buttons or links, or have `onClick` plus keyboard handling.
- `prefers-reduced-transparency` swaps glass for an opaque surface (handled globally).

## Bans

Orange chrome. Text under 11px. Side-stripe accent borders (`border-l-2` coloured). Gradient text. Filled coloured status slabs. KPI tile grids with gradient accents. Em dashes in UI copy. Card walls for tabular data. Glass on content panels.
