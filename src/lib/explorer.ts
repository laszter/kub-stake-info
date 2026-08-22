import { unstable_cache } from "next/cache";
import { EXPLORER_URL, publicClient } from "./chain";

/** KUB Scan (Blockscout) address-counters endpoint. */
const countersUrl = (address: string) =>
  `${EXPLORER_URL}/api/v2/addresses/${address}/counters`;

const POLL_ATTEMPTS = 6;
const POLL_DELAY_MS = 400;
const REQUEST_TIMEOUT_MS = 6000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Number of blocks a validator has produced (signed) on the KUB Chain.
 *
 * On KUB's PoSA consensus the block producer is the validator's own address —
 * it appears as the block `miner` — so the figure is simply that address's
 * "validations" tally on KUB Scan. There is no equivalent field in the
 * StakeManager contract, so the explorer is the only source.
 *
 * KUB Scan (a Blockscout fork) computes address counters lazily and lets them
 * lapse: a hit on a cold counter returns an empty body and kicks off a
 * background recompute. So we poll a few times — each with a unique query so
 * Next's per-render fetch memoisation can't collapse the attempts into one —
 * before giving up. Returns null when the explorer is unreachable or still
 * computing; the caller renders a placeholder.
 */
async function fetchBlocksValidated(address: string): Promise<number | null> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${countersUrl(address)}?_=${attempt}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const body = await res.text();
        if (body) {
          const { validations_count } = JSON.parse(body) as {
            validations_count?: string | null;
          };
          if (validations_count != null && validations_count !== "") {
            const n = Number(validations_count);
            if (Number.isFinite(n)) return n;
          }
        }
      }
    } catch {
      // network error, timeout, or malformed JSON — fall through and retry
    }
    if (attempt < POLL_ATTEMPTS - 1) await sleep(POLL_DELAY_MS);
  }
  return null;
}

/**
 * Cached for 60s to match the node pages' revalidation. Wrapping the polling
 * fetch in unstable_cache keeps the node route statically rendered: its result
 * is treated as cached data rather than a per-request dynamic read, so the
 * surrounding page stays ISR instead of flipping to fully dynamic.
 */
export const getBlocksValidated = unstable_cache(
  fetchBlocksValidated,
  ["blocks-validated"],
  { revalidate: 60 },
);

/* ── Hourly block-production series (last 24h) ───────────────────────────── */

const HOURS = 24;
const HOUR_MS = 3_600_000;

/** KUB block time is a rock-steady ~3.0s (verified on-chain), so a wall-clock
    offset maps cleanly to a block height. Used only to *seed* each hour's
    cursor; the actual bucket boundaries are decided by block timestamps, so a
    small drift in this constant can't misplace a block. */
const GLOBAL_BLOCK_TIME_S = 3.0;

/** Cursor is seeded this many heights ABOVE each hour's upper boundary so the
    very first blocks of the hour are never skipped (covers block-time drift over
    24h, ≈30 heights). The few over-fetched blocks fall outside the range and are
    simply not counted. */
const SEED_MARGIN_HEIGHTS = 60;

/** Max 50-block pages walked per hour. Keeps the explorer load bounded: a
    typical validator (~130 blk/h) reaches its hour boundary in ≤4 pages and is
    counted exactly; only the busiest (~370 blk/h) hits this cap, and those hours
    are extrapolated from the ~54min already covered (see hour walk below). */
const PER_HOUR_PAGE_CAP = 7;

/** How many hour-walks run at once. Each walk is internally sequential (cursor
    paging), so this bounds peak concurrent requests to the explorer. */
const SERIES_CONCURRENCY = 8;

const blocksValidatedUrl = (address: string, cursor: number) =>
  `${EXPLORER_URL}/api/v2/addresses/${address}/blocks-validated` +
  `?block_number=${cursor}&items_count=50`;

export type BlocksProducedSeries = {
  /** Blocks produced in each hourly bucket, oldest hour first (index 0 = 24h
      ago) → most recent hour last (index 23 = the past hour). Length 24. */
  counts: number[];
  /** Unix-ms start of each bucket, aligned 1:1 with `counts`. */
  bucketStarts: number[];
  /** Anchor "now" — the latest block's timestamp (unix ms). */
  to: number;
  /** True if any bucket was extrapolated rather than counted exactly. */
  estimated: boolean;
};

