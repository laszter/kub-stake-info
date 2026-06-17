# KUB Node Info

An explorer for **validators / nodes on the KUB Chain** (Bitkub Chain, chainId 96),
with an optional wallet-connected **Stake Manager**. Read-only pages pull live data
from the `StakeManagerStorageV2` smart contract
([`0xFd98…4c0d`](https://www.kubscan.com/address/0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d))
and present it with a UI modelled on [staking.kubchain.com](https://staking.kubchain.com/).

- **Overview** (`/`) — network stats (total validators, total stake, total rewards),
  a **Pool Node** card grid, and a **Solo Node** table with search, sort,
  grid/list toggle and pagination.
- **Node detail** (`/nodes/[address]`) — every field exposed by the contract for
  a validator: self stake, delegated amount, rewards, commission rates &
  accrued amounts, signer, share contract, status.
- **Stake Manager** (`/stake-manager`) — connect a wallet to manage the validator
  nodes **you own** (discovered via the StakingNFT contract, where each `tokenId`
  is a validatorId). Stake, restake, unstake, unstake-partial, claim rewards,
  claim commission, withdraw delegators' reward, activate, **bulk-claim** across
  nodes, and update commission / min-delegated / delegation. Writes go to
  `StakeManagerV2`
  ([`0x4435…A80F`](https://www.kubscan.com/address/0x443502b3F7C0934576F49CDa084f78640f56A80F));
  every action is simulated before signing.
- **About & FAQ** (`/about`) — what the explorer is, how validators / pool vs solo
  nodes / staking power / commission / rewards work, which contracts the data
  comes from, plus a staking glossary.
- **Dark mode** — light / dark / system theme with no flash on first paint
  (see [Theming](#theming)).

## Stack

- **Next.js 16** (App Router, RSC, ISR) · **React 19** (with the React Compiler) · **Tailwind CSS v4**
- **viem** for type-safe contract reads, batched through **Multicall3**
- **wagmi** + **@tanstack/react-query** for wallet connection and write transactions (Stake Manager)
- Read-only pages are rendered server-side and revalidated every 60s (`export const revalidate = 60`); Stake Manager reads/writes happen client-side via the connected wallet
- SEO/AEO baked in: `sitemap.xml`, `robots.txt`, PWA `manifest`, per-route OpenGraph images, JSON-LD structured data and an `llms.txt` endpoint

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

### Configuration

Copy `.env.example` to `.env.local` to override any of these (all optional in dev):

| Env var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public base URL — drives `metadataBase`, canonical URLs, sitemap, robots, OG images and JSON-LD. **Set this in production.** |
| `KUB_RPC_URL` | `https://rpc.bitkubchain.io` | Server-side RPC (Overview / Node detail reads) for KUB Chain (chainId 96) |
| `NEXT_PUBLIC_KUB_RPC_URL` | `https://rpc.bitkubchain.io` | Client-side RPC for Stake Manager reads + wallet writes (must be `NEXT_PUBLIC_`) |

## How the data maps to the contract

| UI | Source | Notes |
|---|---|---|
| Total Stake | `totalStaked()` | ÷ 1e18 |
| Total Rewards Distributed | `totalRewards() + totalRewardsLiquidated()` | |
| Total Validators | unique `Active` validators with stake > 0 | `getAllValidator()` contains duplicate addresses → deduped |
| Per-validator data | `getValidatorInfo(address)` | full struct in one multicall |
| Pool vs Solo | `validatorShareContract != 0x0` | Pool has a share contract |
| Service Fee | `commissionRate` | basis points → % |
| "My nodes" (Stake Manager) | StakingNFT balance / `tokenId` | each owned `tokenId` == a validatorId |

Validator **names & logos are not on-chain**; they come from a small off-chain
registry at `src/data/validators.json` (with an address fallback).

## Contracts

| Contract | Address | Role |
|---|---|---|
| `StakeManagerStorageV2` | `0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d` | On-chain storage — source of all validator **reads** |
| `StakeManagerV2` | `0x443502b3F7C0934576F49CDa084f78640f56A80F` | Logic contract — target of all **write** actions |
| `StakingNFT` | `0x8ae4cb6a020121bcbd855fffc79a11984be62b39` | Each node is an NFT (`tokenId` == validatorId) — used to find "my nodes" |
| `Multicall3` | `0xcA11bde05977b3631167028862bE2a173976CA11` | Batches reads into one round-trip |

## Theming

Class-based dark mode lives in `src/app/globals.css`. Semantic colour tokens are
defined in `@theme` (light) and overridden under `.dark`, so utilities like
`bg-card` / `text-ink` / `border-line` flip automatically when `<html>` gets the
`dark` class — prefer these tokens over raw colours. State + persistence live in
`src/providers/ThemeProvider.tsx` (`light | dark | system`, stored under
`localStorage.theme`); the toggle UI is `src/components/ui/ThemeToggle.tsx`. A
no-FOUC inline script in `layout.tsx` applies the class before first paint — keep
its logic and storage key in sync with the provider. See [`AGENTS.md`](./AGENTS.md)
for the full theming contract.

## Project layout

```
src/
  app/         # routes: / (overview), /nodes/[address], /stake-manager, /about
               #   + SEO: sitemap.ts, robots.ts, manifest.ts, llms.txt/, opengraph-image.tsx
               #   + loading / error / not-found
  components/  # layout/, stats/, nodes/, stake-manager/, wallet/, seo/, ui/
  hooks/       # useMyNodes, useTx, useBulkClaim
  providers/   # ThemeProvider, Web3Provider, WalletAuthProvider
  content/     # about.ts (FAQ + glossary copy)
  lib/         # chain.ts (viem), contract.ts (addresses + abi), staking.ts (reads),
               #   nodeActions.ts (write builders), wagmi.ts, format.ts, view.ts, site.ts
               #   abi/ (stakeManagerV2.json, stakingNft.json)
  data/        # abi.json (storage), validators.json (off-chain name/logo registry)
```

---

> Unofficial explorer · not affiliated with the KUB Foundation.
