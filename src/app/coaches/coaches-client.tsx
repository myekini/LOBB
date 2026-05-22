"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Check, ChevronDown, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { CoachListCard } from "@/features/coaches/coach-cards";
import { PlayerBottomNav, PlayerDesktopNav } from "@/components/layout/player-nav";
import { LobbEmptyState } from "@/components/common/lobb-empty-state";
import type { CoachPublicProfile } from "@/lib/types";

const LOCATION_FILTERS = ["All", "Lekki", "VI", "Ikoyi", "Ikeja", "Surulere", "Ajah", "Yaba"];
const SPEC_OPTIONS     = ["Beginners", "Kids", "Adults", "Competitive", "Fitness"];

// Price range presets in NGN
const PRICE_RANGES = [
  { label: "Any price",    min: 0,      max: Infinity },
  { label: "Under ₦10k",  min: 0,      max: 10000    },
  { label: "₦10k–₦20k",  min: 10000,  max: 20000    },
  { label: "₦20k–₦35k",  min: 20000,  max: 35000    },
  { label: "₦35k+",       min: 35000,  max: Infinity },
] as const;

type PriceRangeLabel = (typeof PRICE_RANGES)[number]["label"];
type SortOption = "Best Match" | "Highest Rated" | "Most Reviewed" | "Lowest Price" | "Newest on LOBB";
type AvailFilter = "Any" | "Has availability";

