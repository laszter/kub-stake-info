# KUB Stake Info — UI Kit

Reusable UI primitives from the KUB Chain staking explorer. React + Tailwind v4
with a semantic, theme-aware token layer. Build with these components and style
your own layout glue with the token utilities below.

## Setup & theming

- **No provider needed** for any component except `ThemeToggle`. `Button`,
  `Modal`, `Avatar`, `Chevron`, `Logo`, `Pagination`, `CopyButton`, `InfoHint`,
  `ConfirmDialog`, `DataFreshness` render standalone.
- `ThemeToggle` reads theme state from `ThemeProvider` — wrap any tree that uses
  it: `<ThemeProvider>…</ThemeProvider>`. Without it, `ThemeToggle` throws.
- **Dark mode is class-based.** Add `class="dark"` to an ancestor (the app uses
  `<html class="dark">`) and every semantic token flips automatically — there is
  almost never a need for per-element `dark:` variants. Use the tokens, not raw
  colors, and components theme themselves for free.

## Styling idiom — semantic Tailwind utilities

Style with these token utilities (not raw `bg-white` / `text-gray-*`). Each works
as `bg-*`, `text-*`, and `border-*` (and `ring-*` for the accents):

| Family | Tokens |
|---|---|
| Surfaces | `bg-bg` (page) · `bg-card` (panels/modals) · `bg-surface` (subtle fill, footer, pills, hover) |
| Text / ink | `text-ink` (primary) · `text-ink-soft` (secondary) · `text-ink-muted` (tertiary/meta) |
| Brand (KUB green) | `bg-brand` · `bg-brand-dark` (hover) · `bg-brand-light` (tint) · `text-on-brand` (text on a brand fill — dark, AA-safe; never white) |
| Borders | `border-line` |
| Danger (destructive) | `bg-danger` · `bg-danger-dark` · `bg-danger-light` · `text-danger` |
| Warning (wrong-network, unstaked) | `bg-warning` · `bg-warning-light` · `border-warning-border` |
| Status | `status-active` (green) · `status-unstaked` (amber) · `status-idle` (grey) — as `text-`/`bg-` |
| Focus rings | `ring-brand`, `ring-danger`, `ring-warning` (use with an opacity modifier, e.g. `ring-brand/40`) |
| Other | `rounded-card` (panel radius) · `font-sans` (brand sans) |

Round buttons/pills use `rounded-full`; cards/modals use `rounded-card`.

## Where the truth lives

- `styles.css` (and its `@import` of `_ds_bundle.css`) defines every token — read
  it before inventing values; the `.dark` block shows the flipped values.
- Per-component API + usage: each component's `<Name>.d.ts` (props) and
  `<Name>.prompt.md` (composition notes) under `components/general/<Name>/`.

## Idiomatic example

```tsx
import { Button, InfoHint } from "kub-stake-info";

<section className="rounded-card border border-line bg-card p-6">
  <h3 className="text-lg font-bold text-ink">
    Stake KUB
    <InfoHint label="Staking locks your KUB to a validator to earn rewards." />
  </h3>
  <p className="mt-1 text-sm text-ink-soft">Earn rewards by delegating to a validator.</p>
  <div className="mt-5 flex gap-2">
    <Button variant="primary" onClick={stake}>Stake</Button>
    <Button variant="ghost" onClick={cancel}>Cancel</Button>
  </div>
</section>
```

`Button` variants: `primary` (brand), `secondary` (outline), `danger` (destructive),
`neutral` (quiet bordered), `ghost` (text-only). Sizes: `sm`, `md`.