type Block = { height: number; ts: number };

/** One page (≤50) of a validator's produced blocks below `cursor`, newest
    first. One retry on a transient failure; throws if it can't be read. */
async function fetchBlocksPage(address: string, cursor: number): Promise<Block[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(blocksValidatedUrl(address, cursor), {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          items?: { height?: number; timestamp?: string }[];
        };
        const items = Array.isArray(body.items) ? body.items : [];
        return items.map((it) => ({
          height: Number(it.height),
          ts: Date.parse(it.timestamp ?? ""),
        }));
      }
    } catch {
      // network error, timeout, or malformed JSON — retry once, then give up
    }
    if (attempt === 0) await sleep(POLL_DELAY_MS);
  }
  throw new Error("blocks-validated page fetch failed");
}

type HourResult = { value: number; errored: boolean; estimated: boolean };

/**
 * Count the blocks a validator produced in the hour `i` slots back from `toTs`
 * (i = 0 is the most recent hour). Seeds the cursor from the global block height
 * and pages down until a block older than the hour is seen — so the boundary is
 * decided by real timestamps, never an estimate. If the hour is so dense it hits
 * the page cap first, the partial count is scaled up to the full hour (steady
 * production rate), which still surfaces any outage inside the covered window.
 */
async function walkHour(
  address: string,
  headHeight: number,
  toTs: number,
  i: number,
): Promise<HourResult> {
  const upper = toTs - i * HOUR_MS;
  const lower = upper - HOUR_MS;
  let cursor =
    headHeight - Math.round((i * HOUR_MS) / 1000 / GLOBAL_BLOCK_TIME_S) + SEED_MARGIN_HEIGHTS;

  let count = 0;
  let oldestCountedTs = upper;
  let reached = false;

  for (let page = 0; page < PER_HOUR_PAGE_CAP; page++) {
    let items: Block[];
    try {
      items = await fetchBlocksPage(address, cursor);
    } catch {
      return { value: count, errored: true, estimated: false };
    }
    if (items.length === 0) {
      reached = true; // no older blocks exist — the hour is fully covered
      break;
    }
    for (const b of items) {
      if (b.ts >= lower && b.ts < upper) {
        count++;
        if (b.ts < oldestCountedTs) oldestCountedTs = b.ts;
      }
    }
    const oldest = items[items.length - 1];
    if (oldest.ts < lower) {
      reached = true;
      break;
    }
    cursor = oldest.height; // page further back
  }

  // Hit the page cap mid-hour (very high producer): extrapolate the steady rate
  // across the slice not yet reached.
  if (!reached && count > 0) {
    const coveredMs = upper - oldestCountedTs;
    if (coveredMs > 0) {
      return { value: Math.round((count * HOUR_MS) / coveredMs), errored: false, estimated: true };
    }
  }
  return { value: count, errored: false, estimated: false };
}

/** Run `tasks` with at most `limit` in flight, preserving result order. */
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

async function fetchBlocksProducedSeries(
  address: string,
  anchorBlock?: number,
  anchorTime?: number,
): Promise<BlocksProducedSeries | null> {
  let headHeight: number;
  let toTs: number;
  if (anchorBlock !== undefined && anchorTime !== undefined) {
    // Caller-supplied anchor: see `getBlocksProducedSeries`.
    headHeight = anchorBlock;
    toTs = anchorTime;
  } else {
    let head;
    try {
      head = await publicClient.getBlock();
    } catch {
      return null; // can't anchor the window — caller renders a fallback
    }
    headHeight = Number(head.number);
    toTs = Number(head.timestamp) * 1000;
  }

  const tasks = Array.from(
    { length: HOURS },
    (_, i) => () => walkHour(address, headHeight, toTs, i),
  );
  const byHour = await pool(tasks, SERIES_CONCURRENCY);

  // If the explorer is broadly unreachable, don't render a misleading all-zero
  // chart — signal failure instead.
  const failed = byHour.filter((h) => h.errored).length;
  if (failed > HOURS / 2) return null;

  // walkHour indexes 0 = most recent; flip to oldest-first for left→right plot.
  const counts: number[] = [];
  const bucketStarts: number[] = [];
  let estimated = false;
  for (let i = HOURS - 1; i >= 0; i--) {
    counts.push(byHour[i].value);
    bucketStarts.push(toTs - (i + 1) * HOUR_MS);
    if (byHour[i].estimated) estimated = true;
  }

  return { counts, bucketStarts, to: toTs, estimated };
}

