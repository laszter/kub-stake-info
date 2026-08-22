import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getValidatorByAddress, type Validator } from "@/lib/staking";
import {
  getBlocksValidated,
  getBlocksProducedSeries,
  getDelegatorCount,
  getTopDelegators,
} from "@/lib/explorer";
import { getNetworkRewards, rewardRatesFor, rewardSeriesFor } from "@/lib/rewards";
import { NodeActivityChart } from "@/components/nodes/NodeActivityChart";
import { TopDelegatorsTable } from "@/components/nodes/TopDelegatorsTable";
import {
  formatKUBDisplay,
  formatKUBExact,
  bpsToPercent,
  shortenAddress,
  formatRatePercent,
  formatAge,
} from "@/lib/format";
import { EXPLORER_URL } from "@/lib/chain";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
import { Chevron } from "@/components/ui/Chevron";
import { InfoHint } from "@/components/ui/InfoHint";
import { StatusBadge } from "@/components/nodes/StatusBadge";
import { DataFreshness } from "@/components/ui/DataFreshness";
import { NodeJsonLd } from "@/components/seo/NodeJsonLd";

export const revalidate = 60;

/** Official KUB staking site — the only place a delegator can stake to a pool. */
const STAKING_SITE = "https://staking.kubchain.com/";

type Params = { address: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { address } = await params;
  const v = await getValidatorByAddress(address);
  if (!v) {
    return { title: "Node not found", robots: { index: false, follow: false } };
  }

  const name = v.name ?? shortenAddress(v.address);
  const kind = v.isPool ? "Pool" : "Solo";
  const description =
    `${name} is a ${kind.toLowerCase()} ${v.status.toLowerCase()} validator on the KUB Chain. ` +
    `Total stake ${formatKUBDisplay(v.totalStake)} KUB ` +
    `(self ${formatKUBDisplay(v.amount)} + delegated ${formatKUBDisplay(v.delegatedAmount)}), ` +
    `commission ${bpsToPercent(v.commissionRate)}, ` +
    `staking power ${(v.powerRatio * 100).toFixed(2)}%.`;
  const canonical = `/nodes/${v.address}`;

  return {
    title: `${name} — ${kind} Validator`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} · ${kind} Validator`,
      description,
      url: canonical,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${kind} Validator`,
      description,
    },
  };
}

/** Sentence-case section heading + accessible labelling for its content. */
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="mb-3 text-base font-semibold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Card wrapper for a vertical list of Rows / AddressFields. */
function RowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-card px-5 py-1 sm:px-6">
      {children}
    </div>
  );
}

/** Spec grid: label/value tiles laid out 2-up (mobile) → up to 3-up (desktop).
    `cols` matches the desktop track count to the tile count so a 2-tile section
    doesn't leave a dangling empty third column. */
function StatGrid({ cols = 3, children }: { cols?: 1 | 2 | 3; children: React.ReactNode }) {
  const track =
    cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3";
  return (
    <div className="rounded-card border border-line bg-card p-5 sm:p-6">
      <dl className={`grid gap-x-6 gap-y-6 ${track}`}>
        {children}
      </dl>
    </div>
  );
}

/** One figure: a quiet label above a prominent, tabular value. Muted when zero.
    `label` is a node, not a string, so a caller can hang a muted qualifier off
    it (e.g. "· last 7d") the way the section headings below do. */
function Stat({
  label,
  hint,
  value,
  unit,
  title,
  muted,
}: {
  label: React.ReactNode;
  hint?: string;
  value: React.ReactNode;
  unit?: string;
  title?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center text-xs text-ink-soft">
        {label}
        {hint && <InfoHint label={hint} />}
      </dt>
      <dd
        className={`mt-1.5 text-base font-semibold tabular-nums sm:text-lg ${
          muted ? "text-ink-muted" : "text-ink"
        }`}
        title={title}
      >
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-ink-muted">{unit}</span>}
      </dd>
    </div>
  );
}

