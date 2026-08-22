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
  /**
   * Every validator ID this address holds, ascending.
   *
   * One address can own several IDs — it re-registers over time and keeps the
   * old slots (measured on mainnet: 0x8427…1c0b holds [25, 30, 35, 39],
   * 0xdc64…afb3 holds [20, 22]). On-chain events such as `DistributeRewards`
   * are keyed by validator ID, so anything aggregating them has to sum across
   * *all* of these; using only the current/latest ID silently undercounts.
   *
   * These are the positions the address occupies in `getAllValidator()` — that
   * array *is* the ID mapping, see `getStakingData` — so a listed validator
   * always has at least one, with no lookup left to fail.
   */
  validatorIds: number[];
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
 * There is no third round because `getAllValidator()` already carries the ID
 * mapping: the array is indexed by validator ID, so `getAllValidator()[i]` is
 * the address of validator `i`, and an address's IDs are just the positions it
 * occupies. That is verified against the chain, not assumed —
 * `getValidatorByIndex(i)` matched `getAllValidator()[i]` for all 45 entries,
 * and the positions matched `getValidatorIndexByIndex` for all 31 unique
 * addresses. Reading the IDs through `getValidatorIndexLength` +
 * `getValidatorIndexByIndex` instead cost a whole extra round-trip and 76 of
 * 111 contract calls, for the same answer (measured: 111 calls / 3 rounds /
 * ~243ms → 35 calls / 2 rounds / ~157ms).
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

  // getAllValidator() is indexed by validator ID and repeats an address once per
  // ID it holds. One walk does both jobs: dedupe by lowercased address, and
  // collect each address's IDs from the positions it occupies. Ascending by
  // construction, so consumers get a stable order without a sort.
  const addrIndexOf = new Map<string, number>();
  const uniqueAddresses: Address[] = [];
  const idsByAddress: number[][] = [];
  allRaw.forEach((addr, id) => {
    const key = addr.toLowerCase();
    let i = addrIndexOf.get(key);
    if (i === undefined) {
      i = uniqueAddresses.length;
      addrIndexOf.set(key, i);
      uniqueAddresses.push(addr);
      idsByAddress.push([]);
    }
    idsByAddress[i].push(id);
  });

  // Round 2: the validator struct for every unique address, in one batched
  // round-trip.
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
      validatorIds: idsByAddress[i],
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
