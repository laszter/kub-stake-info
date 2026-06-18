import { ThemeToggle } from "kub-stake-info";

// Cycles light → dark → system on click; the icon reflects the active theme
// (monitor = system, the default). Reads its preference from ThemeProvider,
// which wraps every preview (cfg.provider).
export const InHeaderBar = () => (
  <div className="inline-flex items-center gap-3 rounded-full border border-line bg-card px-3 py-1.5">
    <span className="text-sm font-medium text-ink-soft">Appearance</span>
    <ThemeToggle />
  </div>
);

export const Standalone = () => (
  <div className="inline-flex rounded-md border border-line bg-card p-1">
    <ThemeToggle />
  </div>
);
