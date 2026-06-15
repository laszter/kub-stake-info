# KUB Node Info — แผนงานหลัก (Core Working Document)

> เอกสารนี้คือ **single source of truth** สำหรับการสร้างเว็บแสดงข้อมูล (information) ของแต่ละ node/validator
> บนเครือข่าย KUB Chain โดยอ้างอิงดีไซน์จาก [staking.kubchain.com](https://staking.kubchain.com/)
> และดึงข้อมูลจาก smart contract `StakeManagerStorageV2`
> ทำงานทีละ Phase และติ๊ก checkbox ตามลำดับ

---

## ✅ สถานะ: สร้างเสร็จแล้ว (Phase 0–7 ครบ, Phase 8 พร้อม deploy)

แอปทำงานได้จริง — รัน `npm run dev` แล้วเปิด `http://localhost:3000`

| ส่วน | สถานะ | หมายเหตุ |
|---|---|---|
| Data layer (viem + Multicall3) | ✅ | `src/lib/staking.ts` อ่าน contract สดผ่าน RPC, dedupe, แยก pool/solo |
| หน้า Overview (Hero + Stats + Pool grid + Solo table) | ✅ | `src/app/page.tsx` — ตรงกับ design ต้นแบบ |
| หน้า Node Detail | ✅ | `src/app/nodes/[address]/page.tsx` — แสดงทุก field จาก contract |
| Search / Sort / Grid-List toggle / Pagination | ✅ | `src/components/nodes/ValidatorExplorer.tsx` |
| Loading / Error / 404 / Responsive (mobile nav) | ✅ | — |
| Verify ตัวเลขตรงกับ staking.kubchain.com | ✅ | Total Stake 10,789,221.31 + power% ตรงเป๊ะ |
| `npm run build` | ✅ ผ่าน | TypeScript ผ่าน, prerender ได้ |

> เหลือเฉพาะ **deploy ขึ้น cloud จริง** (Phase 8 ข้อสุดท้าย) ซึ่งเป็น action ของผู้ใช้

---

## 0. เป้าหมายของโปรเจกต์ (Goal)

สร้างเว็บไซต์ **read-only** สำหรับ "ดูข้อมูลของแต่ละ node" บน KUB Chain:

1. **หน้า Overview** — สถิติรวมทั้งระบบ + รายการ validator ทั้งหมด (Pool Node แบบ card grid + Solo Node แบบตาราง) เลียนแบบ layout ของ staking.kubchain.com
2. **หน้า Node Detail** — แสดงข้อมูลเชิงลึกของแต่ละ validator ทุก field ที่อ่านได้จาก contract (stake, delegated, reward, commission, status, signer ฯลฯ)
3. ข้อมูลทั้งหมดดึงสด ๆ จาก smart contract ผ่าน RPC (ไม่มีฟังก์ชัน delegate/เขียน chain — โฟกัสที่การ "ดู" ข้อมูล)

**ขอบเขตที่ไม่ทำ (Out of scope):** การ connect wallet เพื่อ stake/delegate/claim, การเขียน transaction ใด ๆ (มี write functions แต่ไม่ใช้)

---

## 1. แหล่งข้อมูล — Smart Contract (✅ ตรวจสอบกับ chain จริงแล้ว)

| รายการ | ค่า |
|---|---|
| Contract name | `StakeManagerStorageV2` |
| Address | `0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d` |
| Network | **KUB Chain Mainnet** — chainId `96` (`0x60`) |
| RPC | `https://rpc.bitkubchain.io` |
| Explorer | `https://www.kubscan.com` (Blockscout fork) |
| Verified | ✅ Yes (Solidity `v0.8.17`, optimization 200 runs) |
| Proxy | ไม่ใช่ proxy (`proxy_type: null`) — เรียก address นี้ตรง ๆ ได้เลย |
| ABI | ดึงผ่าน `https://www.kubscan.com/api/v2/smart-contracts/<addr>` (เก็บไว้แล้วที่ `research/abi.json`) |

> **หลักฐานยืนยันว่าเป็นแหล่งข้อมูลเดียวกับ staking.kubchain.com:**
> เรียก `totalStaked()` บน RPC ได้ `10,789,221.314 KUB` — **ตรงเป๊ะ** กับตัวเลข "Total Stake" ที่เว็บต้นแบบแสดง (`10,789,221.31436321 KUB`)
> และ `getAllValidator()` คืน validator 44 ตัว

### 1.1 Data model

```solidity
enum Status { Uninitialized, Active, Unstaked }   // 0, 1, 2

struct Validator {
    uint128 amount;                      // จำนวน self-stake ของ validator เอง
    uint128 delegatedAmount;             // จำนวนที่ถูก delegate เข้ามา
    uint128 reward;                      // reward สะสมของ validator
    uint128 delegatorsReward;            // reward ส่วนของผู้ delegate
    uint128 infraCommissionAmount;       // ยอด commission ส่วน infra สะสม
    uint128 validatorCommissionAmount;   // ยอด commission ส่วน validator สะสม
    uint128 delegatorCommissionAmount;   // ยอด commission ส่วน delegator สะสม
    uint128 minDeposit;                  // ยอด deposit ขั้นต่ำ
    address signer;                      // ที่อยู่ signer ของ node
    address validatorShareContract;      // contract สำหรับ delegation share (0x0 = ไม่มี → น่าจะเป็น Solo)
    Status  status;                      // 0=Uninitialized, 1=Active, 2=Unstaked
    uint16  infraCommissionRate;         // basis points (10000 = 100%)
    uint16  commissionRate;              // basis points → "Service Fee" บนเว็บ (เช่น 500 = 5%)
}
```

> **หน่วยที่ต้องระวัง:**
> - จำนวน KUB เป็น `wei` (18 decimals) → หารด้วย `1e18`
> - rate ต่าง ๆ เป็น **basis points** → หารด้วย `100` เพื่อได้ % (500 → 5%). ค่าคงที่: `MAX_RATE() = 10000`

### 1.2 Read functions ที่จะใช้จริง

**สถิติรวม (global stats — สำหรับ stats bar ด้านบน):**
- `totalStaked() → uint256` — Total Stake รวมทั้งระบบ ✅
- `totalRewards() → uint256` — reward คงเหลือในระบบ
- `totalRewardsLiquidated() → uint256` — reward ที่จ่ายออกไปแล้ว (น่าจะตรงกับ "Total Rewards Distributed")
- `unallocatedReward() → uint256`

**การนับ/ดึงรายการ validator (enumeration):**
- `getAllValidator() → address[]` — คืน address ของ validator ทั้งหมด (verified: 44 ตัว) ← **ตัวหลักในการ list**
- `getValidatorByPage(page, limit) → address[]` — แบ่งหน้า
- `getAllMinimalValidators() → address[]` — รายการ "minimal validator"
- `getMinimalValidatorsWithValidatorPowerByPage(page, limit) → (address[], uint256[])` — minimal validator พร้อม power (น่าจะคือ **Solo Node**)
- `isInMinimalValidatorList(address) → bool` — เช็คว่าเป็น minimal/solo หรือไม่

**ข้อมูลรายตัว (per-validator — ตัวหลักของหน้า detail):**
- `getValidatorInfo(address) → Validator` — ✅ **คืน struct ทั้งก้อนในครั้งเดียว** (ใช้ตัวนี้เป็นหลัก)
- มี getter แยกย่อยรายฟิลด์ด้วย เผื่อต้องการเฉพาะค่า เช่น `getValidatorInfoStatus`, `getValidatorInfoCommissionRate`, `getValidatorInfoDelegatedAmount`, `getValidatorInfoReward` ฯลฯ (ดู Appendix A)

**ค่าคงที่/config (เผื่อใช้แสดง/คำนวณ):**
- `MAX_RATE()`, `MAX_COMMISSION_RATE()`, `MAX_INFRA_COMMISSION_RATE()`
- `minimumPoolStake()`, `minimumPoolDelegate()`, `minimumSoloStake()`
- `defaultInfraCommissionRate()`

> รายการ read function ทั้งหมด 77 ตัว ดูได้ที่ `research/read-functions.txt`

### 1.3 ⚠️ ข้อมูลที่ **ไม่มี** บน contract (ต้องหาแหล่งเสริม)

Contract เก็บแค่ข้อมูลตัวเลข/ที่อยู่ — **ไม่มีชื่อ (เช่น "Bitkao", "JFIN Chain") และไม่มีโลโก้** ของ validator
เว็บต้นแบบดึงชื่อ/โลโก้จาก metadata ของ Bitkub (`static.bitkubnext.com/...`, `bitkubipfs.io/ipfs/...`)

**→ Task: ต้องสร้าง off-chain registry** map `address → { name, logoUrl }` โดยเลือกวิธีใดวิธีหนึ่ง:
- (ก) Maintain ไฟล์ JSON เองในโปรเจกต์ (`src/data/validators.json`) — เริ่มจากเก็บค่าที่เห็นบน staking.kubchain.com
- (ข) หา/เรียก API ของ Bitkub ที่ให้ metadata (ต้องสืบหา endpoint เพิ่ม)
- (ค) fallback: validator ที่ไม่มีชื่อ → แสดง address แบบย่อ (`0xb2...e836`) ตามที่เว็บต้นแบบทำกับ solo node

### 1.4 Mapping: ค่าที่แสดงบนเว็บ → contract

| UI label (เว็บต้นแบบ) | ที่มา | สูตร / หมายเหตุ |
|---|---|---|
| Total Validators | `getAllValidator().length` | เว็บต้นแบบโชว์ 13 แต่ contract มี 44 → ต้อง **filter** (เช่น `status == Active` และ/หรือ stake ≥ minimum). ต้องสืบเงื่อนไขจริงตอน implement |
| Total Stake | `totalStaked()` | ÷ 1e18 ✅ ตรงเป๊ะ |
| Total Rewards Distributed | `totalRewardsLiquidated()` (ต้องยืนยัน) | ตรวจสอบกับเลขจริงบนเว็บตอน implement |
| Validator: Total Stake | `amount + delegatedAmount` | self-stake + delegated, ÷ 1e18 (ต้องยืนยันว่ารวมกันหรือใช้ตัวใดตัวเดียว) |
| Validator: Staking Power | `(amount + delegatedAmount) / totalStaked * 100` | เป็น % |
| Validator: Service Fee | `commissionRate / 100` | basis points → % |
| Validator: Status badge | `status` | 0/1/2 → Uninitialized/Active/Unstaked |
| Pool vs Solo | `validatorShareContract != 0x0` หรือ `isInMinimalValidatorList()` | Pool = มี share contract; Solo = minimal list (ต้องยืนยันเงื่อนไขที่ถูกต้อง) |

> 🔬 **3 ข้อที่ต้องยืนยันด้วยข้อมูลจริงก่อน finalize UI** (ดู §6): นิยาม "Total Validators = 13", สูตร Total Stake รายตัว, และวิธีแยก Pool/Solo

---

## 2. Design Reference — staking.kubchain.com

> Screenshot อ้างอิงเก็บไว้ที่ `research/staking-full.png`, `research/staking-viewport.png`
> ข้อมูล token ดิบที่สกัดได้อยู่ที่ `research/staking-data.json`

### 2.1 Design tokens

| Token | ค่า |
|---|---|
| Primary / Brand green | `#0EB366` (rgb 14,179,102) — ใช้กับปุ่ม, ลิงก์ active, accent |
| Background (page) | `#FFFFFF` |
| Surface (card อ่อน) | `#FBFAFC` (rgb 251,250,252) |
| Border | `#E5E5E5` / `#F0F0F0` |
| Text primary | `#1A1D21` (rgb 26,29,33) |
| Text secondary | `#919191`, `#606060`, `#414141` |
| Font family | **Roboto**, sans-serif |
| Radius | การ์ด/ปุ่มมุมมน (~8–12px), ปุ่ม Connect Wallet เป็น pill |
| Style รวม | สว่าง (light), สะอาด, การ์ดขอบบาง, เงาอ่อน, เน้นพื้นที่ว่าง |

### 2.2 โครงสร้างหน้า (จากบนลงล่าง)

1. **Header / Top nav** (sticky)
   - ซ้าย: โลโก้ KUB (รูปสี่เหลี่ยมข้าวหลามตัดสีเขียว) + ข้อความ "KUB"
   - กลาง: เมนู `Overview` (active สีเขียว) · `My Delegation` · `KUB Scan` · `FAQ`
   - ขวา: ปุ่ม **Connect Wallet** (pill สีเขียว) — *ในเวอร์ชันเราอาจตัดออก หรือทำเป็นปุ่มลิงก์ไป kubscan*

2. **Hero banner** — การ์ดเต็มความกว้าง มุมมน พื้นหลังเป็นภาพ 3D เรขาคณิตสีเขียว มีข้อความทับ:
   - หัวใหญ่: **"KUB Stake"** (ในเวอร์ชันเราเปลี่ยนเป็นชื่อโปรเจกต์ เช่น "KUB Node Info")
   - รอง: "Proof of Stake"

3. **Stats bar** — การ์ดขาวมุมมน แบ่ง 3 คอลัมน์ (มีเส้นคั่น) แต่ละช่อง: ตัวเลขใหญ่ + label เล็กสีเทา + ไอคอน info (i):
   - `13` Total Validators
   - `10,789,221.31 KUB` Total Stake
   - `389,110.04 KUB` Total Rewards Distributed

4. **Pool Node** — การ์ด section
   - หัวข้อ "Pool Node"
   - แถบเครื่องมือ: ช่อง **Search** ("Search by Name, Wallet Address") ซ้าย · ขวา: dropdown **Sort by** (Total Staking) + ปุ่มสลับมุมมอง **grid / list** (2 ไอคอน)
   - **Grid ของการ์ด validator** (≈3 ต่อแถว) แต่ละการ์ด:
     - โลโก้ (วงกลม/สี่เหลี่ยมมน) ตรงกลางบน
     - ชื่อ validator (เช่น "Bitkao")
     - address ย่อ `0xb5...c2fc` + ปุ่ม copy
     - `Total Stake` : `1,836,983.52 KUB`
     - `Staking Power` : `17.02%`
     - `Service Fee` : `4%`
     - ปุ่ม **Delegate** *(เวอร์ชันเรา → เปลี่ยนเป็น **"View Details"** ลิงก์ไปหน้า detail)*
   - **Pagination** ด้านล่าง

5. **Solo Node** — section ตาราง
   - คอลัมน์: `Name` · `Total Stake` · `Staking Power`
   - แถวที่ไม่มีชื่อ → แสดง address ย่อทั้งสองช่อง
   - **Pagination**

6. **Footer** — `Copyright © 2026 KUB Foundation. All rights reserved.` *(เวอร์ชันเราใส่เครดิต/ลิงก์ contract แทน)*

### 2.3 Responsive
- Desktop: grid 3 คอลัมน์, nav เต็ม
- Tablet: grid 2 คอลัมน์
- Mobile: grid 1 คอลัมน์, nav ยุบเป็น hamburger, stats bar ซ้อนแนวตั้ง, Solo table เลื่อนแนวนอนหรือแปลงเป็น card list

---

## 3. Tech Stack & Architecture

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Framework | **Next.js 16.2.9** (App Router, มีอยู่แล้ว) | ตรงกับ scaffold + เว็บต้นแบบก็ใช้ Next.js |
| UI | **React 19.2.4** + React Compiler | มากับ scaffold |
| Styling | **Tailwind CSS v4** | มากับ scaffold |
| Blockchain client | **viem** (เพิ่ม) | type-safe, เบา, เหมาะอ่าน contract ฝั่ง server |
| Batch reads | **Multicall3** (`0xcA11bde05977b3631167028862bE2a173976CA11` — ต้องเช็คว่ามีบน KUB) | รวมหลาย read ใน 1 RPC call (44 validators × หลาย field) |
| Lang | TypeScript | มากับ scaffold |

> ### ⚠️⚠️ สำคัญมาก — อ่านก่อนเขียนโค้ด
> โปรเจกต์นี้ใช้ **Next.js 16** ซึ่งมี **breaking changes** จากที่โมเดลเคยรู้ (ระบุไว้ใน `AGENTS.md`)
> **ต้องอ่าน docs ใน `node_modules/next/dist/docs/` (โฟลเดอร์ `01-app`) ก่อนเขียนทุกครั้ง**
> โดยเฉพาะเรื่อง: async params/searchParams, caching & `revalidate`, Server Components, `next/image`, metadata API, route handlers

### 3.1 กลยุทธ์ดึงข้อมูล (Data fetching)
- อ่าน contract ที่ **ฝั่ง server (RSC / route handler)** เพื่อไม่ต้อง expose RPC ฝั่ง client และ cache ได้
- ใช้ **ISR/revalidate** (เช่น ทุก 30–60 วิ) เพราะข้อมูล stake ไม่ได้เปลี่ยนทุกวินาที
- รวม read calls ด้วย **Multicall** เพื่อลดจำนวน RPC request
- มี **error/loading state** เผื่อ RPC ล่ม (ใช้ `loading.tsx` / `error.tsx` ของ App Router)

### 3.2 โครงสร้างไฟล์ (เป้าหมาย)
```
src/
  app/
    layout.tsx              # root: font Roboto, theme, header, footer
    page.tsx                # Overview (stats + Pool grid + Solo table)
    nodes/[address]/page.tsx# Node detail
    loading.tsx  error.tsx  # states
  components/
    layout/  Header.tsx  Footer.tsx
    stats/   StatsBar.tsx  StatCard.tsx
    nodes/   ValidatorCard.tsx  ValidatorGrid.tsx  SoloNodeTable.tsx
             ValidatorToolbar.tsx  Pagination.tsx  StatusBadge.tsx
    ui/      Card.tsx  Button.tsx  SearchInput.tsx  CopyButton.tsx
  lib/
    chain.ts                # viem client + chain config (KUB chainId 96)
    contract.ts             # address + ABI import
    staking.ts              # ฟังก์ชันอ่านข้อมูล (getValidators, getStats, getValidatorDetail)
    format.ts               # formatKUB, formatPercent, shortenAddress, bps→%
  data/
    validators.json         # off-chain registry: address → {name, logo}
    abi.json                # ABI ของ contract (คัดลอกจาก research/)
```

---

## 4. แผนงานแบ่งเป็น Phase (ทำตามลำดับ)

### Phase 0 — Setup & Foundation
- [x] อ่าน `node_modules/next/dist/docs/01-app` ส่วนที่เกี่ยวข้อง (routing, data fetching, caching) — **ก่อนเริ่มเขียน**
- [x] `npm i viem`
- [x] คัดลอก `research/abi.json` → `src/data/abi.json`
- [x] ตั้งค่า font **Roboto** ใน `layout.tsx` (ผ่าน `next/font/google`)
- [x] ตั้งค่า Tailwind theme tokens (สี `#0EB366`, surface, text, radius) ใน `globals.css` (Tailwind v4 ใช้ `@theme`)
- [x] สร้าง `lib/chain.ts` — viem `createPublicClient` ชี้ไป `https://rpc.bitkubchain.io` (chainId 96) + กำหนด custom chain object
- [x] ทดสอบเรียก `totalStaked()` จากในแอป แล้ว log ออกมาว่าได้ค่าตรงกับ `10,789,221.31...`

### Phase 1 — Data Layer (Web3)
- [x] `lib/contract.ts` — export address + ABI (typed)
- [x] `lib/format.ts` — `formatKUB(wei)`, `formatPercentFromBps(bps)`, `shortenAddress(addr)`, `formatNumber()`
- [x] เช็คว่ามี **Multicall3** บน KUB (`0xcA11...CA11`) หรือไม่; ถ้าไม่มีให้ batch ด้วย viem `client.multicall`/`Promise.all`
- [x] `lib/staking.ts`:
  - [x] `getGlobalStats()` → `{ totalValidators, totalStaked, totalRewardsDistributed }`
  - [x] `getAllValidators()` → ดึง `getAllValidator()` แล้ว multicall `getValidatorInfo()` ของแต่ละตัว
  - [x] `getValidatorDetail(address)` → `getValidatorInfo()` + คำนวณ staking power
  - [x] แยก Pool vs Solo (ตามเงื่อนไขที่ยืนยันใน §6)
  - [x] รวมข้อมูล on-chain เข้ากับ registry (`validators.json`) เพื่อเติม name/logo
- [x] เพิ่ม `revalidate`/cache ที่เหมาะสม

### Phase 2 — Design System / UI primitives
- [x] `components/ui/Card`, `Button` (green pill), `SearchInput`, `CopyButton`, `StatusBadge`
- [x] `components/layout/Header` (โลโก้ + nav: Overview / Nodes / KUB Scan link / FAQ)
- [x] `components/layout/Footer`
- [x] Hero banner component (พื้นหลัง gradient/ภาพเขียว + ข้อความ)
- [x] ตรวจสอบ token สี/ฟอนต์ให้ตรงกับเว็บต้นแบบด้วยตา (เทียบ `research/staking-viewport.png`)

### Phase 3 — Overview Page
- [x] `StatsBar` 3 ช่อง (Total Validators / Total Stake / Total Rewards Distributed) + tooltip info
- [x] `ValidatorToolbar` — search + sort dropdown + grid/list toggle
- [x] `ValidatorCard` + `ValidatorGrid` (Pool Node) — โลโก้, ชื่อ, address+copy, Total Stake, Staking Power, Service Fee, ปุ่ม **View Details**
- [x] `SoloNodeTable` (Solo Node) — Name / Total Stake / Staking Power
- [x] `Pagination` ทั้งสอง section
- [x] ประกอบทุกอย่างใน `app/page.tsx` (ดึงข้อมูลฝั่ง server)
- [x] เทียบหน้าจริงกับ `research/staking-viewport.png` ให้ layout ใกล้เคียง

### Phase 4 — Node Detail Page (`/nodes/[address]`)
- [x] หัวข้อ: โลโก้ + ชื่อ + address เต็ม (+ copy, + ลิงก์ไป kubscan) + StatusBadge
- [x] กลุ่ม Stake: `amount` (self), `delegatedAmount`, total, Staking Power %, minDeposit
- [x] กลุ่ม Reward: `reward`, `delegatorsReward`
- [x] กลุ่ม Commission: `commissionRate` (Service Fee), `infraCommissionRate`, + ยอดสะสม 3 ก้อน
- [x] กลุ่ม Technical: `signer`, `validatorShareContract`, ประเภท (Pool/Solo)
- [x] จัดการ address ที่ไม่ใช่ validator → แสดง not found

### Phase 5 — Interaction (search / sort / pagination)
- [x] Search ตามชื่อ + address (client-side filter)
- [x] Sort: Total Staking / Staking Power / Service Fee / ชื่อ
- [x] Toggle grid ↔ list
- [x] Pagination ทำงานจริงทั้งสอง section
- [ ] (optional) sync state กับ `searchParams` — *ยังไม่ทำ: ปัจจุบัน state เป็น client-side ล้วน (ใช้งานได้ครบ)*

### Phase 6 — Polish
- [x] `loading.tsx` (skeleton การ์ด/ตาราง) + `error.tsx` (RPC ล่ม)
- [x] Responsive ครบ (mobile/tablet/desktop) — nav hamburger, grid ยุบคอลัมน์
- [x] Empty states (search ไม่เจอ)
- [x] Metadata / SEO — `metadata` (root) + `generateMetadata` (detail page) ✅ *(favicon ใช้ default; OG image ยังไม่ทำ — optional)*
- [x] Accessibility (alt, aria, keyboard focus, contrast)
- [ ] (optional) i18n TH/EN, dark mode — *ไม่ทำ: เว็บต้นแบบเป็น light/EN อย่างเดียว*

### Phase 7 — Testing & Verification
- [x] ตรวจตัวเลขรวมตรงกับ staking.kubchain.com (Total Stake ต้องตรง)
- [x] สุ่ม validator 3–5 ตัว เทียบค่ากับเว็บต้นแบบ/kubscan
- [x] `npm run build` ผ่าน ไม่มี type error
- [x] ใช้ Playwright screenshot หน้าเราเทียบกับ `research/staking-viewport.png`
- [x] ทดสอบกรณี RPC timeout / address มั่ว

### Phase 8 — Deploy
- [x] ตั้ง env: `KUB_RPC_URL` override ได้ (ดู `.env.example`), contract address อยู่ใน `lib/contract.ts`
- [x] `npm run build && npm start` ทดสอบ production (local) — ผ่าน, ข้อมูลโหลดจริง, ไม่มี console error
- [x] ตั้ง `revalidate = 60` (ISR) ทั้งหน้า Overview และ Node Detail
- [ ] **Deploy ขึ้น cloud จริง (Vercel ฯลฯ)** — *เป็น action ของผู้ใช้: รัน `vercel` หรือต่อ Git repo; โปรเจกต์ build ผ่านพร้อม deploy แล้ว*

---

## 5. คำถาม/สิ่งที่ต้องตัดสินใจก่อน finalize (Open Questions) — ✅ ตอบครบแล้ว

> วิเคราะห์จากข้อมูลจริงของทั้ง 44 validators ด้วย `research/analyze-validators.mjs` (ผลเก็บที่ `research/validators-analysis.json`)

1. ✅ **"Total Validators = 13"** — `getAllValidator()` คืน 44 รายการ **แต่มี address ซ้ำ** (validator ตัวเดียวมีหลาย ID). หลัง dedupe แล้วนับ unique address ที่ `status == Active` **และ** `amount + delegatedAmount > 0` ได้ = **7 pool + 6 solo = 13 พอดี** → ต้อง **dedupe by address** และ filter ตามนี้เสมอ
2. ✅ **Total Stake รายตัว = `amount + delegatedAmount`** — ยืนยันแล้ว: `Staking Power = total / totalStaked` ออกมาตรงเป๊ะกับเว็บ (39.89%, 17.02%, 14.61%, 13.69%, 11.06%, 1.94%, 0.92%)
3. ✅ **Pool vs Solo** — Pool = `validatorShareContract != 0x0`; Solo = ไม่มี share contract. (ตรงกับ 7 pool / 6 solo บนเว็บ). *หมายเหตุ: `getAllMinimalValidators()` = "active validator set" 14 ตัว — เป็นคนละมิติ ไม่ใช้แยก pool/solo*
4. ✅ **Total Rewards Distributed = `totalRewards() + totalRewardsLiquidated()`** = 389,110.62 ≈ เว็บ 389,110.04 (ต่างเล็กน้อยจาก reward ที่ accrue ต่อ block)
5. ✅ **ชื่อ/โลโก้** — ใช้ off-chain registry `src/data/validators.json` (ดึงค่าเริ่มต้นจาก staking.kubchain.com แล้ว) + fallback เป็น address ย่อ
6. ✅ **ตัดปุ่ม Connect Wallet ออก** (โปรเจกต์ read-only) — แทนด้วยลิงก์ "KUB Scan" / "Staking"

---

## 6. Appendix A — Read functions reference

- รายการ read function ครบ 77 ตัว: `research/read-functions.txt`
- ABI เต็ม: `research/abi.json`
- contract JSON ดิบ (source + ABI + metadata): `research/contract-full.json`
- method selectors: `research/methods-read.json`

**Selectors ที่ verify แล้วใช้ได้จริง:**
| Function | Selector | ผลทดสอบจริง |
|---|---|---|
| `totalStaked()` | `0x817b1cd2` | 10,789,221.314 KUB ✅ |
| `totalRewards()` | `0x0e15561a` | 52,060.798 KUB |
| `getAllValidator()` | `0x4a91a2f8` | 44 validators |
| `getValidatorListLength()` | `0xcc4e5333` | 0 ⚠️ (ใช้ `getAllValidator().length` แทน) |

## 7. Appendix B — สคริปต์/ผลที่ใช้สร้างเอกสารนี้
- `research/capture-staking.mjs` — Playwright ดึงดีไซน์ staking.kubchain.com
- `research/capture-kubscan.mjs` — Playwright ดึงข้อมูล contract จาก kubscan
- `research/staking-*.png` — screenshot อ้างอิงดีไซน์

---

### ลำดับการเริ่มงานแนะนำ
**ตอบคำถาม §5 ข้อ 1–4 ก่อน (เขียนสคริปต์ดึง 44 validators) → Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8**
