"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { CoachListCard } from "@/features/coaches/coach-cards";
import { PlayerBottomNav, PlayerDesktopNav } from "@/components/layout/player-nav";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import type { CoachPublicProfile } from "@/lib/types";

const LOCATION_FILTERS = ["All", "Lekki", "VI", "Ikoyi", "Oniru", "Ikeja", "Yaba"];
const SPEC_OPTIONS     = ["Beginners", "Kids", "Adults", "Competitive", "Fitness"];

const PRICE_RANGES = [
  { label: "Any price",   min: 0,     max: Infinity },
  { label: "Under ₦10k", min: 0,     max: 10000    },
  { label: "₦10k–₦20k", min: 10000, max: 20000    },
  { label: "₦20k–₦35k", min: 20000, max: 35000    },
  { label: "₦35k+",      min: 35000, max: Infinity },
] as const;

type PriceRangeLabel = (typeof PRICE_RANGES)[number]["label"];
type SortOption      = "Best Match" | "Highest Rated" | "Most Reviewed" | "Lowest Price" | "Newest";
type AvailFilter     = "Any" | "Has availability";

export function CoachesClient({ initialCoaches }: { initialCoaches: CoachPublicProfile[] }) {
  const [query,       setQuery]       = useState("");
  const [location,    setLocation]    = useState("All");
  const [specs,       setSpecs]       = useState<string[]>([]);
  const [priceLabel,  setPriceLabel]  = useState<PriceRangeLabel>("Any price");
  const [availFilter, setAvailFilter] = useState<AvailFilter>("Any");
  const [sort,        setSort]        = useState<SortOption>("Best Match");
  const [showFilter,  setShowFilter]  = useState(false);
  const [showSort,    setShowSort]    = useState(false);

  const activePrice  = PRICE_RANGES.find((r) => r.label === priceLabel) ?? PRICE_RANGES[0];
  const filterCount  = [
    location !== "All",
    specs.length > 0,
    priceLabel !== "Any price",
    availFilter !== "Any",
  ].filter(Boolean).length;

  const results = useMemo(() => {
    let list = initialCoaches.filter((coach) => {
      if (
        location !== "All" &&
        !(coach.primary_location ?? "").toLowerCase().includes(location.toLowerCase()) &&
        !coach.service_areas.some((a) => a.toLowerCase().includes(location.toLowerCase()))
      ) return false;

      if (query) {
        const hay = [coach.full_name, coach.headline ?? "", ...coach.specializations, ...coach.service_areas, coach.primary_location ?? ""]
          .join(" ").toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }

      if (specs.length > 0 && !specs.some((s) => coach.specializations.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))))
        return false;

      if ((coach.hourly_rate_ngn ?? Infinity) < activePrice.min || (coach.hourly_rate_ngn ?? Infinity) > activePrice.max)
        return false;

      if (availFilter === "Has availability" && !coach.has_availability) return false;

      return true;
    });

    if (sort === "Highest Rated")  list = [...list].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    if (sort === "Most Reviewed")  list = [...list].sort((a, b) => b.review_count - a.review_count);
    if (sort === "Lowest Price")   list = [...list].sort((a, b) => (a.hourly_rate_ngn ?? Infinity) - (b.hourly_rate_ngn ?? Infinity));
    if (sort === "Newest")         list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [initialCoaches, location, query, specs, activePrice, availFilter, sort]);

  const reset = () => { setLocation("All"); setSpecs([]); setPriceLabel("Any price"); setAvailFilter("Any"); setQuery(""); };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-5">
          <Link
            href="/"
            aria-label="Back"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] transition active:scale-[0.97]"
          >
            <ArrowLeft className="size-4.5" />
          </Link>
          <h1 className="text-[15px] font-black">Book a Coach</h1>
          <div className="flex items-center gap-2">
            <PlayerDesktopNav active="browse" />
            <button
              onClick={() => setShowSort(true)}
              className="hidden h-10 items-center gap-1.5 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 text-xs font-black sm:flex"
            >
              Sort <ChevronDown className="size-3.5" />
            </button>
            <button
              onClick={() => setShowFilter(true)}
              className="relative flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] transition active:scale-[0.97]"
              aria-label="Filters"
            >
              <SlidersHorizontal className="size-4" />
              {filterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-[var(--lobb-clay)] text-[9px] font-black text-white ring-2 ring-[var(--lobb-bg)]">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 sm:px-5">

        {/* ── Search bar ── */}
        <div className="pt-4">
          <label className="flex h-[52px] items-center gap-3 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 shadow-[0_6px_20px_rgba(58,43,20,0.05)]">
            <Search className="size-5 shrink-0 text-[var(--lobb-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coach, area, skill"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold outline-none placeholder:text-[#b0a89e] focus:ring-0"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear" className="flex size-7 items-center justify-center rounded-full bg-[var(--lobb-surface-2)]">
                <X className="size-3.5 text-[var(--lobb-muted)]" />
              </button>
            )}
          </label>
        </div>

        {/* ── Location chips ── */}
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {LOCATION_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setLocation(item)}
              className={`h-9 shrink-0 rounded-full px-4 text-sm font-black transition ${
                location === item
                  ? "bg-[var(--lobb-black)] text-white"
                  : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)] hover:border-[var(--lobb-black)]/30 hover:text-[var(--lobb-black)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* ── Result meta ── */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--lobb-muted)]">
            <span className="font-black text-[var(--lobb-black)]">{results.length}</span> coach{results.length !== 1 ? "es" : ""}
            {filterCount > 0 || query ? " · filtered" : ""}
          </p>
          {(filterCount > 0 || query) && (
            <button onClick={reset} className="text-xs font-black text-[var(--lobb-clay)] hover:underline">
              Clear all
            </button>
          )}
        </div>

        {/* ── Coach cards ── */}
        <div className="mt-3 flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
          {results.length ? (
            results.map((coach) => <CoachListCard key={coach.id} coach={coach} />)
          ) : (
            <div className="md:col-span-2">
              <LobbEmptyState
                title="No coaches match your search."
                body="Try a different area or clear your filters."
                action={
                  <button className="rounded-full bg-[var(--lobb-black)] px-5 py-2 text-sm font-black text-white" onClick={reset}>
                    Clear filters
                  </button>
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Filter sheet ── */}
      {showFilter && (
        <BottomSheet onClose={() => setShowFilter(false)}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Filter Coaches</h2>
            <button className="text-sm font-bold text-[var(--lobb-clay)]" onClick={() => { resetFiltersOnly(); }}>
              Reset
            </button>
          </div>
          <ChipBlock
            title="Location"
            items={LOCATION_FILTERS.slice(1)}
            selected={location === "All" ? [] : [location]}
            onToggle={(item) => setLocation((prev) => (prev === item ? "All" : item))}
          />
          <ChipBlock
            title="Specialization"
            items={SPEC_OPTIONS}
            selected={specs}
            onToggle={(item) => setSpecs((prev) => prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item])}
          />
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-black">Price range</h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setPriceLabel(r.label)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    priceLabel === r.label
                      ? "border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay-dark)]"
                      : "border-[var(--lobb-border)] text-[var(--lobb-muted)]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-black">Availability</h3>
            <div className="flex gap-2">
              {(["Any", "Has availability"] as AvailFilter[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAvailFilter(opt)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    availFilter === opt
                      ? "border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay-dark)]"
                      : "border-[var(--lobb-border)] text-[var(--lobb-muted)]"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowFilter(false)}
            className="mt-6 h-14 w-full rounded-full bg-[var(--lobb-black)] font-black text-white"
          >
            Show {results.length} Coach{results.length !== 1 ? "es" : ""}
          </button>
        </BottomSheet>
      )}

      {/* ── Sort sheet ── */}
      {showSort && (
        <BottomSheet onClose={() => setShowSort(false)}>
          <h2 className="mb-4 text-lg font-black">Sort</h2>
          {(["Best Match", "Highest Rated", "Most Reviewed", "Lowest Price", "Newest"] as SortOption[]).map((option) => (
            <button
              key={option}
              className="flex w-full items-center justify-between border-b border-[var(--lobb-border)] py-4 text-left font-semibold last:border-0"
              onClick={() => { setSort(option); setShowSort(false); }}
            >
              <span>{option}</span>
              {sort === option ? (
                <Check className="size-4 text-[var(--lobb-clay)]" />
              ) : (
                <span className="size-4 rounded-full border border-[var(--lobb-border)]" />
              )}
            </button>
          ))}
        </BottomSheet>
      )}

      <PlayerBottomNav active="browse" />
    </main>
  );

  function resetFiltersOnly() {
    setLocation("All");
    setSpecs([]);
    setPriceLabel("Any price");
    setAvailFilter("Any");
  }
}

function ChipBlock({
  title, items, selected, onToggle,
}: { title: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return (
    <div className="mt-5">
      <h3 className="mb-3 text-sm font-black">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition ${
                active
                  ? "border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay-dark)]"
                  : "border-[var(--lobb-border)] text-[var(--lobb-muted)]"
              }`}
            >
              {item}
              {active && <Check className="size-3.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-[var(--lobb-surface)] p-5 pb-10 shadow-[0_-18px_40px_rgba(0,0,0,0.18)] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--lobb-border)]" />
        {children}
      </div>
    </div>
  );
}
