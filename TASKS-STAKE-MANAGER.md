# Stake Manager — แผนงานหลัก (Core Working Document)

> ฟีเจอร์ใหม่: เพิ่มเมนู **Stake Manager** ให้ผู้ใช้ "จัดการ node ของตัวเอง" บน KUB Chain ได้
> — stake (สร้าง node), restake (เพิ่ม stake), unstake / **unstakePartial** (ถอนบางส่วน),
> claim rewards และแก้ค่าต่าง ๆ ของ node — โดยเชื่อม **wallet** และเขียน transaction จริง
> อ้างอิง contract `StakeManagerV2` ([`0x4435…A80F`](https://www.kubscan.com/address/0x443502b3F7C0934576F49CDa084f78640f56A80F))
>
> เอกสารนี้ต่อยอดจากแอปเดิม (ดู [`TASKS.md`](./TASKS.md)) ซึ่งเป็นแอป **read-only** อยู่แล้ว
> ทำงานทีละ Phase และติ๊ก checkbox ตามลำดับ

---

## ✅ สถานะ: สร้างเสร็จแล้ว (Phase 0–8 ครบ)

เปิด `http://localhost:3000/stake-manager` หลัง `npm run dev`

| ส่วน | สถานะ | ไฟล์ |
|---|---|---|
| Wallet layer (wagmi + react-query) | ✅ | `lib/wagmi.ts`, `providers/Web3Provider.tsx` |
| Connect / Network guard | ✅ | `components/wallet/ConnectButton.tsx`, `NetworkGuard.tsx` |
| เมนู Stake Manager + ปุ่ม Connect ใน Header | ✅ | `components/layout/Header.tsx` |
| อ่าน "My Nodes" จาก NFT + storage | ✅ | `hooks/useMyNodes.ts` |
| Write actions (stake/restake/unstake/unstakePartial/claim/update…) | ✅ | `lib/nodeActions.ts`, `hooks/useTx.ts` |
| UI: list + manage panel + stake form + tx modal | ✅ | `components/stake-manager/*` |
| `npm run build` | ✅ ผ่าน | route `/stake-manager` |
| Playwright (mock wallet → อ่าน node จริง) | ✅ 0 error | เห็น KUB node ID 0 จริง |

> ✅ **ยืนยัน on-chain แล้ว:** `validatorId == storage index`, NFT `tokenOfOwnerAll` คืน node ที่ถือ, simulate ก่อน write ทุก action
> ⏳ **เหลือ:** การ **เซ็น tx จริง** ต้องทำโดยผู้ใช้ (wallet ที่มี KUB) — เป็น write บน mainnet จึงไม่เซ็นแบบ headless; โค้ดพร้อมแล้ว

---

## 0. เป้าหมาย (Goal)

เพิ่มหน้า/เมนู **Stake Manager** ที่:

1. ให้ผู้ใช้ **connect wallet** (MetaMask / injected EOA wallet) บน KUB Chain (chainId 96)
2. แสดง **node ที่ wallet นี้เป็นเจ้าของ** (เป็น staker) — ดึงจาก validator NFT
3. ทำ action จัดการ node ของตัวเองได้ (write transaction):
   - **Stake** — สร้าง/เปิด validator node ใหม่ (วาง stake)
   - **Restake** — เพิ่ม stake เข้า node เดิม
   - **Unstake** — ถอน stake ทั้งหมด
   - **Unstake Partial** — ถอน stake บางส่วน
   - **Claim Rewards / Claim Commission Rewards** — เคลม reward
   - **Update** ค่าต่าง ๆ: commission rate, min delegated, เปิด/ปิดรับ delegation, activate
4. แสดงสถานะ transaction (pending → success/fail) อย่างปลอดภัยและชัดเจน

> ⚠️ **สำคัญ: นี่คือการเขียน transaction บน mainnet ด้วย KUB จริง** — ต้องเน้นความปลอดภัย, การยืนยันก่อนส่ง, validate input, และทดสอบบน testnet ก่อน (ดู §6, §7)

**ขอบเขตที่ยังไม่ทำใน v1 (Out of scope):**
- โหมด **Bitkub Next** (custodial wallet ผ่าน `callHelper`/`transferRouter` + meta-tx) — contract มี variant `(…, address bitkubNext_)` ไว้รองรับ แต่ v1 ใช้เฉพาะ EOA wallet ปกติ
- การ delegate ให้ node คนอื่น (เป็นมุมของ delegator ไม่ใช่เจ้าของ node) — โฟกัส "node ของตัวเอง" ตามโจทย์
- admin/committee functions (`slash`, `setCommittee`, `distributeReward`, `transferFunds` ฯลฯ) — เป็นสิทธิ์ระบบ ไม่ใช่ของ user

---

## 1. แหล่งข้อมูล — Contracts (✅ ตรวจสอบกับ chain จริงแล้ว)

| Contract | Address | บทบาท |
|---|---|---|
| **StakeManagerV2** | `0x443502b3F7C0934576F49CDa084f78640f56A80F` | **logic** — ปลายทางของ write actions ทั้งหมด (stake/restake/unstake/claim/update) |
| StakeManagerStorageV2 | `0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d` | **storage** — อ่านข้อมูล validator (struct) เหมือนแอปเดิม |
| StakingNFT | `0x8ae4cb6a020121bcbd855fffc79a11984be62b39` | **ownership** — แต่ละ node = NFT 1 ใบ, tokenId = validatorId |
| KKUB (wrapped KUB) | `0x67ebd850304c70d983b2d1b93ea79c7cd6c3f6b5` | wrapped KUB (ใช้ในบาง flow / bitkubNext) |
| StakeManagerVault | `0xcf726f7fe91d0f2373904d350b926830784e810c` | เก็บเงิน stake |

- `StakeManagerV2` **verified**, ไม่ใช่ proxy, Solidity `v0.8.17`
- ยืนยันแล้วว่า `StakeManagerV2.stakeManagerStorage()` = `0xFd98…4c0d` (storage ตัวเดียวกับแอปเดิม) → ใช้ data layer เดิมต่อยอดได้
- ABI เต็มเก็บที่ `research/sm2-abi.json` (71 entries: 33 write, 18 read, 18 events)

### 1.1 Write functions ที่จะใช้ (action ของเจ้าของ node)

> หลายฟังก์ชันมี **2 overloads**: เวอร์ชันปกติ (EOA) และเวอร์ชัน `(…, address bitkubNext_)` (custodial)
> **v1 ใช้เวอร์ชันปกติ/`payable`** เท่านั้น — `msg.sender` = staker

| Action (UI) | Function | หมายเหตุ |
|---|---|---|
| **Stake** (สร้าง node) | `stake(address signer_, bool delegation_)` **payable** | ส่ง KUB เป็น `msg.value`; `signer_` = signer ของ node, `delegation_` = รับ delegation (Pool) หรือไม่ (Solo) |
| **Restake** (เพิ่ม stake) | `restake(uint256 validatorId_)` **payable** | ส่ง KUB เพิ่มเป็น `msg.value` |
| **Unstake** (ถอนหมด) | `unstake(uint256 validatorId_)` | |
| **Unstake Partial** | `unstakePartial(uint256 validatorId_, uint256 amount_)` | `amount_` เป็น wei; มี `onlyStaker` |
| **Claim Rewards** | `claimRewards(uint256 validatorId_)` | reward ของ validator |
| **Claim Commission** | `claimCommissionRewards(uint256 validatorId_)` | |
| **Withdraw Delegators Reward** | `withdrawDelegatorsReward(uint256 validatorId_)` → uint256 | |
| **Activate node** | `activate(uint256 _valId)` | เปิดใช้งาน node |
| **Update Commission Rate** | `updateCommissionRate(uint256 validatorId_, uint256 newCommissionRate_)` | rate = basis points (≤ `MAX_COMMISSION_RATE`) |
| **Update Min Delegated** | `updateMinDelegated(uint256 validatorId_, uint256 newMinDelegated_)` | wei |
| **Toggle Delegation** | `updateValidatorDelegation(uint256 validatorId_, bool delegation_)` | เปิด/ปิดรับ delegation |

> ⚠️ มี modifier `onlyStaker(validatorId_, msg.sender)` — **เฉพาะเจ้าของ NFT (staker) เท่านั้น** ที่เรียกได้
> ⚠️ `updateInfraCommissionRate` เป็นสิทธิ์ระบบ (ไม่ใส่ใน UI ของ user)

### 1.2 Read functions ที่จะใช้

**StakeManagerV2:**
- `getValidatorId(address signer_) → uint256` — แปลง signer → validatorId
- `getValidators() → address[]` — รายการ signer ทั้งหมด
- `getMinimalValidators() / getMinimalValidatorsByPage(...)` — active set
- `MAX_COMMISSION_RATE()`, `MAX_INFRA_COMMISSION_RATE()`, `MAX_RATE()` — เพดาน rate (validate input)

**StakingNFT** (หา "node ของฉัน"):
- `tokenOfOwnerAll(address _owner) → uint256[]` — ✅ **คืน validatorId ทั้งหมดที่ wallet ถือ** (ใช้ตัวนี้เป็นหลัก)
- `balanceOf(address)`, `ownerOf(uint256)`, `tokenOfOwnerByPage(owner, page, limit)` — สำรอง/ตรวจสิทธิ์

**StakeManagerStorageV2** (ดึง state ของ node — reuse จากแอปเดิม):
- `getValidatorInfoByIndex(uint256 index_) → Validator` — ข้อมูล struct ตาม validatorId *(ต้องยืนยัน mapping `validatorId == index` ตอน implement; สำรอง: `getValidatorInfo(signer)`)*
- `minimumPoolStake()`, `minimumSoloStake()`, `minimumPoolDelegate()` — ขั้นต่ำ (validate ตอน stake/restake)

### 1.3 Events (ใช้ confirm ผล / แสดง toast)
`ValidatorStaked`, `ValidatorRestaked`, `ValidatorUnstaked`, `ClaimRewards`,
`CommissionRateUpdated`, `MinDelegatedUpdated`, `DelegationUpdated`

### 1.4 หน่วย & กฎที่ต้องระวัง
- จำนวน KUB ที่กรอก (เช่น "1000") → `parseEther` เป็น wei ก่อนส่ง (`msg.value` หรือ `amount_`)
- Commission rate กรอกเป็น % (เช่น 5) → ×100 = basis points (500) ก่อนส่ง; ห้ามเกิน `MAX_COMMISSION_RATE`
- ต้องเช็ค **ขั้นต่ำ**: stake/restake ≥ `minimumPoolStake`/`minimumSoloStake`
- ต้องเช็ค connected wallet เป็นเจ้าของ validatorId นั้นจริง (`ownerOf == address` หรืออยู่ใน `tokenOfOwnerAll`)
- ต้องอยู่บน **chainId 96** — ถ้าผิด chain ให้ปุ่ม "Switch network"

---

## 2. UI / เมนู Stake Manager

### 2.1 จุดเข้า (Navigation)
- เพิ่มเมนู **"Stake Manager"** ใน `Header` (nav) → route `/stake-manager`
- เพิ่มปุ่ม **Connect Wallet** (pill เขียว) ที่ header — เมื่อ connect แล้วแสดง address ย่อ + ปุ่ม disconnect
  *(แทนปุ่ม "View Contract" เดิม หรือวางคู่กัน)*

### 2.2 หน้า `/stake-manager` (ตาม state ของ wallet)
1. **ยังไม่ connect** → การ์ดเชิญ connect wallet + อธิบายสั้น ๆ ว่าทำอะไรได้
2. **connect แล้วแต่ผิด chain** → ปุ่ม "Switch to KUB Chain"
3. **connect + ถูก chain:**
   - ส่วน **"My Nodes"** — list การ์ด validator ที่ wallet ถือ (จาก `tokenOfOwnerAll`)
     - แต่ละการ์ด: ชื่อ/โลโก้ (จาก registry เดิม), validatorId, total stake, status, commission, ปุ่มขยายดู action
   - ปุ่ม **"+ Stake new node"** → เปิดฟอร์ม stake
4. **เลือก node 1 ตัว → panel จัดการ** มี action ตาม §1.1 (แต่ละอันเป็นปุ่ม/ฟอร์มเล็ก):
   - Restake (กรอกจำนวน KUB)
   - Unstake (ทั้งหมด) / Unstake Partial (กรอกจำนวน)
   - Claim Rewards / Claim Commission / Withdraw Delegators Reward
   - Update Commission Rate / Update Min Delegated / Toggle Delegation
   - Activate (ถ้า status ยังไม่ active)

### 2.3 รูปแบบฟอร์ม & การยืนยัน (UX ความปลอดภัย)
- ทุก action ที่ใช้เงิน → **modal ยืนยัน** สรุป: action, node, จำนวน (KUB), ค่าที่จะเปลี่ยน, ประมาณ gas
- ปุ่ม disabled จนกว่า input valid (จำนวน > 0, ≥ ขั้นต่ำ, ≤ balance สำหรับ stake)
- แสดง wallet balance + ตรวจว่าพอจ่าย
- หลังส่ง: สถานะ **Pending** (รอ tx hash) → **Confirming** (รอ receipt) → **Success** (ลิงก์ไป kubscan tx) / **Failed** (ข้อความ error อ่านง่าย)
- หลัง success → refresh state ของ node อัตโนมัติ

### 2.4 Design
- ใช้ design system เดิม (สี `#0EB366`, Roboto, การ์ดมุมมน, ปุ่ม pill) — กลมกลืนกับแอปเดิม

---

## 3. Architecture & Tech

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Wallet / write layer | **wagmi v2 + viem** | มาตรฐาน React, รองรับ connectors, จัดการ tx state, รองรับ overloaded fn |
| Connectors | `injected()` (MetaMask ฯลฯ) v1; *(WalletConnect = optional)* | ครอบคลุม EOA wallet ทั่วไป |
| State/query | `@tanstack/react-query` (มากับ wagmi) | cache reads ฝั่ง client |
| Chain | KUB chainId 96 (reuse `lib/chain.ts`) | เดียวกับแอปเดิม |
| Read (เดิม) | viem public client ฝั่ง server ยังใช้ได้สำหรับหน้า read-only เดิม | ไม่กระทบ |

> ### ⚠️ ต้องอ่าน docs ก่อนเขียน
> - **Next.js 16** breaking changes (ดู `node_modules/next/dist/docs/`) — โดยเฉพาะการทำ **Client Provider** ครอบ wagmi/react-query ใน App Router (`'use client'` provider + วางใน `layout.tsx`)
> - **wagmi v2 + viem v2** API (เราใช้ viem 2.x อยู่แล้ว) — `useAccount`, `useConnect`, `useSwitchChain`, `useWriteContract`, `useWaitForTransactionReceipt`, `useReadContract(s)`
> - **Overloaded functions**: เวลาเรียก `stake`/`restake`/`unstake` ฯลฯ ที่มีหลาย overload ต้องระบุ signature/ABI item ให้ตรงตัว (เช่นใช้ ABI ที่ filter เฉพาะ overload ที่ต้องการ หรือระบุ `args` ให้ครบจน viem เลือกถูก)

### 3.1 โครงไฟล์ที่จะเพิ่ม
```
src/
  app/
    stake-manager/page.tsx        # หน้า Stake Manager (client)
  providers/
    Web3Provider.tsx              # 'use client' — WagmiProvider + QueryClientProvider
  lib/
    wagmi.ts                      # wagmi config (KUB chain, connectors, transport)
    contracts.ts                  # เพิ่ม address + abi ของ StakeManagerV2, StakingNFT, KKUB
    abi/
      stakeManagerV2.json
      stakingNft.json
    actions.ts                    # helper เรียก write functions (เลือก overload, parseEther, validate)
  components/
    wallet/
      ConnectButton.tsx           # connect/disconnect + แสดง address/chain
      NetworkGuard.tsx            # เช็ค chainId + ปุ่ม switch
    stake-manager/
      MyNodesList.tsx             # ดึง tokenOfOwnerAll → การ์ด node
      NodeManagePanel.tsx         # panel action ของ node ที่เลือก
      StakeForm.tsx               # ฟอร์มสร้าง node ใหม่
      ActionForm.tsx              # ฟอร์มกรอกจำนวน + ปุ่ม submit (reuse)
      TxStatusModal.tsx           # pending/confirming/success/fail
  data/abi.json (เดิม)            # ABI ของ StakeManagerStorageV2 (มีแล้ว)
```

---

## 4. แผนงานแบ่งเป็น Phase (ทำตามลำดับ)

### Phase 0 — เตรียมความพร้อม & docs
- [x] อ่าน docs: Next.js 16 client provider pattern + wagmi v2 quickstart + viem write/overloads
- [x] `npm i wagmi @tanstack/react-query` (viem มีแล้ว)
- [x] คัดลอก ABI: `research/sm2-abi.json` → `src/lib/abi/stakeManagerV2.json`; ดึง/คัดลอก `StakingNFT` ABI → `src/lib/abi/stakingNft.json`
- [x] เพิ่ม address + abi ใหม่ใน `src/lib/contracts.ts` (StakeManagerV2, StakingNFT, KKUB)

### Phase 1 — Wallet infrastructure
- [x] `lib/wagmi.ts` — config: KUB chain (96), `injected()` connector, `http(rpc)` transport, SSR safe
- [x] `providers/Web3Provider.tsx` (`'use client'`) — `WagmiProvider` + `QueryClientProvider`
- [x] ครอบ provider ใน `app/layout.tsx` (วางให้ครอบเฉพาะ tree ที่ต้องใช้ หรือทั้งแอปก็ได้)
- [x] `components/wallet/ConnectButton.tsx` — connect / disconnect / แสดง address ย่อ
- [x] `components/wallet/NetworkGuard.tsx` — ตรวจ chainId 96, ปุ่ม `switchChain`
- [x] ใส่ `ConnectButton` ใน `Header` + เพิ่มเมนู "Stake Manager"

### Phase 2 — อ่านข้อมูล "My Nodes"
- [x] hook `useMyValidatorIds()` — `StakingNFT.tokenOfOwnerAll(address)` → `bigint[]`
- [x] hook `useNodeInfo(validatorId)` — อ่าน struct จาก StakeManagerStorageV2 (`getValidatorInfoByIndex`) + map signer/registry
- [x] `MyNodesList.tsx` — แสดงการ์ด node ที่ถือ (empty state ถ้าไม่มี node)
- [x] ยืนยัน mapping `validatorId ↔ index` ด้วยข้อมูลจริง (เทียบกับ `getValidatorId(signer)`)

### Phase 3 — Write actions (core)
> ทำเป็น helper กลางใน `actions.ts` + ฟอร์มที่ reuse ได้ แล้วต่อ action ทีละตัว
- [x] `useStakeAction` — `stake(signer, delegation)` payable (+ ฟอร์ม StakeForm: signer addr, delegation toggle, จำนวน KUB)
- [x] `useRestakeAction` — `restake(validatorId)` payable (+ ฟอร์มจำนวน)
- [x] `useUnstakeAction` — `unstake(validatorId)`
- [x] `useUnstakePartialAction` — `unstakePartial(validatorId, amount)` (+ ฟอร์มจำนวน)
- [x] เลือก overload ให้ถูก (EOA/payable) ผ่านจำนวน args + `simulateContract` ยืนยัน encode ถูก (จับ revert ก่อนส่ง)

### Phase 4 — Write actions (rewards & settings)
- [x] `claimRewards(validatorId)` / `claimCommissionRewards(validatorId)` / `withdrawDelegatorsReward(validatorId)`
- [x] `updateCommissionRate(validatorId, bps)` (+ validate ≤ MAX, แปลง %→bps)
- [x] `updateMinDelegated(validatorId, wei)`
- [x] `updateValidatorDelegation(validatorId, bool)` (toggle)
- [x] `activate(validatorId)`

### Phase 5 — Transaction UX
- [x] `TxStatusModal` — สถานะ simulating → pending → confirming (`waitForTransactionReceipt`) → success (ลิงก์ kubscan tx) / failed (decode error)
- [x] ยืนยันก่อนส่ง action ที่อันตราย (unstake all / toggle delegation / stake) ผ่าน confirm dialog *(หมายเหตุ: ใช้ `window.confirm`; ยกระดับเป็น styled modal สรุปจำนวน/gas ได้ในเฟสถัดไป)*
- [x] refresh node state อัตโนมัติหลัง success (`refetch` react-query)
- [x] validate ปุ่ม disabled ตาม input + ระหว่าง pending
- [ ] (เพิ่มเติม) แสดง wallet balance + เช็คว่าพอจ่ายก่อนส่ง — *ยังไม่ทำ: ปัจจุบันพึ่ง `simulateContract` จับ insufficient funds*

### Phase 6 — Validation & safety
- [x] เพดาน rate + ขั้นต่ำ stake **บังคับผ่าน `simulateContract`** (revert ถูกจับก่อนเสีย gas) *(ยังไม่ pre-fetch minimum มาโชว์ใน UI — แสดงเป็น hint แทน)*
- [x] เช็คความเป็นเจ้าของ (แสดง/ทำ action เฉพาะ node ที่อยู่ใน `tokenOfOwnerAll` ของ wallet)
- [x] error handling: user rejected, insufficient funds, revert reason, wrong chain (`NetworkGuard` + `prettyError`)
- [x] กันกดซ้ำ (disable ระหว่าง `isBusy`)

### Phase 7 — Testing & Verification
- [x] ใช้ `simulateContract` ก่อนส่งจริงทุก action (จับ revert ล่วงหน้า) — implement ใน `useTx`
- [x] `npm run build` ผ่าน, ไม่มี type error
- [x] Playwright: inject mock EIP-1193 provider (forward → RPC จริง) → connect → เห็น node จริง (KUB, ID 0) + ตรวจ UI states (no-wallet / connected / panel) — 0 console error
- [ ] **ทดสอบ write จริงบน testnet/mainnet** (restake/claim/unstakePartial ด้วยจำนวนเล็ก) — *เป็น action ของผู้ใช้: ต้องใช้ wallet ที่มี KUB จริงเซ็น tx (เซ็น tx จริงแบบ headless ไม่ปลอดภัย); โค้ด simulate+write พร้อมแล้ว*

### Phase 8 — Polish & docs
- [x] Responsive + loading/skeleton ของ My Nodes
- [x] อัปเดต `README.md` + `TASKS.md` (ลิงก์มาที่ไฟล์นี้)
- [ ] (optional, เฟสถัดไป) WalletConnect connector + รองรับ Bitkub Next (callHelper) + styled confirm modal + แสดง balance

---

## 5. Data / Action mapping (สรุปอ้างอิงเร็ว)

| UI action | Contract.fn | ส่งค่า | หน่วย |
|---|---|---|---|
| Stake new | `StakeManagerV2.stake(signer,delegation)` | `value = KUB` | parseEther |
| Restake | `StakeManagerV2.restake(validatorId)` | `value = KUB` | parseEther |
| Unstake | `StakeManagerV2.unstake(validatorId)` | — | — |
| Unstake partial | `StakeManagerV2.unstakePartial(validatorId, amount)` | `amount` | parseEther |
| Claim reward | `StakeManagerV2.claimRewards(validatorId)` | — | — |
| Claim commission | `StakeManagerV2.claimCommissionRewards(validatorId)` | — | — |
| Update commission | `StakeManagerV2.updateCommissionRate(validatorId, bps)` | `% ×100` | bps |
| Update min delegated | `StakeManagerV2.updateMinDelegated(validatorId, wei)` | `KUB` | parseEther |
| Toggle delegation | `StakeManagerV2.updateValidatorDelegation(validatorId, bool)` | bool | — |
| Activate | `StakeManagerV2.activate(validatorId)` | — | — |
| List my nodes | `StakingNFT.tokenOfOwnerAll(myAddr)` → ids | — | — |
| Node state | `StakeManagerStorageV2.getValidatorInfoByIndex(id)` | — | — |

---

## 6. คำถาม/สิ่งที่ต้องตัดสินใจก่อน implement (Open Questions)

1. **`validatorId` == `index` ใน storage จริงไหม?** — ต้องยืนยันว่า `getValidatorInfoByIndex(validatorId)` คืน node ที่ถูกต้อง (เทียบ `getValidatorId(signer)` กับ NFT tokenId) ก่อนผูก UI
2. **ทดสอบบน testnet ได้ไหม?** — ต้องหา address `StakeManagerV2`/`StakingNFT` บน KUB testnet (25925); ถ้าไม่มี ต้องวางแผนทดสอบแบบ simulate-only ก่อนยิง mainnet ด้วยจำนวนเล็ก
3. **`stake` ต้องมีเงื่อนไขอะไรก่อน?** (เช่น signer ต้องไม่ซ้ำ, ต้องมี NFT/ลงทะเบียนก่อน, ขั้นต่ำเท่าไร) — ตรวจ require ใน source `research/sm2-full.json`
4. **`activate` ใช้ตอนไหน** — หลัง stake ต้อง activate เองไหม หรือ auto? (ดู flow ใน source)
5. **รองรับ Bitkub Next ไหมใน v1?** — ค่าเริ่มต้น: **ไม่** (ใช้ EOA อย่างเดียว). ถ้าต้องการ ค่อยเพิ่ม variant `bitkubNext_` + callHelper เฟสถัดไป
6. **WalletConnect** — เพิ่มไหม หรือ injected พอสำหรับ v1?

> วิธีหาคำตอบ §6 ข้อ 1,3,4: อ่าน source `research/sm2-full.json` (มี natspec + require) และ `simulateContract` กับ node จริงบน mainnet (read-only ปลอดภัย)

---

## 7. หลักความปลอดภัย (ย้ำ — เพราะเขียน tx จริงด้วยเงินจริง)
- **Simulate ก่อนส่งเสมอ** (`useSimulateContract`) เพื่อจับ revert ก่อนเสียค่า gas
- **ยืนยัน 2 ชั้น**: ฟอร์ม valid → modal สรุป → ผู้ใช้กดยืนยัน → wallet เซ็น
- ตรวจ chainId + ownership ก่อนเปิด action
- เริ่มทดสอบด้วย **จำนวนน้อยที่สุด** บน mainnet หลังผ่าน simulate
- ไม่เก็บ private key / seed ใด ๆ — ทุกการเซ็นผ่าน wallet ของผู้ใช้

---

## 8. Appendix — ABI & ไฟล์อ้างอิง
- `research/sm2-abi.json` — ABI ของ StakeManagerV2 (71 entries)
- `research/sm2-full.json` — contract JSON เต็ม (source + abi + metadata)
- `research/nft-full.json` — ABI ของ StakingNFT
- on-chain links (verified): `stakeManagerStorage=0xFd98…4c0d`, `kkub=0x67eb…f6b5`, `nftContract=0x8ae4…2b39`, `stakeManagerVault=0xcf72…810c`

### ลำดับการเริ่มงานแนะนำ
**ตอบ §6 ข้อ 1,3,4 (อ่าน source + simulate) → Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**
