import { CopyButton } from "kub-stake-info";

// Copy affordance for addresses/hashes. Shows the clipboard icon; on click it
// flips to a check for 1.5s (interaction-driven, so the static capture shows
// the idle clipboard state).
export const WithAddress = () => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink">
    <span className="font-mono">0x8a3c…7b8c</span>
    <CopyButton value="0x8a3c2f1b9d4e5a6c7b8e9f0a1b2c3d4e5f6a7b8c" />
  </span>
);

export const Inline = () => (
  <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
    <span>Validator address</span>
    <CopyButton value="0x1f2e3d4c5b6a7980abcdef0123456789abcdef01" label="Copy validator address" />
  </span>
);
