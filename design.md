# Design — Consi

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

Consi is a B2B multi-currency (USD/VES) payment gateway for Venezuela. Three
audiences share one system: merchants running collections, platform admins
reviewing queues, and payers on the hosted checkout. The register is
**instrument panel, not marketing site** — these screens are read for numbers.

## Genre

**modern-minimal** — B2B, API, webhooks, dashboard. Not atmospheric, not playful.

## Theme

**Cobalt**, light + dark. Cool engineered paper, cool charcoal ink, exactly ONE
electric cobalt signal held under ~5 % of any viewport. Hairlines carry all
structure; there are no drop shadows and no gradients anywhere in the system.

Graphite is the one dark beat, and it is **reserved** for two focal surfaces:
the balance readout on the dashboard, and code blocks in the docs. Graphite
used anywhere else dilutes it into decoration.

Values live in [`src/app/tokens.css`](src/app/tokens.css) — that file is the
source of truth, this section is the rationale.

| Role | Light | Dark |
| --- | --- | --- |
| `--color-paper` | `oklch(98.5% 0.004 250)` | `oklch(17% 0.014 260)` |
| `--color-surface` | `oklch(99.6% 0.002 250)` | `oklch(21% 0.016 260)` |
| `--color-ink` | `oklch(24% 0.02 258)` | `oklch(95% 0.005 250)` |
| `--color-ink-3` | `oklch(48% 0.016 256)` | `oklch(68% 0.012 254)` |
| `--color-rule` | `oklch(91% 0.006 252)` | `oklch(30% 0.014 258)` |
| `--color-accent` | `oklch(50% 0.2 257)` | `oklch(70% 0.16 254)` |
| `--color-graphite` | `oklch(22% 0.016 260)` | `oklch(12.5% 0.012 262)` |

**Accent discipline.** `--color-accent` is the only value allowed for fills and
accent *text* — it clears 4.5:1 both on paper and under white. `--color-accent-bright`
is for focus rings and non-text indicators only (3:1 bar). Never set small text
in accent-bright.

**Dark mode is a real second palette, not an inversion.** Graphite sinks *below*
the page in dark mode rather than rising above it, so code cards stay recessive
in both. Theme resolves before first paint via an inline script in
`src/app/layout.tsx`; the user's choice persists in `localStorage['consi-theme']`,
defaulting to `prefers-color-scheme`.

## Typography

- **Display:** Space Grotesk 500/600, `letter-spacing: -0.022em`, always roman.
- **Body:** Inter 400/500.
- **Mono:** JetBrains Mono 400/500.

**Mono is not decoration here — it is the money face.** Every amount, rate,
reference, account number, API key and code block uses `.num` (mono +
`tabular-nums`), so figures align down a column and never reflow as they update.
Mono also carries the `.label` recipe: uppercase, `0.06em` tracked, `--text-2xs`,
`--color-ink-4`. Labels and meta only — never body copy.

Base size is `--text-base` = 0.875rem. Dashboards run tighter than marketing pages.

## Spacing

4-point named scale in `tokens.css` (`--space-3xs` … `--space-3xl`). Pages must
use named tokens. The pre-redesign codebase used ad-hoc pixel values
(`p-[22px]`, `gap-[18px]`, `h-[68px]`) — do not reintroduce them.

## Macrostructure families

Pages within a family share the family's shape and vary only in archetypes.

| Family | Macrostructure | Routes |
| --- | --- | --- |
| **App** | 05 Workbench — rail + header + dense work surface | `/`, `/links`, `/transactions`, `/payouts`, `/settlements`, `/admin`, `/admin/merchants`, `/admin/merchants/new`, `/admin/merchants/[id]` |
| **Docs** | 21 Component Playground — section index + prose + request/response | `/developers` |
| **Focused** | 04 Stat-Led — the single figure is the hero | `/c/[token]`, `/login` |

Every App-family route opens with `<PageHead>` (display title · optional lede ·
optional action, hairline underneath). That component *is* the section rhythm —
do not hand-roll a per-page variant.

## Navigation

- **N3 side rail**, 244px, hairline right border, mono group label, active item
  gets accent-soft fill plus a 2px accent bar. Hidden below `lg`.
