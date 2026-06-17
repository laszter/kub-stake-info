import {
  STAKE_MANAGER_ADDRESS,
  STAKE_MANAGER_V2_ADDRESS,
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
      "KUB Node Info is an unofficial, read-only explorer for validators and nodes on the KUB Chain (Bitkub Chain, chainId 96). It reads live data — stake, delegation, rewards and commission — directly from the StakeManager smart contract and presents it for browsing. It is not affiliated with the KUB Foundation.",
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
      "Validators accrue KUB rewards for the blocks they help produce. The validator keeps its commission (plus any infrastructure commission) and the remainder is distributed to delegators in proportion to their delegated stake. Each validator's accrued reward, delegators' reward and commission amounts are read directly from the contract.",
  },
  {
    question: "How often is the data updated?",
    answer:
      "The overview and node-detail pages are rendered on the server and re-read the chain at most once per minute (60-second incremental regeneration). The “Data as of” timestamp on each page shows when the data was last refreshed.",
  },
  {
    question: "Which smart contracts does this read from?",
    answer:
      `Read data comes from the StakeManagerStorageV2 contract at ${STAKE_MANAGER_ADDRESS}. Wallet write actions in the Stake Manager (stake, restake, unstake, claim and settings updates) go to the StakeManagerV2 contract at ${STAKE_MANAGER_V2_ADDRESS}. Both are on the KUB Chain (chainId 96).`,
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
];
