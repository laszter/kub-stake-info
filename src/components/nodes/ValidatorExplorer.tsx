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
    <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
      {title}
      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted">
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
      on ? "bg-brand-light text-brand-dark" : "text-ink-muted hover:text-ink"
    }`;

  return (
    <div id="nodes" className="scroll-mt-20 space-y-10">
      {/* ---------- Pool Node ---------- */}
      <section className="rounded-card border border-line bg-white p-5 sm:p-6">
        <SectionHeading title="Pool Node" count={filteredPools.length} />

        {/* Toolbar */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
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
              placeholder="Search by name, wallet address"
              className="w-full rounded-full border border-line bg-white py-2 pl-9 pr-4 text-sm outline-none transition-colors focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              Sort by:
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1 rounded-lg border border-line p-1">
              <button type="button" onClick={() => setView("grid")} className={toggleBtn(view === "grid")} aria-label="Grid view">
                <GridIcon active={view === "grid"} />
              </button>
              <button type="button" onClick={() => setView("list")} className={toggleBtn(view === "list")} aria-label="List view">
                <ListIcon active={view === "list"} />
              </button>
            </div>
          </div>
        </div>

        {/* Pool list */}
        {poolsOnPage.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-muted">
            No pool nodes match your search.
          </p>
        ) : view === "grid" ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {poolsOnPage.map((v) => (
              <ValidatorCard key={v.address} v={v} />
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {poolsOnPage.map((v) => (
              <ValidatorRow key={v.address} v={v} />
            ))}
          </div>
        )}

        <Pagination page={safePoolPage} pageCount={poolPageCount} onChange={setPoolPage} />
      </section>

      {/* ---------- Solo Node ---------- */}
      <section className="rounded-card border border-line bg-white p-5 sm:p-6">
        <SectionHeading title="Solo Node" count={filteredSolos.length} />
        <div className="mt-5">
          <SoloNodeTable rows={solosOnPage} />
        </div>
        <Pagination page={safeSoloPage} pageCount={soloPageCount} onChange={setSoloPage} />
      </section>
    </div>
  );
}
