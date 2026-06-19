import {
  STAKE_MANAGER_ADDRESS,
  STAKE_MANAGER_V2_ADDRESS,
  STAKING_NFT_ADDRESS,
} from "@/lib/contract";

export type Faq = { question: string; answer: string };
export type Term = { term: string; definition: string };

/**
 * Single source of truth for the About/FAQ copy. The visible page AND the
 * FAQPage / DefinedTermSet JSON-LD are both built from these arrays, so the
 * structured data always matches what the user sees (a Google requirement).
 */
export const FAQ_ITEMS: Faq[] = [
  {
    question: "What is KUB Node Info?",
    answer:
      "KUB Node Info is an unofficial explorer and stake manager for validators and nodes on the KUB Chain (Bitkub Chain, chainId 96). Browsing is read-only and needs no wallet — it shows live stake, delegation, rewards and commission read directly from the StakeManager smart contract. Connect a wallet and the Stake Manager also lets you manage the nodes you own: stake, restake, unstake, claim rewards and update settings. It is not affiliated with the KUB Foundation.",
  },
  {
    question: "What is a validator on the KUB Chain?",
    answer:
      "A validator is a node that secures the KUB Chain's Proof-of-Stake network by producing and confirming blocks. Each validator holds staked KUB — its own self-stake plus KUB delegated by others — and earns rewards, sharing a portion with delegators according to its commission rate.",
  },
  {
    question: "What is the difference between a Pool Node and a Solo Node?",
    answer:
      "A Pool Node accepts delegations from other users through a validator share contract, so anyone can stake KUB to it. A Solo Node has no share contract and runs on the operator's own stake only. In this explorer a validator is classed as a Pool Node when it has a non-zero validator share contract, otherwise it is a Solo Node.",
  },
  {
    question: "What is staking power?",
    answer:
      "Staking power is a validator's total stake (self-stake plus delegated amount) expressed as a percentage of all KUB staked across the network. It approximates the validator's share of block-production influence — higher staking power means a larger slice of the network's total stake.",
  },
  {
    question: "What is the commission rate?",
    answer:
      "The commission rate is the percentage a validator keeps from staking rewards before distributing the remainder to its delegators. It is stored on-chain in basis points (10,000 = 100%) and shown here as a percentage — for example, 500 basis points is 5%.",
  },
  {
    question: "How are validator rewards distributed?",
    answer:
      "Validators accrue KUB rewards for the blocks they help produce. The validator keeps its commission and the remainder is set aside for delegators in proportion to their delegated stake. Each validator's accrued reward, delegators' reward and commission amounts are read directly from the contract.",
  },
  {
    question: "Can I stake or manage my own validator nodes here?",
    answer:
      "Yes. Open the Stake Manager and connect a wallet on the KUB Chain to see and manage the nodes that wallet owns. You can register a new Pool or Solo node, add stake (restake), unstake part or all of a node, claim your validator and commission rewards, withdraw delegators' rewards, update a pool's commission rate and minimum delegation, and activate a node. A “Claim all” action sweeps every claimable reward across your nodes in one go. Nothing moves without your wallet's confirmation — until you sign, the app stays read-only.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "The Overview and node-detail pages are rendered on the server and re-read the chain at most once per minute (60-second incremental regeneration); each page's “Data as of” timestamp shows when that happened. While a wallet is connected, the Stake Manager refreshes your nodes and balances live, about every 20 seconds.",
  },
  {
    question: "Which smart contracts does this read from?",
    answer:
      `Validator data is read from the StakeManagerStorageV2 contract at ${STAKE_MANAGER_ADDRESS}. To find the nodes a connected wallet owns, the Stake Manager reads the StakingNFT contract at ${STAKING_NFT_ADDRESS} — each node is an NFT whose token ID is its validator ID. Wallet write actions (stake, restake, unstake, claim and settings updates) go to the StakeManagerV2 contract at ${STAKE_MANAGER_V2_ADDRESS}. All are on the KUB Chain (chainId 96).`,
  },
  {
    question: "Is this the official KUB staking site?",
    answer:
      "No. KUB Node Info is an independent, unofficial explorer and is not affiliated with the KUB Foundation. Always verify contract addresses and transactions yourself before staking.",
  },
];

export const GLOSSARY: Term[] = [
  {
    term: "Validator",
    definition:
      "A node that secures the KUB Chain Proof-of-Stake network by producing and validating blocks, backed by staked KUB.",
  },
  {
    term: "Pool Node",
    definition:
      "A validator that accepts delegations from other users through a validator share contract.",
  },
  {
    term: "Solo Node",
    definition:
      "A validator with no share contract that runs on its operator's own stake only.",
  },
  {
    term: "Self Stake",
    definition: "The amount of KUB a validator has staked from its own funds.",
  },
  {
    term: "Delegated Amount",
    definition: "The total KUB delegated to a validator by other users.",
  },
  {
    term: "Total Stake",
    definition:
      "Self-stake plus delegated amount — a validator's full backing stake.",
  },
  {
    term: "Staking Power",
    definition:
      "A validator's total stake as a percentage of all KUB staked on the network.",
  },
  {
    term: "Commission Rate",
    definition:
      "The percentage of rewards a validator keeps before paying delegators, stored on-chain in basis points (10,000 = 100%).",
  },
  {
    term: "Restake",
    definition:
      "Adding more KUB to a node you already own, increasing its stake.",
  },
  {
    term: "Min Delegated",
    definition:
      "The smallest delegation amount a Pool Node will accept from a delegator.",
  },
  {
    term: "Delegators Reward",
    definition:
      "Rewards set aside for a pool's delegators; the operator withdraws them so they can be distributed.",
  },
  {
    term: "Node NFT",
    definition:
      "An NFT that represents ownership of a validator node; its token ID is the node's validator ID.",
  },
];
