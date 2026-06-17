"use client";

import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { stakingNft, stakeManager } from "@/lib/contract";
import { kubChain } from "@/lib/chain";
import { useWalletAuth } from "@/providers/WalletAuthProvider";
import registry from "@/data/validators.json";

const ZERO = "0x0000000000000000000000000000000000000000";
const STATUS = ["Uninitialized", "Active", "Unstaked"] as const;
const reg = registry as Record<string, { name: string; logo: string }>;

/** Re-read on-chain state on this interval so rewards stay live. */
export const REFRESH_MS = 20_000;

export interface MyNode {
  id: bigint;
  signer: `0x${string}`;
  name: string | null;
  logo: string | null;
  amount: bigint;
  delegatedAmount: bigint;
  totalStake: bigint;
  reward: bigint;
  delegatorsReward: bigint;
  validatorCommissionAmount: bigint;
  delegatorCommissionAmount: bigint;
  minDeposit: bigint;
  validatorShareContract: `0x${string}`;
  status: string;
  statusCode: number;
  commissionRate: number;
  infraCommissionRate: number;
  isPool: boolean;
  powerRatio: number;
}

interface RawValidator {
  amount: bigint;
  delegatedAmount: bigint;
  reward: bigint;
  delegatorsReward: bigint;
  infraCommissionAmount: bigint;
  validatorCommissionAmount: bigint;
  delegatorCommissionAmount: bigint;
  minDeposit: bigint;
  signer: `0x${string}`;
  validatorShareContract: `0x${string}`;
  status: number;
  infraCommissionRate: number;
  commissionRate: number;
}

export function useMyNodes() {
  const { address, isConnected: walletConnected, chainId } = useAccount();
  const { isVerified } = useWalletAuth();
  // The UI treats "connected" as connected *and* signature-verified, so the
  // stake manager stays locked until the user has confirmed the wallet.
  const isConnected = walletConnected && isVerified;
  const onKub = chainId === kubChain.id;
  const ready = isVerified && Boolean(address) && onKub;

  const idsQuery = useReadContract({
    ...stakingNft,
    functionName: "tokenOfOwnerAll",
    args: address ? [address] : undefined,
    chainId: kubChain.id,
    query: { enabled: ready, refetchInterval: REFRESH_MS },
  });

  const ids = (idsQuery.data as bigint[] | undefined) ?? [];

  const infoQuery = useReadContracts({
    allowFailure: true,
    contracts: ids.map((id) => ({
      ...stakeManager,
      functionName: "getValidatorInfoByIndex",
      args: [id],
      chainId: kubChain.id,
    })),
    query: { enabled: ids.length > 0, refetchInterval: REFRESH_MS },
  });

  const totalQuery = useReadContract({
    ...stakeManager,
    functionName: "totalStaked",
    chainId: kubChain.id,
    query: { enabled: ready, refetchInterval: REFRESH_MS },
  });
  const totalStaked = (totalQuery.data as bigint | undefined) ?? 0n;

  const nodes: MyNode[] = [];
  if (infoQuery.data) {
    ids.forEach((id, i) => {
      const res = infoQuery.data![i];
      if (res.status !== "success" || !res.result) return;
      const v = res.result as unknown as RawValidator;
      const totalStake = v.amount + v.delegatedAmount;
      const entry = reg[v.signer.toLowerCase()];
      nodes.push({
        id,
        signer: v.signer,
        name: entry?.name ?? null,
        logo: entry?.logo ?? null,
        amount: v.amount,
        delegatedAmount: v.delegatedAmount,
        totalStake,
        reward: v.reward,
        delegatorsReward: v.delegatorsReward,
        validatorCommissionAmount: v.validatorCommissionAmount,
        delegatorCommissionAmount: v.delegatorCommissionAmount,
        minDeposit: v.minDeposit,
        validatorShareContract: v.validatorShareContract,
        status: STATUS[v.status] ?? "Uninitialized",
        statusCode: v.status,
        commissionRate: v.commissionRate,
        infraCommissionRate: v.infraCommissionRate,
        isPool: v.validatorShareContract !== ZERO,
        powerRatio: totalStaked === 0n ? 0 : Number((totalStake * 1_000_000n) / totalStaked) / 1_000_000,
      });
    });
  }

  function refetch() {
    idsQuery.refetch();
    infoQuery.refetch();
    totalQuery.refetch();
  }

  return {
    address,
    isConnected,
    onKub,
    nodes,
    ids,
    isLoading: idsQuery.isLoading || (ids.length > 0 && infoQuery.isLoading),
    refetch,
  };
}
