// design-sync bundle entry. This repo is a Next.js app (no published dist), so
// we hand the converter an explicit barrel of the reusable UI primitives. Each
// re-export becomes a window.KubStakeUI.<Name> the preview cards mount.
// ThemeProvider is exported (not listed as a component) so cfg.provider can wrap
// previews — ThemeToggle reads its context. Passed via --entry; the 11 cards
// are enumerated in config.json `componentSrcMap`.
export { Avatar } from "@/components/ui/Avatar";
export { Button } from "@/components/ui/Button";
export { Chevron } from "@/components/ui/Chevron";
export { ConfirmDialog } from "@/components/ui/ConfirmDialog";
export { CopyButton } from "@/components/ui/CopyButton";
export { DataFreshness } from "@/components/ui/DataFreshness";
export { InfoHint } from "@/components/ui/InfoHint";
export { Logo } from "@/components/ui/Logo";
export { Modal } from "@/components/ui/Modal";
export { Pagination } from "@/components/ui/Pagination";
export { ThemeToggle } from "@/components/ui/ThemeToggle";

export { ThemeProvider } from "@/providers/ThemeProvider";
