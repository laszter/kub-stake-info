# TASKS — SEO & AEO

แผนงานทำ **SEO** (Search Engine Optimization) และ **AEO** (Answer Engine Optimization)
ของเว็บ **KUB Node Info** ตั้งแต่ต้นจนจบ — เขียนให้ตรงกับโค้ดจริง (Next.js 16 App Router,
RSC + ISR, Tailwind v4, viem) เพื่อให้ทำตามทีละข้อแล้วจบงานได้

> **SEO vs AEO**
> - **SEO** = ทำให้ search engine (Google/Bing) จัดทำดัชนีและจัดอันดับหน้าเว็บได้ดี
> - **AEO** = ทำให้ "เครื่องมือตอบคำถาม" (Google AI Overviews, ChatGPT/Search, Perplexity,
>   Claude, Bing Copilot) เลือก **อ้างอิง/ดึงคำตอบ** จากเว็บเราไปตอบผู้ใช้
>   จุดต่างคือ AEO ต้องการ **เนื้อหาที่เป็นคำตอบเบ็ดเสร็จ + structured data + ความชัดเจนเชิง entity**
>   มากกว่าแค่คีย์เวิร์ด

---

## 0. กติกาของโปรเจกต์ (อ่านก่อนเริ่ม)

- **นี่ไม่ใช่ Next.js ที่คุ้นเคย** — Next 16.2.9 มี breaking changes อ่าน guide ที่
  `node_modules/next/dist/docs/` ก่อนเขียนโค้ดทุกครั้ง ที่เกี่ยวกับงานนี้:
  - `01-app/01-getting-started/14-metadata-and-og-images.md`
  - `01-app/03-api-reference/04-functions/generate-metadata.md`
  - `01-app/03-api-reference/03-file-conventions/01-metadata/{robots,sitemap}.md`
  - `01-app/03-api-reference/04-functions/generate-sitemaps.md`
- จุดที่ต่างจากของเก่าและ **ต้องระวัง**:
  - `themeColor` ใช้ใน `metadata` **ไม่ได้แล้ว** ต้องอยู่ใน `export const viewport` (โปรเจกต์ทำถูกแล้วใน `layout.tsx`)
  - `sitemap` แบบหลายไฟล์: ใน v16 พารามิเตอร์ `id` ของ `generateSitemaps` เป็น **Promise<string>** แล้ว
  - **Streaming metadata**: หน้า dynamic จะ stream `<head>` ทีหลัง แต่ Next ปิด streaming ให้บอตอัตโนมัติ
    (ปรับ/ปิดได้ผ่าน `htmlLimitedBots` ใน config) — สำคัญต่อ AEO/crawler
- **Theming**: เนื้อหา/คอมโพเนนต์ UI ใหม่ทุกชิ้นใช้ semantic token (`bg-card`, `text-ink`,
  `border-line` ฯลฯ) ห้ามฮาร์ดโค้ดสีดิบ ตาม `AGENTS.md`
- ไฟล์เนื้อหาฝั่ง read-only เป็น RSC + ISR (`export const revalidate = 60`) — งาน SEO ทำฝั่ง server ได้เต็มที่
- ข้อมูล validator (name/logo) มาจาก off-chain registry `src/data/validators.json` ส่วนตัวเลขมาจาก
  สัญญาผ่าน `src/lib/staking.ts → getStakingData()` (ห่อด้วย `React.cache` แล้ว ใช้ซ้ำใน metadata ได้ฟรี)

---

## 1. สถานะปัจจุบัน (Audit)

