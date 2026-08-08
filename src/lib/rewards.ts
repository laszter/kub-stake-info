import { unstable_cache } from "next/cache";
import { createPublicClient, http, parseAbiItem } from "viem";
import { kubChain } from "./chain";
import { STAKE_MANAGER_V2_ADDRESS } from "./contract";

/* ── Realised reward rates from `DistributeRewards` logs ─────────────────────

   The contracts expose only *lifetime* accrued balances, so nothing on-chain
   answers "what did this node pay out lately". The event log does: every payout
   emits `DistributeRewards` on StakeManagerV2 with the full split, so summing a
   fixed window of logs gives a rate that was actually earned rather than one
   projected from a rate card.

   This module deliberately imports no `staking.ts`: that module reads the
   storage contract and would eventually want a rate itself, so rewards stay a
   leaf that takes primitives (ids + stake) and returns numbers.
   ────────────────────────────────────────────────────────────────────────── */

/**
 * A private client for log scanning — the shared `publicClient` in `chain.ts`
 * cannot be used here and must not be changed to suit us.
 *
 * That client sets `http(undefined, { batch: true })`, which coalesces
 * concurrent JSON-RPC calls into one HTTP POST. That is right for the many tiny
 * `eth_call`s the rest of the app makes, but fatal for `eth_getLogs`: the
 * batched *responses* are concatenated into a single body, and a week of
 * network-wide payouts (~67k logs) blows past viem's 10 MiB body cap — verified,
 * it fails with `ResponseBodyTooLargeError`. With `batch: false` each chunk is
 * its own request and its own body, so only per-chunk size matters.
 */
const logClient = createPublicClient({
  chain: kubChain,
  transport: http(undefined, { batch: false }),
});

/** Window length. 24h was measured and rejected: nodes that are paid in bursts
    (e.g. `0xad7b…`) read 0.000% over 24h but 0.340% over 7d, so the short window
    reports healthy nodes as dead. 7d is long enough to catch every live node at
    least once and short enough to still reflect a recent commission change. */
const WINDOW_DAYS = 7;

/** KUB block time is a rock-steady ~3.0s (same constant, same verification as
    `explorer.ts`'s `GLOBAL_BLOCK_TIME_S`). Used to size the window in blocks and
    to convert the last payout's height back into an age. */
const BLOCK_TIME_S = 3;

/** 7d ÷ 3s. Blocks — not timestamps — bound the scan because `eth_getLogs`
    ranges are heights; a few seconds of block-time drift only shifts the window
    edge by a handful of blocks, which cannot change a 7-day rate. */
const WINDOW_BLOCKS = (WINDOW_DAYS * 24 * 3600) / BLOCK_TIME_S; // 201_600

/** The window is split into this many `eth_getLogs` calls (~14.4k blocks ≈ 12h
    each). Sized so the busiest chunk's response stays an order of magnitude
    below viem's 10 MiB cap even if payout volume grows; fewer, fatter chunks
    were measured to sit uncomfortably close to it. */
const CHUNKS = 14;

/** Chunks in flight at once. Measured: 14 chunks at concurrency 5 pulled 66,871
    logs in ~2.8s. Higher concurrency buys little and risks rate-limiting the
    public RPC, which is shared with every other read in the app. */
const CHUNK_CONCURRENCY = 5;

/**
 * The event signature is written out rather than pulled from
 * `stakeManagerV2Abi`, which is cast to viem's wide `Abi` type in `contract.ts`.
 * Through that cast viem cannot infer the argument shape, so `log.args` would
 * degrade to `readonly unknown[]` and every field would need an unchecked cast.
 * `parseAbiItem` keeps `args` fully typed. The signature below is a
 * character-for-character match of the ABI entry (verified against
 * `src/lib/abi/stakeManagerV2.json`) — the address still comes from
 * `contract.ts` so there is only one place to change if it is ever redeployed.
 */
const distributeRewardsEvent = parseAbiItem(
  "event DistributeRewards(uint256 indexed validatorId, uint256 totalReward, uint256 validatorReward, uint256 delegatorsReward, uint256 infraCommission, uint256 validatorCommission, uint256 delegatorCommission)",
);

/** Run `tasks` with at most `limit` in flight, preserving result order.
    Copied from `pool` in `src/lib/explorer.ts:203-217` (same reason
    `TopDelegatorsTable.tsx:5` copies `pctOf`): it is not exported there, and
    exporting it would mean editing a file this change has no other business in. */
async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const idx = next++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}

/** Rewards paid to one validator ID inside the window.
    Every amount is wei as an unsigned decimal string, never a `bigint`:
    `unstable_cache` serialises with `JSON.stringify`, which throws
    `TypeError: Do not know how to serialize a BigInt` — the rejection is
    swallowed as an unhandled one and the entry is never written, so every
    request would silently re-scan a week of logs. `rewardRatesFor` converts
    back on the far side of the cache. */
