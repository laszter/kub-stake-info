import { Button } from "kub-stake-info";

const noop = () => {};

export const Variants = () => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
    <Button variant="primary" onClick={noop}>Stake KUB</Button>
    <Button variant="secondary" onClick={noop}>Restake</Button>
    <Button variant="danger" onClick={noop}>Unstake</Button>
    <Button variant="neutral" onClick={noop}>Disconnect</Button>
    <Button variant="ghost" onClick={noop}>Cancel</Button>
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button size="sm" variant="primary" onClick={noop}>Small</Button>
    <Button size="md" variant="primary" onClick={noop}>Medium</Button>
  </div>
);

export const States = () => (
  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
    <Button variant="primary" onClick={noop}>Enabled</Button>
    <Button variant="primary" disabled>Disabled</Button>
    <Button variant="secondary" disabled>Disabled</Button>
  </div>
);

export const FullWidth = () => (
  <div style={{ width: 320 }}>
    <Button variant="primary" size="md" fullWidth onClick={noop}>
      Confirm stake
    </Button>
  </div>
);
