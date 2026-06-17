import { JsonLd } from "./JsonLd";
import { SITE_URL, KUB_CHAIN_ID, KUB_CHAIN_NAME, absoluteUrl } from "@/lib/site";
import type { Validator, GlobalStats } from "@/lib/staking";
import { shortenAddress } from "@/lib/format";

/**
 * Home-page structured data: a Dataset describing the validator set (great for
 * answer engines) plus an ItemList linking every validator to its detail page.
 */
export function HomeJsonLd({
  validators,
  stats,
  updatedAt,
}: {
  validators: Validator[];
  stats: GlobalStats;
  updatedAt: Date;
}) {
  const dataset = {
    "@type": "Dataset",
    "@id": `${SITE_URL}/#dataset`,
    name: `${KUB_CHAIN_NAME} validators`,
    description:
      `Live dataset of active validators on the ${KUB_CHAIN_NAME} (chainId ${KUB_CHAIN_ID}): ` +
      `stake, delegation, rewards and commission, read from the StakeManager smart contract. ` +
      `${stats.totalValidators} active validators.`,
    url: `${SITE_URL}/`,
    creator: { "@id": `${SITE_URL}/#organization` },
    isAccessibleForFree: true,
    dateModified: updatedAt.toISOString(),
    variableMeasured: [
      "total stake",
      "self stake",
      "delegated amount",
      "rewards",
      "commission rate",
      "staking power",
    ],
  };

  const itemList = {
    "@type": "ItemList",
    name: `${KUB_CHAIN_NAME} validators`,
    numberOfItems: validators.length,
    itemListElement: validators.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/nodes/${v.address}`),
      name: v.name ?? shortenAddress(v.address),
    })),
  };

  return (
    <JsonLd
      data={{ "@context": "https://schema.org", "@graph": [dataset, itemList] }}
    />
  );
}
