import { parseEther } from "viem";
import { stakeManagerV2 } from "./contract";

/**
 * Builders for StakeManagerV2 write calls. Each returns the contract params
 * (address/abi/functionName/args/value) minus account & chainId, which the
 * caller adds. Arg counts are chosen to select the EOA (non-bitkubNext) overload.
 */

type Id = bigint;
const base = { address: stakeManagerV2.address, abi: stakeManagerV2.abi } as const;

export const buildStake = (signer: `0x${string}`, delegation: boolean, amountKUB: string) => ({
  ...base,
  functionName: "stake",
  args: [signer, delegation] as const,
  value: parseEther(amountKUB),
});

export const buildRestake = (id: Id, amountKUB: string) => ({
  ...base,
  functionName: "restake",
  args: [id] as const,
  value: parseEther(amountKUB),
});

export const buildUnstake = (id: Id) => ({
  ...base,
  functionName: "unstake",
  args: [id] as const,
});

export const buildUnstakePartial = (id: Id, amountKUB: string) => ({
  ...base,
  functionName: "unstakePartial",
  args: [id, parseEther(amountKUB)] as const,
});

export const buildClaimRewards = (id: Id) => ({
  ...base,
  functionName: "claimRewards",
  args: [id] as const,
});

export const buildClaimCommission = (id: Id) => ({
  ...base,
  functionName: "claimCommissionRewards",
  args: [id] as const,
});

export const buildUpdateCommission = (id: Id, percent: number) => ({
  ...base,
  functionName: "updateCommissionRate",
  args: [id, BigInt(Math.round(percent * 100))] as const, // % → basis points
});

export const buildUpdateMinDelegated = (id: Id, amountKUB: string) => ({
  ...base,
  functionName: "updateMinDelegated",
  args: [id, parseEther(amountKUB)] as const,
});

export const buildActivate = (id: Id) => ({
  ...base,
  functionName: "activate",
  args: [id] as const,
});
