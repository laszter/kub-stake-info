"use client";

import { useId, useState } from "react";

/**
 * Inline "i" affordance that explains a domain term in place. The text shows in
 * a real popover that opens on tap, click, hover, or focus — so touch users and
 * low-vision sighted users get the explanation, not just screen readers. Esc and
 * blur dismiss it; the panel is wired to the trigger via `aria-describedby`.
 */
export function InfoHint({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-block align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="ml-1 inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-line text-[10px] font-bold leading-none text-ink-muted transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute left-1/2 top-full z-30 mt-1.5 w-56 max-w-[min(14rem,80vw)] -translate-x-1/2 rounded-lg border border-line bg-card p-2.5 text-left text-xs font-normal leading-snug text-ink-soft shadow-lg"
        >
          {label}
        </span>
      )}
    </span>
  );
}
