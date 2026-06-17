export function Logo({ className = "" }: { className?: string }) {
  // Isometric "KUB-cube": a faceted gem/block in graded KUB green.
  // Four facets (two top, two sides) read as a 3D cube — KUB → cube — and a
  // stacked block for staking, distinct from a flat diamond.
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M4 10L16 17L16 29L4 22Z" fill="#0C9A57" />
      <path d="M28 10L16 17L16 29L28 22Z" fill="#0A7D47" />
      <path d="M16 3L4 10L16 17Z" fill="#2FD587" />
      <path d="M16 3L28 10L16 17Z" fill="#0EB366" />
    </svg>
  );
}