/**
 * Cached for 5 minutes — the hourly buckets shift slowly and the crawl is far
 * heavier than the single-counter lookup, so it warrants a longer TTL than
 * `getBlocksValidated`. Wrapped in unstable_cache so the node route stays ISR
 * (the result is treated as cached data, not a per-request dynamic read).
 *
 * `anchorBlock` / `anchorTime` exist so a caller that already holds a chain head
 * can cut this window from the *same* instant as another series it means to
 * overlay. Without that, this crawl and the reward scan (`rewards.ts`) each read
 * their own head, minutes apart, and their bucket edges land minutes apart too —
 * enough to file a payout and the blocks that earned it under different hours.
 * The arguments are part of the cache key, so a fresh anchor re-crawls; that
 * costs nothing extra in practice, since both caches already turn over on the
 * same 5-minute TTL. Omit them and the crawl anchors itself, which is the right
 * behaviour when the other source is unavailable.
 */
export const getBlocksProducedSeries = unstable_cache(
  fetchBlocksProducedSeries,
  ["blocks-produced-series"],
  { revalidate: 300 },
);

/* ── Pool delegators (share-token holders) ───────────────────────────────── */

/* A pool's ValidatorShare contract is a plain ERC-20 ("BKC POS Delegator"),
   minted to whoever delegates into that pool. The StakeManager exposes no
   delegator roster or count, so the explorer's token views are the only source:
   holders = delegators, and each holder's balance = their stake. */
const tokenUrl = (token: string) => `${EXPLORER_URL}/api/v2/tokens/${token}`;
const tokenHoldersUrl = (token: string) =>
  `${EXPLORER_URL}/api/v2/tokens/${token}/holders`;
const tokenCountersUrl = (token: string) =>
  `${EXPLORER_URL}/api/v2/tokens/${token}/counters`;

export type Delegator = {
  /** Delegator's account, as returned by the explorer (0x-prefixed). */
  address: string;
  /** Stake in wei, as an unsigned decimal string — *not* a `bigint`.
      `unstable_cache` serialises a wrapped function's result with
      `JSON.stringify`, which throws `TypeError: Do not know how to serialize a
      BigInt`; the rejection is swallowed as an unhandled one and the entry is
      never written, so every request silently re-crawls the explorer. Callers
      that need arithmetic take `BigInt(amount)` on the far side of the cache.

      The share token mints 1:1 against KUB — a pool's share `total_supply`
      matches its on-chain `delegatedAmount` to the wei — so this is already a
      KUB amount and needs no conversion before formatting or before taking its
      share of `delegatedAmount`. */
  amount: string;
};

/**
 * Holder tally of a pool's share token, i.e. how many accounts have delegated
 * to that pool.
 *
 * `/tokens/{token}` carries `holders` as a stored field rather than one of
 * Blockscout's lazily-recomputed counters, so a single request suffices and the
 * six-attempt poll `fetchBlocksValidated` needs is unnecessary here — two tries
 * only to ride out a transient network blip. Should that field ever go missing,
 * we drop to `/tokens/{token}/counters`, which *is* lazy and therefore polled.
 *
 * A 404 is not a failure: Blockscout only indexes a token once it has seen a
 * transfer, so a pool nobody has delegated to yet has no token record at all.
 * Reporting null there would show "—" forever on an empty pool; it is a true
 * zero. null is reserved for "the explorer could not be read", so the caller
 * can tell an empty pool apart from an outage.
 */
async function fetchDelegatorCount(share: string): Promise<number | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${tokenUrl(share)}?_=${attempt}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status === 404) return 0; // token never indexed ⇒ no delegators
      if (res.ok) {
        const body = await res.text();
        if (body) {
          const { holders } = JSON.parse(body) as { holders?: string | null };
          if (holders != null && holders !== "") {
            const n = Number(holders);
            if (Number.isFinite(n)) return n;
          }
          return fetchTokenHoldersCounter(share);
        }
      }
    } catch {
      // network error, timeout, or malformed JSON — retry once, then give up
    }
    if (attempt === 0) await sleep(POLL_DELAY_MS);
  }
  return null;
}

