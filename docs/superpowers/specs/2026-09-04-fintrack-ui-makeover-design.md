# FinTrack UI Makeover — Design Spec

Date: 2026-09-04
Status: Approved for planning
Scope: Complete visual/structural makeover of the FinTrack expense dashboard. All existing functionality is preserved unchanged except the two intentional changes listed in §6.

## 1. Problem statement

The current build is a dark-themed design force-flipped to light through a CSS override layer (`.light-brand` attribute-selector hacks in `src/index.css:86-115`). Consequences observed in the running app:

- Dark-mode accent colors (e.g. `text-emerald-400`, `text-emerald-300`) sit on white surfaces and fail contrast.
- Header icon buttons render near-invisible (white-on-white).
- Card surfaces, borders and chart chrome are inconsistent because overrides match class-name substrings.
- Everything lives in one 601-line `src/App.tsx`, so any restyle touches every line.

The makeover replaces the override hack with a real semantic token system, adds a persisted light/dark toggle, recomposes the layout around a sidebar shell, and splits the UI into focused components. Currency labeling changes from `Rs.` to `Nu.` (Bhutanese ngultrum) per product owner direction.

## 2. Goals / non-goals

Goals
- Both themes correct by construction: components consume semantic tokens, never per-element `dark:` conditionals.
- WCAG AA contrast for all text and interactive states in both themes.
- Sidebar-based shell on desktop, top-bar + segmented tabs on mobile.
- `src/App.tsx` reduced to composition only; UI split into single-purpose components.
- Zero new runtime dependencies.

Non-goals
- No new features beyond the theme toggle.
- No routing library, no backend, no i18n, no data-model or storage-schema changes.
- No changes to seed data or business logic.

## 3. Theming & tokens

All color decisions live in `src/index.css` as CSS variables declared in a Tailwind v4 `@theme` block (emitted as `:root` custom properties, so `bg-surface`, `text-ink`, `border-line`, `text-brand` utilities compile to `var(--color-*)`). The light values are the defaults; a `:root[data-theme="dark"]` selector redeclares the same variable names, and because utilities resolve the variable at the usage site, the override cascades with no per-element conditionals.

Theme selection: `<html data-theme="light|dark">`. A `useTheme` hook (`src/hooks/useTheme.ts`) initializes from `localStorage["fintrack-theme"]`, falls back to `matchMedia("(prefers-color-scheme: dark)")`, writes the attribute and persists on change. Toggle control lives in the sidebar footer (desktop) and top bar (mobile).

Token values:

| Token | Light | Dark |
|---|---|---|
| `--color-surface` | `#FAF9F6` | `#0E1512` |
| `--color-surface-raised` | `#FFFFFF` | `#16211B` |
| `--color-surface-sunken` | `#F1F0EA` | `#0A100D` |
| `--color-ink` | `#12211A` | `#E8F0EA` |
| `--color-ink-muted` | `#5C6B62` | `#9DB0A4` |
| `--color-ink-faint` | `#75847A` | `#6E8177` |
| `--color-line` | `rgba(18,33,26,0.10)` | `rgba(232,240,234,0.10)` |
| `--color-line-strong` | `rgba(18,33,26,0.18)` | `rgba(232,240,234,0.18)` |
| `--color-brand` | `#059669` | `#34D399` |
| `--color-brand-strong` | `#047857` | `#6EE7B7` |
| `--color-brand-soft` | `rgba(5,150,105,0.10)` | `rgba(52,211,153,0.12)` |
| `--color-accent` | `#E8890C` | `#FBBF24` |
| `--color-accent-soft` | `rgba(232,137,12,0.12)` | `rgba(251,191,36,0.14)` |
| `--color-danger` | `#DC2626` | `#F87171` |
| `--color-danger-soft` | `rgba(220,38,38,0.10)` | `rgba(248,113,113,0.12)` |
| `--color-focus` | `#059669` | `#34D399` |

Category palette (used by donut, breakdown bars, icons). Light set darkened for contrast on white; dark set keeps current hues:

| Category | Light | Dark |
|---|---|---|
| Food | `#059669` | `#34D399` |
| Transport | `#2563EB` | `#60A5FA` |
| Entertainment | `#7C3AED` | `#C084FC` |
| Shopping | `#D97706` | `#FBBF24` |
| Health | `#E11D48` | `#FB7185` |
| Education | `#0891B2` | `#22D3EE` |
| Utilities | `#EA580C` | `#FB923C` |
| Other | `#64748B` | `#94A3B8` |

