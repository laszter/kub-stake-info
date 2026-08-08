import { formatEther } from "viem";
import type { Validator } from "./staking";
// Type-only: `rewards.ts` pulls in `next/cache` and an RPC client, and this
// module is (type-)imported by client components. Importing the type alone
// keeps that module out of the client bundle entirely.
import type { RewardRates } from "./rewards";
import { formatKUB, bpsToPercent, formatRatePercent } from "./format";

/** Plain, serializable shape passed to client components (no bigint). */
export interface ValidatorCardView {
  address: string;
  name: string | null;
  logo: string | null;
  totalStake: string; // formatted "1,836,983.53"
  totalStakeNum: number; // for client-side sorting
  power: string; // "17.02%"
  powerNum: number; // 0–1 ratio
  serviceFee: string; // "4%"
  feeNum: number; // basis points
  status: string;
  isPool: boolean;
  /** Ready-to-render realised reward rate: "0.36%" · "—" (unreadable) ·
      "None in 7d" (read fine, but nothing was paid and no rate applies). The
      string is built here, on the server, because the three cases are not
      distinguishable from a single number and the card must not re-derive them. */
  rewardRate: string;
  /** Same rate as a number, for client-side sorting only. -1 stands for "no
      rate" so those rows sink below a genuine 0.00% — an idle node is still a
      more informative answer than a node we could not measure. */
  rewardRateNum: number;
  /** The node's own rate (whole payout over total stake), shown alongside
      `rewardRate` on pool cards. It answers a different question — how well the
      node converts the stake behind it into rewards — and unlike the delegator
      rate it still has a value for a pool nobody has delegated to yet, which is
      otherwise an em dash. Same three-case string treatment as `rewardRate`. */
  nodeRate: string;
}

/**
 * Map a chain-side validator into the card shape.
 *
 * `rates` is optional so callers that have no reward scan (or for which one
 * failed) keep working unchanged; they simply render an em dash.
 *
 * Which rate is shown depends on what the reader is deciding. A pool card is
 * chosen by someone about to delegate, so it shows `delegatorRatePct` — what
 * they would actually receive, net of the pool's cut. A solo node takes no
 * delegation, so its only meaningful figure is `nodeRatePct`, the whole payout
 * over the stake behind it, which for a solo node is the owner's own return.
 */
export function toCardView(v: Validator, rates?: RewardRates): ValidatorCardView {
  // Rate is null both when the chain could not be read and when there is no
  // stake to divide by; `hasData` + `rewardCount` separate the two so an outage
  // never reads as "this node earned nothing".
  const pct = v.isPool ? rates?.delegatorRatePct : rates?.nodeRatePct;
  const noRate =
    rates?.hasData && rates.rewardCount === 0 ? "None in 7d" : "—";
  const nodePct = rates?.nodeRatePct;

  return {
    address: v.address,
    name: v.name,
    logo: v.logo,
    totalStake: formatKUB(v.totalStake),
    totalStakeNum: Number(formatEther(v.totalStake)),
    power: `${(v.powerRatio * 100).toFixed(2)}%`,
    powerNum: v.powerRatio,
    serviceFee: bpsToPercent(v.commissionRate),
    feeNum: v.commissionRate,
    status: v.status,
    isPool: v.isPool,
    rewardRate: pct == null ? noRate : formatRatePercent(pct),
    rewardRateNum: pct ?? -1,
    nodeRate: nodePct == null ? noRate : formatRatePercent(nodePct),
  };
}
