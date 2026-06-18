# design-sync notes — KUB Stake Info UI Kit

Project: `b737a910-ff36-4b5d-b50e-baa8345c17ac` (https://claude.ai/design/p/b737a910-ff36-4b5d-b50e-baa8345c17ac)

## This repo is a Next.js app, not a packaged design system

There is no `dist/`, no `.d.ts` exports, and no Storybook. Key consequences:

- **Synth-entry mode is NOT usable.** With no `--entry`, `package-build` sets
  `PKG_DIR = node_modules/<pkg>` (which doesn't exist for an app) and crashes in
  `exportedNames`. We instead hand it an explicit barrel: `--entry
  .design-sync/entry.ts`, which makes `PKG_DIR` walk up to the repo root.
- The 11 synced components are enumerated in `config.componentSrcMap` (and
  re-exported from `entry.ts`). **There is no auto-discovery** — adding/removing a
  UI primitive means editing BOTH `entry.ts` and `componentSrcMap`.
- `ThemeProvider` is re-exported from `entry.ts` (not a card) so `cfg.provider`
  can wrap previews; `ThemeToggle` needs it.

## buildCmd compiles Tailwind v4 → static CSS

`cfg.buildCmd = node .design-sync/compile-css.mjs` runs `@tailwindcss/postcss`
over `src/app/globals.css` → `.design-sync/.cache/compiled.css` (gitignored),
wired in via `cfg.cssEntry`. **Run it before `package-build`/`resync`** — the
driver does NOT run buildCmd automatically. On a fresh clone the cache is empty,
so this must run first.

- It `@source`s `src/**` AND `.design-sync/previews/**` (so utilities used only in
  a preview compile), plus a **safelist** of the full semantic-token utility
  vocabulary via `@source inline(...)`. The safelist exists because a static
  Tailwind compile only emits classes found in source — without it, tokens like
  `bg-brand-dark` / `bg-status-active` would be unstyled in designs the agent
  builds. **Keep the `TOKENS` list in compile-css.mjs in sync with the `@theme`
  block in `src/app/globals.css`.**

## Gotchas that cost debugging cycles

- **`next/image` is shimmed.** `Avatar` imports it; the real `next/image` drags
  Next's runtime into the browser IIFE and references bare `process`
  (`__NEXT_IMAGE_OPTS`, `NEXT_RUNTIME`, …), which throws at eval and takes down
  the whole bundle (`window.<GLOBAL>` never assigns). The shim
  (`.design-sync/shims/next-image.tsx`, a plain `<img>`) is wired via
  `tsconfig.build.json` `paths`. esbuild renders a plain `<img>` anyway, so it's
  faithful.
- **`tsconfig.build.json` must have NO comment keys.** The converter strips `//`
  comments with a regex that a `"//"` JSON key breaks → invalid JSON → the
  tsconfig-paths plugin silently returns null and the `next/image` alias (and
  `@/`) stop resolving. Keep that file pure JSON.
- **Overlays need a min-height wrapper.** `Modal` and `ConfirmDialog` use
  `position: fixed`. The preview card mount has `transform: translateZ(0)`, which
  makes `fixed` resolve to a zero-height ancestor → the dialog pins to the top and
  the title clips. Each overlay preview wraps the component in
  `<div style={{ minHeight: "100vh" }}>` and uses `cfg.overrides.<Name> =
  {cardMode:"single", viewport:"WxH"}`. Real designs (no transform ancestor)
  render fine — this is a preview-only fix.

## Known render warns

None — render check is 11/11 clean.

## Re-sync risks (what can silently go stale)

- **Component set drift.** New/removed UI primitives won't appear/disappear unless
  `entry.ts` + `componentSrcMap` are updated (no auto-discovery in `--entry` mode).
- **Roboto substituted.** The app's brand font is Roboto via `next/font`
  (`--font-roboto`), injected at runtime. The static compile has no `--font-roboto`
  so `font-sans` falls back to the system sans stack — previews and designs render
  in system sans, an acceptable substitute. Wire a webfont if exact Roboto is
  wanted (recorded as the accepted substitution).
- **Safelist ↔ @theme drift** (see buildCmd section).
- **Tooltip/copied/hover states are interaction-driven** (`InfoHint` popover,
  `CopyButton` check, `ThemeToggle` cycle) — previews show the idle state by design.
- `compiled.css` is gitignored — always run buildCmd before the converter.
