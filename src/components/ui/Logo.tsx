export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M16 2L24 10L16 18L8 10L16 2Z" fill="#0EB366" />
      <path d="M16 14L24 22L16 30L8 22L16 14Z" fill="#0C9A57" />
    </svg>
  );
}
