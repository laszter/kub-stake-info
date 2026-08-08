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
- StakeManagerV2 (writes, and the DistributeRewards event log behind the reward rates): ${STAKE_MANAGER_V2_ADDRESS}
- Data freshness: server-rendered, re-read from the chain every 60 seconds (ISR); the 7-day reward-event scan behind the reward rates refreshes every 5 minutes

## Definitions
- Validator: a node that secures the ${KUB_CHAIN_NAME} Proof-of-Stake network, backed by staked KUB.
- Pool Node: a validator that accepts delegations via a validator share contract.
- Solo Node: a validator with no share contract, running on its own stake only.
- Delegators: the number of accounts delegating to a pool, counted from the holders of the pool's ERC-20 share token as indexed by ${EXPLORER_URL} — not a field in the StakeManager contract.
- Staking power: a validator's total stake as a percentage of all KUB staked on the network.
- Commission rate: the percentage of rewards a validator keeps before paying delegators (stored on-chain in basis points).
- Reward rate (APR): the annual percentage rate a node has actually paid, measured from the DistributeRewards events of the StakeManagerV2 contract over the last 7 days and annualised (÷ 7 × 365) — an observed rate, not a forecast. The delegator reward rate is the delegators' share of those rewards over the pool's delegated amount (after commission); the node reward rate is the whole reward before it is split, over the node's total stake (self-stake plus delegated), which keeps nodes comparable no matter how small the owner's own share of that stake is — and for a Solo Node it is exactly what the owner earned. Rewards on this chain come from gas fees, not inflation, so real rates run at roughly 0.3–1% a year.
- Last reward: how long ago a node was last paid a reward on-chain — a liveness signal, since the Active status only reflects a node's registration in the contract; a node paid nothing in the window shows "None in 7 days".

## More
- [Sitemap](${absoluteUrl("/sitemap.xml")})
`;

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