| รายการ | สถานะ | หมายเหตุ |
|---|---|---|
| `metadata` ราก (title template + description) | ✅ มี | `src/app/layout.tsx` |
| `viewport.themeColor` ต่อ theme | ✅ มี | ถูกต้องตาม v16 |
| `lang="en"`, skip-link, semantic H1/H2 | ✅ มี | a11y พื้นฐานดี |
| `icon.svg` | ✅ มี | `src/app/icon.svg` |
| `generateMetadata` หน้า node detail | ⚠️ มีแต่ title เท่านั้น | ไม่มี description/OG/canonical |
| `metadata` หน้า stake-manager | ⚠️ มี title+desc | ไม่มี OG/canonical/robots |
| `metadataBase` | ❌ ไม่มี | ทำให้ OG/canonical เป็น absolute URL ไม่ได้ |
| OpenGraph / Twitter cards | ❌ ไม่มี | แชร์ลิงก์ไม่มีรูป/การ์ด |
| canonical (`alternates.canonical`) | ❌ ไม่มี | เสี่ยง duplicate-content |
| OG images (static/dynamic) | ❌ ไม่มี | |
| `robots.ts` | ❌ ไม่มี | |
| `sitemap.ts` | ❌ ไม่มี | |
| web app manifest | ❌ ไม่มี | |
| `favicon.ico` / `apple-icon` | ❌ ไม่มี | มีแค่ `icon.svg` |
| JSON-LD structured data | ❌ ไม่มี | จำเป็นมากสำหรับ AEO |
| เนื้อหา answer-first / FAQ / glossary | ❌ ไม่มี | หัวใจของ AEO |
| `llms.txt` | ❌ ไม่มี | |
| public/ มีไฟล์ default ของ Next | ⚠️ มีขยะ | `next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg` |

**สรุป:** พื้นฐาน technical ดี แต่ยังขาด "ชั้นที่ทำให้ถูกค้นเจอและถูกอ้างอิง" เกือบทั้งหมด

---

## 2. Prerequisites (ทำก่อน ทุก phase พึ่งพาสิ่งนี้)

### TASK 2.1 — กำหนด canonical domain + env
- [ ] เลือกโดเมนจริงของ production (เช่น `https://kubnodeinfo.com`)
- [ ] เพิ่มตัวแปรใน `.env.example` และ `.env.local`:
  ```bash
  # Public base URL ของเว็บ (ใช้กับ metadataBase / sitemap / robots / OG / JSON-LD)
  NEXT_PUBLIC_SITE_URL=https://kubnodeinfo.com
  ```
- [ ] สร้าง helper กลางไว้ใช้ซ้ำ `src/lib/site.ts`:
  ```ts
  // แหล่งความจริงเดียวของ base URL — fallback เป็น localhost ตอน dev
  export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  export const SITE_NAME = "KUB Node Info";
  export const SITE_DESCRIPTION =
    "Explore validators and node information on the KUB Chain — stake, delegation, rewards and commission, read live from the StakeManager smart contract.";
  // ใช้กับ JSON-LD/entity: ระบุตัวตนของเชนให้ชัด
  export const KUB_CHAIN_ID = 96;
  ```
- **เหตุผล:** ทุกอย่างที่ต้องเป็น absolute URL (OG, canonical, sitemap) พังถ้าไม่มีค่านี้
- **DoD:** import `SITE_URL` ได้จากทุกหน้า และ build ผ่านทั้งตอนตั้ง/ไม่ตั้ง env

### TASK 2.2 — เก็บกวาด public/ และไอคอน
- [ ] ลบไฟล์ default ที่ไม่ใช้ออกจาก `public/`: `next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg`
      (ยืนยันก่อนว่าไม่มีการ import ที่ไหน — `grep -r "next.svg\|vercel.svg\|window.svg\|globe.svg\|file.svg" src`)
- [ ] เพิ่ม `src/app/favicon.ico` (แปลงจาก `icon.svg`, มาตรฐาน 32×32/48×48 multi-res)
- [ ] เพิ่ม `src/app/apple-icon.png` (180×180) — Next จะ map เป็น `apple-touch-icon` ให้เอง
- **DoD:** ไม่มี 404 asset ตอน build; `view-source` เห็น `<link rel="icon">` + `apple-touch-icon`

---

## 3. Phase 1 — Core Metadata (titles / descriptions / OG / Twitter / canonical)

