"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortenAddress } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const connector =
    connectors.find((c) => c.id === "injected") ?? connectors[0];

  // Avoid hydration mismatch — wallet state is only known on the client.
  if (!mounted) {
    return <div className="h-9 w-[120px]" aria-hidden />;
  }

  if (isConnected && address) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-surface px-3 py-1.5 font-mono text-sm text-ink">
          {shortenAddress(address)}
        </span>
        {/* On mobile the Disconnect action moves into the menu to avoid a
            three-control crush in the top bar; show it inline from sm up. */}
        <Button
          variant="neutral"
          onClick={() => disconnect()}
          className="hidden sm:inline-flex"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => connect({ connector })}
      disabled={isPending}
      title={error?.message}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </Button>
  );
}
