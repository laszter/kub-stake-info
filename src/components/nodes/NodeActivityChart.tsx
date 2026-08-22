"use client";

import { useState } from "react";
import type { BlocksProducedSeries } from "@/lib/explorer";
import type { RewardSeries } from "@/lib/rewards";
import { alignHourly } from "@/lib/hourly";
import { InfoHint } from "@/components/ui/InfoHint";
import { HourlyChart, type ChartSeries } from "./HourlyChart";

type Tab = "blocks" | "rewards" | "both";

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
  both:
    "Blocks produced and KUB paid out, hour by hour. The two come from different sources, read minutes apart, so their hours are matched up by timestamp before overlaying. Each line has its own scale — the two differ by orders of magnitude — so read the shapes against each other, not the heights: hours where reward outruns production, or lags it, are the interesting ones.",
};

const TITLES: Record<Tab, string> = {
  blocks: "Blocks produced per hour",
  rewards: "KUB rewards per hour",
  both: "Blocks & KUB rewards per hour",
};

/** Base spec for each series. Colour and stroke are decided per tab: alone, a
    series gets the brand green and its area fill; overlaid, the second takes the
    `chart-alt` token and a dashed stroke, and neither is filled — two
    translucent fills stacked read as a third colour and swallow the lines. */
const BLOCKS: Omit<ChartSeries, "values"> = {
  format: formatBlocks,
  formatTick: formatBlocks,
  unit: "blocks",
  name: "Blocks",
  color: "var(--color-brand)",
};
const REWARDS: Omit<ChartSeries, "values"> = {
  format: formatKub,
  formatTick: formatKubTick,
  unit: "KUB",
  name: "KUB rewards",
  color: "var(--color-brand)",
};

/**
 * The node page's hourly activity card: one chart, three views — blocks, KUB
 * paid out, or both overlaid — behind a segmented control.
 *
 * Both series arrive as props already fetched. They come from different places
 * (the explorer crawl for blocks, the network-wide log scan for rewards) and
 * neither is fetched on switch, so flipping tabs is instant and costs nothing.
 *
 * Every tab keeps the page's three-way discipline about missing data, because
 * the three cases mean different things and must not be conflated: a source that
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

  const blocksEmpty = blocks?.counts.every((v) => v === 0) ?? true;
  const rewardsEmpty = rewards?.values.every((v) => v === 0) ?? true;

  /** The overlay's shared grid. Both series are 24 rolling hours, but each is
      anchored to the chain head as of its own cache fill, so index i is not the
      same hour in both — see `hourly.ts`. Aligning by timestamp is what keeps a
      payout drawn over the blocks it was earned by; the price is that the
      window shrinks to the hours both sources cover, hence the header counting
      the buckets rather than saying "24h" whatever happens. */
  const both =
    blocks && rewards
      ? alignHourly(
          { values: blocks.counts, bucketStarts: blocks.bucketStarts },
          rewards,
        )
      : null;

  const windowHours =
    (tab === "blocks"
      ? blocks?.counts.length
      : tab === "rewards"
        ? rewards?.values.length
        : both?.bucketStarts.length) ?? 24;

  function panel() {
    if (tab === "blocks") {
      if (!blocks) return <Note>{OUTAGE.blocks}</Note>;
      if (blocksEmpty) return <Note>No blocks produced in the last 24 hours.</Note>;
      return (
        <HourlyChart
          series={[{ ...BLOCKS, values: blocks.counts, fill: true }]}
          bucketStarts={blocks.bucketStarts}
          to={blocks.to}
          title={TITLES.blocks}
        />
      );
    }

    if (tab === "rewards") {
      if (!rewards) return <Note>{OUTAGE.rewards}</Note>;
      if (rewardsEmpty) return <Note>No rewards paid in the last 24 hours.</Note>;
      return (
        <HourlyChart
          series={[{ ...REWARDS, values: rewards.values, fill: true }]}
          bucketStarts={rewards.bucketStarts}
          to={rewards.to}
          title={TITLES.rewards}
        />
      );
    }

    // Overlay. Needs both sources, so an outage in either is fatal to this view
    // even though the other tab still works — say which one is missing rather
    // than drawing half a comparison.
    if (!blocks || !rewards) {
      return <Note>{!blocks ? OUTAGE.blocks : OUTAGE.rewards}</Note>;
    }
    // Two windows that no longer overlap at all — one cache would have to be a
    // day stale. Nothing honest to draw, so say that rather than overlay hours
    // that are not the same hours.
    if (!both) return <Note>{OUTAGE.unaligned}</Note>;
    // One flat line against a live one is still a real comparison, so only an
    // entirely silent node gets the note.
    if (blocksEmpty && rewardsEmpty) {
      return <Note>No blocks produced and no rewards paid in the last 24 hours.</Note>;
    }
    return (
      <HourlyChart
        series={[
          { ...BLOCKS, values: both.a },
          {
            ...REWARDS,
            values: both.b,
            color: "var(--color-chart-alt)",
            dashed: true,
          },
        ]}
        // The blocks series' grid, trimmed to the hours the rewards series also
        // covers — `alignHourly` has already re-indexed the payouts onto it, so
        // one x position is one hour in both lines. `to` stays the blocks
        // anchor, which is what the "Nh ago" labels are measured from.
        bucketStarts={both.bucketStarts}
        to={blocks.to}
        title={TITLES.both}
      />
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h3 className="flex items-center text-sm font-medium text-ink-soft">
          {TITLES[tab]}
          <span className="ml-1 text-ink-muted">· last {windowHours}h</span>
          {/* Keyed so the popover unmounts on tab change — otherwise an open
              hint would keep showing the previous view's explanation. */}
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
          <button
            type="button"
            onClick={() => setTab("both")}
            className={tabBtn(tab === "both")}
            aria-label="Show blocks and KUB rewards together"
            aria-pressed={tab === "both"}
          >
            Both
          </button>
        </div>
      </div>

      {panel()}
    </>
  );
}

const OUTAGE = {
  blocks: "Couldn't load production history from KUB Scan — try again shortly.",
  rewards: "Couldn't read reward history from the chain — try again shortly.",
  unaligned:
    "Block and reward history currently cover different days — try again shortly.",
};

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-ink-muted">{children}</p>;
}