### TASK 3.1 — ขยาย metadata ราก (`src/app/layout.tsx`)
- [ ] เพิ่ม `metadataBase`, `applicationName`, `keywords`, `authors`, `openGraph`, `twitter`,
      `robots`, `formatDetection`, `alternates.canonical`
  ```ts
  import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

  export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: { default: "KUB Node Info — KUB Chain Validators & Staking Explorer", template: "%s · KUB Node Info" },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    keywords: [
      "KUB Chain", "Bitkub Chain", "validators", "validator explorer",
      "staking", "delegation", "rewards", "commission", "proof of stake",
      "StakeManager", "KUB staking", "node info", "chainId 96",
    ],
    authors: [{ name: "KUB Node Info" }],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: "KUB Node Info — KUB Chain Validators & Staking Explorer",
      description: SITE_DESCRIPTION,
      url: "/",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: "KUB Node Info",
      description: SITE_DESCRIPTION,
    },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
  ```
- **หมายเหตุ:** ไม่ต้องใส่ `images` ตรงนี้ถ้าใช้ไฟล์ `opengraph-image.tsx` (Phase 3) — Next ผูกให้อัตโนมัติ
- **DoD:** `view-source` ของหน้าใดก็ได้เห็น `og:*`, `twitter:*`, `<link rel="canonical">` เป็น absolute URL

### TASK 3.2 — Metadata หน้าแรก (`src/app/page.tsx`)
- [ ] หน้าแรกตอนนี้รับ description จาก default — ใส่ description เฉพาะหน้า + canonical ที่เจาะจง
- [ ] เพิ่ม metadata ที่สื่อ "ภาพรวมเครือข่าย" และฝัง **ตัวเลขจริง** ลง description เพื่อความสด (AEO ชอบ)
  ```ts
  import type { Metadata } from "next";
  import { getStakingData } from "@/lib/staking";
  import { formatKUBDisplay } from "@/lib/format";

  export async function generateMetadata(): Promise<Metadata> {
    const { stats } = await getStakingData();
    const desc =
      `Live KUB Chain (chainId 96) staking overview: ${stats.totalValidators} active validators, ` +
      `${formatKUBDisplay(stats.totalStaked)} KUB total staked, ` +
      `${formatKUBDisplay(stats.totalRewardsDistributed)} KUB rewards distributed. ` +
      `Browse pool & solo nodes with stake, delegation, rewards and commission.`;
    return {
      description: desc,
      alternates: { canonical: "/" },
      openGraph: { description: desc, url: "/" },
      twitter: { description: desc },
    };
  }
  ```
- **เหตุผล:** `getStakingData()` ห่อ `cache` อยู่แล้ว เรียกใน metadata + page โดยไม่ยิง RPC ซ้ำ
- **DoD:** description หน้าแรกมีตัวเลขจริง และอัปเดตทุกรอบ ISR (60s)

### TASK 3.3 — Metadata หน้า Stake Manager (`src/app/stake-manager/page.tsx`)
- [ ] เพิ่ม `openGraph` + `alternates.canonical: "/stake-manager"`
- [ ] **ตัดสินใจเรื่อง index:** หน้านี้เป็นเครื่องมือ wallet-gated ที่เนื้อหาแทบไม่มีสาระให้ค้น
      → แนะนำ `robots: { index: false, follow: true }` (ให้ตามลิงก์ได้ แต่ไม่ต้องติดดัชนีหน้าเครื่องมือ)
      หรือถ้าต้องการให้คนค้นเจอหน้าจัดการ ก็ index ได้ — เลือกอย่างใดอย่างหนึ่งแล้ว sync กับ sitemap (TASK 4.2)
- **DoD:** การตัดสินใจ index/noindex สอดคล้องกันทั้ง metadata + sitemap + robots

