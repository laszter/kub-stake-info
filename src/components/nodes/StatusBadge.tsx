const styles: Record<string, string> = {
  Unstaked: "bg-warning-light text-warning",
  Uninitialized: "bg-surface text-ink-muted",
};

/**
 * Status pill. "Active" renders nothing: every list we surface is already
 * filtered to active nodes, so an Active badge is pure noise. The badge only
 * earns its place to flag the exceptional Unstaked / Uninitialized states.
 */
export function StatusBadge({ status }: { status: string }) {
  if (status === "Active") return null;
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
