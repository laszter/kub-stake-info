import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getStakingData } from "@/lib/staking";

// Regenerate alongside the data (ISR, once per minute).
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { all } = await getStakingData();
  const now = new Date();

  const nodes: MetadataRoute.Sitemap = all
    .filter((v) => v.status === "Active" && v.totalStake > 0n)
    .map((v) => ({
      url: `${SITE_URL}/nodes/${v.address}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    }));

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...nodes,
  ];
}
