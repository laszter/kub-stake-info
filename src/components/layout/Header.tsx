import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { MobileNav } from "./MobileNav";
import { EXPLORER_URL } from "@/lib/chain";
import { STAKE_MANAGER_ADDRESS } from "@/lib/contract";

const navLinks = [
  { label: "Overview", href: "/" },
  { label: "Nodes", href: "/#nodes" },
  {
    label: "KUB Scan",
    href: `${EXPLORER_URL}/address/${STAKE_MANAGER_ADDRESS}`,
    external: true,
  },
  { label: "Staking", href: "https://staking.kubchain.com", external: true },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-bold tracking-tight text-ink">
            KUB <span className="text-ink-muted font-medium">Node Info</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-ink-soft transition-colors hover:text-brand"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-ink-soft transition-colors hover:text-brand"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`${EXPLORER_URL}/address/${STAKE_MANAGER_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            View Contract
          </a>
          <MobileNav links={navLinks} />
        </div>
      </div>
    </header>
  );
}