### TASK 3.4 — ขยาย `generateMetadata` หน้า node detail (`src/app/nodes/[address]/page.tsx`)
- [ ] เพิ่ม description (ฝังตัวเลขจริงของ validator), canonical, openGraph, twitter
- [ ] เคส not-found: คืน `robots: { index: false }` กันหน้า 404 ติดดัชนี
  ```ts
  export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const { address } = await params;
    const v = await getValidatorByAddress(address);
    if (!v) return { title: "Node not found", robots: { index: false, follow: false } };

    const name = v.name ?? shortenAddress(v.address);
    const kind = v.isPool ? "Pool" : "Solo";
    const desc =
      `${name} is a ${kind.toLowerCase()} ${v.status.toLowerCase()} validator on the KUB Chain. ` +
      `Total stake ${formatKUBDisplay(v.totalStake)} KUB ` +
      `(self ${formatKUBDisplay(v.amount)} + delegated ${formatKUBDisplay(v.delegatedAmount)}), ` +
      `commission ${bpsToPercent(v.commissionRate)}, ` +
      `staking power ${(v.powerRatio * 100).toFixed(2)}%.`;
    const canonical = `/nodes/${v.address}`;
    return {
      title: `${name} — ${kind} Validator`,
      description: desc,
      alternates: { canonical },
      openGraph: { title: `${name} · ${kind} Validator`, description: desc, url: canonical, type: "profile" },
      twitter: { card: "summary_large_image", title: name, description: desc },
    };
  }
  ```
- **DoD:** แต่ละหน้า validator มี title/description/canonical/OG ไม่ซ้ำกัน

---

## 4. Phase 2 — Crawl directives (robots + sitemap)

### TASK 4.1 — `src/app/robots.ts`
- [ ] อนุญาตทุกบอต + ระบุ AI/answer-engine bots ให้ชัด (สำคัญต่อ AEO) + อ้าง sitemap + host
- [ ] บล็อกเฉพาะเส้นทางที่ไม่อยากให้ติดดัชนี (เช่น `/stake-manager` ถ้าเลือก noindex)
  ```ts
  import type { MetadataRoute } from "next";
  import { SITE_URL } from "@/lib/site";

  export default function robots(): MetadataRoute.Robots {
    return {
      rules: [
        // เปิดให้ search + AI crawlers ทั่วไป
        { userAgent: "*", allow: "/", disallow: ["/stake-manager"] },
        // ระบุ AI bots ชัด ๆ เพื่อ AEO (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended)
        { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot",
                      "Claude-Web", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"],
          allow: "/" },
      ],
      sitemap: `${SITE_URL}/sitemap.xml`,
      host: SITE_URL,
    };
  }
  ```
- **หมายเหตุ:** การ "อนุญาต" AI bots คือการเปิดให้ถูกนำไปอ้างอิง — ถ้าต้องการกันบางตัวค่อย `disallow`
- **DoD:** เปิด `/robots.txt` แล้วเห็น rules + บรรทัด `Sitemap:` ถูกต้อง

### TASK 4.2 — `src/app/sitemap.ts`
- [ ] รวมหน้า static + หน้า validator ทุกตัว (ดึงจาก `getStakingData().all` ที่ status Active)
- [ ] ใส่ `lastModified`, `changeFrequency`, `priority` ให้สมเหตุผล
  ```ts
  import type { MetadataRoute } from "next";
  import { SITE_URL } from "@/lib/site";
  import { getStakingData } from "@/lib/staking";

  export const revalidate = 60;

  export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const { all } = await getStakingData();
    const now = new Date();
    const nodes = all
      .filter((v) => v.status === "Active" && v.totalStake > 0n)
      .map((v) => ({
        url: `${SITE_URL}/nodes/${v.address}`,
        lastModified: now,
        changeFrequency: "hourly" as const,
        priority: 0.7,
      }));
    return [
      { url: SITE_URL, lastModified: now, changeFrequency: "hourly", priority: 1 },
      // ถ้า stake-manager เลือก index ค่อยใส่ที่นี่ (sync กับ TASK 3.3/4.1)
      ...nodes,
    ];
  }
  ```
- **หมายเหตุ:** ตอนนี้ validator มีไม่กี่ตัว (~13) ไม่ต้องใช้ `generateSitemaps` (ลิมิต Google 50k URLs/ไฟล์)
- **DoD:** `/sitemap.xml` คืน XML ครบทุก node และ validate ผ่าน

---

## 5. Phase 3 — OG Images (dynamic, ผ่าน `next/og`)

