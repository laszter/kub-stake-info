import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getValidatorByAddress } from "@/lib/staking";
import {
  formatKUBDisplay,
  formatKUBExact,
  bpsToPercent,
  shortenAddress,
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
function StatGrid({ cols = 3, children }: { cols?: 2 | 3; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-card p-5 sm:p-6">
      <dl
        className={`grid grid-cols-2 gap-x-6 gap-y-6 ${
          cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
        }`}
      >
        {children}
      </dl>
    </div>
  );
}

/** One figure: a quiet label above a prominent, tabular value. Muted when zero. */
function Stat({
  label,
  hint,
  value,
  unit,
  title,
  muted,
}: {
  label: string;
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
    "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 sm:w-auto";

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

      {/* Fees & terms */}
      <Section id="fees-h" title="Fees &amp; terms">
        <StatGrid cols={v.isPool ? 3 : 2}>
          {v.isPool && (
            <Stat
              label="Service fee"
              hint="Share of delegators' staking rewards this pool keeps as commission."
              value={bpsToPercent(v.commissionRate)}
            />
          )}
          <Stat
            label="Infra commission rate"
            hint="Protocol infrastructure fee taken from staking rewards."
            value={bpsToPercent(v.infraCommissionRate)}
          />
          <KubStat
            label="Minimum stake"
            hint="The smallest stake this node accepts."
            wei={v.minDeposit}
          />
        </StatGrid>
      </Section>

      {/* Rewards & accrued — headline figures shown to everyone; the pool's
          commission-accounting internals collapse behind a disclosure so a
          delegator isn't handed an owner's audit dump. Zero values stay muted. */}
      <Section id="rewards-h" title="Rewards &amp; accrued">
        <div className="rounded-card border border-line bg-card p-5 sm:p-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6">
            <KubStat
              label="Reward"
              hint="Validator staking rewards accrued, claimable by the node owner."
              wei={v.reward}
            />
            <KubStat
              label="Infra commission earned"
              hint="Infrastructure fee accrued from rewards."
              wei={v.infraCommissionAmount}
            />
          </dl>
          {v.isPool && (
            <details className="mt-4 border-t border-line pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-medium text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 [&::-webkit-details-marker]:hidden">
                <span>
                  Reward breakdown
                  <span className="ml-1 font-normal text-ink-muted">
                    · delegator &amp; commission detail
                  </span>
                </span>
                <Chevron className="disclosure-icon h-4 w-4 shrink-0 text-ink-muted transition-transform" />
              </summary>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
                <KubStat
                  label="Delegators reward"
                  hint="Rewards accrued for this pool's delegators, distributed by the owner."
                  wei={v.delegatorsReward}
                />
                <KubStat
                  label="Validator commission"
                  hint="Commission accrued to the validator from delegators' rewards."
                  wei={v.validatorCommissionAmount}
                />
                <KubStat
                  label="Delegator commission"
                  hint="Commission share attributed to delegators."
                  wei={v.delegatorCommissionAmount}
                />
              </dl>
            </details>
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
