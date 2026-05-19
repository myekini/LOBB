"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { CoachListCard } from "@/components/coach-cards";
import { PlayerBottomNav } from "@/components/player-nav";
import { LobbEmptyState } from "@/components/lobb-empty-state";
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
  const router = useRouter();
  const [query,        setQuery]        = useState("");
  const [location,     setLocation]     = useState("All");
  const [specs,        setSpecs]        = useState<string[]>([]);
  const [priceLabel,   setPriceLabel]   = useState<PriceRangeLabel>("Any price");
  const [availFilter,  setAvailFilter]  = useState<AvailFilter>("Any");
  const [sort,         setSort]         = useState<SortOption>("Best Match");
  const [showFilter,   setShowFilter]   = useState(false);
  const [showSort,     setShowSort]     = useState(false);

  const activePrice = PRICE_RANGES.find((r) => r.label === priceLabel) ?? PRICE_RANGES[0];
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
        !coach.primary_location.toLowerCase().includes(location.toLowerCase()) &&
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
        coach.primary_location,
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
        coach.hourly_rate_ngn < activePrice.min ||
        coach.hourly_rate_ngn > activePrice.max
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
      list = [...list].sort((a, b) => a.hourly_rate_ngn - b.hourly_rate_ngn);
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
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="-ml-2 flex size-10 items-center justify-center rounded-full border border-transparent hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface)]"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center">
          <h1 className="font-black">Find a Coach</h1>
          <p className="text-xs font-semibold text-[var(--lobb-muted)]">
            Verified tennis coaches in Lagos
          </p>
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className="relative flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]"
        >
          <SlidersHorizontal className="size-5" />
          {filterCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--lobb-clay)] text-[9px] font-black text-white">
              {filterCount}
            </span>
          )}
        </button>
      </header>

      {/* Search */}
      <section className="px-5 pt-4">
        <label className="flex h-14 items-center gap-3 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 shadow-[0_12px_30px_rgba(58,43,20,0.06)]">
          <Search className="size-5 text-[var(--lobb-clay)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search coaches, areas..."
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-semibold outline-none placeholder:text-[#9b958a] focus:ring-0"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X className="size-4 text-[var(--lobb-muted)]" />
            </button>
          )}
        </label>
      </section>

      {/* Location chips */}
      <section className="mt-5 px-5">
        <div className="flex flex-wrap gap-2">
          {LOCATION_FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => setLocation(item)}
              className={`h-9 rounded-full px-4 text-sm font-bold ${
                location === item
                  ? "bg-[var(--lobb-black)] text-white"
                  : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* Results row */}
      <section className="mt-5 flex items-center justify-between px-5 text-sm text-[var(--lobb-muted)]">
        <span className="font-semibold">{results.length} coaches found</span>
        <button
          onClick={() => setShowSort(true)}
          className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 font-bold text-[var(--lobb-black)]"
        >
          Sort: ↕ {sort.replace(" Match", "")}
        </button>
      </section>

      {/* Coach cards */}
      <section className="mt-4 space-y-4 px-5">
        {results.length ? (
          results.map((coach) => <CoachListCard key={coach.id} coach={coach} />)
        ) : (
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
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-[var(--lobb-surface)] p-5 shadow-[0_-18px_40px_rgba(0,0,0,0.18)]"
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