> ข้อจำกัด `ImageResponse`: รองรับเฉพาะ flexbox + subset ของ CSS (ห้าม `display:grid`) ขนาดมาตรฐาน 1200×630

### TASK 5.1 — OG image ของราก/หน้าแรก `src/app/opengraph-image.tsx`
- [ ] สร้างการ์ดแบรนด์ (โลโก้รูปข้าวหลามตัด + ชื่อ "KUB Node Info" + tagline) โทนเขียวแบรนด์ (`#0EB366`/`#0b0e12`)
  ```tsx
  import { ImageResponse } from "next/og";
  export const size = { width: 1200, height: 630 };
  export const contentType = "image/png";
  export const alt = "KUB Node Info — KUB Chain Validators & Staking Explorer";

  export default function Image() {
    return new ImageResponse(
      (<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: 80, background: "#0b0e12", color: "#fff" }}>
        <div style={{ fontSize: 72, fontWeight: 700 }}>KUB Node Info</div>
        <div style={{ fontSize: 32, color: "#0EB366", marginTop: 16 }}>
          KUB Chain Validators & Staking Explorer
        </div>
      </div>),
      { ...size },
    );
  }
  ```
- **DoD:** เปิด `/opengraph-image` เห็นรูป; share debugger (FB/X/LINE) แสดงการ์ด

### TASK 5.2 — OG image ต่อ validator `src/app/nodes/[address]/opengraph-image.tsx`
- [ ] เรนเดอร์การ์ดที่มี: ชื่อ validator, badge Pool/Solo, total stake, commission, staking power
- [ ] ดึงข้อมูลด้วย `getValidatorByAddress(address)` (cache ร่วมกับหน้า/metadata)
- [ ] กรณีไม่พบ: เรนเดอร์การ์ด fallback (ไม่ throw)
- **DoD:** OG ของแต่ละ validator แตกต่างกันและตัวเลขตรงกับหน้า

---

## 6. Phase 4 — Structured Data / JSON-LD (กระดูกสันหลังของ AEO)

> ใส่ผ่าน `<script type="application/ld+json">` ใน RSC ได้เลย แนะนำทำ helper เล็ก ๆ
> `src/components/seo/JsonLd.tsx`:
> ```tsx
> export function JsonLd({ data }: { data: object }) {
>   return <script type="application/ld+json"
>     dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
> }
> ```
> ตรวจทุกชนิดด้วย Google Rich Results Test + schema.org validator

### TASK 6.1 — `WebSite` + `Organization` (ใส่ใน `layout.tsx` หรือหน้าแรก)
- [ ] `WebSite` พร้อม `url`, `name`, `description`, `inLanguage: "en"`
- [ ] `Organization` (publisher) พร้อม `name`, `url`, `logo` — ระบุชัดว่า **unofficial / not affiliated with KUB Foundation** (ตรงกับ footer)
- [ ] (ออปชัน) `potentialAction: SearchAction` ถ้าทำ search endpoint ที่ deep-link ได้

### TASK 6.2 — `BreadcrumbList` (หน้า node detail)
- [ ] Home → Validators → {ชื่อ validator} ช่วยทั้ง SERP breadcrumb และความเข้าใจ entity ของ AI

### TASK 6.3 — `Dataset` + `ItemList` (หน้าแรก) — **คีย์ AEO**
- [ ] `Dataset` อธิบายชุดข้อมูล validator: ชื่อ, คำอธิบาย, `creator`, `isAccessibleForFree: true`,
      `temporalCoverage`/`dateModified` (เวลาที่อ่านเชน), `variableMeasured` (stake, delegation, rewards, commission)
- [ ] `ItemList` ของ validator ทั้งหมด แต่ละ item โยงไป `/nodes/{address}` พร้อม `position`
- **เหตุผล:** answer engine ชอบ "ชุดข้อมูลที่มีโครงสร้าง" + รู้ว่าแต่ละ entity อยู่ URL ไหน

### TASK 6.4 — `FAQPage` (ผูกกับเนื้อหา FAQ ใน Phase 5)
- [ ] markup คำถาม-คำตอบให้ตรงกับข้อความที่แสดงจริงบนหน้า (ห้าม markup เนื้อหาที่ผู้ใช้มองไม่เห็น)

