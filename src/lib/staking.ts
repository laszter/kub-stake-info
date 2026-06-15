import { cache } from "react";
import type { Address } from "viem";
import { publicClient } from "./chain";
import { stakeManager } from "./contract";
import registry from "@/data/validators.json";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const STATUS_LABELS = ["Uninitialized", "Active", "Unstaked"] as const;
export type ValidatorStatus = (typeof STATUS_LABELS)[number];

/** Raw struct returned by getValidatorInfo (viem decodes named tuple → object). */
interface RawValidator {
  amount: bigint;
  delegatedAmount: bigint;
  reward: bigint;
  delegatorsReward: bigint;
  infraCommissionAmount: bigint;
  validatorCommissionAmount: bigint;
  delegatorCommissionAmount: bigint;
  minDeposit: bigint;
  signer: Address;
  validatorShareContract: Address;
  status: number;
  infraCommissionRate: number;
  commissionRate: number;
}

export interface Validator {
  address: Address;
  name: string | null;
  logo: string | null;
  amount: bigint;
  delegatedAmount: bigint;
  totalStake: bigint;
  reward: bigint;
  delegatorsReward: bigint;
  infraCommissionAmount: bigint;
  validatorCommissionAmount: bigint;
  delegatorCommissionAmount: bigint;
  minDeposit: bigint;
  signer: Address;
  validatorShareContract: Address;
  status: ValidatorStatus;
  statusCode: number;
  infraCommissionRate: number;
  commissionRate: number;
  isPool: boolean;
  /** totalStake / totalStaked as a 0–1 ratio (for power display & sorting). */
  powerRatio: number;
}

export interface GlobalStats {
  totalValidators: number;
  totalStaked: bigint;
  totalRewardsDistributed: bigint;
}

export interface StakingData {
  stats: GlobalStats;
  pools: Validator[];
  solos: Validator[];
  all: Validator[];
}

const reg = registry as Record<string, { name: string; logo: string }>;

function metaFor(address: string) {
  const entry = reg[address.toLowerCase()];
  return { name: entry?.name ?? null, logo: entry?.logo ?? null };
}

/**
 * Fetch everything in as few RPC round-trips as possible:
 *  1. globals + the full validator address list
 *  2. one multicall for getValidatorInfo of every unique address
 *
 * Wrapped in React.cache so stats + page + detail dedupe within a request.
 */
export const getStakingData = cache(async (): Promise<StakingData> => {
  const [totalStaked, totalRewards, totalRewardsLiquidated, allRaw] =
    await Promise.all([
      publicClient.readContract({ ...stakeManager, functionName: "totalStaked" }) as Promise<bigint>,
      publicClient.readContract({ ...stakeManager, functionName: "totalRewards" }) as Promise<bigint>,
      publicClient.readContract({ ...stakeManager, functionName: "totalRewardsLiquidated" }) as Promise<bigint>,
      publicClient.readContract({ ...stakeManager, functionName: "getAllValidator" }) as Promise<Address[]>,
    ]);

  // getAllValidator() contains duplicate addresses (one validator can hold
  // multiple IDs). Dedupe by lowercased address.
  const seen = new Set<string>();
  const uniqueAddresses: Address[] = [];
  for (const addr of allRaw) {
    const key = addr.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueAddresses.push(addr);
    }
  }

  const infos = (await publicClient.multicall({
    contracts: uniqueAddresses.map((address) => ({
      ...stakeManager,
      functionName: "getValidatorInfo",
      args: [address],
    })),
    allowFailure: true,
  })) as { status: "success" | "failure"; result?: RawValidator }[];

  const all: Validator[] = [];
  uniqueAddresses.forEach((address, i) => {
    const res = infos[i];
    if (res.status !== "success" || !res.result) return;
    const v = res.result;
    const totalStake = v.amount + v.delegatedAmount;
    const isPool = v.validatorShareContract !== ZERO_ADDRESS;
    const powerRatio =
      totalStaked === 0n
        ? 0
        : Number((totalStake * 1_000_000n) / totalStaked) / 1_000_000;
    all.push({
      address,
      ...metaFor(address),
      amount: v.amount,
      delegatedAmount: v.delegatedAmount,
      totalStake,
      reward: v.reward,
      delegatorsReward: v.delegatorsReward,
      infraCommissionAmount: v.infraCommissionAmount,
      validatorCommissionAmount: v.validatorCommissionAmount,
      delegatorCommissionAmount: v.delegatorCommissionAmount,
      minDeposit: v.minDeposit,
      signer: v.signer,
      validatorShareContract: v.validatorShareContract,
      status: STATUS_LABELS[v.status] ?? "Uninitialized",
      statusCode: v.status,
      infraCommissionRate: v.infraCommissionRate,
      commissionRate: v.commissionRate,
      isPool,
      powerRatio,
    });
  });

  // Sort by total stake descending.
  all.sort((a, b) => (b.totalStake > a.totalStake ? 1 : b.totalStake < a.totalStake ? -1 : 0));

  // "Live" validators = Active with a non-zero stake. This is the set the
  // official explorer counts (matches the 13 shown on staking.kubchain.com).
  const live = all.filter((v) => v.status === "Active" && v.totalStake > 0n);
  const pools = live.filter((v) => v.isPool);
  const solos = live.filter((v) => !v.isPool);

  return {
    stats: {
      totalValidators: live.length,
      totalStaked,
      totalRewardsDistributed: totalRewards + totalRewardsLiquidated,
    },
    pools,
    solos,
    all,
  };
});

export async function getValidatorByAddress(
  address: string,
): Promise<Validator | null> {
  const data = await getStakingData();
  const found = data.all.find(
    (v) => v.address.toLowerCase() === address.toLowerCase(),
  );
  return found ?? null;
}
