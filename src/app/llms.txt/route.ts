import {
  SITE_NAME,
  SITE_TAGLINE,
  KUB_CHAIN_ID,
  KUB_CHAIN_NAME,
  absoluteUrl,
} from "@/lib/site";
import {
  STAKE_MANAGER_ADDRESS,
  STAKE_MANAGER_V2_ADDRESS,
} from "@/lib/contract";
import { EXPLORER_URL } from "@/lib/chain";

// Served at /llms.txt — a concise, machine-friendly summary for AI / answer
// engines (https://llmstxt.org). Static; uses absolute URLs from SITE_URL.
export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_TAGLINE}. An unofficial, read-only explorer for validators and nodes on the ${KUB_CHAIN_NAME} (Bitkub Chain, chainId ${KUB_CHAIN_ID}). Live stake, delegation, rewards and commission are read from the StakeManager smart contract. Not affiliated with the KUB Foundation.

## Pages
- [Overview](${absoluteUrl("/")}): network stats (total validators, total stake, total rewards) and the pool/solo validator list
- [Stake Manager](${absoluteUrl("/stake-manager")}): wallet-connected management of your own validator nodes (stake, restake, unstake, claim, settings)
- [About & FAQ](${absoluteUrl("/about")}): definitions, FAQ and a staking glossary

## Key facts
- Chain: ${KUB_CHAIN_NAME} (Bitkub Chain), chainId ${KUB_CHAIN_ID}, native token KUB
- Block explorer: ${EXPLORER_URL}
- StakeManagerStorageV2 (reads): ${STAKE_MANAGER_ADDRESS}
- StakeManagerV2 (writes): ${STAKE_MANAGER_V2_ADDRESS}
- Data freshness: server-rendered, re-read from the chain every 60 seconds (ISR)

## Definitions
- Validator: a node that secures the ${KUB_CHAIN_NAME} Proof-of-Stake network, backed by staked KUB.
- Pool Node: a validator that accepts delegations via a validator share contract.
- Solo Node: a validator with no share contract, running on its own stake only.
- Staking power: a validator's total stake as a percentage of all KUB staked on the network.
- Commission rate: the percentage of rewards a validator keeps before paying delegators (stored on-chain in basis points).

## More
- [Sitemap](${absoluteUrl("/sitemap.xml")})
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
