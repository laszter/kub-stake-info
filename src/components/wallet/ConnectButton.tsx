"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { shortenAddress } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { useWalletAuth } from "@/providers/WalletAuthProvider";

/**
 * The wallet picks the account; this message proves the user actually controls
 * it. Signing is free and moves no funds — it just confirms the *right* wallet
 * is connected before any of the stake-manager UI is shown.
 */
function verifyMessage(address: string) {
  return [
    "Welcome to KUB Node Info!",
    "",
    "Sign to confirm you control this wallet:",
    address,
    "",
    "This is free, submits no transaction and moves no funds.",
  ].join("\n");
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { isVerified, markVerified, reset } = useWalletAuth();

  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setMounted(true), []);

  const connector =
    connectors.find((c) => c.id === "injected") ?? connectors[0];

  function teardown() {
    reset();
    disconnect();
  }

  async function connectAndVerify() {
    setError(undefined);
    setBusy(true);
    try {
      // 1. Let the user choose the wallet/account (skip if a different account
      //    is already connected but unverified — only the signature is needed).
      const account =
        isConnected && address
          ? address
          : ((await connectAsync({ connector })).accounts[0] as `0x${string}`);

      // 2. Require a fresh signature every time to confirm the chosen wallet.
      await signMessageAsync({ message: verifyMessage(account) });
      markVerified(account);
    } catch (e) {
      // Cancelled the picker or rejected the signature — tear the session back
      // down so nothing is left half-connected and the next click starts clean.
      teardown();
      setError(e instanceof Error ? e.message : "Connection cancelled");
    } finally {
      setBusy(false);
    }
  }

  // Avoid hydration mismatch — wallet state is only known on the client.
  if (!mounted) {
    return <div className="h-9 w-[120px]" aria-hidden />;
  }

  if (isConnected && address && isVerified) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full bg-surface px-3 py-1.5 font-mono text-sm text-ink">
          {shortenAddress(address)}
        </span>
        {/* On mobile the Disconnect action moves into the menu to avoid a
            three-control crush in the top bar; show it inline from sm up. */}
        <Button
          variant="neutral"
          onClick={teardown}
          className="hidden sm:inline-flex"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={connectAndVerify} disabled={busy} title={error}>
      {busy ? "Check wallet…" : "Connect Wallet"}
    </Button>
  );
}
