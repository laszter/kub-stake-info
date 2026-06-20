"use client";

import { useState } from "react";
import { useBalance } from "wagmi";
import { formatEther, isAddress, parseEther } from "viem";
import { kubChain } from "@/lib/chain";
import { useTx } from "@/hooks/useTx";
import { buildStake } from "@/lib/nodeActions";
import { formatKUBDisplay } from "@/lib/format";
import { KUB_NODE_DOCS_URL } from "@/lib/site";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InfoHint } from "@/components/ui/InfoHint";
import { TxStatusModal } from "./TxStatusModal";

const isPositive = (s: string) => /^\d*\.?\d+$/.test(s.trim()) && Number(s) > 0;
/** Native-token gas headroom kept clear when "Max" fills the stake amount. */
const GAS_RESERVE = parseEther("0.01");

function safeParseEther(value: string): bigint | null {
  try {
    return parseEther(value);
  } catch {
    return null;
  }
}

export function StakeForm({
  account,
  onDone,
  onCancel,
}: {
  account: `0x${string}`;
  onDone: () => void;
  onCancel: () => void;
}) {
  const tx = useTx();
  const [signer, setSigner] = useState("");
  const [amount, setAmount] = useState("");
  const [delegation, setDelegation] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data: balance } = useBalance({ address: account, chainId: kubChain.id });

  const walletKub = balance?.value ?? 0n;
  const maxFill = walletKub > GAS_RESERVE ? walletKub - GAS_RESERVE : 0n;
  const signerValid = isAddress(signer);
  const amountValid = isPositive(amount);
  const parsedAmount = amountValid ? safeParseEther(amount) : null;
  const overBalance = balance != null && parsedAmount != null && parsedAmount > walletKub;
  const canSubmit = signerValid && amountValid && !overBalance && !tx.isBusy;

  async function runStake() {
    setConfirmOpen(false);
    const ok = await tx.run({
      ...buildStake(signer as `0x${string}`, delegation, amount),
      account,
      chainId: kubChain.id,
    });
    if (ok) {
      onDone();
      setSigner("");
      setAmount("");
    }
  }

  const inputBase =
    "w-full rounded-lg border py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <div className="animate-reveal rounded-card border border-line bg-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-ink">Stake a new node</h3>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm text-ink-soft">
            Signer address
            <InfoHint label="The validator's signing address — the key the node uses to sign blocks. Different from your wallet." />
          </span>
          <input
            value={signer}
            onChange={(e) => setSigner(e.target.value)}
            placeholder="0x…"
            aria-invalid={signer ? !signerValid : undefined}
            className={`mt-1 px-3 font-mono ${inputBase} ${
              signer && !signerValid ? "border-warning" : "border-line"
            }`}
          />
          {signer && !signerValid && (
            <span className="text-xs text-warning">Not a valid address</span>
          )}
        </label>

        <label className="block">
          <span className="text-sm text-ink-soft">Stake amount</span>
          <div className="relative mt-1">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              aria-invalid={overBalance || undefined}
              className={`pl-3 pr-12 ${inputBase} ${overBalance ? "border-danger" : "border-line"}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">KUB</span>
          </div>
          {balance && (
            <p className="mt-1 text-xs text-ink-muted">
              {overBalance ? (
                <span className="text-danger">Exceeds your balance ({formatKUBDisplay(walletKub)} KUB)</span>
              ) : (
                <>Available: {formatKUBDisplay(walletKub)} KUB</>
              )}
              {maxFill > 0n && (
                <button
                  type="button"
                  onClick={() => setAmount(formatEther(maxFill))}
                  className="ml-1.5 font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  Max
                </button>
              )}
            </p>
          )}
        </label>

        <div>
          <span className="text-sm text-ink-soft">
            Node type
            <InfoHint label="Pool accepts delegations from others (you set a commission). Solo stakes only your own funds." />
          </span>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setDelegation(false)}
              aria-pressed={!delegation}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
                !delegation ? "border-brand bg-brand-light text-brand-dark" : "border-line text-ink-soft hover:border-brand/40"
              }`}
            >
              Solo
            </button>
            <button
              type="button"
              onClick={() => setDelegation(true)}
              aria-pressed={delegation}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 ${
                delegation ? "border-brand bg-brand-light text-brand-dark" : "border-line text-ink-soft hover:border-brand/40"
              }`}
            >
              Pool (accepts delegation)
            </button>
          </div>
        </div>

        <Button
          disabled={!canSubmit}
          onClick={() => setConfirmOpen(true)}
          fullWidth
          size="md"
        >
          Stake node
        </Button>
        <p className="text-center text-xs text-ink-muted">
          {delegation
            ? "Pool nodes must meet the minimum pool stake."
            : "Solo nodes must meet the minimum solo stake."}
        </p>

        <div className="rounded-lg border border-line bg-surface p-3 text-xs leading-relaxed text-ink-muted">
          New to becoming a node validator? Running a node needs your own server
          infrastructure with high uptime and a minimum stake.{" "}
          <a
            href={KUB_NODE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            Learn how to run a KUB node →
          </a>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Stake a new node"
        message={`Stake ${amount} KUB to register a new ${
          delegation ? "Pool" : "Solo"
        } node with signer ${signer}?`}
        confirmLabel={`Stake ${amount} KUB`}
        onConfirm={runStake}
        onCancel={() => setConfirmOpen(false)}
      />

      <TxStatusModal status={tx.status} hash={tx.hash} error={tx.error} onClose={tx.reset} />
    </div>
  );
}
