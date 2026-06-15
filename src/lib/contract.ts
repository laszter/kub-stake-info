import type { Abi } from "viem";
import abi from "@/data/abi.json";

/** StakeManagerStorageV2 — the on-chain source of all validator/staking data. */
export const STAKE_MANAGER_ADDRESS =
  "0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d" as const;

export const stakeManagerAbi = abi as Abi;

export const stakeManager = {
  address: STAKE_MANAGER_ADDRESS,
  abi: stakeManagerAbi,
} as const;
