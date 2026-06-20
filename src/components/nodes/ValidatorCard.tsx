import Link from "next/link";
import type { ValidatorCardView } from "@/lib/view";
import { shortenAddress } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export function ValidatorCard({ v }: { v: ValidatorCardView }) {
  return (
    <Link
      href={`/nodes/${v.address}`}
      className="group flex flex-col rounded-card border border-line bg-card p-5 transition-all hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex flex-col items-center text-center">
        <Avatar src={v.logo} name={v.name} address={v.address} size={56} />
        <h3 className="mt-3 line-clamp-1 font-semibold text-ink group-hover:text-brand">
          {v.name ?? shortenAddress(v.address)}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
          <span className="font-mono">{shortenAddress(v.address)}</span>
          <CopyButton value={v.address} />
        </div>
      </div>

      <div className="mt-5 space-y-2.5 border-t border-line pt-4">
        <Row label="Total Stake" value={`${v.totalStake} KUB`} />
        <Row label="Staking Power" value={v.power} />
        <Row label="Service Fee" value={v.serviceFee} />
      </div>

      <span className="mt-5 inline-flex items-center justify-center rounded-full border border-brand py-2 text-sm font-medium text-brand transition-colors group-hover:bg-btn-primary group-hover:text-on-btn-primary">
        View Details
      </span>
    </Link>
  );
}

/** Compact row layout used in "list" view. */
export function ValidatorRow({ v }: { v: ValidatorCardView }) {
  return (
    <Link
      href={`/nodes/${v.address}`}
      className="group flex items-center gap-4 rounded-card border border-line bg-card px-5 py-3.5 transition-all hover:border-brand/40 hover:shadow-sm"
    >
      <Avatar src={v.logo} name={v.name} address={v.address} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink group-hover:text-brand">
          {v.name ?? shortenAddress(v.address)}
        </p>
        <p className="font-mono text-xs text-ink-muted">
          {shortenAddress(v.address)}
        </p>
      </div>
      <div className="hidden w-40 text-right sm:block">
        <p className="font-medium text-ink">{v.totalStake} KUB</p>
        <p className="text-xs text-ink-muted">Total Stake</p>
      </div>
      <div className="w-20 text-right">
        <p className="font-medium text-ink">{v.power}</p>
        <p className="text-xs text-ink-muted">Power</p>
      </div>
      <div className="hidden w-16 text-right sm:block">
        <p className="font-medium text-ink">{v.serviceFee}</p>
        <p className="text-xs text-ink-muted">Fee</p>
      </div>
    </Link>
  );
}
