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
   * Empty when the index lookup failed.
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
 *  2. one multicall for getValidatorInfo + getValidatorIndexLength of every
 *     unique address
 *  3. one multicall expanding those lengths into getValidatorIndexByIndex
 *
 * Step 3 can't be folded into step 2 — the number of index lookups is only
 * known once the lengths come back. It stays a single batched multicall for
 * the whole network (~93 calls, ~160 ms) instead of a per-address loop.
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

  // Round 2: the validator struct and the ID count, interleaved per address so
  // both come back in one batched round-trip.
  const infoAndLengths = (await publicClient.multicall({
    contracts: uniqueAddresses.flatMap((address) => [
      { ...stakeManager, functionName: "getValidatorInfo", args: [address] },
      { ...stakeManager, functionName: "getValidatorIndexLength", args: [address] },
    ]),
    allowFailure: true,
  })) as { status: "success" | "failure"; result?: unknown }[];

  const infos = uniqueAddresses.map(
    (_, i) => infoAndLengths[i * 2] as { status: "success" | "failure"; result?: RawValidator },
  );
  const idCounts = uniqueAddresses.map((_, i) => {
    const res = infoAndLengths[i * 2 + 1];
    return res?.status === "success" ? Number(res.result as bigint) : 0;
  });

  // Round 3: flatten (address, index) pairs across the whole network into one
  // multicall. getValidatorIndexByIndex only takes a single index, so the fan-out
  // is unavoidable — batching it keeps the cost at one round-trip regardless.
  const idLookups: { addrIndex: number; index: number }[] = [];
  idCounts.forEach((count, addrIndex) => {
    for (let index = 0; index < count; index++) idLookups.push({ addrIndex, index });
  });

  const idResults = idLookups.length
    ? ((await publicClient.multicall({
        contracts: idLookups.map(({ addrIndex, index }) => ({
          ...stakeManager,
          functionName: "getValidatorIndexByIndex",
          args: [uniqueAddresses[addrIndex], BigInt(index)],
        })),
        allowFailure: true,
      })) as { status: "success" | "failure"; result?: bigint }[])
    : [];

  const idsByAddress: number[][] = uniqueAddresses.map(() => []);
  idLookups.forEach(({ addrIndex }, i) => {
    const res = idResults[i];
    if (res?.status !== "success" || res.result === undefined) return;
    idsByAddress[addrIndex].push(Number(res.result));
  });
  // Ascending, so consumers get a stable order regardless of storage layout.
  for (const ids of idsByAddress) ids.sort((a, b) => a - b);

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