/** KUB-amount stat: tidy value + unit, full precision on hover, muted when zero. */
function KubStat({ label, hint, wei }: { label: string; hint?: string; wei: bigint }) {
  return (
    <Stat
      label={label}
      hint={hint}
      muted={wei === 0n}
      title={formatKUBExact(wei)}
      value={formatKUBDisplay(wei)}
      unit="KUB"
    />
  );
}

/** Validated-block count, fetched from KUB Scan in its own async component so
    the on-chain figures above never wait on the explorer. Streams in behind a
    Suspense boundary; shows "—" if the count can't be loaded. */
async function BlocksValidatedStat({ address }: { address: string }) {
  const count = await getBlocksValidated(address);
  return (
    <Stat
      label="Blocks validated"
      hint="Total blocks this node has produced (signed) on the KUB Chain, per KUB Scan."
      muted={count === null || count === 0}
      title={
        count === null ? "Couldn't load from KUB Scan — try again shortly." : undefined
      }
      value={count === null ? "—" : count.toLocaleString("en-US")}
    />
  );
}

/** Pulsing placeholder shown while the validated-block count streams in. */
function BlocksValidatedSkeleton() {
  return (
    <div>
      <dt className="text-xs text-ink-soft">Blocks validated</dt>
      <dd
        className="mt-1.5 h-6 w-28 animate-pulse rounded bg-line sm:h-7"
        aria-hidden
      />
    </div>
  );
}

/** Hourly activity chart for the last 24h — blocks produced and KUB paid out,
    switchable in the client. Its own async component so it streams in behind a
    Suspense boundary without holding up the on-chain figures.

    Both series are resolved here rather than in the client, so switching tabs
    needs no fetch. Only the block crawl is real work: the reward scan is
    network-wide and cached as a single entry that `RewardsPerformanceStats` on
    this very page already awaits, so the second series adds no round-trip.

    Neither `null` is handled here — the empty and unreadable cases are worded
    per series and belong next to the tab that shows them. */
async function NodeActivityChartSection({ v }: { v: Validator }) {
  // Sequential on purpose: the reward scan carries the chain head its buckets
  // were cut from, and handing that to the block crawl is what puts both series
  // on one hourly grid (see `getBlocksProducedSeries`). The scan is the cached
  // network-wide one this page already awaits elsewhere, so the wait is a cache
  // read, not a second scan. A failed scan just leaves the crawl to anchor
  // itself.
  const rewards = await getNetworkRewards();
  const blocks = await getBlocksProducedSeries(
    v.address,
    rewards?.headBlock,
    rewards?.headTime,
  );
  return (
    <NodeActivityChart
      blocks={blocks}
      rewards={rewardSeriesFor(v.validatorIds, rewards)}
    />
  );
}

/** Pulsing placeholder sized to the card while it streams in. Covers the header
    row too: the heading and the tabs both live inside the client component now,
    so without a stand-in the card would pop from empty to full height. */
function NodeActivityChartSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="flex items-center justify-between gap-4">
        <div className="h-5 w-52 rounded bg-line" />
        <div className="h-8 w-28 rounded-lg bg-line" />
      </div>
      <div className="mt-3 h-44 w-full rounded-lg bg-line" />
    </div>
  );
}

/** A rate label with the measurement window hung off it in muted text, matching
    the "· top 10" and "· last 24h" qualifiers on the headings further down. The
    window belongs on the label, not buried in the hint: an annualised rate read
    off a 7-day sample is a different claim from a rate read off a year, and the
    reader has to see which one they are looking at without opening anything. */
function RateLabel({ children }: { children: string }) {
  return (
    <>
      {children}
      <span className="ml-1 text-ink-muted">· last 7d</span>
    </>
  );
}

/** Shown when the log scan itself failed. Kept distinct from a node that was
    genuinely paid nothing all week — that case is a fact worth stating, this
    one is an absence of information, and they must never render alike. */
