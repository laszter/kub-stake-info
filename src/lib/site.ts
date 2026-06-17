/**
 * Single source of truth for the site's public identity — used by metadata,
 * canonical URLs, sitemap, robots, OG images and JSON-LD.
 *
 * `NEXT_PUBLIC_SITE_URL` must be set in production (e.g. https://kubnodeinfo.com)
 * so OG/canonical/sitemap URLs are absolute. Falls back to localhost in dev.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "KUB Node Info";

export const SITE_TAGLINE = "KUB Chain Validators & Staking Explorer";

export const SITE_DESCRIPTION =
  "Explore validators and node information on the KUB Chain — stake, delegation, rewards and commission, read live from the StakeManager smart contract.";

/** Entity facts re-used across JSON-LD / llms.txt / FAQ copy. */
export const KUB_CHAIN_ID = 96;
export const KUB_CHAIN_NAME = "KUB Chain";

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
