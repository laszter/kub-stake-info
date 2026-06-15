import { getStakingData } from "@/lib/staking";
import { toCardView } from "@/lib/view";
import { Hero } from "@/components/layout/Hero";
import { StatsBar } from "@/components/stats/StatsBar";
import { ValidatorExplorer } from "@/components/nodes/ValidatorExplorer";

// Re-read the chain (ISR) at most once per minute.
export const revalidate = 60;

export default async function HomePage() {
  const { stats, pools, solos } = await getStakingData();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Hero />
      <StatsBar stats={stats} />
      <ValidatorExplorer
        pools={pools.map(toCardView)}
        solos={solos.map(toCardView)}
      />
    </div>
  );
}