const NO_REWARD_DATA =
  "Couldn't read reward history from the chain — try again shortly.";

/** Whether the delegator-rate tile applies to this node. Shared by the section
    (which sizes its grid to the tile count), the stats, and the skeleton, so the
    three cannot disagree and shift the layout when the real values land. A pool
    with nothing delegated is excluded along with solo nodes: there is no
    denominator, so its delegator rate could only ever be "—". */
function hasDelegatorRate(v: Validator): boolean {
  return v.isPool && v.delegatedAmount > 0n;
}

/** What this node actually paid out, annualised — the one part of the page that
    answers "what does staking here return", measured from `DistributeRewards`
    logs rather than from any advertised rate.

    Its own async component behind a Suspense boundary because the scan is the
    heaviest read in the app (a week of network-wide logs); the contract figures
    above it must never wait on it. The scan is network-wide and cached as a
    single entry, so this costs nothing beyond the first page to render it.

    Three-way split on the result, none of which may be conflated:
    an unreadable chain shows "—" with an explanatory title; a node that really
    earned nothing shows a truthful 0.00% and "None in 7 days"; anything else
    shows the measured figures. Rates are muted at zero or "—" so a live node's
    number is the only one that carries weight. */
async function RewardsPerformanceStats({ v }: { v: Validator }) {
  const rates = rewardRatesFor(
    {
      ids: v.validatorIds,
      selfStake: v.amount,
      delegatedAmount: v.delegatedAmount,
    },
    await getNetworkRewards(),
  );
  // Only an outage gets the caveat title; a real zero needs no apology.
  const outageTitle = rates.hasData ? undefined : NO_REWARD_DATA;

  return (
    <>
      {hasDelegatorRate(v) && (
        <Stat
          label={<RateLabel>Delegator reward rate</RateLabel>}
          hint="What delegators actually earned after this pool's fee, annualised from its DistributeRewards payouts over the last 7 days. A measured result, not a forecast. Rewards come from gas fees, not inflation, so the figure is small."
          muted={!rates.delegatorRatePct}
          title={outageTitle}
          value={formatRatePercent(rates.delegatorRatePct)}
        />
      )}
      <Stat
        label={<RateLabel>Node reward rate</RateLabel>}
        hint="The node's entire payout over the last 7 days against all the stake backing it, annualised. Comparable across nodes because it doesn't move with the fee split. On a solo node every coin staked is the owner's, so this is their own return."
        muted={!rates.nodeRatePct}
        title={outageTitle}
        value={formatRatePercent(rates.nodeRatePct)}
      />
      <Stat
        label="Last reward"
        hint="When this node was last paid, from the same 7-day scan. Shows whether it is still earning — unlike the Active badge, which only reflects its registration in the contract."
        muted={!rates.hasData || rates.rewardCount === 0}
        title={outageTitle}
        value={
          !rates.hasData
            ? "—"
            : rates.rewardCount === 0
              ? "None in 7 days"
              : formatAge(rates.lastRewardAgeSec)
        }
      />
    </>
  );
}

/** One skeleton tile: the real label with only its value pulsing, so the text
    never moves when the figure arrives. */
function RewardsSkeletonTile({ label }: { label: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd
        className="mt-1.5 h-6 w-28 animate-pulse rounded bg-line sm:h-7"
        aria-hidden
      />
    </div>
  );
}

/** Placeholder for the rewards tiles while the scan streams in. Renders the same
    number of tiles the result will, for the same reason `DelegatorCountSkeleton`
    keeps its label as real text: the card must not resize on arrival. */
function RewardsPerformanceSkeleton({
  delegatorRate,
}: {
  delegatorRate: boolean;
}) {
  return (
    <>
      {delegatorRate && (
        <RewardsSkeletonTile label={<RateLabel>Delegator reward rate</RateLabel>} />
      )}
      <RewardsSkeletonTile label={<RateLabel>Node reward rate</RateLabel>} />
      <RewardsSkeletonTile label="Last reward" />
    </>
  );
}

