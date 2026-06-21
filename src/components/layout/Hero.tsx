import type { GlobalStats } from "@/lib/staking";
import { formatKUB } from "@/lib/format";
import { DataFreshness } from "@/components/ui/DataFreshness";

export interface DistributionSegment {
  label: string;
  share: number; // 0–1 of total staked
}

export interface StakeDistribution {
  top: DistributionSegment[];
  topShare: number; // summed share of the listed top segments
  othersShare: number; // remaining share held by everyone else
  othersCount: number;
}

/** Stepped brand tints for the distribution segments — one hue, varied weight,
 *  so the bar reads as a single distribution rather than a rainbow. */
const SEGMENT_TONE = [
  "bg-brand",
  "bg-brand/75",
  "bg-brand/60",
  "bg-brand/45",
  "bg-brand/35",
];

function Figure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-sm font-medium text-ink-muted">{unit}</span>
        )}
      </dd>
    </div>
  );
}

function DistributionBar({ dist }: { dist: StakeDistribution }) {
  const topPct = `${Math.round(dist.topShare * 100)}%`;
  const label = `Stake distribution: the top ${dist.top.length} validators hold ${topPct} of all staked KUB`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium uppercase tracking-wide text-ink-muted">
          Stake distribution
        </span>
        <span className="text-ink-muted">
          Top {dist.top.length} hold{" "}
          <span className="font-semibold text-ink tabular-nums">{topPct}</span>
        </span>
      </div>
      <div
        className="mt-2.5 flex h-2.5 gap-0.5"
        role="img"
        aria-label={label}
      >
        {dist.top.map((s, i) => (
          <div
            key={s.label + i}
            className={`${SEGMENT_TONE[i] ?? "bg-brand/35"} min-w-[3px] first:rounded-l-full`}
            style={{ flexGrow: s.share }}
            title={`${s.label} · ${(s.share * 100).toFixed(2)}%`}
          />
        ))}
        {dist.othersShare > 0.0001 && (
          <div
            className="min-w-[3px] rounded-r-full bg-brand/15"
            style={{ flexGrow: dist.othersShare }}
            title={`${dist.othersCount} other validators · ${(dist.othersShare * 100).toFixed(2)}%`}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Overview masthead — a two-column "network header". The left column carries
 * the identity (live status, title, lede); the right column is a compact KPI
 * list. A full-width stake-distribution bar turns the panel into a true
 * network-at-a-glance summary, and a freshness footer closes it. No marketing
 * gradient — this reads as financial-infrastructure chrome, not a launch page.
 */
export function Hero({
  stats,
  asOf,
  distribution,
}: {
  stats: GlobalStats;
  asOf: Date;
  distribution: StakeDistribution;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-card shadow-sm">
      <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        {/* Identity */}
        <div className="flex flex-col justify-center bg-card px-6 py-6 sm:px-8 sm:py-7">
          <h1 className="text-2xl font-bold tracking-tight text-ink text-balance sm:text-[32px]">
            KUB Staking Network
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            Live validator &amp; node data on the KUB Chain — delegated Proof of
            Stake.
          </p>
        </div>

        {/* KPI list */}
        <dl className="divide-y divide-line bg-card px-6 py-5 sm:px-8 sm:py-6">
          <Figure
            label="Total staked"
            value={formatKUB(stats.totalStaked)}
            unit="KUB"
          />
          <Figure
            label="Active validators"
            value={stats.totalValidators.toLocaleString("en-US")}
          />
          <Figure
            label="Rewards distributed"
            value={formatKUB(stats.totalRewardsDistributed)}
            unit="KUB"
          />
        </dl>
      </div>

      {distribution.top.length > 0 && (
        <div className="border-t border-line bg-card px-6 py-4 sm:px-8 sm:py-5">
          <DistributionBar dist={distribution} />
        </div>
      )}

      <div className="border-t border-line bg-surface px-6 py-2.5 sm:px-8">
        <DataFreshness time={asOf} />
      </div>
    </section>
  );
}
