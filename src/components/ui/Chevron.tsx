/** Chevron glyph as an SVG so it matches the rest of the icon set (no font-dependent ›/▾). */
export function Chevron({
  direction = "right",
  className = "",
}: {
  direction?: "right" | "down";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
      className={`${direction === "down" ? "rotate-90" : ""} ${className}`}
    >
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
