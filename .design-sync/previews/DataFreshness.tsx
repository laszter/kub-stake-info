import { DataFreshness } from "kub-stake-info";

// Fixed timestamp keeps the render deterministic across captures.
const AS_OF = new Date("2026-06-18T09:30:00Z");

export const Default = () => <DataFreshness time={AS_OF} />;

export const InPanel = () => (
  <div style={{ maxWidth: 380 }} className="rounded-card border border-line bg-card p-4">
    <p className="mb-1 text-sm font-semibold text-ink">Network stats</p>
    <DataFreshness time={AS_OF} />
  </div>
);
