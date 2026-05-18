"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { coaches } from "@/lib/mock-data";
import { CoachListCard } from "@/components/coach-cards";
import { PlayerBottomNav } from "@/components/player-nav";

const locations = ["All", "Lekki", "VI", "Ikoyi", "Ikeja", "Surulere"];
const specs = ["Beginners", "Kids", "Adults", "Competitive", "Fitness"];

export default function CoachesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sort, setSort] = useState("Best Match");

  const results = useMemo(() => {
    return coaches.filter((coach) => {
      const matchesLocation = location === "All" || coach.locations.includes(location);
      const haystack = [coach.name, coach.subtitle, coach.headline, ...coach.specializations, ...coach.locations]
        .join(" ")
        .toLowerCase();
      return matchesLocation && haystack.includes(query.toLowerCase());
    });
  }, [location, query]);

  return (
    <main className="min-h-screen bg-[var(--lobb-bg)] pb-28 text-[var(--lobb-black)]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between border-b border-[var(--lobb-border)] bg-[var(--lobb-bg)]/95 px-5 backdrop-blur">
        <button onClick={() => router.back()} aria-label="Go back" className="-ml-2 flex size-10 items-center justify-center rounded-full border border-transparent hover:border-[var(--lobb-border)] hover:bg-[var(--lobb-surface)]">
          <ArrowLeft className="size-5" />
        </button>
        <div className="text-center">
          <h1 className="font-black">Find a Coach</h1>
          <p className="text-xs font-semibold text-[var(--lobb-muted)]">Verified tennis coaches in Lagos</p>
        </div>
        <button onClick={() => setShowFilter(true)} className="flex size-10 items-center justify-center rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)]">
          <SlidersHorizontal className="size-5" />
        </button>
      </header>

      <section className="px-5 pt-4">
        <label className="flex h-14 items-center gap-3 rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-5 shadow-[0_12px_30px_rgba(58,43,20,0.06)]">
          <Search className="size-5 text-[var(--lobb-clay)]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search coaches, areas..."
            className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-semibold outline-none placeholder:text-[#9b958a] focus:ring-0"
          />
        </label>
      </section>

      <section className="mt-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {locations.map((item) => (
            <button
              key={item}
              onClick={() => setLocation(item)}
              className={`h-9 rounded-full px-4 text-sm font-bold ${
                location === item ? "bg-[var(--lobb-black)] text-white" : "border border-[var(--lobb-border)] bg-[var(--lobb-surface)] text-[var(--lobb-muted)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 flex items-center justify-between px-5 text-sm text-[var(--lobb-muted)]">
        <span className="font-semibold">{results.length} coaches found</span>
        <button onClick={() => setShowSort(true)} className="rounded-full border border-[var(--lobb-border)] bg-[var(--lobb-surface)] px-3 py-1.5 font-bold text-[var(--lobb-black)]">
          Sort: ↕ {sort.replace(" Match", "")}
        </button>
      </section>

      <section className="mt-4 space-y-4 px-5">
        {results.length ? (
          results.map((coach) => <CoachListCard key={coach.slug} coach={coach} />)
        ) : (
          <div className="rounded-[28px] border border-[var(--lobb-border)] bg-[var(--lobb-surface)] p-8 text-center shadow-[0_14px_34px_rgba(58,43,20,0.06)]">
            <p className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--lobb-surface-2)] text-3xl">🎾</p>
            <h2 className="mt-4 font-black">No coaches match these filters.</h2>
            <p className="mt-2 text-sm font-medium text-[var(--lobb-muted)]">Try widening your search.</p>
            <button className="mt-5 rounded-full bg-[var(--lobb-black)] px-5 py-2 text-sm font-black text-white" onClick={() => { setQuery(""); setLocation("All"); }}>
              Clear filters
            </button>
          </div>
        )}
      </section>

      {showFilter && (
        <BottomSheet onClose={() => setShowFilter(false)}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-black">Filter Coaches</h2>
            <button className="text-sm font-bold text-[var(--lobb-clay)]">Reset</button>
          </div>
          <FilterBlock title="Location" items={locations.slice(1)} active={location} setActive={setLocation} />
          <FilterBlock title="Specialization" items={specs} active="Beginners" />
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-black">Price Range</h3>
            <div className="h-2 rounded-full bg-[var(--lobb-surface-2)]">
              <div className="h-2 w-2/3 rounded-full bg-[var(--lobb-clay)]" />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-[var(--lobb-muted)]">
              <span>₦10k</span>
              <span>₦50k</span>
            </div>
          </div>
          <div className="mt-6 space-y-2 text-sm font-medium text-[var(--lobb-muted)]">
            <h3 className="text-sm font-black text-[var(--lobb-black)]">Availability</h3>
            <p>○ Any time</p>
            <p>● This weekend</p>
            <p>○ This week</p>
          </div>
          <button onClick={() => setShowFilter(false)} className="mt-6 h-14 w-full rounded-full bg-[var(--lobb-black)] font-black text-white">
            Show {results.length} Coaches
          </button>
        </BottomSheet>
      )}

      {showSort && (
        <BottomSheet onClose={() => setShowSort(false)}>
          <h2 className="mb-5 text-lg font-black">Sort Coaches</h2>
          {["Best Match", "Highest Rated", "Most Reviewed", "Lowest Price", "Newest on LOBB"].map((option) => (
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
          ))}
        </BottomSheet>
      )}

      <PlayerBottomNav active="browse" />
    </main>
  );
}

function FilterBlock({ title, items, active, setActive }: { title: string; items: string[]; active: string; setActive?: (value: string) => void }) {
  return (
    <div className="mt-6">
      <h3 className="mb-3 text-sm font-black">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => setActive?.(item)}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${active === item ? "border-[var(--lobb-clay)] bg-[#fff0e8] text-[var(--lobb-clay-dark)]" : "border-[var(--lobb-border)] text-[var(--lobb-muted)]"}`}
          >
            {item} {active === item ? "✓" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/35" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-[var(--lobb-surface)] p-5 shadow-[0_-18px_40px_rgba(0,0,0,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-[var(--lobb-border)]" />
        <button onClick={onClose} className="absolute right-5 top-5">
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}
