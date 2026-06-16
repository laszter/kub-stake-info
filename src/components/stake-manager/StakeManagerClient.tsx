"use client";

import { useEffect, useState } from "react";
import { useMyNodes } from "@/hooks/useMyNodes";
import { useBulkClaim, type BulkItem } from "@/hooks/useBulkClaim";
import { kubChain } from "@/lib/chain";
import {
  buildClaimRewards,
  buildClaimCommission,
  buildWithdrawDelegatorsReward,
} from "@/lib/nodeActions";
import { formatKUBDisplay, bpsToPercent, shortenAddress } from "@/lib/format";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkGuard } from "@/components/wallet/NetworkGuard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chevron } from "@/components/ui/Chevron";
import { StatusBadge } from "@/components/nodes/StatusBadge";
import { NodeManagePanel } from "./NodeManagePanel";
import { StakeForm } from "./StakeForm";
import { BulkClaimModal } from "./BulkClaimModal";

const CAPABILITIES = [
  "Stake, restake & unstake your nodes",
  "Claim validator & commission rewards",
  "Update commission and delegation",
];

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden>
      <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StakeManagerClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected, nodes, isLoading, refetch } = useMyNodes();
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [showStake, setShowStake] = useState(false);
  const bulk = useBulkClaim();

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Every claimable reward across all nodes, flattened into a sequential queue
  // (the contract has no batch call).
  const claimQueue: BulkItem[] = nodes.flatMap((node) => {
    const name = node.name ?? shortenAddress(node.signer);
    const items: BulkItem[] = [];
    if (node.reward > 0n)
      items.push({ label: `${name} — validator rewards`, build: buildClaimRewards(node.id) });
    if (node.isPool && node.validatorCommissionAmount > 0n)
      items.push({ label: `${name} — commission`, build: buildClaimCommission(node.id) });
    if (node.isPool && node.delegatorsReward > 0n)
      items.push({ label: `${name} — delegators reward`, build: buildWithdrawDelegatorsReward(node.id) });
    return items;
  });
  const totalClaimable = nodes.reduce(
    (sum, n) => sum + n.reward + (n.isPool ? n.validatorCommissionAmount + n.delegatorsReward : 0n),
    0n,
  );

  // Keyboard accelerators (desktop power users). Ignored while typing in a field
  // or while a modal owns the keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!isConnected || !address) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable))
        return;
      if (document.querySelector('[role="dialog"]')) return;
      switch (e.key.toLowerCase()) {
        case "n":
          setShowStake((s) => !s);
          break;
        case "r":
          refetch();
          break;
        case "e":
          setOpenIds((prev) => (prev.size > 0 ? new Set() : new Set(nodes.map((n) => n.id.toString()))));
          break;
        default:
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isConnected, address, refetch, nodes]);

  if (!mounted) {
    return <div className="h-40 animate-pulse rounded-card bg-line/50" />;
  }

  if (!isConnected || !address) {
    return (
      <div className="rounded-card border border-line bg-white px-6 py-10 text-center">
        <h2 className="text-lg font-bold text-ink">Connect your wallet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Connect a wallet on KUB Chain to view and manage the validator nodes you own.
        </p>
        <ul className="mx-auto mt-5 flex max-w-xs flex-col gap-2 text-left text-sm text-ink-soft">
          {CAPABILITIES.map((c) => (
            <li key={c} className="flex items-start gap-2">
              <CheckMark />
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
        <p className="mx-auto mt-4 max-w-xs text-xs text-ink-muted">
          Read-only until you sign — funds never move without your wallet&apos;s confirmation.
        </p>
      </div>
    );
  }

  const canClaimAll = claimQueue.length > 0 && bulk.status === "idle";

  return (
    <NetworkGuard>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">
              My Nodes{" "}
              <span className="text-sm font-medium text-ink-muted">({nodes.length})</span>
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Live · auto-updates every 20s
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canClaimAll && (
              <Button
                variant="secondary"
                onClick={() => bulk.run(claimQueue, address, kubChain.id)}
              >
                Claim all · {formatKUBDisplay(totalClaimable)} KUB
              </Button>
            )}
            <Button
              variant={showStake ? "neutral" : "primary"}
              onClick={() => setShowStake((s) => !s)}
            >
              {showStake ? "Close" : "+ Stake new node"}
            </Button>
          </div>
        </div>

        {showStake && (
          <StakeForm
            account={address}
            onCancel={() => setShowStake(false)}
            onDone={() => {
              setShowStake(false);
              refetch();
            }}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-card bg-line/50" />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="rounded-card border border-line bg-white p-10 text-center text-sm text-ink-soft">
            This wallet doesn&apos;t own any validator nodes yet. Use{" "}
            <span className="font-medium text-ink">Stake new node</span> to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {nodes.map((node) => {
              const id = node.id.toString();
              const open = openIds.has(id);
              if (open) {
                return (
                  <div key={id} className="animate-reveal">
                    <Button variant="ghost" onClick={() => toggle(id)} className="mb-2" aria-expanded>
                      <Chevron direction="down" className="h-3.5 w-3.5" />
                      Collapse
                    </Button>
                    <NodeManagePanel node={node} account={address} onDone={refetch} />
                  </div>
                );
              }
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-expanded={false}
                  className="flex w-full items-center gap-3 rounded-card border border-line bg-white p-4 text-left transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <Avatar src={node.logo} name={node.name} address={node.signer} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">
                        {node.name ?? shortenAddress(node.signer)}
                      </span>
                      <StatusBadge status={node.status} />
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-soft">
                        {node.isPool ? "Pool" : "Solo"} · ID {node.id.toString()}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-ink-muted">
                      {shortenAddress(node.signer, 6)}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatKUBDisplay(node.totalStake)} KUB</p>
                    <p className="text-xs text-ink-muted">
                      {(node.powerRatio * 100).toFixed(2)}%
                      {node.isPool ? ` · fee ${bpsToPercent(node.commissionRate)}` : ""}
                    </p>
                  </div>
                  <Chevron className="ml-1 h-4 w-4 shrink-0 text-ink-muted" />
                </button>
              );
            })}
          </div>
        )}

        {nodes.length > 0 && (
          <p className="hidden text-xs text-ink-muted sm:block">
            Shortcuts:{" "}
            <kbd className="rounded border border-line px-1 font-mono">N</kbd> new ·{" "}
            <kbd className="rounded border border-line px-1 font-mono">R</kbd> refresh ·{" "}
            <kbd className="rounded border border-line px-1 font-mono">E</kbd> expand/collapse all
          </p>
        )}
      </div>

      <BulkClaimModal
        status={bulk.status}
        index={bulk.index}
        total={bulk.total}
        step={bulk.step}
        results={bulk.results}
        onClose={() => {
          bulk.reset();
          refetch();
        }}
      />
    </NetworkGuard>
  );
}
