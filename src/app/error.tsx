"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning-light text-2xl">
        ⚠️
      </div>
      <h1 className="mt-4 text-xl font-bold text-ink">
        Couldn&apos;t load chain data
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        The KUB RPC may be temporarily unavailable. Please try again.
      </p>
      {error.message && (
        <code className="mt-3 max-w-full overflow-x-auto rounded-md bg-surface px-3 py-2 text-xs text-ink-soft">
          {error.message}
        </code>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
      >
        Try again
      </button>
    </div>
  );
}
