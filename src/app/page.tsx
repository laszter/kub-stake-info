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

  // Stake concentration: the top nodes by share, with the remainder folded
  // into "others" — surfaces how decentralised the network actually is.
  //
  // The unit is one validator node (address), not an operator: an operator
  // running several addresses shows up as several segments. The denominator
  // is the live set's own stake, not the contract's `totalStaked` (which also
  // counts inactive validators), so the segments and "others" cover exactly
  // the nodes counted and sum to 100%. `powerRatio` stays network-wide for
  // the per-node "staking power" shown elsewhere.
  const TOP_N = 5;
  const liveStake = liveValidators.reduce((sum, v) => sum + v.totalStake, 0n);
  const shareOf = (stake: bigint) =>
    liveStake === 0n
      ? 0
      : Number((stake * 1_000_000n) / liveStake) / 1_000_000;
  const ranked = [...liveValidators].sort((a, b) =>
    b.totalStake > a.totalStake ? 1 : b.totalStake < a.totalStake ? -1 : 0,
  );
  const topNodes = ranked.slice(0, TOP_N);
  const topStake = topNodes.reduce((sum, v) => sum + v.totalStake, 0n);
  const distribution: StakeDistribution = {
    top: topNodes.map((v) => ({
      label: v.name ?? shortenAddress(v.address),
      share: shareOf(v.totalStake),
    })),
    topShare: shareOf(topStake),
    othersShare: shareOf(liveStake - topStake),
    othersCount: ranked.length - topNodes.length,
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
