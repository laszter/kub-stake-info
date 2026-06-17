"use client";

import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { WalletAuthProvider } from "@/providers/WalletAuthProvider";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } },
      }),
  );

  return (
    // `reconnectOnMount={false}`: never silently re-attach to whatever account
    // the wallet still authorises. The user must explicitly connect (and sign)
    // every visit, so they always confirm *which* wallet — important when one
    // browser holds several.
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <WalletAuthProvider>{children}</WalletAuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
