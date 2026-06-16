"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { kubChain } from "@/lib/chain";
import { Button } from "@/components/ui/Button";

/** Renders children only when connected to KUB Chain; otherwise prompts a switch. */
export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (isConnected && chainId !== kubChain.id) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="font-medium text-amber-800">Wrong network</p>
        <p className="mt-1 text-sm text-amber-700">
          Stake Manager works on KUB Chain (chainId {kubChain.id}). Please switch
          networks.
        </p>
        <Button
          size="md"
          onClick={() => switchChain({ chainId: kubChain.id })}
          disabled={isPending}
          className="mt-4"
        >
          {isPending ? "Switching…" : "Switch to KUB Chain"}
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