- Below `lg` the rail is replaced by a horizontally scrollable strip — no drawer,
  no overlay, no focus trap, and no sideways body scroll at 320px.
- **N13 inline ⌘K pill** in the header, opening a real spotlight palette.
  Combobox/listbox pattern: focus stays on the input and arrows move
  `aria-activedescendant`, so the dialog needs no focus trap.
- **Footer:** Ft2 inline single line, on public surfaces only. Dashboards get no
  footer.

## Motion

- Easings: `--ease-out` `cubic-bezier(0.16,1,0.3,1)` and siblings in `tokens.css`.
- Durations: `--dur-fast` 120ms for state, `--dur-short` 220ms, `--dur-med` 380ms.
- **Reveal pattern: none.** The page is composed, not animated in. Motion is
  reserved for state changes — hover, press, spinner.
- Animate `transform` and `opacity` only. Never a layout property.
- Focus rings are **never** animated; they appear the instant focus lands.
- `prefers-reduced-motion: reduce` collapses animation and transition duration
  to ~0 globally.

## Microinteractions stance

- Silent success. Inline `<Notice>` lines, never toasts, never celebratory motion.
- Copy buttons swap to a check for 1.2s, then revert. No toast.
- Destructive actions confirm via `window.confirm` before firing.
- Loading is a text swap on the button ("Guardando…"), not a spinner overlay.

## CTA voice

- **Primary:** solid `--color-accent`, `--radius-sm` (6px), `--color-accent-ink`
  text. **Never a pill, never a gradient.** One per view.
- **Secondary:** hairline outline on surface.
- **Tertiary:** typographic link, accent-coloured, underline on hover.
- Copy names the destination — "Crear link", "Solicitar retiro", "Liberar fondos
  vencidos". Never "Click here", never "Get started".

## Data honesty

**No page may render invented figures.** The weekly chart derives its series
from real completed pay-ins via `/transactions?type=PAYIN&status=COMPLETED&from=…`
and renders an explicit empty state when there are none. Where a bound is known
(that endpoint caps at `take=100`), the UI says so rather than silently
under-reporting. If a future page needs a metric the API cannot supply, ship the
empty state — not a plausible number.

## Per-page allowances

- App pages: no enrichment. Function carries the page.
- Docs pages: graphite code cards are the only enrichment.
- Focused pages: typography only.

## What pages MUST share

- The wordmark: accent square + "Consi" in Space Grotesk + mono context suffix.
- The accent colour and its ≤5 % budget.
- The display / body / mono trio.
- The CTA voice — 6px radius, fill vs hairline.
- `<PageHead>` for section rhythm; `.label` for all meta; `.num` for all figures.
- Both themes. Anything added must be checked in light **and** dark.

## What pages MAY differ on

- Macrostructure, within the family table above.
- Table column sets and filter rows.
- Whether the page carries a graphite surface (App: only the dashboard readout).

## Banned in this system

Gradients of any kind · coloured glow shadows · drop shadows · mesh/aurora
backgrounds · pill-shaped buttons · italic headings · fake browser chrome
(traffic-light dots, mock title bars) · re-drawn checkboxes and radios ·
hardcoded Tailwind palette colours (`bg-slate-100`, `text-green-400`) ·
raw hex or OKLCH values inline in a component — lift it into `tokens.css` and
reference it by name.

## Exports

### tokens.css

Canonical: [`src/app/tokens.css`](src/app/tokens.css). Imported by
`src/app/globals.css` immediately after `@import "tailwindcss"`.

### Tailwind v4

This project deliberately ships **no** `@theme` block. Our tokens are already
named `--color-*`, so registering them with Tailwind would be self-referential.
Components consume them as arbitrary values — `bg-[var(--color-surface)]`,
`text-[length:var(--text-sm)]`. One rule must stay in `globals.css`:

```css
/* Tailwind v4 defaults border-color to currentColor. */
* { border-color: var(--color-rule); }
```

### Porting to another project

Copy `tokens.css`, the `.num` / `.label` / focus-visible rules from
`globals.css`, and the `THEME_INIT` script from `layout.tsx`. That trio is the
whole system.