`src/data.ts` exports `CAT_COLORS: Record<"light" | "dark", Record<Category, string>>`; components receive the active theme from `useTheme` and index into it. Chart SVG props (`tick.fill`, gradient `stopColor`, `stroke`) accept these resolved hex values.

Typography: DM Sans for UI (already loaded), Space Mono with tabular figures for every numeric amount, stat value and axis label. Type scale: hero figure `text-4xl sm:text-5xl`, section titles `text-base font-semibold`, labels `text-[11px] uppercase tracking-[0.14em]`.

Deleted from `src/index.css`: the entire `.light-brand` override block, the unused `@layer utilities` (`bg-card`, `bg-subtle`, `border-subtle`), and the hard-coded dark `html, body` background (replaced by `background: var(--color-surface)`). Kept: `overview-reveal` keyframes, focus-visible ring (retargeted to `--color-focus`), `::selection`, scrollbar styling (retuned per theme), recharts width guards. Kept: `.bhutan-logo` saffron→orange gradient mark.

## 4. Layout & information architecture

App shell (`src/App.tsx` composes only):

- Desktop (≥1024px): fixed 240px sidebar, full height, `border-right: 1px var(--color-line)`. Contents top→bottom: Nu logo + wordmark; nav items Dashboard / Transactions (`aria-current="page"` on active); primary button "Add Expense"; secondary row Export CSV, Undo (disabled when history empty); footer row theme toggle + Clear all data.
- Mobile (<1024px): sticky 56px top bar (logo, theme toggle, icon-only Add button) plus a segmented two-tab row (Dashboard / Transactions). Export CSV, Undo and Clear all sit in a compact action row directly under the tabs.
- Content column: `max-w-[1160px]`, padding 24px (16px mobile), vertical rhythm 24px.

Dashboard composition (top→bottom):
1. Hero panel: raised card with `--color-brand-soft` wash and a subtle dzong-lattice geometric motif (CSS repeating-linear-gradient at ≤5% opacity, decorative only, `aria-hidden`). Left: label "Total spent · September 2026", figure in Space Mono, expense count line. Right: "Add Expense" CTA and "Export CSV" ghost button.
2. Stat tile row: 4 tiles (This Month, Top Category, Avg. Entry, Transactions count) — grid 4-up ≥lg, 2-up ≥sm, 1-up below.
3. Charts row: `lg:grid-cols-3`; Spending Trend area chart spans 2, Category donut spans 1. Both 260px tall, token-colored axes/tooltips, empty-state with CTA when no data.
4. Bottom row: `lg:grid-cols-5`; Category Breakdown bars span 3, Recent (5 items) spans 2 with "View all" switching to Transactions.

Transactions view:
1. Toolbar card: search input (icon-prefixed), category chips (All + 8), result count pill.
2. List card: header row (Description / Category / Date / Amount) at ≥md, stacked rows below; per-row delete button revealed on hover (always visible on touch); footer bar with filtered total.
3. Empty state when filter yields nothing.

Add Expense modal: unchanged fields and validation (date ≤ today, amount > 0, description required), autofocus amount, Esc and backdrop close, restyled on tokens with `role="dialog" aria-modal="true"` and a labelled heading.

Toasts: fixed bottom-right stack, token-colored per type (success/error/info), auto-dismiss 3s, manual dismiss button.

## 5. Code structure

New files:
- `src/types.ts` — `Category`, `Expense`, `Toast`, `Theme`.
- `src/data.ts` — `CATEGORIES`, `CAT_COLORS`, `CAT_ICONS`, `SEED_DATA`, `STORAGE_KEY`, `HISTORY_KEY`, `THEME_KEY`.
- `src/format.ts` — `today`, `formatDate`, `formatAmount`, `uid`, `loadFromStorage`, `saveToStorage`.
- `src/hooks/useTheme.ts` — theme state, `<html data-theme>` sync, persistence.
- `src/hooks/useExpenses.ts` — expenses + history state, persistence effects, `addExpense`, `deleteExpense`, `undoLast`, `clearAll`, `exportCSV`, toasts + `dismissToast`.
- `src/components/Sidebar.tsx`, `MobileBar.tsx`, `StatCard.tsx`, `HeroPanel.tsx`, `TrendChart.tsx`, `CategoryDonut.tsx`, `CategoryBreakdown.tsx`, `RecentList.tsx`, `TransactionTable.tsx`, `AddExpenseModal.tsx`, `ToastStack.tsx`, `ThemeToggle.tsx`.

