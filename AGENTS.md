# Task & planning notes

Any task lists, planning notes, or scratch specs (e.g. `TASKS-*.md`) go in the
`task/` folder, never in the repo root. The whole `task/` folder is git-ignored,
so these stay local and out of version control.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Theming (dark mode)

Class-based dark mode lives in `src/app/globals.css`:

- Semantic colour tokens are defined in `@theme` (light values) and overridden under `.dark`. Tailwind utilities resolve to `var(--color-*)`, so a utility like `bg-card` / `text-ink` / `border-line` flips automatically when `<html>` gets the `dark` class — **prefer these tokens over raw colours** (`bg-white`, `text-gray-*`, `*-amber-*` …) so new UI themes itself for free.
- Surfaces: `bg` (page) · `card` (panels/modals, replaces the old `bg-white`) · `surface` (footer/pills/hover). Accents: `brand*`, `danger*`, `warning*`, `status-*`.
- Only reach for a `dark:` variant when a value genuinely can't be a token (e.g. the modal scrim `bg-black/40 dark:bg-black/70`).
- State + persistence: `src/providers/ThemeProvider.tsx` (`light | dark | system`, stored under `localStorage.theme`); toggle UI in `src/components/ui/ThemeToggle.tsx`. A no-FOUC inline script in `layout.tsx` applies the class before first paint — keep its logic and the storage key in sync with the provider. Per-theme browser chrome is set via the `viewport.themeColor` export.
