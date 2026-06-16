"use client";

import { useId } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * Styled in-app confirmation, replacing the native `window.confirm()` for
 * high-stakes actions (staking/unstaking funds). Lives in the app's own visual
 * vocabulary so amounts read clearly and the prompt feels trustworthy.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const bodyId = useId();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      labelledBy={titleId}
      describedBy={message ? bodyId : undefined}
      className="max-w-sm"
    >
      <div className="p-6">
        <h3 id={titleId} className="text-lg font-bold text-ink">
          {title}
        </h3>
        {message && (
          <p id={bodyId} className="mt-2 text-sm leading-relaxed text-ink-soft">
            {message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