### TASK 6.5 — `DefinedTermSet` / glossary (ผูกกับ Phase 5)
- [ ] นิยามศัพท์: Validator, Pool Node, Solo Node, Staking Power, Commission Rate, Delegation, Self Stake
- **DoD ทั้ง Phase 4:** ทุก JSON-LD ผ่าน Rich Results Test โดยไม่มี error และค่าตรงกับเนื้อหาที่เรนเดอร์

---

## 7. Phase 5 — เนื้อหา Answer-First สำหรับ AEO

> หัวใจของ AEO: ให้ "คำตอบเบ็ดเสร็จ" ที่ AI ดึงไปตอบได้ทันที — heading เป็นรูปคำถาม,
> ย่อหน้าแรกตอบให้จบใน 1–3 ประโยค, ระบุ entity (ที่อยู่สัญญา, chainId 96) ให้ชัด

### TASK 7.1 — หน้า/เซกชัน "เกี่ยวกับ + FAQ" (`src/app/about/page.tsx` หรือเซกชันท้ายหน้าแรก)
- [ ] เขียน FAQ โดย heading เป็นคำถามจริง และคำตอบสั้น กระชับ ตรงประเด็น เช่น:
  - **What is KUB Node Info?** — อธิบายว่าเป็น explorer อ่าน read-only จาก StakeManager
  - **What is a validator on the KUB Chain?**
  - **What is the difference between a Pool Node and a Solo Node?** (Pool มี `validatorShareContract`, Solo ไม่มี)
  - **What is staking power?** (totalStake ÷ totalStaked ของเครือข่าย)
  - **What is the commission rate?** (basis points → %)
  - **How are validator rewards calculated/distributed?**
  - **How often is the data updated?** (อ่านเชนใหม่ทุก 60 วินาทีผ่าน ISR)
  - **Which smart contracts does this read from?** (StakeManagerStorageV2 read, StakeManagerV2 write — ใส่ที่อยู่จริง)
  - **Is this the official KUB staking site?** (ไม่ใช่ — unofficial, ไม่สังกัด KUB Foundation)
- [ ] ใช้ semantic tokens (`text-ink`, `bg-card`, `border-line`) ให้ธีม dark/light ทำงาน
- [ ] ผูก `FAQPage` JSON-LD (TASK 6.4) ให้ตรงข้อความ
- [ ] เพิ่มลิงก์เข้าหน้านี้จาก Footer/Nav (internal linking)

### TASK 7.2 — สัญญาณความสด (freshness) ที่ "มองเห็นได้"
- [ ] แสดงข้อความ "Data as of {เวลา}" บนหน้าแรก/หน้า detail (ช่วยทั้งผู้ใช้และ AEO ว่าข้อมูลสด)
- [ ] เวลานี้ผูกกับรอบ ISR — ส่ง timestamp จาก server component ลงมา
- **เหตุผล:** answer engine ให้น้ำหนักกับความสด/มี timestamp ชัดเจน

### TASK 7.3 — Glossary มองเห็นได้ + DefinedTerm
- [ ] เซกชันคำนิยามสั้น ๆ (Validator / Pool / Solo / Staking Power / Commission / Delegation / Self Stake)
- [ ] ผูก `DefinedTermSet` (TASK 6.5)

### TASK 7.4 — `llms.txt` (มาตรฐานสำหรับ AI ที่กำลังนิยม)
- [ ] เพิ่ม `public/llms.txt` สรุปว่าเว็บนี้คืออะไร, หน้า/แหล่งข้อมูลหลัก, ที่อยู่สัญญา, ลิงก์ sitemap
  ```
  # KUB Node Info
  > Read-only explorer for validators/nodes on the KUB Chain (Bitkub Chain, chainId 96).
  > Data is read live from the StakeManagerStorageV2 smart contract.

  ## Pages
  - [Overview](/) : network stats + pool/solo validator list
  - [Stake Manager](/stake-manager) : wallet-connected node management
  - [FAQ / About](/about) : definitions and common questions

  ## Notes
  - Unofficial; not affiliated with the KUB Foundation.
  - StakeManager (read): 0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d
  - StakeManagerV2 (write): 0x443502b3F7C0934576F49CDa084f78640f56A80F
  ```