/** How many accounts have delegated to this pool. The StakeManager keeps no
    delegator roster, so the figure is the holder count of the pool's share
    token on KUB Scan — fetched in its own async component so the on-chain
    numbers above stream out without waiting on the explorer.

    A pool whose on-chain `delegatedAmount` is zero has provably no delegators,
    and the explorer would 404 on its share token anyway (Blockscout only
    indexes a token after its first transfer), so that case answers 0 without a
    request. Otherwise 0 and null are kept apart deliberately: 0 means "nobody
    has delegated", null means "the explorer couldn't be read" and must show "—"
    rather than a zero that reads as fact. */
async function DelegatorCountStat({
  share,
  delegated,
}: {
  share: string;
  delegated: bigint;
}) {
  const count = delegated === 0n ? 0 : await getDelegatorCount(share);
  return (
    <Stat
      label="Delegators"
      hint="Accounts that have delegated to this pool, counted from the holders of the pool's share token, per KUB Scan. It isn't a field on the StakeManager contract."
      muted={count === null || count === 0}
      title={
        count === null ? "Couldn't load from KUB Scan — try again shortly." : undefined
      }
      value={count === null ? "—" : count.toLocaleString("en-US")}
    />
  );
}

/** Pulsing placeholder shown while the delegator count streams in. Keeps the
    label as real text (only the value pulses) so nothing shifts on arrival. */
function DelegatorCountSkeleton() {
  return (
    <div>
      <dt className="text-xs text-ink-soft">Delegators</dt>
      <dd
        className="mt-1.5 h-6 w-28 animate-pulse rounded bg-line sm:h-7"
        aria-hidden
      />
    </div>
  );
}

/** The pool's largest delegators, crawled from KUB Scan in its own async
    component so it streams in behind a Suspense boundary alongside — not
    ahead of — the count.

    Same three-way split as `DelegatorCountStat`: a zero `delegatedAmount`
    short-circuits to the table's own empty state with no request; an empty
    list is the honest "nobody has delegated yet"; and null (explorer
    unreachable) gets a quiet note, because rendering an empty table there
    would claim the pool has no delegators.

    Amounts come back as decimal strings because `getTopDelegators` is wrapped
    in `unstable_cache`, which cannot serialise a `bigint`; they are widened
    back here, on the far side of the cache, since the table is a server
    component and takes wei as `bigint`. */
async function TopDelegatorsSection({
  share,
  delegated,
}: {
  share: string;
  delegated: bigint;
}) {
  if (delegated === 0n) return <TopDelegatorsTable rows={[]} total={0n} />;
  const rows = await getTopDelegators(share, 10);
  if (!rows) {
    return (
      <p className="mt-3 text-sm text-ink-muted">
        Couldn&apos;t load delegators from KUB Scan — try again shortly.
      </p>
    );
  }
  return (
    <TopDelegatorsTable
      rows={rows.map((r) => ({ address: r.address, amount: BigInt(r.amount) }))}
      total={delegated}
    />
  );
}

/** Pulsing placeholder sized to a full ten-row table so the card doesn't jump
    when the rows land: a 41px header row plus ten 44px rows and their nine
    hairline dividers ≈ 30.5rem. Carries the same `mt-3` the table itself does
    (the table owns that margin, so the Suspense boundary must not add one). */
function TopDelegatorsSkeleton() {
  return (
    <div
      className="mt-3 h-[30.5rem] w-full animate-pulse rounded-lg bg-line"
      aria-hidden
    />
  );
}

