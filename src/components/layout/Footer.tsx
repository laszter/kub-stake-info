import { EXPLORER_URL } from "@/lib/chain";
import { STAKE_MANAGER_ADDRESS } from "@/lib/contract";
import { shortenAddress } from "@/lib/format";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:px-6">
        <p>
          Data read live from{" "}
          <a
            href={`${EXPLORER_URL}/address/${STAKE_MANAGER_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink-soft hover:text-brand"
          >
            StakeManager ({shortenAddress(STAKE_MANAGER_ADDRESS)})
          </a>{" "}
          on KUB Chain.
        </p>
        <p>Unofficial explorer · Not affiliated with KUB Foundation</p>
      </div>
    </footer>
  );
}
