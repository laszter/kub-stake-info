"use client";

import { useState } from "react";
import { useBalance } from "wagmi";
import { formatEther, parseEther } from "viem";
import { kubChain } from "@/lib/chain";
import { useTx } from "@/hooks/useTx";
import type { MyNode } from "@/hooks/useMyNodes";
import { formatKUBDisplay, bpsToPercent } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InfoHint } from "@/components/ui/InfoHint";
import { TxStatusModal } from "./TxStatusModal";

/** Native-token gas headroom left untouched when "Max" fills a spend field. */
const GAS_RESERVE = parseEther("0.01");

function safeParseEther(value: string): bigint | null {
  try {
    return parseEther(value);
  } catch {
    return null;
  }
}
import {
  buildRestake,
  buildUnstake,
  buildUnstakePartial,
  buildClaimRewards,
  buildClaimCommission,
  buildWithdrawDelegatorsReward,
  buildUpdateCommission,
  buildUpdateMinDelegated,
  buildToggleDelegation,
  buildActivate,
} from "@/lib/nodeActions";

const isPositive = (s: string) => /^\d*\.?\d+$/.test(s.trim()) && Number(s) > 0;

const inputClass =
  "w-full rounded-lg border border-line py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function AmountAction({
  label,
  labelHint,
  unit,
  cta,
  disabled,
  onSubmit,
  danger,
  max,
  maxFill,
  maxLabel = "Available",
}: {
  label: string;
  labelHint?: string;
  unit: string;
  cta: string;
  disabled?: boolean;
  onSubmit: (value: string) => void;
  danger?: boolean;
  /** Hard ceiling: submission is blocked above this. */
  max?: bigint;
  /** What the "Max" button fills (defaults to `max`; lower to reserve gas). */
  maxFill?: bigint;
  maxLabel?: string;
}) {
  const [value, setValue] = useState("");
  const valid = isPositive(value);
  const parsed = valid ? safeParseEther(value) : null;
  const over = max != null && parsed != null && parsed > max;
  const fill = maxFill ?? max;

  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="w-36 text-sm text-ink-soft">
          {label}
          {labelHint && <InfoHint label={labelHint} />}
        </span>
        <div className="relative flex-1">
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0.0"
            aria-invalid={over || undefined}
            className={`${inputClass} pl-3 pr-12 ${over ? "border-danger" : ""}`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            {unit}
          </span>
        </div>
        <Button
          variant={danger ? "danger" : "secondary"}
          disabled={disabled || !valid || over}
          onClick={() => onSubmit(value)}
        >
          {cta}
        </Button>
      </div>
      {max != null && (
        <p className="text-xs text-ink-muted sm:ml-[9.5rem]">
          {over ? (
            <span className="text-danger">
              Exceeds {maxLabel.toLowerCase()} ({formatKUBDisplay(max)} {unit})
            </span>
          ) : (
            <>
              {maxLabel}: {formatKUBDisplay(max)} {unit}
            </>
          )}
          {fill != null && fill > 0n && (
            <button
              type="button"
              onClick={() => setValue(formatEther(fill))}
              className="ml-1.5 font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              Max
            </button>
          )}
        </p>
      )}
    </div>
  );
}

function SimpleAction({
  label,
  cta,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      <Button variant={danger ? "danger" : "secondary"} disabled={disabled} onClick={onClick}>
        {cta}
      </Button>
    </div>
  );
}

/** Claimable-reward row: shows the live amount + a claim/withdraw button. */
function RewardRow({
  label,
  amount,
  cta,
  onClick,
  disabled,
}: {
  label: string;
  amount: bigint;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const nothing = amount === 0n;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-ink-muted">{label}</p>
        <p className="font-semibold text-ink" title={`${amount} wei`}>
          {formatKUBDisplay(amount)} <span className="text-xs font-normal text-ink-muted">KUB</span>
        </p>
      </div>
      <Button variant="secondary" disabled={disabled || nothing} onClick={onClick} className="shrink-0">
        {cta}
      </Button>
    </div>
  );
}

type Build = {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
};

type Pending = {
  build: Build;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
};

