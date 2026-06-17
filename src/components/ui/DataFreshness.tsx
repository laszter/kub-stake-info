function fmtUTC(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  });
}

/**
 * Visible freshness signal — server-rendered (reflects the last ISR
 * regeneration). The machine-readable <time> helps answer engines gauge how
 * current the data is.
 */
export function DataFreshness({
  time,
  className = "",
}: {
  time: Date;
  className?: string;
}) {
  return (
    <p className={`text-xs text-ink-muted ${className}`}>
      Data as of{" "}
      <time dateTime={time.toISOString()}>{fmtUTC(time)} UTC</time> · read live
      from the StakeManager contract, refreshed every 60s
    </p>
  );
}
