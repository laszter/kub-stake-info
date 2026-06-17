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
import { StatusBadge } from "@/components/nodes/StatusBadge";
import { DataFreshness } from "@/components/ui/DataFreshness";
import { NodeJsonLd } from "@/components/seo/NodeJsonLd";

export const revalidate = 60;

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

function Tile({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  title?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p
        className="mt-1.5 truncate text-lg font-bold text-ink"
        title={title ?? value}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

/** KUB-amount tile: tidy value, full precision on hover. */
function KubTile({
  label,
  wei,
  sub = "KUB",
}: {
  label: string;
  wei: bigint;
  sub?: string;
}) {
  return (
    <Tile
      label={label}
      value={formatKUBDisplay(wei)}
      sub={sub}
      title={formatKUBExact(wei)}
    />
  );
}

function AddressField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-ink-muted">{label}</span>
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <NodeJsonLd name={name} address={v.address} />
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-brand"
      >
        ‹ Back to all nodes
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar src={v.logo} name={v.name} address={v.address} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              {v.name ?? shortenAddress(v.address)}
            </h1>
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
              className="font-mono hover:text-brand"
            >
              {v.address}
            </a>
            <CopyButton value={v.address} />
          </div>
        </div>
      </div>

      {/* Stake */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Stake
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KubTile label="Total Stake" wei={total} />
          <KubTile label="Self Stake" wei={v.amount} />
          <KubTile label="Delegated" wei={v.delegatedAmount} />
          <Tile label="Staking Power" value={`${(v.powerRatio * 100).toFixed(2)}%`} sub="of total network stake" />
        </div>
      </section>

      {/* Commission */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Commission
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Service Fee" value={bpsToPercent(v.commissionRate)} sub="validator commission" />
          <Tile label="Infra Commission" value={bpsToPercent(v.infraCommissionRate)} sub="infrastructure" />
          <KubTile label="Min Deposit" wei={v.minDeposit} />
          <Tile label="Status" value={v.status} />
        </div>
      </section>

      {/* Rewards & accrued commission */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Rewards &amp; Accrued
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KubTile label="Reward" wei={v.reward} />
          <KubTile label="Delegators Reward" wei={v.delegatorsReward} />
          <KubTile label="Validator Commission" wei={v.validatorCommissionAmount} sub="KUB accrued" />
          <KubTile label="Infra Commission" wei={v.infraCommissionAmount} sub="KUB accrued" />
          <KubTile label="Delegator Commission" wei={v.delegatorCommissionAmount} sub="KUB accrued" />
        </div>
      </section>

      {/* Technical */}
      <section className="rounded-card border border-line bg-card px-5 py-2 sm:px-6">
        <h2 className="border-b border-line py-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
          Technical
        </h2>
        <AddressField label="Signer" value={v.signer} />
        {v.isPool && (
          <AddressField
            label="Validator Share Contract"
            value={v.validatorShareContract}
          />
        )}
      </section>

      <DataFreshness time={asOf} />
    </div>
  );
}
