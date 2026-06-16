"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { label: string; href: string; external?: boolean };

/** Shared focus ring, matching the Button component's vocabulary. */
const FOCUS_RING =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2";

function ExternalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-60"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}

/**
 * Renders the nav links with a current-page indicator. Hash links like
 * "/#nodes" scroll within a page; `usePathname` drops the hash, so only true
 * route links are marked active — otherwise "Overview" and "Nodes" would both
 * light up on the home page.
 */
export function NavLinks({
  links,
  variant,
  onNavigate,
}: {
  links: NavLink[];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (link: NavLink) =>
    !link.external && !link.href.includes("#") && pathname === link.href;

  return (
    <>
      {links.map((link) => {
        const active = isActive(link);

        const className =
          variant === "mobile"
            ? [
                "flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-light text-brand"
                  : "text-ink-soft hover:bg-surface hover:text-brand",
                FOCUS_RING,
              ].join(" ")
            : [
                "relative inline-flex items-center gap-1 py-1 text-sm font-medium transition-colors",
                active ? "text-ink" : "text-ink-soft hover:text-brand",
                active
                  ? "after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand"
                  : "",
                FOCUS_RING,
              ].join(" ");

        return link.external ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} (opens in new tab)`}
            onClick={onNavigate}
            className={className}
          >
            {link.label}
            <ExternalIcon />
          </a>
        ) : (
          <Link
            key={link.label}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={className}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