Modified: `src/App.tsx` (composition + view state + keyboard shortcuts only), `src/index.css` (token system).

Component contracts (props):
- `Sidebar { view, onView, onAdd, onExport, onUndo, canUndo, onClearAll }`
- `MobileBar { view, onView, onAdd, onExport, onUndo, canUndo, onClearAll }`
- `HeroPanel { total, monthLabel, count, onAdd, onExport }`
- `StatCard { label, value, icon, tone: "ink" | "brand" | "accent" | "info" }`
- `TrendChart { data: { date: string; amount: number }[], theme, onAdd }`
- `CategoryDonut { data: { name: string; value: number }[], theme }`
- `CategoryBreakdown { data, total, theme }`
- `RecentList { items, onDelete, onViewAll }`
- `TransactionTable { items, onDelete, total }`
- `AddExpenseModal { onClose, onAdd }`
- `ToastStack { toasts, onDismiss }`
- `ThemeToggle { theme, onToggle, compact?: boolean }`

Keyboard shortcuts stay in `App.tsx`: Ctrl/Cmd+N opens modal, Ctrl/Cmd+Z undo, Esc closes modal.

## 6. Behavior parity contract

Identical to today, verified by test:
- Storage keys `fintrack-expenses` and `fintrack-history` unchanged; existing browser data survives the makeover.
- Seed data (12 entries) unchanged and used only as first-run fallback.
- Add prepends to expenses + history; delete pushes the removed expense onto history; undo pops history back into expenses; clear-all empties both and removes both keys.
- Search is case-insensitive substring match on description; category chips filter exactly; footer total reflects the filtered set.
- CSV export columns and filename unchanged: `Date,Description,Category,Amount` → `fintrack-export.csv`.
- Toast copy and 3s auto-dismiss unchanged.
- Charts: same aggregations (daily totals for dates ≥ 2026-09-01; per-category sums). The "this month" window stays hard-coded to the `2026-09` prefix exactly as in the current build; the makeover does not change which expenses count toward monthly figures.

Intentional visible changes (approved):
1. Currency prefix `Rs.` → `Nu.` in `formatAmount` (all surfaces, tooltips, CSV amounts keep bare numbers as today).
2. New theme toggle with persisted preference.

## 7. Accessibility & motion

- All body text ≥4.5:1 and large text/UI ≥3:1 against its surface in both themes (token table chosen to satisfy this).
- `:focus-visible` 2px ring in `--color-focus`, offset 2px, on every interactive element.
- Icon-only buttons carry `aria-label`; nav marks active item with `aria-current="page"`; modal is a labelled dialog; toasts are `role="status"`.
- Chart wrappers get `role="img"` plus an `aria-label` summarizing the series (e.g. "Daily spending, 7 days, total Nu. 1,300.00").
- `@media (prefers-reduced-motion: reduce)` disables the reveal animation and recharts animations (`isAnimationActive={false}` when matched).
- Hover transitions capped at 250ms; theme switch transitions background/color at 200ms.

## 8. Verification plan

1. `npx tsc --noEmit` clean; `npm run build` succeeds.
2. Browser at 1440px and 390px widths, both themes:
   - add expense via modal (validation error path included) → toast appears, list and stats update;
   - delete a row → undo restores it (button and Ctrl+Z);
   - search + category chip combinations update list and footer total;
   - CSV download triggers with expected header;
   - theme toggle flips every surface, survives reload, and charts re-color;
   - clear-all shows empty states, then clearing localStorage restores seed data;
   - Esc closes modal; Ctrl+N opens it.
3. Contrast spot-check of ink/muted/brand text on each surface in both themes.

## 9. Risks & mitigations

- Recharts SVG props with theme-dependent colors: resolved hex values are passed from React state (no `var()` inside SVG), so no browser-support risk.
- Existing localStorage payloads from the old build are read as-is; no migration needed because the schema is untouched.
- Mobile action placement (Export/Undo/Clear) differs from desktop; both bars render the same handlers, so parity is structural rather than visual.
- `dist/` contains a stale production build; it is ignored and regenerated only by `npm run build`.
