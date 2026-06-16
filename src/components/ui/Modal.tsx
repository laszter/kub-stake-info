"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal shell: backdrop, Escape-to-close, click-outside, focus trap,
 * scroll lock, and focus restore. `dismissible={false}` keeps the dialog open
 * during a critical operation (e.g. a transaction mid-flight) while still
 * trapping focus, so the user is never silently stranded.
 */
export function Modal({
  open,
  onClose,
  dismissible = true,
  labelledBy,
  describedBy,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  dismissible?: boolean;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const restoreFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const focusables = () =>
      panel
        ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null,
          )
        : [];

    // Prefer an element the dialog marks as the natural landing spot (e.g. the
    // confirm/close button) over the first tabbable, which may be a link.
    const preferred = panel?.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? focusables()[0] ?? panel)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) {
        e.preventDefault();
        panel?.focus();
        return;
      }
      const idx = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && idx === f.length - 1) {
        e.preventDefault();
        f[0].focus();
      }
    }

    document.addEventListener("keydown", onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      restoreFocus?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`animate-reveal w-full rounded-card bg-white shadow-xl focus:outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