export type ValidatorRewards = {
  /** Whole payout before any split — owner + delegators + infra. This is what
      the node's own rate is measured from (see `nodeRatePct`). */
  total: string;
  /** `delegatorsReward`: the delegators' share, already net of the pool's cut. */
  delegators: string;
  /** What the node's owner actually receives:
      `validatorReward + validatorCommission + delegatorCommission`.
      `_liquidateRewards` pays the owner all three (commissions are claimed
      together via `claimCommissionRewards`), so `validatorReward` alone would
      under-report a commission-charging pool's own take. On a solo node both
      commissions are 0 and this collapses to `totalReward`.

      Kept because it is the correct answer to "what did the owner earn", but no
      rate is currently derived from it — dividing it by self-stake produces a
      figure that cannot be compared across nodes (see `nodeRatePct`). */
  owner: string;
  /** Number of payout events — 0 means genuinely idle, not an RPC failure. */
  count: number;
  /** Height of the most recent payout; 0 when there was none. */
  lastBlock: number;
};

/** One network-wide scan, shared by every page. Purely JSON-safe so it survives
    `unstable_cache`. Keyed by validator ID (decimal string) because an address
    can hold several IDs and the log only carries the ID. */
export type NetworkRewards = {
  byId: Record<string, ValidatorRewards>;
  /** Chain head the scan was anchored to — the reference point for ages. */
  headBlock: number;
  /** First block of the window (inclusive). */
  fromBlock: number;
  /** Window length in days, so callers annualise with the same divisor. */
  windowDays: number;
};

/**
 * Scan the whole network's payouts once and aggregate them per validator ID.
 *
 * Deliberately unfiltered by ID: one 14-chunk scan feeds the home page and every
 * node page from a single cache entry, which is both cheaper than a scan per
 * node and the only way the figures on the two pages can never disagree.
 *
 * Returns null when the chain could not be read, so the UI can tell an outage
 * apart from a node that genuinely earned nothing.
 */
async function fetchNetworkRewards(): Promise<NetworkRewards | null> {
  let head;
  try {
    head = await logClient.getBlock();
  } catch {
    return null; // can't anchor the window — caller renders a fallback
  }
  const headBlock = Number(head.number);
  const fromBlock = Math.max(0, headBlock - WINDOW_BLOCKS);
  const span = Math.floor((headBlock - fromBlock) / CHUNKS);

  const tasks = Array.from({ length: CHUNKS }, (_, i) => async () => {
    const start = fromBlock + i * span;
    // The last chunk runs to the head so integer division can't drop the tail.
    const end = i === CHUNKS - 1 ? headBlock : fromBlock + (i + 1) * span - 1;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await logClient.getLogs({
          address: STAKE_MANAGER_V2_ADDRESS,
          event: distributeRewardsEvent,
          fromBlock: BigInt(start),
          toBlock: BigInt(end),
          // strict: only logs whose data decodes fully against the signature are
          // returned, which is also what gives `log.args` non-optional fields —
          // no per-field undefined checks over ~67k logs.
          strict: true,
        });
      } catch {
        // transient RPC failure — retry once, then report the chunk as lost
      }
    }
    return null;
  });

  const parts = await pool(tasks, CHUNK_CONCURRENCY);

  // A lost chunk silently *understates* every rate, which is worse than showing
  // nothing, so past a threshold we report failure instead — same call as
  // `explorer.ts:237-240` makes for its hourly walks.
  const failed = parts.filter((p) => p === null).length;
  if (failed > CHUNKS / 2) return null;

  type Sum = { total: bigint; delegators: bigint; owner: bigint; count: number; lastBlock: number };
  const agg = new Map<string, Sum>();
  for (const part of parts) {
    if (!part) continue;
    for (const log of part) {
      const a = log.args;
      const key = a.validatorId.toString();
      let sum = agg.get(key);
      if (!sum) {
        sum = { total: 0n, delegators: 0n, owner: 0n, count: 0, lastBlock: 0 };
        agg.set(key, sum);
      }
      sum.total += a.totalReward;
      sum.delegators += a.delegatorsReward;
      sum.owner += a.validatorReward + a.validatorCommission + a.delegatorCommission;
      sum.count++;
      // Pending logs carry a null blockNumber; they have no height to age from.
      const height = log.blockNumber === null ? 0 : Number(log.blockNumber);
      if (height > sum.lastBlock) sum.lastBlock = height;
    }
  }

  const byId: Record<string, ValidatorRewards> = {};
  for (const [id, sum] of agg) {
    byId[id] = {
      total: sum.total.toString(),
      delegators: sum.delegators.toString(),
      owner: sum.owner.toString(),
      count: sum.count,
      lastBlock: sum.lastBlock,
    };
  }

  return { byId, headBlock, fromBlock, windowDays: WINDOW_DAYS };
}