export function CoachesClient({ initialCoaches }: { initialCoaches: CoachPublicProfile[] }) {
  const [query,        setQuery]        = useState("");
  const [location,     setLocation]     = useState("All");
  const [specs,        setSpecs]        = useState<string[]>([]);
  const [priceLabel,   setPriceLabel]   = useState<PriceRangeLabel>("Any price");
  const [availFilter,  setAvailFilter]  = useState<AvailFilter>("Any");
  const [sort,         setSort]         = useState<SortOption>("Best Match");
  const [showFilter,   setShowFilter]   = useState(false);
  const [showSort,     setShowSort]     = useState(false);

  const activePrice = PRICE_RANGES.find((r) => r.label === priceLabel) ?? PRICE_RANGES[0];
  const availableCount = initialCoaches.filter((coach) => coach.has_availability).length;
  const topRatedCoach = initialCoaches.find((coach) => coach.avg_rating != null);
  const filterCount = [
    location !== "All",
    specs.length > 0,
    priceLabel !== "Any price",
    availFilter !== "Any",
  ].filter(Boolean).length;

  const results = useMemo(() => {
    let list = initialCoaches.filter((coach) => {
      // Location
      if (
        location !== "All" &&
        !(coach.primary_location ?? "").toLowerCase().includes(location.toLowerCase()) &&
        !coach.service_areas.some((a) => a.toLowerCase().includes(location.toLowerCase()))
      ) {
        return false;
      }

      // Keyword search
      const haystack = [
        coach.full_name,
        coach.headline ?? "",
        ...coach.specializations,
        ...coach.service_areas,
        coach.primary_location ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (query && !haystack.includes(query.toLowerCase())) return false;

      // Specialization (any match)
      if (
        specs.length > 0 &&
        !specs.some((s) =>
          coach.specializations.some((cs) => cs.toLowerCase().includes(s.toLowerCase()))
        )
      ) {
        return false;
      }

      // Price range
      if (
        (coach.hourly_rate_ngn ?? Infinity) < activePrice.min ||
        (coach.hourly_rate_ngn ?? Infinity) > activePrice.max
      ) {
        return false;
      }

      // Availability filter
      if (availFilter === "Has availability" && !coach.has_availability) return false;

      return true;
    });

    if (sort === "Highest Rated") {
      list = [...list].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
    } else if (sort === "Most Reviewed") {
      list = [...list].sort((a, b) => b.review_count - a.review_count);
    } else if (sort === "Lowest Price") {
      list = [...list].sort((a, b) => (a.hourly_rate_ngn ?? Infinity) - (b.hourly_rate_ngn ?? Infinity));
    } else if (sort === "Newest on LOBB") {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [initialCoaches, location, query, specs, activePrice, availFilter, sort]);

  const resetFilters = () => {
    setLocation("All");
    setSpecs([]);
    setPriceLabel("Any price");
    setAvailFilter("Any");
  };

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-40 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="Go back"
            className="flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] shadow-[0_8px_22px_rgba(13,13,13,0.05)] transition active:scale-[0.97]"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--lobb-muted)]">LOBB coaches</p>
            <h1 className="text-[17px] font-black leading-tight">Book a Coach</h1>
          </div>
          <div className="flex items-center gap-2">
            <PlayerDesktopNav active="browse" />
            <button
              onClick={() => setShowFilter(true)}
              className="relative flex size-11 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-black)] shadow-[0_8px_22px_rgba(13,13,13,0.05)] transition active:scale-[0.97]"
            >
              <SlidersHorizontal className="size-5" />
              {filterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-[var(--lobb-clay)] text-[10px] font-black text-white ring-2 ring-[var(--lobb-bg)]">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:pt-8">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[28px] bg-[var(--lobb-black)] p-5 text-white shadow-[0_18px_46px_rgba(13,13,13,0.18)] sm:p-7">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-[56px] bg-[var(--lobb-clay)]/20" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-white/58">
                  <Sparkles className="size-3.5 text-[var(--lobb-clay)]" />
                  Verified booking desk
                </div>
                <h2 className="mt-4 max-w-xl text-[31px] font-black leading-[0.94] tracking-[-0.01em] sm:text-[44px]">
                  Find your next tennis coach in Lagos.
                </h2>
                <p className="mt-4 max-w-[36rem] text-[14px] font-medium leading-6 text-white/62 sm:text-[15px]">
                  Search by area, compare price and session history, then book straight into an open slot.
                </p>
              </div>
              <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-[var(--lobb-clay)] sm:flex">
                <CalendarCheck className="size-6" />
              </span>
            </div>
            <div className="relative mt-6 grid grid-cols-3 overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.06]">
              <Stat label="Coaches" value={initialCoaches.length} />
              <Stat label="Slots" value={availableCount} />
              <Stat label="Rating" value={topRatedCoach?.avg_rating?.toFixed(1) ?? "New"} />
            </div>
          </div>

          <aside className="hidden rounded-[28px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-5 shadow-[0_14px_34px_rgba(13,13,13,0.06)] lg:block">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--lobb-muted)]">Quick filters</p>
            <div className="mt-4 space-y-3">
              <button
                onClick={() => setAvailFilter((prev) => (prev === "Has availability" ? "Any" : "Has availability"))}
                className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm font-black transition ${
                  availFilter === "Has availability"
                    ? "border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay-dark)]"
                    : "border-[var(--lobb-border)] bg-white/50 text-[var(--lobb-black)]"
                }`}
              >
                Slots open now
                {availFilter === "Has availability" && <Check className="size-4" />}
              </button>
              <button
                onClick={() => setSort("Highest Rated")}
                className={`flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left text-sm font-black transition ${
                  sort === "Highest Rated"
                    ? "border-[var(--lobb-black)] bg-[var(--lobb-black)] text-white"
                    : "border-[var(--lobb-border)] bg-white/50 text-[var(--lobb-black)]"
                }`}
              >
                Highest rated
                {sort === "Highest Rated" && <Check className="size-4" />}
              </button>
            </div>
            <p className="mt-5 text-sm font-semibold leading-6 text-[var(--lobb-muted)]">
              {results.length} matching coaches from {initialCoaches.length} active profiles.
            </p>
          </aside>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/94 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 sm:px-6">
          <label className="flex h-[52px] flex-1 items-center gap-3 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 shadow-[0_10px_28px_rgba(58,43,20,0.05)]">
            <Search className="size-5 shrink-0 text-[var(--lobb-clay)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coach, area, skill"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-semibold outline-none placeholder:text-[#9b958a] focus:ring-0"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search" className="flex size-8 items-center justify-center rounded-full bg-[var(--lobb-surface-2)]">
                <X className="size-4 text-[var(--lobb-muted)]" />
              </button>
            )}
          </label>
          <button
            onClick={() => setShowSort(true)}
            className="flex h-[52px] items-center gap-1.5 rounded-[18px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 text-sm font-black shadow-[0_10px_28px_rgba(58,43,20,0.05)]"
          >
            <span className="hidden sm:inline">Sort</span>
            <ChevronDown className="size-4" />
          </button>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4 sm:px-6">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {LOCATION_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setLocation(item)}
              className={`h-10 shrink-0 rounded-full px-4 text-sm font-black transition ${
                location === item
                  ? "bg-[var(--lobb-black)] text-white shadow-[0_10px_24px_rgba(13,13,13,0.14)]"
                  : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-5 flex max-w-6xl items-center justify-between px-4 text-sm sm:px-6">
        <div>
          <p className="font-black text-[var(--lobb-black)]">{results.length} coaches found</p>
          <p className="text-xs font-semibold text-[var(--lobb-muted)]">
            {filterCount > 0 ? `${filterCount} filter${filterCount === 1 ? "" : "s"} active` : "Ready when you are"}
          </p>
        </div>
        {(filterCount > 0 || query) && (
          <button
            className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-4 py-2 text-xs font-black text-[var(--lobb-black)]"
            onClick={() => { resetFilters(); setQuery(""); }}
          >
            Clear
          </button>
        )}
      </section>

      <section className="mx-auto mt-4 grid max-w-6xl gap-4 px-4 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
        {results.length ? (
          results.map((coach) => <CoachListCard key={coach.id} coach={coach} />)
        ) : (
          <div className="md:col-span-2 xl:col-span-3">
            <LobbEmptyState
              title="No coaches match your filters."
              body="Try widening your search or check back soon."
              action={
                <button
                  className="rounded-full bg-[var(--lobb-black)] px-5 py-2 text-sm font-black text-white"
                  onClick={() => { resetFilters(); setQuery(""); }}
                >
                  Clear filters
                </button>
              }
            />
          </div>
        )}
      </section>

      {/* Filter bottom sheet */}
      {showFilter && (
        <BottomSheet onClose={() => setShowFilter(false)}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Filter Coaches</h2>
            <button
              className="text-sm font-bold text-[var(--lobb-clay)]"
              onClick={resetFilters}
            >
              Reset all
            </button>
          </div>

          {/* Location */}
          <ChipBlock
            title="Location"
            items={LOCATION_FILTERS.slice(1)}
            selected={location === "All" ? [] : [location]}
            onToggle={(item) => setLocation((prev) => (prev === item ? "All" : item))}
            single
          />

          {/* Specialization */}
          <ChipBlock
            title="Specialization"
            items={SPEC_OPTIONS}
            selected={specs}
            onToggle={(item) =>
              setSpecs((prev) =>
                prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
              )
            }
          />

          {/* Price range */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-black">Price range</h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setPriceLabel(r.label)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${
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

          {/* Availability */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-black">Availability</h3>
            <div className="flex flex-wrap gap-2">
              {(["Any", "Has availability"] as AvailFilter[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAvailFilter(opt)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${
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
            Show {results.length} Coaches
          </button>
        </BottomSheet>
      )}

      {/* Sort bottom sheet */}
      {showSort && (
        <BottomSheet onClose={() => setShowSort(false)}>
          <h2 className="mb-5 text-lg font-black">Sort Coaches</h2>
          {(["Best Match", "Highest Rated", "Most Reviewed", "Lowest Price", "Newest on LOBB"] as SortOption[]).map(
            (option) => (
              <button
                key={option}
                className="flex w-full items-center justify-between border-b border-[var(--lobb-border)] py-4 text-left font-semibold"
                onClick={() => {
                  setSort(option);
                  setShowSort(false);
                }}
              >
                <span>{option}</span>
                <span>{sort === option ? "●" : "○"}</span>
              </button>
            )
          )}
        </BottomSheet>
      )}

      <PlayerBottomNav active="browse" />
    </main>
  );
}

// ─── Shared filter chip block ─────────────────────────────────────────────────

function ChipBlock({
  title,
  items,
  selected,
  onToggle,
  single,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  single?: boolean;
}) {
  void single;
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-black">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`rounded-full border px-4 py-2 text-sm font-bold ${
                active
                  ? "border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay-dark)]"
                  : "border-[var(--lobb-border)] text-[var(--lobb-muted)]"
              }`}
            >
              {item} {active ? "✓" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0 sm:px-4">
      <p className="text-[21px] font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/42">{label}</p>
    </div>
  );
}

// ─── Bottom sheet wrapper ─────────────────────────────────────────────────────

function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/35" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-[var(--lobb-surface)] p-5 shadow-[0_-18px_40px_rgba(0,0,0,0.18)] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--lobb-border)]" />
        <button onClick={onClose} className="absolute right-5 top-5">
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
