export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  const items: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) items.push("…");
    items.push(p);
    prev = p;
  }

  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition-colors";

  return (
    <nav className="mt-5 flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={`${btn} border border-line text-ink-soft disabled:opacity-40 enabled:hover:border-brand enabled:hover:text-brand`}
        aria-label="Previous page"
      >
        ‹
      </button>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`e${i}`} className="px-1 text-ink-muted">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            aria-current={it === page}
            className={`${btn} ${
              it === page
                ? "bg-btn-primary text-on-btn-primary"
                : "border border-line text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        className={`${btn} border border-line text-ink-soft disabled:opacity-40 enabled:hover:border-brand enabled:hover:text-brand`}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}
