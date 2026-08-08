import type { Metadata } from "next";
import { getStakingData } from "@/lib/staking";
import { getNetworkRewards, rewardRatesFor } from "@/lib/rewards";
import { toCardView } from "@/lib/view";
import { formatKUB, shortenAddress } from "@/lib/format";
import { Hero, type StakeDistribution } from "@/components/layout/Hero";
import { ValidatorExplorer } from "@/components/nodes/ValidatorExplorer";
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
  // One network-wide reward scan for the whole page (and, via the same cache
  // entry, for every node page) — see `getNetworkRewards`. Null on an RPC
  // failure, which every card then renders as an em dash rather than a zero.
  const rewards = await getNetworkRewards();
  const withRates = (v: (typeof all)[number]) =>
    toCardView(
      v,
      rewardRatesFor(
        {
          ids: v.validatorIds,
          selfStake: v.amount,
          delegatedAmount: v.delegatedAmount,
        },
        rewards,
      ),
    );
  const liveValidators = all.filter(
    (v) => v.status === "Active" && v.totalStake > 0n,
  );
  const asOf = new Date();

  // Stake concentration: top validators by share, with the remainder folded
  // into "others" — surfaces how decentralised the network actually is.
  const TOP_N = 5;
  const ranked = [...liveValidators].sort((a, b) => b.powerRatio - a.powerRatio);
  const top = ranked.slice(0, TOP_N).map((v) => ({
    label: v.name ?? shortenAddress(v.address),
    share: v.powerRatio,
  }));
  const topShare = top.reduce((sum, t) => sum + t.share, 0);
  const distribution: StakeDistribution = {
    top,
    topShare,
    othersShare: Math.max(0, 1 - topShare),
    othersCount: Math.max(0, ranked.length - top.length),
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <HomeJsonLd
        validators={liveValidators}
        stats={stats}
        updatedAt={asOf}
      />
      <Hero stats={stats} asOf={asOf} distribution={distribution} />
      <ValidatorExplorer
        pools={pools.map(withRates)}
        solos={solos.map(withRates)}
      />
    </div>
  );
}
