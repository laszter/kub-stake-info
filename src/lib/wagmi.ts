import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { kubChain } from "./chain";

/**
 * wagmi config for KUB Chain (96). Injected (MetaMask / browser wallet) only in v1.
 * `ssr: true` so the App Router can render without a wallet present.
 */
export const wagmiConfig = createConfig({
  chains: [kubChain],
  connectors: [injected()],
  transports: {
    [kubChain.id]: http(process.env.NEXT_PUBLIC_KUB_RPC_URL),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
