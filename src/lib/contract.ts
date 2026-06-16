import type { Abi } from "viem";
import storageAbi from "@/data/abi.json";
import smV2Abi from "@/lib/abi/stakeManagerV2.json";
import nftAbi from "@/lib/abi/stakingNft.json";

/**
 * StakeManagerStorageV2 — on-chain storage; source of all validator data (reads).
 * (Kept under the original `STAKE_MANAGER_*` / `stakeManager` names for the
 * read-only app that already depends on them.)
 */
export const STAKE_MANAGER_ADDRESS =
  "0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d" as const;
export const STAKE_MANAGER_STORAGE_ADDRESS = STAKE_MANAGER_ADDRESS;

export const stakeManagerAbi = storageAbi as Abi;

export const stakeManager = {
  address: STAKE_MANAGER_ADDRESS,
  abi: stakeManagerAbi,
} as const;

/** StakeManagerV2 — logic contract; target of all write actions (stake/restake/…). */
export const STAKE_MANAGER_V2_ADDRESS =
  "0x443502b3F7C0934576F49CDa084f78640f56A80F" as const;
export const stakeManagerV2Abi = smV2Abi as Abi;
export const stakeManagerV2 = {
  address: STAKE_MANAGER_V2_ADDRESS,
  abi: stakeManagerV2Abi,
} as const;

/** StakingNFT — each node is an NFT; tokenId == validatorId. Used to find "my nodes". */
export const STAKING_NFT_ADDRESS =
  "0x8ae4cb6a020121bcbd855fffc79a11984be62b39" as const;
export const stakingNftAbi = nftAbi as Abi;
export const stakingNft = {
  address: STAKING_NFT_ADDRESS,
  abi: stakingNftAbi,
} as const;

/** KKUB — wrapped KUB (used by the bitkubNext flow; reserved for later). */
export const KKUB_ADDRESS =
  "0x67ebd850304c70d983b2d1b93ea79c7cd6c3f6b5" as const;
