import { EXPLORER_URL } from "@/lib/chain";
import { formatKUBDisplay, formatKUBExact, shortenAddress } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";

/** Percentage via 1e9-scaled bigint division — copied from `pctOf` in
    `src/app/nodes/[address]/page.tsx` so the two share columns agree. Plain
    `(a*100n)/total` (or even 1e6 scaling) integer-divides a sub-millionth share
    like 1 KUB of 6M down to 0; 1e9 keeps a real delegation non-zero so the
    "<1%" label stays honest. */
function pctOf(part: bigint, total: bigint): number {
  if (total <= 0n) return 0;
  return Number((part * 1_000_000_000n) / total) / 1e7;
}

/** Percent label that never collapses a real, non-zero share to "0%".
    Mirrors `fmtPct` in `src/app/nodes/[address]/page.tsx`. */
function fmtPct(pct: number): string {
  if (pct <= 0) return "0%";
  if (pct < 1) return "<1%";
  return `${pct.toFixed(0)}%`;
}

/**
 * Largest delegators of a pool, ranked. Deliberately a server component (no
 * `"use client"`) so wei amounts can cross as `bigint` instead of being
 * stringified at a client boundary — nothing here is interactive except the
 * copy button, which brings its own client boundary.
 *
 * `total` is the pool's on-chain `delegatedAmount`, not the sum of `rows`:
 * the table only shows the top slice, so dividing by the rows' own sum would
 * inflate every share to look like the whole pool.
 */
export function TopDelegatorsTable({
  rows,
  total,
}: {
  rows: { address: string; amount: bigint }[];
  total: bigint;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-card border border-dashed border-line px-5 py-10 text-center text-sm text-ink-muted">
        No delegators yet — nobody has staked into this pool.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin mt-3 overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">
          Largest delegators to this pool, ranked by delegated amount, with each
          one&apos;s share of the pool&apos;s total delegated stake
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
            <th scope="col" className="px-5 py-3 font-medium">
              <span className="sr-only">Rank</span>
              <span aria-hidden>#</span>
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              Delegator
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Delegated
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Share
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, i) => (
            <tr
              key={row.address}
              className="transition-colors hover:bg-surface"
            >
              <td className="px-5 py-3 text-ink-muted tabular-nums">{i + 1}</td>
              <td className="px-5 py-3">
                <span className="flex items-center gap-2">
                  <a
                    href={`${EXPLORER_URL}/address/${row.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-ink hover:text-brand"
                  >
                    {shortenAddress(row.address)}
                  </a>
                  <CopyButton value={row.address} />
                </span>
              </td>
              <td
                className="px-5 py-3 text-right font-medium text-ink tabular-nums"
                title={formatKUBExact(row.amount)}
              >
                {formatKUBDisplay(row.amount)}{" "}
                <span className="font-normal text-ink-muted">KUB</span>
              </td>
              <td className="px-5 py-3 text-right text-ink-soft tabular-nums">
                {fmtPct(pctOf(row.amount, total))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
