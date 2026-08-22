"use client";

import { useState } from "react";
import type { BlocksProducedSeries } from "@/lib/explorer";
import type { RewardSeries } from "@/lib/rewards";
import { InfoHint } from "@/components/ui/InfoHint";
import { HourlyChart } from "./HourlyChart";

type Tab = "blocks" | "rewards";

/** Counts are whole blocks; the average is not, so it rounds here rather than
    printing "222.79 blocks/hr". Every other value it sees is already an
    integer, which makes the rounding a no-op for them. */
const formatBlocks = (v: number) => Math.round(v).toLocaleString("en-US");

/** KUB for the tooltip and footer. Mirrors `formatKUBDisplay` in `format.ts`
    (same 4-decimal cap, same "< 0.0001" floor for dust) but takes a number,
    because the series crossed the cache as KUB rather than wei. Dust gets its
    own label instead of rounding to "0" — an hour that paid something is not
    the same as an hour that paid nothing, which is the distinction the whole
    chart exists to show. */
const formatKub = (v: number) => {
  if (v === 0) return "0";
  if (v < 0.0001) return "< 0.0001";
  return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
};

/** Terser KUB for the y axis, which has three labels and no room for four
    decimals. `niceMax` only ever hands it a 1/2/5 × 10ⁿ value or half of one,
    so two or three decimals always land exactly on the tick. */
const formatKubTick = (v: number) =>
  v === 0
    ? "0"
    : v.toLocaleString("en-US", { maximumFractionDigits: v < 1 ? 3 : 2 });

const HINTS: Record<Tab, string> = {
  blocks:
    "Blocks this node produced (signed) in each of the last 24 hours, per KUB Scan. Dips indicate missed slots or downtime.",
  rewards:
    "KUB paid out to this node in each of the last 24 hours, summed from its DistributeRewards events. This is the whole payout before the split, so on a pool it includes the delegators' share as well as the owner's.",
};

const TITLES: Record<Tab, string> = {
  blocks: "Blocks produced per hour",
  rewards: "KUB rewards per hour",
};

/**
 * The node page's hourly activity card: one chart, two series, a segmented
 * control to switch between them.
 *
 * Both series arrive as props already fetched — they come from different places
 * (the explorer crawl for blocks, the network-wide log scan for rewards) and
 * neither is fetched on switch, so flipping tabs is instant and costs nothing.
 *
 * Each tab keeps the page's three-way discipline about missing data, because the
 * three cases mean different things and must not be conflated: a source that
 * could not be read says so, a node that genuinely did nothing in the window
 * says *that*, and anything else draws the chart. Silently plotting 24 zeroes
 * for an outage would read as a dead node.
 */
export function NodeActivityChart({
  blocks,
  rewards,
}: {
  blocks: BlocksProducedSeries | null;
  rewards: RewardSeries | null;
}) {
  const [tab, setTab] = useState<Tab>("blocks");

  // Same segmented-control treatment as the grid/list toggle in
  // `ValidatorExplorer`, so the two read as one control vocabulary.
  const tabBtn = (on: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      on ? "bg-card text-brand-dark shadow-sm" : "text-ink-muted hover:text-ink"
    }`;

  const series = tab === "blocks" ? blocks : rewards;
  const values = tab === "blocks" ? blocks?.counts : rewards?.values;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="flex items-center text-sm font-medium text-ink-soft">
          {TITLES[tab]}
          <span className="ml-1 text-ink-muted">· last 24h</span>
          {/* Keyed so the popover unmounts on tab change — otherwise an open
              hint would keep showing the previous series' explanation. */}
          <InfoHint key={tab} label={HINTS[tab]} />
        </h3>

        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab("blocks")}
            className={tabBtn(tab === "blocks")}
            aria-label="Show blocks produced per hour"
            aria-pressed={tab === "blocks"}
          >
            Blocks
          </button>
          <button
            type="button"
            onClick={() => setTab("rewards")}
            className={tabBtn(tab === "rewards")}
            aria-label="Show KUB rewards per hour"
            aria-pressed={tab === "rewards"}
          >
            KUB
          </button>
        </div>
      </div>

      {!series || !values ? (
        <p className="mt-3 text-sm text-ink-muted">
          {tab === "blocks"
            ? "Couldn't load production history from KUB Scan — try again shortly."
            : "Couldn't read reward history from the chain — try again shortly."}
        </p>
      ) : values.every((v) => v === 0) ? (
        <p className="mt-3 text-sm text-ink-muted">
          {tab === "blocks"
            ? "No blocks produced in the last 24 hours."
            : "No rewards paid in the last 24 hours."}
        </p>
      ) : (
        <HourlyChart
          values={values}
          bucketStarts={series.bucketStarts}
          to={series.to}
          format={tab === "blocks" ? formatBlocks : formatKub}
          formatTick={tab === "blocks" ? formatBlocks : formatKubTick}
          unit={tab === "blocks" ? "blocks" : "KUB"}
          title={TITLES[tab]}
        />
      )}
    </>
  );
}
