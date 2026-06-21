import Link from "next/link";
import type { ValidatorCardView } from "@/lib/view";
import { shortenAddress } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { CopyButton } from "@/components/ui/CopyButton";
import { Chevron } from "@/components/ui/Chevron";

/**
 * Width of a validator's share bar, normalised so the network leader fills the
 * track. Tiny non-zero shares keep a visible sliver. `maxPower` is the largest
 * staking-power ratio in the same group, so bars stay comparable across pages.
 */
function shareWidth(powerNum: number, maxPower: number): string {
  if (maxPower <= 0 || powerNum <= 0) return "0%";
  const pct = (powerNum / maxPower) * 100;
  return `${Math.max(pct, 3)}%`;
}

function ShareBar({ width }: { width: string }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-brand-light"
      aria-hidden="true"
    >
      <div className="h-full rounded-full bg-brand" style={{ width }} />
    </div>
  );
}

export function ValidatorCard({
  v,
  maxPower,
}: {
  v: ValidatorCardView;
  maxPower: number;
}) {
  return (
    <Link
      href={`/nodes/${v.address}`}
      className="group flex flex-col rounded-card border border-line bg-card p-5 transition-colors hover:border-brand/50"
    >
      <div className="flex items-center gap-3">
        <Avatar src={v.logo} name={v.name} address={v.address} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-ink group-hover:text-brand">
            {v.name ?? shortenAddress(v.address)}
          </h3>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
            <span className="font-mono">{shortenAddress(v.address)}</span>
            <CopyButton value={v.address} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">
            {v.totalStake}
            <span className="ml-1 text-sm font-medium text-ink-muted">KUB</span>
          </span>
          <span className="text-xs text-ink-muted">staked</span>
        </div>
        <div className="mt-2.5">
          <ShareBar width={shareWidth(v.powerNum, maxPower)} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-ink-muted">
            <span className="font-medium text-ink tabular-nums">{v.power}</span>{" "}
            staking power
          </span>
          <span className="text-ink-muted">
            <span className="font-medium text-ink tabular-nums">
              {v.serviceFee}
            </span>{" "}
            fee
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3 text-sm font-medium text-ink-muted transition-colors group-hover:text-brand">
        View details
        <Chevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/** Compact row layout used in "list" view. */
export function ValidatorRow({
  v,
  maxPower,
}: {
  v: ValidatorCardView;
  maxPower: number;
}) {
  return (
    <Link
      href={`/nodes/${v.address}`}
      className="group flex items-center gap-4 rounded-card border border-line bg-card px-4 py-3 transition-colors hover:border-brand/50 sm:px-5"
    >
      <Avatar src={v.logo} name={v.name} address={v.address} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink group-hover:text-brand">
          {v.name ?? shortenAddress(v.address)}
        </p>
        <p className="font-mono text-xs text-ink-muted">
          {shortenAddress(v.address)}
        </p>
      </div>

      {/* stake + share bar */}
      <div className="hidden w-44 sm:block">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink tabular-nums">
            {v.totalStake}
          </span>
          <span className="ml-1 text-xs text-ink-muted">KUB</span>
        </div>
        <div className="mt-1.5">
          <ShareBar width={shareWidth(v.powerNum, maxPower)} />
        </div>
      </div>

      <div className="hidden w-20 text-right sm:block">
        <p className="text-sm font-medium text-ink tabular-nums">{v.power}</p>
        <p className="text-[11px] text-ink-muted">power</p>
      </div>
      <div className="hidden w-14 text-right sm:block">
        <p className="text-sm font-medium text-ink tabular-nums">
          {v.serviceFee}
        </p>
        <p className="text-[11px] text-ink-muted">fee</p>
      </div>

      {/* mobile-only compact stake */}
      <div className="text-right sm:hidden">
        <p className="text-sm font-semibold text-ink tabular-nums">
          {v.totalStake}
        </p>
        <p className="text-[11px] text-ink-muted">KUB staked</p>
      </div>

      <Chevron className="hidden h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand sm:block" />
    </Link>
  );
}
