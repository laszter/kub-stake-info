import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-5xl font-bold text-brand">404</p>
      <h1 className="mt-3 text-xl font-bold text-ink">Node not found</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This address is not a validator on the StakeManager contract, or it has
        never been registered.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-btn-primary px-5 py-2.5 text-sm font-medium text-on-btn-primary transition-colors hover:bg-btn-primary-hover"
      >
        Back to all nodes
      </Link>
    </div>
  );
}
