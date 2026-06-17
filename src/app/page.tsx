import type { Metadata } from "next";
import { getStakingData } from "@/lib/staking";
import { toCardView } from "@/lib/view";
import { formatKUB } from "@/lib/format";
import { Hero } from "@/components/layout/Hero";
import { StatsBar } from "@/components/stats/StatsBar";
import { ValidatorExplorer } from "@/components/nodes/ValidatorExplorer";
import { DataFreshness } from "@/components/ui/DataFreshness";
import { HomeJsonLd } from "@/components/seo/HomeJsonLd";

// Re-read the chain (ISR) at most once per minute.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { stats } = await getStakingData();
  const desc =
    `KUB Chain staking overview: ${stats.totalValidators} active validators, ` +
    `${formatKUB(stats.totalStaked, { withSymbol: true })} staked, ` +
    `${formatKUB(stats.totalRewardsDistributed, { withSymbol: true })} rewards distributed. ` +
    `Browse pool & solo nodes — stake, delegation, rewards & commission.`;
  return {
    description: desc,
    alternates: { canonical: "/" },
    openGraph: { description: desc, url: "/" },
    twitter: { card: "summary_large_image", description: desc },
  };
}

export default async function HomePage() {
  const { stats, pools, solos, all } = await getStakingData();
  const liveValidators = all.filter(
    (v) => v.status === "Active" && v.totalStake > 0n,
  );
  const asOf = new Date();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <HomeJsonLd
        validators={liveValidators}
        stats={stats}
        updatedAt={asOf}
      />
      <Hero />
      <StatsBar stats={stats} />
      <DataFreshness time={asOf} className="text-center" />
      <ValidatorExplorer
        pools={pools.map(toCardView)}
        solos={solos.map(toCardView)}
      />
    </div>
  );
}