function AddressField({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-ink-soft">
        {label}
        {hint && <InfoHint label={hint} />}
      </span>
      <span className="flex items-center gap-2">
        <a
          href={`${EXPLORER_URL}/address/${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm text-ink hover:text-brand"
        >
          {shortenAddress(value, 8)}
        </a>
        <CopyButton value={value} />
      </span>
    </div>
  );
}

/** Percentage via 1e9-scaled bigint division — plain `(a*100n)/total` (or even
    1e6 scaling) integer-divides a sub-millionth share like 1 KUB of 4.3M down to
    0; 1e9 keeps it non-zero so the "<1%" label and the bar sliver stay honest. */
function pctOf(part: bigint, total: bigint): number {
  if (total <= 0n) return 0;
  return Number((part * 1_000_000_000n) / total) / 1e7;
}

/** Percent label that never collapses a real, non-zero share to "0%". */
function fmtPct(pct: number): string {
  if (pct <= 0) return "0%";
  if (pct < 1) return "<1%";
  return `${pct.toFixed(0)}%`;
}

/** Legend entry for the composition bar: swatch · label · amount · share. */
function CompLegend({
  swatch,
  label,
  wei,
  pct,
}: {
  swatch: string;
  label: string;
  wei: bigint;
  pct: number;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${swatch}`} aria-hidden />
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink" title={formatKUBExact(wei)}>
        {formatKUBDisplay(wei)} <span className="font-normal text-ink-muted">KUB</span>
      </dd>
      <dd className="tabular-nums text-ink-muted">· {fmtPct(pct)}</dd>
    </div>
  );
}

/** Two-tone bar splitting total stake into self vs delegated, with a legend.
    A non-zero share keeps a 3px sliver so a 1-KUB self-stake never renders as
    an invisible (and "0%"-labelled) segment. */
function CompositionBar({ self, delegated }: { self: bigint; delegated: bigint }) {
  const total = self + delegated;
  const selfPct = pctOf(self, total);
  const delPct = total > 0n ? 100 - selfPct : 0;
  return (
    <div className="mt-4">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={`Self-staked ${fmtPct(selfPct)}, delegated ${fmtPct(delPct)}`}
      >
        <div
          className="h-full bg-brand"
          style={{ width: `${selfPct}%`, minWidth: self > 0n ? "3px" : undefined }}
        />
        <div
          className="h-full bg-brand/40"
          style={{ width: `${delPct}%`, minWidth: delegated > 0n ? "3px" : undefined }}
        />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
        <CompLegend swatch="bg-brand" label="Self" wei={self} pct={selfPct} />
        <CompLegend swatch="bg-brand/40" label="Delegated" wei={delegated} pct={delPct} />
      </dl>
    </div>
  );
}

/** Arrow-out-of-box glyph signalling a link that leaves the site. */
function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