/**
 * Cached for 5 minutes. The scan is by far the heaviest read in the app (14 RPC
 * round-trips, tens of thousands of logs), while a 7-day sum barely moves in
 * five minutes — a payout shifts it by well under a basis point. The long TTL is
 * what makes one scan serve the whole site. Wrapped in `unstable_cache` so the
 * pages stay ISR: the result counts as cached data rather than a per-request
 * dynamic read, which is also why every amount inside it is a string (see
 * `ValidatorRewards`).
 */
export const getNetworkRewards = unstable_cache(
  fetchNetworkRewards,
  ["network-rewards"],
  { revalidate: 300 },
);

/** Annualised, ready-to-display view of one node's realised rewards. */
export type RewardRates = {
  /** What delegators earned, annualised %, or null when the pool has no
      delegated stake (nothing to divide by) or there is no data. */
  delegatorRatePct: number | null;
  /** What the node produced per unit of stake backing it, annualised %: the
      whole payout over the window divided by *total* stake (self + delegated).
      Null when the node has no stake at all or there is no data.

      The denominator is total stake, not the owner's own stake, because
      owner-income ÷ self-stake is not comparable across nodes: commission
      income does not scale with self-stake, so a pool that posts a token
      self-stake explodes to six figures — `0x3c55…` stakes exactly 1 KUB
      against 6.03M delegated and would truthfully read ~116,000%/yr, which
      reads as a broken page rather than a number. Against total stake the
      metric answers "how well does this node convert the stake behind it into
      rewards", which is independent of the fee structure and of how the stake
      is split between owner and delegators. On a solo node `delegatedAmount` is
      0, so this is exactly the owner's own return with no special case. */
  nodeRatePct: number | null;
  /** Seconds since the last payout; null when there was none in the window. */
  lastRewardAgeSec: number | null;
  /** Payout events in the window across all of the address's IDs. */
  rewardCount: number;
  /** False only when the chain could not be read. `hasData: true` with
      `rewardCount: 0` is the meaningful case — a node that really was paid
      nothing all week — and the UI must render the two differently ("—" vs
      "None in 7 days"). */
  hasData: boolean;
};

const NO_DATA: RewardRates = {
  delegatorRatePct: null,
  nodeRatePct: null,
  lastRewardAgeSec: null,
  rewardCount: 0,
  hasData: false,
};

/** Percent-per-year from a windowed payout, computed in bigint up to the last
    step: wei figures are far past `Number`'s safe range, so dividing them as
    numbers first would lose the low digits of a large pool's total. The 1e6
    scale keeps six decimal places of a percent — well beyond the two the UI
    shows — before the single narrowing to `Number`. */
const SCALE = 1_000_000n;
function annualisedPct(rewards: bigint, stake: bigint, windowDays: number): number | null {
  if (stake <= 0n) return null; // no capital to earn on — a rate would be meaningless
  return (
    Number((rewards * 365n * 100n * SCALE) / (stake * BigInt(windowDays))) /
    Number(SCALE)
  );
}

/**
 * Roll a network scan up into one address's rates.
 *
 * Two rates, deliberately different denominators:
 *  · `nodeRatePct`      = Σ total      ÷ (selfStake + delegatedAmount)
 *  · `delegatorRatePct` = Σ delegators ÷ delegatedAmount
 * both annualised over `net.windowDays`. The first says how productive the node
 * is per unit of stake behind it; the second says what a delegator actually
 * takes home after the pool's cut — so the gap between them is the fee.
 *
 * Sums across *every* ID the address holds, not just its current one: several
 * addresses on this chain hold more than one (`0x8427…` holds four), and reading
 * only the current ID silently drops the rest of their rewards.
 *
 * Not cached — hence free to take and use `bigint` stakes directly, unlike
 * everything crossing the `getNetworkRewards` boundary.
 */
export function rewardRatesFor(
  input: { ids: number[]; selfStake: bigint; delegatedAmount: bigint },
  net: NetworkRewards | null,
): RewardRates {
  if (!net) return NO_DATA;

  let total = 0n;
  let delegators = 0n;
  let rewardCount = 0;
  let lastBlock = 0;
  for (const id of input.ids) {
    const r = net.byId[String(id)];
    if (!r) continue; // this ID was simply never paid inside the window
    total += BigInt(r.total);
    delegators += BigInt(r.delegators);
    rewardCount += r.count;
    if (r.lastBlock > lastBlock) lastBlock = r.lastBlock;
  }

  return {
    delegatorRatePct: annualisedPct(delegators, input.delegatedAmount, net.windowDays),
    nodeRatePct: annualisedPct(total, input.selfStake + input.delegatedAmount, net.windowDays),
    // Heights only ever run up to the head we anchored on, but clamp anyway so a
    // reorg between the scan and now can't produce a negative age.
    lastRewardAgeSec:
      lastBlock > 0 ? Math.max(0, (net.headBlock - lastBlock) * BLOCK_TIME_S) : null,
    rewardCount,
    hasData: true,
  };
}
