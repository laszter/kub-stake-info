import { Logo } from "kub-stake-info";

// The KUB-cube brand mark. Fills are fixed brand greens, so it reads on any surface.
export const Sizes = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    <Logo className="h-6 w-6" />
    <Logo className="h-10 w-10" />
    <Logo className="h-16 w-16" />
  </div>
);

export const WithWordmark = () => (
  <span className="inline-flex items-center gap-2">
    <Logo className="h-8 w-8" />
    <span className="text-xl font-bold text-ink">KUB Stake Info</span>
  </span>
);

// On a dark surface (the .dark token scope) the wordmark ink flips automatically.
export const OnDark = () => (
  <div className="dark rounded-card p-5" style={{ background: "#0b0e12" }}>
    <span className="inline-flex items-center gap-2">
      <Logo className="h-8 w-8" />
      <span className="text-xl font-bold text-ink">KUB Stake Info</span>
    </span>
  </div>
);