- **DoD:** เปิด `/llms.txt` ได้และเนื้อหาตรงปัจจุบัน

---

## 8. Phase 6 — Semantic HTML & On-page polish

### TASK 8.1 — ตรวจโครงสร้าง heading
- [ ] ทุกหน้าให้มี **H1 เดียว** ที่สื่อหัวข้อหน้า (home: Hero h1 ✅ / detail: ชื่อ validator ✅ / stake-manager ✅)
- [ ] ลำดับ H2/H3 ไล่ตามตรรกะ ไม่ข้ามระดับ

### TASK 8.2 — Alt text / รูปภาพ
- [ ] `Avatar` ของ validator ต้องมี `alt` สื่อชื่อ (เช่น `alt="{name} logo"`)
- [ ] ถ้าจะใช้รูป logo จาก registry ให้พิจารณา `next/image` เพื่อ LCP/optimization

### TASK 8.3 — Machine-readable tables/links
- [ ] ตาราง Solo node ใช้ `<table>` semantic + `<th scope>` ให้ดึงข้อมูลง่าย
- [ ] ลิงก์ภายในใช้ `next/link` และข้อความลิงก์สื่อความหมาย (ไม่ใช่ "click here")

### TASK 8.4 — ความยาว title/description
- [ ] title ≤ ~60 ตัวอักษร, description ~110–160 ตัวอักษร (ตัด/ปรับ description ที่ฝังตัวเลขให้ไม่ยาวเกิน)

---

## 9. Phase 7 — Performance / Core Web Vitals (ปัจจัยอันดับ SEO)

- [ ] **TASK 9.1** — Fonts: ใช้ `next/font` (Roboto) อยู่แล้ว ✅ ตรวจว่าไม่มี FOUT/CLS เพิ่ม
- [ ] **TASK 9.2** — รูป validator logo ผ่าน `next/image` (กำหนด width/height กัน CLS)
- [ ] **TASK 9.3** — ตรวจ LCP/CLS/INP ของหน้าแรกและ detail ด้วย Lighthouse (เป้า SEO ≥ 95, Perf ≥ 90)
- [ ] **TASK 9.4** — ยืนยัน RSC/ISR ทำงาน (HTML มีเนื้อหา validator ตั้งแต่ server — ดีต่อ crawler ที่ไม่รัน JS)
- [ ] **TASK 9.5** — พิจารณา `htmlLimitedBots` ใน `next.config.ts` หากต้องบังคับให้บอตได้ metadata ครบใน `<head>`

---

## 10. Phase 8 — Verification & Validation

### TASK 10.1 — ตรวจ head tags จริง
- [ ] `npm run build && npm start` แล้ว `view-source` ของ `/`, `/nodes/{addr}`, `/stake-manager`
- [ ] ยืนยันมี: title, description, canonical (absolute), og:*, twitter:*, JSON-LD

### TASK 10.2 — เขียน Playwright assertion (โปรเจกต์มี playwright อยู่แล้ว)
- [ ] สคริปต์เช็คว่าแต่ละหน้ามี meta tags + JSON-LD ครบ และ `/robots.txt`, `/sitemap.xml`, `/llms.txt` ตอบ 200
  (วางใน `research/` ตามแนวสคริปต์เดิม เช่น `research/check-seo.mjs`)

### TASK 10.3 — Validators ภายนอก
- [ ] Google Rich Results Test — JSON-LD ทุกชนิดผ่าน
- [ ] schema.org validator — ไม่มี error
- [ ] Lighthouse SEO ≥ 95
- [ ] OG: Facebook Sharing Debugger / X Card Validator / LINE — แสดงการ์ด+รูปถูก

