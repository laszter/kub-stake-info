import { Chevron } from "kub-stake-info";

// Stroke uses currentColor, so color comes from the surrounding text color.
export const Directions = () => (
  <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
    <span className="inline-flex flex-col items-center gap-1 text-ink">
      <Chevron direction="right" className="h-6 w-6" />
      <span className="text-xs text-ink-muted">right</span>
    </span>
    <span className="inline-flex flex-col items-center gap-1 text-ink">
      <Chevron direction="down" className="h-6 w-6" />
      <span className="text-xs text-ink-muted">down</span>
    </span>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 20, alignItems: "center" }} className="text-brand">
    <Chevron direction="right" className="h-4 w-4" />
    <Chevron direction="right" className="h-6 w-6" />
    <Chevron direction="right" className="h-8 w-8" />
  </div>
);

export const InRow = () => (
  <span className="inline-flex items-center gap-1.5 text-ink-soft">
    <span className="text-sm font-medium">Show all validators</span>
    <Chevron direction="down" className="h-4 w-4 text-brand" />
  </span>
);
