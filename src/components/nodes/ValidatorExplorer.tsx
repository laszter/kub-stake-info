"use client";

import { useMemo, useState } from "react";
import type { ValidatorCardView } from "@/lib/view";
import { ValidatorCard, ValidatorRow } from "./ValidatorCard";
import { SoloNodeTable } from "./SoloNodeTable";
import { Pagination } from "@/components/ui/Pagination";

type SortKey = "stake" | "power" | "fee" | "name";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "stake", label: "Total Staking" },
  { key: "power", label: "Staking Power" },
  { key: "fee", label: "Service Fee" },
  { key: "name", label: "Name" },
];

const POOLS_PER_PAGE = 9;
const SOLOS_PER_PAGE = 10;

function sortValidators(list: ValidatorCardView[], key: SortKey) {
  const sorted = [...list];
  switch (key) {
    case "power":
    case "stake":
      sorted.sort((a, b) => b.totalStakeNum - a.totalStakeNum);
      break;
    case "fee":
      sorted.sort((a, b) => b.feeNum - a.feeNum);
      break;
    case "name":
      sorted.sort((a, b) =>
        (a.name ?? a.address).localeCompare(b.name ?? b.address),
      );
      break;
  }
  return sorted;
}

function SectionHeading({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-ink">
      {title}
      <span className="rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-ink-soft tabular-nums">
        {count}
      </span>
    </h2>
  );
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "3" : "2"} strokeLinecap="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

export function ValidatorExplorer({
  pools,
  solos,
}: {
  pools: ValidatorCardView[];
  solos: ValidatorCardView[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("stake");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [poolPage, setPoolPage] = useState(1);
  const [soloPage, setSoloPage] = useState(1);

  // Normalise share bars against each group's strongest node, computed over the
  // full set so bars stay comparable across pages and searches.
  const maxPoolPower = useMemo(
    () => pools.reduce((m, p) => Math.max(m, p.powerNum), 0),
    [pools],
  );
  const maxSoloPower = useMemo(
    () => solos.reduce((m, s) => Math.max(m, s.powerNum), 0),
    [solos],
  );

  const matches = (v: ValidatorCardView) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      (v.name?.toLowerCase().includes(q) ?? false) ||
      v.address.toLowerCase().includes(q)
    );
  };

  const filteredPools = useMemo(
    () => sortValidators(pools.filter(matches), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pools, query, sort],
  );
  const filteredSolos = useMemo(
    () => solos.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [solos, query],
  );

  const poolPageCount = Math.max(1, Math.ceil(filteredPools.length / POOLS_PER_PAGE));
  const soloPageCount = Math.max(1, Math.ceil(filteredSolos.length / SOLOS_PER_PAGE));
  const safePoolPage = Math.min(poolPage, poolPageCount);
  const safeSoloPage = Math.min(soloPage, soloPageCount);

  const poolsOnPage = filteredPools.slice(
    (safePoolPage - 1) * POOLS_PER_PAGE,
    safePoolPage * POOLS_PER_PAGE,
  );
  const solosOnPage = filteredSolos.slice(
    (safeSoloPage - 1) * SOLOS_PER_PAGE,
    safeSoloPage * SOLOS_PER_PAGE,
  );

  const toggleBtn = (on: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
      on ? "bg-card text-brand-dark shadow-sm" : "text-ink-muted hover:text-ink"
    }`;

  return (
    <div id="nodes" className="scroll-mt-20 space-y-12">
      {/* ---------- Pool Node ---------- */}
      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionHeading title="Pool nodes" count={filteredPools.length} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPoolPage(1);
                  setSoloPage(1);
                }}
                placeholder="Search name or address"
                className="w-full rounded-lg border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-ink-muted">
                <span className="hidden sm:inline">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-lg border border-line bg-card px-2.5 py-2 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
                <button type="button" onClick={() => setView("grid")} className={toggleBtn(view === "grid")} aria-label="Grid view" aria-pressed={view === "grid"}>
                  <GridIcon active={view === "grid"} />
                </button>
                <button type="button" onClick={() => setView("list")} className={toggleBtn(view === "list")} aria-label="List view" aria-pressed={view === "list"}>
                  <ListIcon active={view === "list"} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pool list */}
        {poolsOnPage.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-line py-10 text-center text-sm text-ink-muted">
            No pool nodes match your search.
          </p>
        ) : view === "grid" ? (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
            {poolsOnPage.map((v) => (
              <ValidatorCard key={v.address} v={v} maxPower={maxPoolPower} />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {poolsOnPage.map((v) => (
              <ValidatorRow key={v.address} v={v} maxPower={maxPoolPower} />
            ))}
          </div>
        )}

        <Pagination page={safePoolPage} pageCount={poolPageCount} onChange={setPoolPage} />
      </section>

      {/* ---------- Solo Node ---------- */}
      <section>
        <SectionHeading title="Solo nodes" count={filteredSolos.length} />
        <div className="mt-5">
          <SoloNodeTable rows={solosOnPage} maxPower={maxSoloPower} />
        </div>
        <Pagination page={safeSoloPage} pageCount={soloPageCount} onChange={setSoloPage} />
      </section>
    </div>
  );
}
