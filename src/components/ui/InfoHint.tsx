/**
 * Small inline "i" affordance that explains a domain term in place. Carries the
 * text in both `title` (mouse hover) and `aria-label` (screen reader on focus),
 * and is keyboard-focusable so first-timers aren't left to guess at jargon.
 */
export function InfoHint({ label }: { label: string }) {
  return (
    <span
      tabIndex={0}
      role="note"
      aria-label={label}
      title={label}
      className="ml-1 inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-line text-[10px] font-bold leading-none text-ink-muted align-middle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
    >
      i
    </span>
  );
}
