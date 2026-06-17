"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAccount } from "wagmi";

interface WalletAuthValue {
  /**
   * True only once the *currently active* account has signed the verification
   * message in this session. Held in memory (never persisted), so a page
   * refresh always drops it and forces a fresh connect + signature.
   */
  isVerified: boolean;
  /** Record a signature for `address`, unlocking the wallet-gated UI. */
  markVerified: (address: `0x${string}`) => void;
  /** Forget the signature (called on disconnect). */
  reset: () => void;
}

const WalletAuthContext = createContext<WalletAuthValue | null>(null);

export function WalletAuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [verifiedAddress, setVerifiedAddress] = useState<`0x${string}` | null>(
    null,
  );

  // Drop verification whenever the wallet disconnects or the active account
  // changes in the wallet — the new account hasn't proven ownership yet and
  // must sign again before the stake manager unlocks.
  useEffect(() => {
    if (!isConnected) {
      setVerifiedAddress(null);
    } else if (verifiedAddress && address && address !== verifiedAddress) {
      setVerifiedAddress(null);
    }
  }, [isConnected, address, verifiedAddress]);

  const markVerified = useCallback(
    (addr: `0x${string}`) => setVerifiedAddress(addr),
    [],
  );
  const reset = useCallback(() => setVerifiedAddress(null), []);

  const isVerified =
    isConnected && !!address && address === verifiedAddress;

  return (
    <WalletAuthContext.Provider value={{ isVerified, markVerified, reset }}>
      {children}
    </WalletAuthContext.Provider>
  );
}

export function useWalletAuth() {
  const ctx = useContext(WalletAuthContext);
  if (!ctx) {
    throw new Error("useWalletAuth must be used within a WalletAuthProvider");
  }
  return ctx;
}