export function NodeManagePanel({
  node,
  account,
  onDone,
}: {
  node: MyNode;
  account: `0x${string}`;
  onDone: () => void;
}) {
  const tx = useTx();
  const [commission, setCommission] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const { data: balance } = useBalance({ address: account, chainId: kubChain.id });

  const walletKub = balance?.value ?? 0n;
  // Leave gas headroom so "Max" on a native-token spend doesn't guarantee a fail.
  const restakeFill = walletKub > GAS_RESERVE ? walletKub - GAS_RESERVE : 0n;

  async function doExec(build: Build) {
    const ok = await tx.run({
      address: build.address,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: build.abi as any,
      functionName: build.functionName,
      args: build.args,
      value: build.value,
      account,
      chainId: kubChain.id,
    });
    if (ok) onDone();
  }

  /** Run immediately (the wallet popup is the only confirmation). */
  function exec(build: Build) {
    void doExec(build);
  }

  /** Ask for an in-app confirmation first (destructive / structural changes). */
  function confirmExec(build: Build, opts: Omit<Pending, "build">) {
    setPending({ build, ...opts });
  }

  async function onConfirm() {
    if (!pending) return;
    const { build } = pending;
    setPending(null);
    await doExec(build);
  }

  const busy = tx.isBusy;

  return (
    <>
      <div className="space-y-4">
        <Section title="Stake">
          <AmountAction
            label="Restake (add)"
            unit="KUB"
            cta="Restake"
            disabled={busy}
            max={balance ? walletKub : undefined}
            maxFill={restakeFill}
            maxLabel="Available"
            onSubmit={(v) => exec(buildRestake(node.id, v))}
          />
          <AmountAction
            label="Unstake partial"
            unit="KUB"
            cta="Unstake"
            danger
            disabled={busy}
            max={node.amount}
            maxLabel="Your stake"
            onSubmit={(v) =>
              confirmExec(buildUnstakePartial(node.id, v), {
                title: "Unstake funds",
                message: `Unstake ${v} KUB from this node? This returns the funds to your wallet.`,
                confirmLabel: `Unstake ${v} KUB`,
                danger: true,
              })
            }
          />
          <SimpleAction
            label="Unstake everything"
            cta="Unstake all"
            danger
            disabled={busy}
            onClick={() =>
              confirmExec(buildUnstake(node.id), {
                title: "Unstake everything",
                message:
                  "Unstake the entire stake of this node? The node will stop validating and all funds return to your wallet.",
                confirmLabel: "Unstake all",
                danger: true,
              })
            }
          />
        </Section>

        <Section title="Rewards">
          <RewardRow
            label="Claimable validator rewards"
            amount={node.reward}
            cta="Claim"
            disabled={busy}
            onClick={() => exec(buildClaimRewards(node.id))}
          />
          {node.isPool && (
            <>
              <RewardRow
                label="Claimable commission rewards"
                amount={node.validatorCommissionAmount}
                cta="Claim"
                disabled={busy}
                onClick={() => exec(buildClaimCommission(node.id))}
              />
              <RewardRow
                label="Delegators reward (to distribute)"
                amount={node.delegatorsReward}
                cta="Withdraw"
                disabled={busy}
                onClick={() => exec(buildWithdrawDelegatorsReward(node.id))}
              />
            </>
          )}
        </Section>

        <Section title="Settings">
          {node.isPool && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="w-36 text-sm text-ink-soft">
                Commission rate
                <InfoHint label="The % of delegators' staking rewards this pool keeps as a fee." />
              </span>
              <div className="relative flex-1">
                <input
                  inputMode="decimal"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder={bpsToPercent(node.commissionRate)}
                  className={`${inputClass} pl-3 pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">%</span>
              </div>
              <Button
                variant="secondary"
                disabled={busy || !(Number(commission) >= 0 && commission !== "")}
                onClick={() => exec(buildUpdateCommission(node.id, Number(commission)))}
              >
                Update
              </Button>
            </div>
          )}
          {node.isPool && (
            <AmountAction
              label="Min delegated"
              labelHint="The smallest delegation amount this pool will accept from a delegator."
              unit="KUB"
              cta="Update"
              disabled={busy}
              onSubmit={(v) => exec(buildUpdateMinDelegated(node.id, v))}
            />
          )}
          <SimpleAction
            label={node.isPool ? "Disable delegation (→ Solo)" : "Enable delegation (→ Pool)"}
            cta={node.isPool ? "Disable" : "Enable"}
            disabled={busy}
            onClick={() =>
              confirmExec(buildToggleDelegation(node.id, !node.isPool), {
                title: node.isPool ? "Disable delegation" : "Enable delegation",
                message: node.isPool
                  ? "Turn this Pool node into a Solo node? It will stop accepting new delegations."
                  : "Turn this Solo node into a Pool node? It will start accepting delegations.",
                confirmLabel: node.isPool ? "Disable" : "Enable",
              })
            }
          />
          {node.statusCode !== 1 && (
            <SimpleAction
              label="Activate node"
              cta="Activate"
              disabled={busy}
              onClick={() => exec(buildActivate(node.id))}
            />
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending?.title ?? ""}
        message={pending?.message}
        confirmLabel={pending?.confirmLabel}
        danger={pending?.danger}
        onConfirm={onConfirm}
        onCancel={() => setPending(null)}
      />

      <TxStatusModal status={tx.status} hash={tx.hash} error={tx.error} onClose={tx.reset} />
    </>
  );
}