### TASK 10.4 — หลัง deploy (production)
- [ ] ยืนยัน `metadataBase`/canonical ชี้โดเมนจริง
- [ ] Submit sitemap ที่ Google Search Console + Bing Webmaster Tools
- [ ] ตรวจ `robots.txt` ปลายทางว่าตรงกับที่ตั้งใจ (อย่าเผลอ noindex ทั้งเว็บ)

---

## 11. Definition of Done (เช็กลิสต์รวม)

**SEO**
- [ ] `metadataBase` + canonical absolute ทุกหน้า
- [ ] OG + Twitter card ครบ พร้อม OG image (ราก + ต่อ validator)
- [ ] `robots.txt` + `sitemap.xml` ใช้งานได้และครอบคลุมทุก node
- [ ] favicon.ico + apple-icon + manifest + public/ สะอาด
- [ ] title/description ไม่ซ้ำ ความยาวเหมาะสม ทุกหน้า
- [ ] Lighthouse SEO ≥ 95

**AEO**
- [ ] JSON-LD: WebSite, Organization, BreadcrumbList, Dataset, ItemList, FAQPage, DefinedTermSet — ผ่าน validator
- [ ] เนื้อหา FAQ/Glossary answer-first + heading เป็นคำถาม
- [ ] entity ชัด (ที่อยู่สัญญา, chainId 96, สถานะ unofficial)
- [ ] สัญญาณความสด ("Data as of …") มองเห็นได้
- [ ] `llms.txt` ใช้งานได้ + AI bots ไม่ถูกบล็อกใน robots

---

## 12. ภาคผนวก

### A. ลำดับการทำที่แนะนำ
1. Prerequisites (§2) → 2. Core metadata (§3) → 3. robots+sitemap (§4) →
4. OG images (§5) → 5. JSON-LD (§6) → 6. AEO content (§7) →
7. Semantic/Perf polish (§8–9) → 8. Verify (§10)

ทำตามลำดับนี้เพราะ §3–6 พึ่ง `SITE_URL`/`metadataBase` จาก §2 และ §6 (FAQPage/DefinedTermSet)
ต้องมีเนื้อหา §7 อยู่จริงก่อนถึงจะ markup ได้ถูกต้อง

### B. ไฟล์ที่จะถูกสร้าง/แก้ (สรุป)
| ไฟล์ | สร้าง/แก้ | งาน |
|---|---|---|
| `.env.example` | แก้ | §2.1 |
| `src/lib/site.ts` | สร้าง | §2.1 |
| `public/` (ลบ svg ขยะ), `src/app/favicon.ico`, `src/app/apple-icon.png` | แก้/สร้าง | §2.2 |
| `src/app/layout.tsx` | แก้ | §3.1, §6.1 |
| `src/app/page.tsx` | แก้ | §3.2, §6.3, §7.2 |
| `src/app/stake-manager/page.tsx` | แก้ | §3.3 |
| `src/app/nodes/[address]/page.tsx` | แก้ | §3.4, §6.2 |
| `src/app/robots.ts` | สร้าง | §4.1 |
| `src/app/sitemap.ts` | สร้าง | §4.2 |
| `src/app/opengraph-image.tsx` | สร้าง | §5.1 |
| `src/app/nodes/[address]/opengraph-image.tsx` | สร้าง | §5.2 |
| `src/components/seo/JsonLd.tsx` | สร้าง | §6 |
| `src/app/about/page.tsx` (+ FAQ/Glossary) | สร้าง | §7.1, §7.3 |
| `public/llms.txt` | สร้าง | §7.4 |
| `research/check-seo.mjs` | สร้าง | §10.2 |

### C. ค่าคงที่ entity (ใช้ใน JSON-LD / llms.txt / FAQ)
- Chain: **KUB Chain (Bitkub Chain), chainId 96**, native token **KUB**
- Explorer: `https://www.kubscan.com`
- StakeManager (read, StakeManagerStorageV2): `0xFd98aac1Fbc57e6BC16A167452DBA7af2B6a4c0d`
- StakeManagerV2 (write): `0x443502b3F7C0934576F49CDa084f78640f56A80F`
- สถานะ: **Unofficial · ไม่สังกัด KUB Foundation**
