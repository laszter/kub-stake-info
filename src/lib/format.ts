import { formatEther } from "viem";

/** Format a wei bigint into a human KUB string with thousands separators. */
export function formatKUB(
  wei: bigint,
  opts: { decimals?: number; withSymbol?: boolean } = {},
): string {
  const { decimals = 2, withSymbol = false } = opts;
  const value = Number(formatEther(wei));
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return withSymbol ? `${formatted} KUB` : formatted;
}

/**
 * Tidy KUB value for detail tiles: capped decimals, no awkward wrapping.
 * Tiny non-zero dust collapses to "< 0.0001". Pair with `formatKUBExact`
 * in a title attribute for full precision on hover.
 */
export function formatKUBDisplay(wei: bigint): string {
  if (wei === 0n) return "0";
  const v = Number(formatEther(wei));
  if (v > 0 && v < 0.0001) return "< 0.0001";
  if (v >= 1)
    return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return v.toLocaleString("en-US", { maximumSignificantDigits: 4 });
}

/** Full-precision KUB value (no rounding) — for tooltips / raw display. */
export function formatKUBExact(wei: bigint, withSymbol = true): string {
  const s = formatEther(wei);
  const [int, frac] = s.split(".");
  const intFmt = BigInt(int).toLocaleString("en-US");
  const out = frac ? `${intFmt}.${frac}` : intFmt;
  return withSymbol ? `${out} KUB` : out;
}

/** Basis points (10000 = 100%) → percent string, e.g. 500 → "5%". */
export function bpsToPercent(bps: number | bigint, decimals = 0): string {
  const pct = Number(bps) / 100;
  return `${pct.toLocaleString("en-US", { maximumFractionDigits: decimals })}%`;
}

/** Staking power percentage from two wei bigints. */
export function stakingPower(part: bigint, total: bigint, decimals = 2): string {
  if (total === 0n) return "0%";
  // Use 1e6 scaling to keep precision on bigint division.
  const scaled = Number((part * 1_000_000n) / total) / 1_000_000;
  return `${(scaled * 100).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

/** Shorten an address: 0x3C55…df25 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/** Compact number formatting, e.g. 10789221 → "10.79M". */
export function formatCompact(value: number): string {
  return value.toLocaleString("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  });
}

/**
 * Measured reward rate → percent label with two decimals, e.g. 0.36 → "0.36%".
 * `null` means "no rate" (unreadable data, or a divide-by-zero the caller
 * refused to guess at) and renders as an em dash.
 *
 * Deliberately *not* the `fmtPct` in `src/app/nodes/[address]/page.tsx`: that
 * one collapses every value below 1 into "<1%", which is honest for a stake
 * share but fatal here — measured rates on this network sit between 0.08% and
 * 1.00%, so every node in the list would print the identical label and any
 * ordering by rate would look like noise. `minimumFractionDigits` is pinned to
 * the maximum so the digit count never changes between rows, which is what
 * makes `tabular-nums` columns line up.
 */
export function formatRatePercent(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  return `${pct.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

/**
 * Elapsed seconds → coarse relative label: "just now" · "5 min ago" ·
 * "3 h ago" · "2 d ago". `null` is "unknown" and renders as an em dash —
 * callers must not pass 0 to mean "never happened", that is a different
 * message ("None in 7 days") decided at the call site.
 *
 * The buckets are coarse on purpose. Pages showing this are ISR with
 * `revalidate = 60`, so a rendered age can already be a minute stale; a finer
 * bucket ("94 s ago") would advertise a precision the cache cannot honour.
 * Every bucket floors instead of rounding, so the label stays a lower bound:
 * 3599 s reads "59 min ago" rather than jumping to "60 min ago" one second
 * before the hour bucket takes over, and page staleness only ever pushes the
 * real age further past what we printed — never before it.
 *
 * `seconds` is always computed on the server (head block − last reward block,
 * times the fixed 3 s block time). Nothing in this project calls `Date.now()`
 * while rendering on the client: `src/components/nodes/BlocksProducedChart.tsx`
 * (lines 95-100) derives its "3h ago" labels purely from two server-supplied
 * numbers, and `src/components/ui/DataFreshness.tsx` formats with a pinned
 * locale and UTC timezone. Both exist so server and client HTML match exactly;
 * feeding a client-side clock delta in here would reintroduce the hydration
 * mismatch they avoid.
 */
export function formatAge(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  // Under two minutes reads as "now" to a human and is inside the ISR window
  // anyway. A negative value (block clock drift) lands here too, which beats
  // printing a future timestamp.
  if (seconds < 120) return "just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} min ago`;
  // Hours run to 48, not 24: "36 h ago" is easier to reason about than
  // "1 d ago" when the question is whether a node went quiet overnight.
  if (seconds < 172_800) return `${Math.floor(seconds / 3_600)} h ago`;
  return `${Math.floor(seconds / 86_400)} d ago`;
}
