"use client";

import { useEffect, useId, useState } from "react";
import type { TxStatus } from "@/hooks/useTx";
import { EXPLORER_URL } from "@/lib/chain";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const COPY: Record<TxStatus, { title: string; body: string } | null> = {
  idle: null,
  simulating: { title: "Checking transaction…", body: "Simulating against the contract." },
  pending: { title: "Confirm in your wallet", body: "Waiting for you to sign the transaction." },
  confirming: { title: "Transaction submitted", body: "Waiting for on-chain confirmation…" },
  success: { title: "Success", body: "Your transaction is confirmed." },
  error: { title: "Transaction failed", body: "" },
};

function SuccessIcon() {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand-dark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6" aria-hidden>
        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function ErrorIcon() {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} className="h-6 w-6" aria-hidden>
        <path d="M12 8v5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="0.5" fill="currentColor" stroke="none" />
        <path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function TxStatusModal({
  status,
  hash,
  error,
  onClose,
}: {
  status: TxStatus;
  hash?: `0x${string}`;
  error?: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  // Dismissing during a running tx hides the modal to a pill rather than
  // resetting state, so the user is never stranded *and* never loses tracking.
  const [hidden, setHidden] = useState(false);

  // Re-surface automatically whenever we're not mid-flight: a brand-new attempt
  // and, crucially, the terminal success/error outcome the user is waiting on.
  useEffect(() => {
    if (status !== "pending" && status !== "confirming") setHidden(false);
  }, [status]);

  if (status === "idle") return null;

  const copy = COPY[status]!;
  const busy = status === "simulating" || status === "pending" || status === "confirming";

  if (hidden && busy) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink shadow-lg transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden />
        Transaction pending… <span className="text-ink-muted">tap to view</span>
      </button>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      labelledBy={titleId}
      describedBy={bodyId}
      className="max-w-sm"
    >
      <div className="p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center">
          {busy && (
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand"
              role="status"
              aria-label="Working"
            />
          )}
          {status === "success" && <SuccessIcon />}
          {status === "error" && <ErrorIcon />}
        </div>
        <h3 id={titleId} className="mt-3 text-lg font-bold text-ink">
          {copy.title}
        </h3>
        <p id={bodyId} className="mt-1 text-sm text-ink-soft">
          {error ?? copy.body}
        </p>

        {hash && (
          <a
            href={`${EXPLORER_URL}/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block break-all rounded font-mono text-xs text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            View on KUB Scan ↗
          </a>
        )}

        {busy ? (
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="mt-5 block w-full rounded py-1 text-xs text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            Dismiss · the transaction keeps running
          </button>
        ) : (
          <Button onClick={onClose} fullWidth size="md" className="mt-5" data-autofocus>
            {status === "success" ? "Done" : "Close"}
          </Button>
        )}
      </div>
    </Modal>
  );
}
