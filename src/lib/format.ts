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