/** Decorative bar for staking power; the exact % is shown as text alongside. */
function PowerBar({ ratio }: { ratio: number }) {
  // Truly proportional; a non-zero share keeps a 2px sliver so tiny nodes still
  // register without overstating their width.
  const pct = Math.min(100, Math.max(ratio * 100, 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line" aria-hidden>
      <div
        className="h-full rounded-full bg-brand"
        style={{ width: `${pct}%`, minWidth: ratio > 0 ? "2px" : undefined }}
      />
    </div>
  );
}

export default async function NodeDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { address } = await params;
  const v = await getValidatorByAddress(address);
  if (!v) notFound();

  const total = v.totalStake;
  const name = v.name ?? shortenAddress(v.address);
  const asOf = new Date();
  // Computed once here so the grid's column count and the Suspense fallback's
  // tile count are decided by the same predicate the tiles themselves use.
  const showDelegatorRate = hasDelegatorRate(v);

  // This explorer's Stake Manager only registers/manages nodes you own — it has
  // no delegate flow. So a pool's primary action links out to the official KUB
  // staking site where a delegator can actually stake to it; a solo node points
  // to the owner-only Stake Manager.
  const cta = v.isPool
    ? {
        href: STAKING_SITE,
        external: true,
        label: "Stake to this pool",
        help: "Opens the official KUB staking site to delegate.",
      }
    : {
        href: "/stake-manager",
        external: false,
        label: "Manage in Stake Manager",
        help: "Solo nodes are managed by their owner in the Stake Manager.",
      };

  const ctaClass =
    "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-btn-primary px-5 text-sm font-medium text-on-btn-primary transition-colors hover:bg-btn-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 sm:w-auto";

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <NodeJsonLd name={name} address={v.address} />
      <Link
        href="/#nodes"
        className="inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-brand"
      >
        <Chevron className="h-4 w-4 rotate-180" />
        Back to all nodes
      </Link>

      {/* Header: identity + primary action */}
      <div className="rounded-card border border-line bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <Avatar src={v.logo} name={v.name} address={v.address} size={64} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-ink sm:text-2xl">{name}</h1>
                <StatusBadge status={v.status} />
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft">
                  {v.isPool ? "Pool Node" : "Solo Node"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-sm text-ink-muted">
                <a
                  href={`${EXPLORER_URL}/address/${v.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs hover:text-brand sm:text-sm"
                >
                  <span className="sm:hidden">{shortenAddress(v.address, 8)}</span>
                  <span className="hidden break-all sm:inline">{v.address}</span>
                </a>
                <CopyButton value={v.address} className="shrink-0" />
              </div>
            </div>
          </div>

          <div className="sm:shrink-0 sm:text-right">
            {cta.external ? (
              <a
                href={cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaClass}
              >
                {cta.label}
                <ExternalIcon className="h-4 w-4" />
              </a>
            ) : (
              <Link href={cta.href} className={ctaClass}>
                {cta.label}
                <Chevron className="h-4 w-4" />
              </Link>
            )}
            <p className="mt-1.5 max-w-56 text-xs text-ink-muted sm:ml-auto">
              {cta.help}
            </p>
          </div>
        </div>
      </div>

      {/* Overview: the figures a decision rests on */}
      <Section id="overview-h" title="Overview">
        <div className="rounded-card border border-line bg-card p-5 sm:p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-ink-muted">Total stake</p>
              <p
                className="mt-1 text-3xl font-bold tabular-nums text-ink sm:text-4xl"
                title={formatKUBExact(total)}
              >
                {formatKUBDisplay(total)}{" "}
                <span className="text-lg font-semibold text-ink-muted">KUB</span>
              </p>
              {v.isPool ? (
                <CompositionBar self={v.amount} delegated={v.delegatedAmount} />
              ) : (
                <p className="mt-2 text-sm text-ink-soft">Entirely self-staked</p>
              )}
            </div>

            <div className="flex flex-col justify-center gap-2 sm:border-l sm:border-line sm:pl-6">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-ink-muted">
                  Staking power
                  <InfoHint label="This node's share of all KUB staked on the network." />
                </span>
                <span className="text-lg font-bold tabular-nums text-ink">
                  {(v.powerRatio * 100).toFixed(2)}%
                </span>
              </div>
              <PowerBar ratio={v.powerRatio} />
              <p className="text-xs text-ink-muted">of total network stake</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Rewards performance — what that stake actually earned. Sits directly
          under Overview because "how much is staked here" and "what did it
          return" are one question, and above Delegators because the rate is
          what a reader is deciding on. Grid is sized to the tile count so a
          solo node doesn't leave a dangling third column. */}
      <Section id="performance-h" title="Rewards performance">
        <StatGrid cols={showDelegatorRate ? 3 : 2}>
          <Suspense
            fallback={<RewardsPerformanceSkeleton delegatorRate={showDelegatorRate} />}
          >
            <RewardsPerformanceStats v={v} />
          </Suspense>
        </StatGrid>
      </Section>

      {/* Delegators — who the delegated half of the composition bar above
          actually is: how many accounts back this pool and how concentrated
          their stake is. Pools only; a solo node has no share contract and so
          no delegators to show. Both figures come from KUB Scan, each behind
          its own Suspense boundary so neither delays the other or the
          on-chain figures. */}
      {v.isPool && (
        <Section id="delegators-h" title="Delegators">
          <div className="space-y-4">
            <StatGrid cols={1}>
              <Suspense fallback={<DelegatorCountSkeleton />}>
                <DelegatorCountStat
                  share={v.validatorShareContract}
                  delegated={v.delegatedAmount}
                />
              </Suspense>
            </StatGrid>
            <div className="rounded-card border border-line bg-card p-5 sm:p-6">
              <h3 className="flex items-center text-sm font-medium text-ink-soft">
                Top delegators
                <span className="ml-1 text-ink-muted">· top 10</span>
                <InfoHint label="The ten largest delegations into this pool, per KUB Scan, each shown as a share of the pool's total delegated stake. A few addresses holding most of the pool means its stake — and its block production — depends on those few staying." />
              </h3>
              <Suspense fallback={<TopDelegatorsSkeleton />}>
                <TopDelegatorsSection
                  share={v.validatorShareContract}
                  delegated={v.delegatedAmount}
                />
              </Suspense>
            </div>
          </div>
        </Section>
      )}

      {/* Block production — validated-block count + 24h hourly chart, both
          streamed from the explorer so they never block the on-chain figures
          above. */}
      <Section id="blocks-h" title="Block production">
        <div className="space-y-4">
          <StatGrid cols={1}>
            <Suspense fallback={<BlocksValidatedSkeleton />}>
              <BlocksValidatedStat address={v.address} />
            </Suspense>
          </StatGrid>
          <div className="rounded-card border border-line bg-card p-5 sm:p-6">
            <Suspense fallback={<NodeActivityChartSkeleton />}>
              <NodeActivityChartSection v={v} />
            </Suspense>
          </div>
        </div>
      </Section>

      {/* Fees & terms */}
      <Section id="fees-h" title="Fees &amp; terms">
        <StatGrid cols={v.isPool ? 2 : 1}>
          {v.isPool && (
            <Stat
              label="Service fee"
              hint="Share of delegators' staking rewards this pool keeps as commission."
              value={bpsToPercent(v.commissionRate)}
            />
          )}
          <KubStat
            label="Minimum stake"
            hint="The smallest stake this node accepts."
            wei={v.minDeposit}
          />
        </StatGrid>
      </Section>

      {/* Rewards & accrued — headline figure shown to everyone; for pools the
          delegator & commission breakdown is shown inline below. Zero values stay muted. */}
      <Section id="rewards-h" title="Rewards &amp; accrued">
        <div className="rounded-card border border-line bg-card p-5 sm:p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
            <KubStat
              label="Unclaimed reward"
              hint="Validator staking rewards accrued so far and claimable now by the node owner. This is the current outstanding balance — it resets to zero when claimed, so it isn't the node's lifetime total."
              wei={v.reward}
            />
          </dl>
          {v.isPool && (
            <div className="mt-4 border-t border-line pt-4">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
                <KubStat
                  label="Delegators reward"
                  hint="Rewards set aside for this pool's delegators (their stake's share, after the validator's commission), distributed to them in proportion to their delegated stake."
                  wei={v.delegatorsReward}
                />
                <KubStat
                  label="Validator commission"
                  hint="Commission charged on the validator's own self-stake reward. It is paid back to the node owner, so it effectively nets out against their own reward."
                  wei={v.validatorCommissionAmount}
                />
                <KubStat
                  label="Delegator commission"
                  hint="The pool's commission fee taken from the delegators' rewards — paid to the node owner."
                  wei={v.delegatorCommissionAmount}
                />
              </dl>
            </div>
          )}
        </div>
      </Section>

      {/* Technical */}
      <Section id="technical-h" title="Technical">
        <RowCard>
          <AddressField
            label="Signer"
            hint="The node's block-signing address — distinct from the owner's wallet."
            value={v.signer}
          />
          {v.isPool && (
            <AddressField
              label="Validator share contract"
              hint="Tracks delegators' shares for this pool."
              value={v.validatorShareContract}
            />
          )}
        </RowCard>
      </Section>

      <DataFreshness time={asOf} />
    </div>
  );
}
