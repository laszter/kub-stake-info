// design-sync buildCmd: compile the app's Tailwind v4 entry (src/app/globals.css)
// into a static stylesheet the converter feeds via cfg.cssEntry. The repo's CSS
// is `@import "tailwindcss"` + `@theme` tokens, which only becomes real CSS after
// a Tailwind build — so we run the same @tailwindcss/postcss plugin the app uses,
// scanning the component sources for utilities. Output is gitignored cache;
// re-sync re-runs this before package-build.mjs.
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

const root = process.cwd();
const inputPath = resolve(root, "src/app/globals.css");
const outPath = resolve(root, ".design-sync/.cache/compiled.css");

// Explicit @source guarantees the scoped UI components + provider AND the
// authored preview compositions are scanned (so utilities used only in a
// preview still compile). Paths are relative to the CSS file (src/app).
// Safelist the full semantic-token utility vocabulary so the design agent can
// style NEW designs with any token (not just the ones the app happens to use).
// Without this, a static Tailwind compile only emits classes found in source,
// leaving e.g. bg-brand-dark / bg-status-active unstyled in generated designs.
const TOKENS = [
  "brand", "brand-dark", "brand-light", "on-brand",
  "bg", "card", "surface",
  "ink", "ink-soft", "ink-muted", "line",
  "danger", "danger-dark", "danger-light",
  "warning", "warning-light", "warning-border",
  "status-active", "status-idle", "status-unstaked",
].join(",");
const safelist =
  `\n@source inline("{bg,text,border}-{${TOKENS}}");\n` +
  `\n@source inline("ring-{brand,danger,warning}");\n` +
  `\n@source inline("font-sans rounded-card");\n`;

const source =
  readFileSync(inputPath, "utf8") +
  '\n@source "../**/*.tsx";\n' +
  '\n@source "../../.design-sync/previews/**/*.tsx";\n' +
  safelist;

const result = await postcss([tailwindcss()]).process(source, {
  from: inputPath,
  to: outPath,
});

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, result.css);
console.log(`compiled.css: ${(result.css.length / 1024).toFixed(1)} KB -> ${outPath}`);
