import { createPublicClient, http, defineChain } from "viem";

/**
 * KUB Chain (Bitkub Chain) mainnet — chainId 96.
 * Multicall3 is deployed at the canonical address (verified on-chain).
 */
export const kubChain = defineChain({
  id: 96,
  name: "KUB Chain",
  nativeCurrency: { name: "KUB Coin", symbol: "KUB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.KUB_RPC_URL ?? "https://rpc.bitkubchain.io"],
    },
  },
  blockExplorers: {
    default: { name: "KUB Scan", url: "https://www.kubscan.com" },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

export const publicClient = createPublicClient({
  chain: kubChain,
  transport: http(undefined, { batch: true }),
});

export const EXPLORER_URL = kubChain.blockExplorers.default.url;
