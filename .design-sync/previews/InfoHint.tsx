import { InfoHint } from "kub-stake-info";

// The "i" affordance sits next to a domain term. Its popover opens on
// hover/focus/tap (interaction-driven, so it shows closed in a static capture).
export const InLabel = () => (
  <span className="inline-flex items-center text-sm font-medium text-ink">
    Annual reward rate
    <InfoHint label="Estimated yearly return on your staked KUB, net of validator commission. Varies with network participation." />
  </span>
);

export const TermList = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="text-sm text-ink">
    <span className="inline-flex items-center">
      Unbonding period
      <InfoHint label="The 7-day delay between unstaking and being able to withdraw your KUB." />
    </span>
    <span className="inline-flex items-center">
      Commission
      <InfoHint label="The share of rewards the validator keeps as a fee." />
    </span>
  </div>
);
