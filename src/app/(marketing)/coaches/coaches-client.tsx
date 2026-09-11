"use client";

import { Button as LobbButton } from "@/components/ui/button";
import { Input as LobbInput } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { CoachListCard } from "@/features/coaches/coach-cards";
import { PlayerBottomNav, PlayerHeader } from "@/components/layout/player-nav";
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
    <main className="lobb-app-page min-h-screen pb-28 text-[var(--lobb-text-primary)]">
      <PlayerHeader
        active="coaches"
        title="Book a coach"
        actions={
          <>
            <LobbButton variant="unstyled"
              type="button"
              onClick={() => setShowSort(true)}
              className="hidden h-10 items-center gap-1.5 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 text-xs font-medium sm:flex"
            >
              Sort <ChevronDown className="size-3.5" />
            </LobbButton>
            <LobbButton variant="unstyled"
              type="button"
              onClick={() => setShowFilter(true)}
              className="relative flex size-10 items-center justify-center rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] transition active:scale-[0.97]"
              aria-label="Filters"
            >
              <SlidersHorizontal className="size-4" />
              {filterCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-4.5 items-center justify-center rounded-full bg-[var(--lobb-clay)] text-[9px] font-medium text-white ring-2 ring-[var(--lobb-bg-primary)]">
                  {filterCount}
                </span>
              )}
            </LobbButton>
          </>
        }
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-5">

        <div className="pt-4">
          <label className="lobb-surface-outlined flex h-[52px] items-center gap-3 border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4">
            <Search className="size-5 shrink-0 text-[var(--lobb-text-secondary)]" />
            <LobbInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coach, area, skill"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-medium outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
            />
            {query && (
              <LobbButton variant="unstyled" type="button" onClick={() => setQuery("")} aria-label="Clear search" className="flex size-7 items-center justify-center rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-secondary)]">
                <X className="size-3.5 text-[var(--lobb-text-secondary)]" />
              </LobbButton>
            )}
          </label>
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {LOCATION_FILTERS.map((item) => (
            <LobbButton variant="unstyled"
              type="button"
              key={item}
              onClick={() => setLocation(item)}
              aria-pressed={location === item}
              className={`h-9 shrink-0 rounded-[var(--lobb-radius-lg)] px-4 text-sm font-medium transition ${
                location === item
                  ? "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)]"
                  : "border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-secondary)] hover:border-[var(--lobb-clay)]/35 hover:text-[var(--lobb-text-primary)]"
              }`}
            >
              {item}
            </LobbButton>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-[var(--lobb-text-secondary)]">
            <span className="font-medium text-[var(--lobb-bg-inverse)]">{results.length}</span> coach{results.length !== 1 ? "es" : ""}
            {filterCount > 0 || query ? " · filtered" : ""}
          </p>
          {(filterCount > 0 || query) && (
              <LobbButton variant="unstyled" type="button" onClick={reset} className="text-xs font-semibold text-[var(--lobb-clay)] hover:underline">
              Clear all
            </LobbButton>
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
                  <LobbButton variant="unstyled" type="button" className="rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] px-5 py-2 text-sm font-semibold text-[var(--lobb-text-inverse)]" onClick={reset}>
                    Clear filters
                  </LobbButton>
                }
              />
            </div>
          )}
        </div>
      </div>

      <BottomSheet title="Filter coaches" open={showFilter} onClose={() => setShowFilter(false)}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Filter coaches</h2>
            <LobbButton variant="unstyled" type="button" className="text-sm font-bold text-[var(--lobb-clay)]" onClick={() => { resetFiltersOnly(); }}>
              Reset
            </LobbButton>
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
            <h3 className="mb-3 text-sm font-semibold">Price range</h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map((r) => (
                <LobbButton variant="unstyled"
                  type="button"
                  key={r.label}
                  onClick={() => setPriceLabel(r.label)}
                  aria-pressed={priceLabel === r.label}
                  className={`rounded-[var(--lobb-radius-lg)] border px-4 py-2 text-sm font-bold transition ${
                    priceLabel === r.label
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay-dark)]"
                      : "border-[var(--lobb-border-subtle)] text-[var(--lobb-text-secondary)]"
                  }`}
                >
                  {r.label}
                </LobbButton>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold">Availability</h3>
            <div className="flex gap-2">
              {(["Any", "Has availability"] as AvailFilter[]).map((opt) => (
                <LobbButton variant="unstyled"
                  type="button"
                  key={opt}
                  onClick={() => setAvailFilter(opt)}
                  aria-pressed={availFilter === opt}
                  className={`rounded-[var(--lobb-radius-lg)] border px-4 py-2 text-sm font-bold transition ${
                    availFilter === opt
                      ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay-dark)]"
                      : "border-[var(--lobb-border-subtle)] text-[var(--lobb-text-secondary)]"
                  }`}
                >
                  {opt}
                </LobbButton>
              ))}
            </div>
          </div>
          <LobbButton variant="unstyled"
            type="button"
            onClick={() => setShowFilter(false)}
            className="mt-6 h-14 w-full rounded-[var(--lobb-radius-md)] bg-[var(--lobb-bg-inverse)] font-medium text-[var(--lobb-text-inverse)]"
          >
            Show {results.length} coach{results.length !== 1 ? "es" : ""}
          </LobbButton>
        </BottomSheet>

      <BottomSheet title="Sort coaches" open={showSort} onClose={() => setShowSort(false)}>
          <h2 className="mb-4 text-lg font-semibold">Sort</h2>
          {(["Best Match", "Highest Rated", "Most Reviewed", "Lowest Price", "Newest"] as SortOption[]).map((option) => (
            <LobbButton variant="unstyled"
              type="button"
              key={option}
              aria-pressed={sort === option}
              className="flex w-full items-center justify-between border-b border-[var(--lobb-border-subtle)] py-4 text-left font-medium last:border-0"
              onClick={() => { setSort(option); setShowSort(false); }}
            >
              <span>{option}</span>
              {sort === option ? (
                <Check className="size-4 text-[var(--lobb-clay)]" />
              ) : (
                <span className="size-4 rounded-full border border-[var(--lobb-border-subtle)]" />
              )}
            </LobbButton>
          ))}
        </BottomSheet>

      <PlayerBottomNav active="coaches" />
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
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <LobbButton variant="unstyled"
              type="button"
              key={item}
              onClick={() => onToggle(item)}
              aria-pressed={active}
              className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--lobb-radius-lg)] border px-4 text-sm font-bold transition ${
                active
                  ? "border-[var(--lobb-clay)] bg-[var(--lobb-clay-light)] text-[var(--lobb-clay-dark)]"
                  : "border-[var(--lobb-border-subtle)] text-[var(--lobb-text-secondary)]"
              }`}
            >
              {item}
              {active && <Check className="size-3.5" />}
            </LobbButton>
          );
        })}
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose, title, open }: { children: React.ReactNode; onClose: () => void; title: string; open: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px]" />
        <Dialog.Popup
          aria-label={title}
          className="fixed bottom-0 left-0 right-0 z-[60] max-h-[88vh] overflow-y-auto border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] p-5 pb-10 shadow-[var(--lobb-shadow-modal)] sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--lobb-border-subtle)]" />
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
