import Link from "next/link";
import type { ValidatorCardView } from "@/lib/view";
import { shortenAddress } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";

export function SoloNodeTable({ rows }: { rows: ValidatorCardView[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-line bg-white px-5 py-8 text-center text-sm text-ink-muted">
        No solo nodes found.
      </p>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
            <th className="px-5 py-3 font-medium">Name</th>
            <th className="px-5 py-3 text-right font-medium">Total Stake</th>
            <th className="px-5 py-3 text-right font-medium">Staking Power</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((v) => (
            <tr key={v.address} className="transition-colors hover:bg-surface">
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
                  <span className="font-medium text-ink hover:text-brand">
                    {v.name ?? shortenAddress(v.address)}
                  </span>
                </Link>
              </td>
              <td className="px-5 py-3 text-right font-medium text-ink">
                {v.totalStake} KUB
              </td>
              <td className="px-5 py-3 text-right text-ink-soft">{v.power}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
