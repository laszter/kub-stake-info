# Product

## Register

product

## Users

KUB Chain stakeholders coming to look up or act on validator data:

- **Delegators / investors** — comparing validators (stake size, commission, staking power, status) to decide where to delegate. They arrive on a Node Detail page from search, the node list, or a shared link, often before they trust the project with funds.
- **Node owners (validators)** — checking their own node's live state: stake, accrued rewards, commission, status. Power users who revisit often and cross-reference the wallet-connected Stake Manager.
- **Researchers / developers** — reading on-chain values, network stats, contract addresses; auditing or debugging. They want exact numbers and a path to the block explorer.

Context: read-mostly. The public explorer (node list, Node Detail) requires no wallet; the Stake Manager is gated behind a connected, signature-verified wallet. Numbers represent real money, so confidence in their accuracy is the whole point.

## Product Purpose

A KUB Chain validator explorer with an integrated, wallet-connected Stake Manager. It surfaces on-chain validator state (reads via StakeManagerStorageV2) in a fast, legible, SEO-indexed form, and lets node owners act on their nodes (writes via StakeManagerV2). Success = a delegator can size up any validator in seconds and trust the figures, and an owner can manage a node without dropping to a raw block explorer.

## Brand Personality

Trustworthy & precise. Voice is plain, exact, and unhyped — it states numbers and lets them speak. Three words: **credible, clear, calm.** The interface should feel like financial infrastructure (think a well-run explorer or a Stripe dashboard), not a hype-driven DeFi launch. Confidence comes from accuracy, legibility, and restraint — never from loud color or motion.

## Anti-references

- Generic crypto/DeFi dashboards: neon-on-black gradients, glassmorphism, glowing cards, animated number counters, "🚀 APY" hype framing.
- Gradient text, gradient-accent hero metrics, decorative motion.
- Marketing-landing tropes pushed onto a data page (eyebrow kickers, 01/02/03 section numbers, oversized display headings).
- Anything that makes real financial figures feel like a game or a pitch.

## Design Principles

1. **The number is the product.** Money figures get the strongest hierarchy, exact precision on demand, and never compete with chrome or decoration.
2. **Earned trust over flash.** Legibility, correct contrast, and honest states build credibility; visual spectacle erodes it here.
3. **Read first, act second.** The public explorer must be fully usable with no wallet; actions are progressively revealed, never blocking the read.
4. **Show freshness and source.** On-chain data has a timestamp and a path to the block explorer — users can always verify.
5. **Consistent vocabulary.** The same tile, badge, address, and KUB-amount patterns mean the same thing across explorer and Stake Manager.

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body text ≥4.5:1 (incl. the muted-gray labels that data tiles lean on), large text ≥3:1. Full keyboard navigation with visible focus, semantic headings/landmarks, state changes announced. Class-based dark mode must meet contrast in both themes. Respect `prefers-reduced-motion`. Never convey status (Active / Unstaked) by color alone.
