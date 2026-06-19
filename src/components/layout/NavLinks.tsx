"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
 * Hash links like "/#nodes" scroll within a page; `usePathname` drops the hash,
 * so only true route links are marked active — otherwise "Overview" and "Nodes"
 * would both light up on the home page.
 */
const isActiveOn = (pathname: string) => (link: NavLink) =>
  !link.external && !link.href.includes("#") && pathname === link.href;

/**
 * Desktop nav with a single "magic line" underline that rests under the active
 * route and glides to its new spot via a CSS transform transition whenever the
 * route changes. Reduced-motion users get an instant move via the global
 * override in globals.css.
 */
function DesktopNav({
  links,
  onNavigate,
}: {
  links: NavLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = isActiveOn(pathname);
  const activeIndex = links.findIndex(isActive);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [rect, setRect] = useState({ left: 0, width: 0 });
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  // Position the underline under the active route. Re-measure on route change
  // and on any layout shift (resize, font swap, show/hide).
  useEffect(() => {
    if (activeIndex < 0) {
      setVisible(false);
      return;
    }
    const measure = () => {
      const el = itemRefs.current[activeIndex];
      if (!el) return;
      setRect({ left: el.offsetLeft, width: el.offsetWidth });
      setVisible(true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [activeIndex, pathname, links]);

  // Snap into place on first paint, then enable the glide for later moves so the
  // underline doesn't visibly grow in from the left on load.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div ref={containerRef} className="relative flex items-center gap-7">
      {links.map((link, i) => {
        const active = isActive(link);
        const className = [
          "relative inline-flex items-center gap-1 py-1 text-sm font-medium transition-colors",
          active ? "text-ink" : "text-ink-soft hover:text-brand",
          FOCUS_RING,
        ].join(" ");
        const common = {
          ref: (el: HTMLAnchorElement | null) => {
            itemRefs.current[i] = el;
          },
          className,
        };

        return link.external ? (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${link.label} (opens in new tab)`}
            onClick={onNavigate}
            {...common}
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
            {...common}
          >
            {link.label}
          </Link>
        );
      })}

      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-1.5 left-0 h-0.5 rounded-full bg-brand ${
          ready ? "transition-[transform,width,opacity] duration-300 ease-out" : ""
        }`}
        style={{
          width: rect.width,
          transform: `translateX(${rect.left}px)`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

/** Stacked links with a pill highlight for the open mobile menu. */
function MobileNavLinks({
  links,
  onNavigate,
}: {
  links: NavLink[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = isActiveOn(pathname);

  return (
    <>
      {links.map((link) => {
        const active = isActive(link);
        const className = [
          "flex items-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-brand-light text-brand"
            : "text-ink-soft hover:bg-surface hover:text-brand",
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

/** Renders the nav links with a current-page indicator, per layout variant. */
export function NavLinks({
  links,
  variant,
  onNavigate,
}: {
  links: NavLink[];
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  return variant === "desktop" ? (
    <DesktopNav links={links} onNavigate={onNavigate} />
  ) : (
    <MobileNavLinks links={links} onNavigate={onNavigate} />
  );
}
