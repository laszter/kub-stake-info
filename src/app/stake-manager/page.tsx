import type { Metadata } from "next";
import { StakeManagerClient } from "@/components/stake-manager/StakeManagerClient";

export const metadata: Metadata = {
  title: "Stake Manager",
  description:
    "Connect your wallet to manage your own KUB Chain validator nodes — stake, restake, unstake, claim rewards and update settings.",
};

export default function StakeManagerPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Stake Manager</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Manage the validator nodes you own on KUB Chain.
        </p>
      </div>
      <StakeManagerClient />
    </div>
  );
}
