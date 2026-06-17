const styles: Record<string, string> = {
  Active: "bg-brand-light text-brand-dark",
  Unstaked: "bg-warning-light text-warning",
  Uninitialized: "bg-surface text-ink-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[status] ?? styles.Uninitialized
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
