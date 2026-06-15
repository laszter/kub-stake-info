import { formatEther } from "viem";
import type { Validator } from "./staking";
import { formatKUB, bpsToPercent } from "./format";

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
}

export function toCardView(v: Validator): ValidatorCardView {
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
  };
}
