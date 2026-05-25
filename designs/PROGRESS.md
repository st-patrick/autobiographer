# Autobiographer UI — Design Session Progress

## Final approved design
**`106.html`** (also copied as `FINAL-106-dim-modes.html`) — "Dim + Modes"

### What 106 is
A three-column layout for the autobiographer journaling app:

**Left pane (80px):** Vertical chapter spine — `all · baby · kid · teen · young · adult` with rotated italic labels, year-range subtitles, and dot clusters showing coverage per chapter. Active chapter gets an accent stripe. Clicking a chapter filters the browse.

**Center pane:** Tab bar at top (`write / read / random`). Scrollable.
- **Write tab:** Large italic question with tiny uppercase meta line above. Borderless textarea beneath (no box, just cursor + placeholder). Meta and actions (`different question · skip year · + month/day`) on one line below, with year/age pushed left and actions pushed right. Then quick entry with a three-mode toggle (`now · past memory · undated`) — clicking changes the placeholder of the quick textarea. All textareas are borderless.
- **Browse** starts below the quick entry after generous whitespace. Year headers and date stamps dim slightly (use `--dim` color) when scrolled out of view, return to full color when you scroll into them. Sticky ghost search bar at the top of the browse — 30% opacity until hovered/focused.
- **Random tab:** Single entry card with a "next" button.

**Right pane (280px, sticky):** On-this-day quote · people mentions · blind spots · tool buttons.

**Immersive mode:** When you scroll into the browse, the right sidebar collapses (width → 0) via CSS transition. A toggle button on the edge brings it back.

### Lineage
`025 → 038 → 044 → 053 → 062 → 065 → 071 → 088 → 094 → 106`

### Key milestones along the way
- **011** — First chapter spine that clicked. "Absolute aha moment."
- **025** — Solid layout (three-column + endless scroll + chapter filtering actually working).
- **033** — Immersive browse (sidebar collapses on scroll).
- **038** — Tab-based center pane (`write / read / random`). "Reached perfection."
- **044** — 13px base font. User prefers tiny text.
- **053** — Big question + tiny uppercase meta. Strong hierarchy.
- **062** — Meta inline with actions on one row below the textarea.
- **065** — Spacious vertical rhythm between sections.
- **088** — Borderless textareas. Eliminated form-like feel.
- **094** — Ghost search bar (30% opacity until hover).
- **106** — Subtle browse dimming via color shift + entry mode toggle on quick entry.

### Features moved/hidden
- Past memory + undated memory → quick entry mode toggle (not as separate buttons)
- Stats grid → removed entirely (was adding nothing)
- Tool buttons → sidebar, vertical stack
- Search bar → ghost (30% opacity) to reduce visual noise on write tab

## Design folder contents
- `001–024` — Early exploration (journal layouts, split columns, card stacks, chapter approaches)
- `025–027` — First "endless" interactive versions with real JS
- `028` — Dark mode (kept as option)
- `029–035` — Brave structural forks from 025
- `036–042` — Merges of 011's chapter spine with various ideas
- `038, 043–049` — Typography/color variations
- `053, 057–063` — Hierarchy and divider experiments
- `065, 071–077` — Spacing and feature-hiding
- `082–088` — Textarea treatment (borderless, ghost, underline)
- `094, 106–112` — Final dimming and entry-mode refinements
- `index.html` — Gallery (outdated, only reflects 001–005)

## Next steps
- Port 106's layout into the real `../index.html`
- Wire up the `now / past memory / undated` mode toggle to actually call the existing `insertDatedEntry` / `insertIncoming` functions
- Rewrite the `QBank` using the situated prompt research (see memory `project_question_research.md`)
- Test that all screen switching (viewer, stats, photos, person profile) still works in the new layout
