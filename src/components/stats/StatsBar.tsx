import type { GlobalStats } from "@/lib/staking";
import { formatKUB } from "@/lib/format";

function InfoIcon({ tip }: { tip: string }) {
  return (
    <span
      title={tip}
      className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-ink-muted/40 text-[9px] font-bold text-ink-muted"
    >
      i
    </span>
  );
}

function Stat({
  value,
  label,
  tip,
}: {
  value: string;
  label: string;
  tip: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 px-4 py-5 text-center">
      <span className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
        {value}
      </span>
      <span className="flex items-center gap-1.5 text-sm text-ink-muted">
        {label}
        <InfoIcon tip={tip} />
      </span>
    </div>
  );
}

export function StatsBar({ stats }: { stats: GlobalStats }) {
  return (
    <div className="grid grid-cols-1 divide-y divide-line rounded-card border border-line bg-card shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Stat
        value={stats.totalValidators.toLocaleString("en-US")}
        label="Total Validators"
        tip="Active validators with a non-zero stake"
      />
      <Stat
        value={formatKUB(stats.totalStaked, { withSymbol: true })}
        label="Total Stake"
        tip="Total KUB staked across all validators (totalStaked)"
      />
      <Stat
        value={formatKUB(stats.totalRewardsDistributed, { withSymbol: true })}
        label="Total Rewards Distributed"
        tip="totalRewards + totalRewardsLiquidated"
      />
    </div>
  );
}
