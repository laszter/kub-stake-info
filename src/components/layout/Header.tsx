import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NavLinks, type NavLink } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { EXPLORER_URL } from "@/lib/chain";
import { STAKE_MANAGER_V2_ADDRESS } from "@/lib/contract";

const navLinks: NavLink[] = [
  { label: "Overview", href: "/" },
  { label: "Stake Manager", href: "/stake-manager" },
  { label: "FAQ", href: "/about" },
  {
    label: "KUB Scan",
    href: `${EXPLORER_URL}/address/${STAKE_MANAGER_V2_ADDRESS}`,
    external: true,
  },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
        >
          <Logo className="h-7 w-7 shrink-0" />
          <span className="truncate text-lg font-bold tracking-tight text-ink">
            KUB <span className="font-medium text-ink-muted">Node Info</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <NavLinks variant="desktop" links={navLinks} />
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <ConnectButton />
          <MobileNav links={navLinks} />
        </div>
      </div>
    </header>
  );
}