/** Fallback holder tally. This endpoint is one of Blockscout's lazy counters —
    a cold hit answers with an empty body and schedules a recompute — so it is
    polled with a unique query per attempt, exactly as `fetchBlocksValidated`
    does for address counters. */
async function fetchTokenHoldersCounter(token: string): Promise<number | null> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${tokenCountersUrl(token)}?_=${attempt}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status === 404) return 0;
      if (res.ok) {
        const body = await res.text();
        if (body) {
          const { token_holders_count } = JSON.parse(body) as {
            token_holders_count?: string | null;
          };
          if (token_holders_count != null && token_holders_count !== "") {
            const n = Number(token_holders_count);
            if (Number.isFinite(n)) return n;
          }
        }
      }
    } catch {
      // network error, timeout, or malformed JSON — fall through and retry
    }
    if (attempt < POLL_ATTEMPTS - 1) await sleep(POLL_DELAY_MS);
  }
  return null;
}

/**
 * The `limit` largest delegators of a pool, biggest stake first.
 *
 * Blockscout ignores `?limit=` on this endpoint — it always answers with one
 * page of 50 holders — so the cut to the top `limit` happens here. It also
 * already returns the page sorted by balance descending, but we re-sort rather
 * than depend on an undocumented ordering that a future explorer release could
 * change. Malformed rows are skipped instead of failing the whole table: one
 * bad entry should not cost the user the other nine.
 *
 * Same contract as `fetchDelegatorCount`: 404 means the token was never indexed
 * because nobody has delegated (an empty list), while null means the explorer
 * could not be read.
 */
async function fetchTopDelegators(
  share: string,
  limit: number,
): Promise<Delegator[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${tokenHoldersUrl(share)}?_=${attempt}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status === 404) return []; // token never indexed ⇒ no delegators
      if (res.ok) {
        const body = (await res.json()) as {
          items?: {
            address?: { hash?: string } | null;
            value?: string | null;
          }[];
        };
        const items = Array.isArray(body.items) ? body.items : [];
        // Ranking has to compare numeric value, and these are wei-scale figures
        // of differing digit counts — a plain string sort would put "9" above
        // "10000". So each row carries a parsed `wei` alongside its string form
        // purely to order the list; only the string crosses the cache boundary.
        const rows: (Delegator & { wei: bigint })[] = [];
        for (const item of items) {
          const address = item.address?.hash;
          const value = item.value;
          // Balances arrive as unsigned decimal strings; anything else would
          // throw in BigInt, so drop the row rather than the whole response.
          if (!address || !value || !/^\d+$/.test(value)) continue;
          rows.push({ address, amount: value, wei: BigInt(value) });
        }
        rows.sort((a, b) => (a.wei < b.wei ? 1 : a.wei > b.wei ? -1 : 0));
        return rows
          .slice(0, limit)
          .map(({ address, amount }) => ({ address, amount }));
      }
    } catch {
      // network error, timeout, or malformed JSON — retry once, then give up
    }
    if (attempt === 0) await sleep(POLL_DELAY_MS);
  }
  return null;
}

/**
 * Cached for 60s to match the node pages' revalidation — a single cheap lookup,
 * same trade-off as `getBlocksValidated`. Wrapped in unstable_cache so the node
 * route stays ISR (the result is treated as cached data, not a per-request
 * dynamic read).
 */
export const getDelegatorCount = unstable_cache(
  fetchDelegatorCount,
  ["delegator-count"],
  { revalidate: 60 },
);

/**
 * Cached for 5 minutes: a leaderboard of the largest stakes barely moves from
 * minute to minute, and the payload is a 50-row page rather than one number, so
 * it earns a longer TTL than the count — the same reasoning as
 * `getBlocksProducedSeries`. Wrapped in unstable_cache to keep the node route
 * ISR — which is also why `Delegator.amount` is a decimal string: the cache
 * serialises with `JSON.stringify`, and a `bigint` there fails to write at all.
 */
export const getTopDelegators = unstable_cache(
  fetchTopDelegators,
  ["top-delegators"],
  { revalidate: 300 },
);
