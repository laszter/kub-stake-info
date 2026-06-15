# KUB Node Info

A read-only explorer for **validators / nodes on the KUB Chain**. It reads live
data from the `StakeManagerStorageV2` smart contract
([`0xFd98…4c0d`](https://www.kubscan.com/address/0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d))
and presents it with a UI modelled on [staking.kubchain.com](https://staking.kubchain.com/).

- **Overview** — network stats (total validators, total stake, total rewards),
  a **Pool Node** card grid, and a **Solo Node** table with search, sort,
  grid/list toggle and pagination.
- **Node detail** (`/nodes/[address]`) — every field exposed by the contract for
  a validator: self stake, delegated amount, rewards, commission rates &
  accrued amounts, signer, share contract, status.

## Stack

- **Next.js 16** (App Router, RSC, ISR) · **React 19** · **Tailwind CSS v4**
- **viem** for type-safe contract reads, batched through **Multicall3**
- Data is read server-side and revalidated every 60s (`export const revalidate = 60`)

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

| Env var | Default | Purpose |
|---|---|---|
| `KUB_RPC_URL` | `https://rpc.bitkubchain.io` | KUB Chain (chainId 96) RPC endpoint |

Copy `.env.example` to `.env.local` to override.

## How the data maps to the contract

| UI | Source | Notes |
|---|---|---|
| Total Stake | `totalStaked()` | ÷ 1e18 |
| Total Rewards Distributed | `totalRewards() + totalRewardsLiquidated()` | |
| Total Validators | unique `Active` validators with stake > 0 | `getAllValidator()` contains duplicate addresses → deduped |
| Per-validator data | `getValidatorInfo(address)` | full struct in one call |
| Pool vs Solo | `validatorShareContract != 0x0` | Pool has a share contract |
| Service Fee | `commissionRate` | basis points → % |

Validator **names & logos are not on-chain**; they come from a small off-chain
registry at `src/data/validators.json` (with an address fallback).

## Project layout

```
src/
  app/            # routes: / (overview), /nodes/[address], loading, error, not-found
  components/     # layout/, stats/, nodes/, ui/
  lib/            # chain.ts (viem), contract.ts (abi), staking.ts (reads), format.ts, view.ts
  data/           # abi.json, validators.json
```

See [`TASKS.md`](./TASKS.md) for the full design/spec and the build plan.

---

> Unofficial explorer · not affiliated with the KUB Foundation.
