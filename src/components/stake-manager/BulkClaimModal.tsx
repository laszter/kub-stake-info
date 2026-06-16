"use client";

import { useId, useState } from "react";
import type { TxStatus } from "@/hooks/useTx";
import type { BulkResult, BulkStatus } from "@/hooks/useBulkClaim";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const STEP_COPY: Record<TxStatus, string> = {
  idle: "",
  simulating: "Checking…",
  pending: "Confirm in your wallet",
  confirming: "Confirming on-chain…",
  success: "",
  error: "",
};

export function BulkClaimModal({
  status,
  index,
  total,
  step,
  results,
  onClose,
}: {
  status: BulkStatus;
  index: number;
  total: number;
  step: TxStatus;
  results: BulkResult[];
  onClose: () => void;
}) {
  const titleId = useId();
  const [hidden, setHidden] = useState(false);

  if (status === "idle") return null;

  const running = status === "running";
  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  if (hidden && running) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-lg transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden />
        Claiming {Math.min(index + 1, total)} of {total}… <span className="text-ink-muted">tap to view</span>
      </button>
    );
  }

  return (
    <Modal open onClose={onClose} dismissible={!running} labelledBy={titleId} className="max-w-sm">
      <div className="p-6">
        <div className="flex items-center gap-3">
          {running && (
            <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-line border-t-brand" role="status" aria-label="Working" />
          )}
          <h3 id={titleId} className="text-lg font-bold text-ink">
            {running ? `Claiming ${Math.min(index + 1, total)} of ${total}…` : "Claim complete"}
          </h3>
        </div>

        {running && step !== "idle" && (
          <p className="mt-1 text-sm text-ink-soft">{STEP_COPY[step]}</p>
        )}

        {!running && (
          <p className="mt-1 text-sm text-ink-soft">
            {okCount} claimed{failCount > 0 ? `, ${failCount} failed or skipped` : ""}.
          </p>
        )}

        {results.length > 0 && (
          <ul className="mt-4 max-h-52 space-y-1.5 overflow-y-auto text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={r.ok ? "text-brand" : "text-danger"} aria-hidden>
                  {r.ok ? "✓" : "✕"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink">{r.label}</span>
                  {!r.ok && r.error && (
                    <span className="block text-xs text-ink-muted">{r.error}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {running ? (
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="mt-5 block w-full rounded py-1 text-xs text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            Dismiss · claiming continues
          </button>
        ) : (
          <Button onClick={onClose} fullWidth size="md" className="mt-5" data-autofocus>
            Done
          </Button>
        )}
      </div>
    </Modal>
  );
}
