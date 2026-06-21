import Link from "next/link";
import type { ValidatorCardView } from "@/lib/view";
import { shortenAddress } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";

function barWidth(powerNum: number, maxPower: number): string {
  if (maxPower <= 0 || powerNum <= 0) return "0%";
  return `${Math.max((powerNum / maxPower) * 100, 3)}%`;
}

export function SoloNodeTable({
  rows,
  maxPower,
}: {
  rows: ValidatorCardView[];
  maxPower: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line px-5 py-10 text-center text-sm text-ink-muted">
        No solo nodes found.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">
          KUB Chain solo validators with their total stake and staking power
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
            <th scope="col" className="px-5 py-3 font-medium">
              Name
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Total Stake
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Staking Power
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((v) => (
            <tr key={v.address} className="group transition-colors hover:bg-surface">
              <td className="px-5 py-3">
                <Link
                  href={`/nodes/${v.address}`}
                  className="flex items-center gap-3"
                >
                  <Avatar
                    src={v.logo}
                    name={v.name}
                    address={v.address}
                    size={32}
                  />
                  <span className="font-medium text-ink group-hover:text-brand">
                    {v.name ?? shortenAddress(v.address)}
                  </span>
                </Link>
              </td>
              <td className="px-5 py-3 text-right font-medium text-ink tabular-nums">
                {v.totalStake} KUB
              </td>
              <td className="px-5 py-3">
                <div className="ml-auto flex w-32 items-center gap-2">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-brand-light"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: barWidth(v.powerNum, maxPower) }}
                    />
                  </div>
                  <span className="w-14 text-right font-medium text-ink-soft tabular-nums">
                    {v.power}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
