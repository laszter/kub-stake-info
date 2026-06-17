"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { NavLinks, type NavLink } from "./NavLinks";
import { shortenAddress } from "@/lib/format";
import { useWalletAuth } from "@/providers/WalletAuthProvider";

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { isVerified, reset } = useWalletAuth();

  // Close when the route changes (e.g. tapping "Stake Manager").
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: Escape closes; a pointer outside the menu closes. Clicks on the
  // toggle and the menu itself live inside the container, so they're ignored.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="flex h-11 w-11 items-center justify-center rounded-md text-ink-soft transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-nav"
          className="animate-reveal absolute left-0 right-0 top-16 border-b border-line bg-card shadow-sm"
        >
          <nav className="mx-auto flex max-w-6xl flex-col gap-0.5 px-4 py-3">
            <NavLinks
              variant="mobile"
              links={links}
              onNavigate={() => setOpen(false)}
            />

            {isConnected && address && isVerified && (
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-line px-3 pt-3">
                <span className="font-mono text-sm text-ink-soft">
                  {shortenAddress(address)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    disconnect();
                    setOpen(false);
                  }}
                  className="rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2"
                >
                  Disconnect
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
