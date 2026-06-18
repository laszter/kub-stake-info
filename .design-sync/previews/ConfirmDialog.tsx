import { ConfirmDialog } from "kub-stake-info";

const noop = () => {};

// Overlay component — rendered open inside a single full-card (cfg.overrides).
// The min-height wrapper gives the card mount real height so the dialog's
// `position: fixed` overlay fills the card and centers (the mount sets a
// transform, which would otherwise collapse the fixed containing block).
// The danger variant is the canonical high-stakes use (unstaking funds).
export const Unstake = () => (
  <div style={{ minHeight: "100vh" }}>
    <ConfirmDialog
      open
      danger
      title="Unstake 1,250 KUB?"
      message="Your KUB enters a 7-day unbonding period before it can be withdrawn, and stops earning rewards immediately."
      confirmLabel="Unstake"
      cancelLabel="Keep staked"
      onConfirm={noop}
      onCancel={noop}
    />
  </div>
);
