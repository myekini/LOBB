"use client";

import * as React from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LOBB searchable select — a shadcn-combobox-style picker built on Base UI.
 * Renders a button-like trigger matching the app's field styling; opens a
 * popup with a search input and a filtered list. Use anywhere a native
 * <select> would force endless scrolling (locations, banks, courts).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyMessage = "No matches found.",
  disabled = false,
  invalid = false,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  id?: string;
}) {
  const items = React.useMemo(
    () =>
      options.map((option) =>
        typeof option === "string" ? { value: option, label: option } : option
      ),
    [options]
  );
  const selected = items.find((item) => item.value === value) ?? null;

  return (
    <Combobox.Root
      items={items}
      value={selected}
      onValueChange={(item) => onChange(item?.value ?? "")}
      itemToStringLabel={(item) => item?.label ?? ""}
      disabled={disabled}
    >
      <Combobox.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-14 w-full items-center justify-between gap-3 rounded-[16px] border bg-[var(--lobb-surface-2)] px-5 text-left text-[15px] font-bold text-[var(--lobb-text-primary)] transition-all",
          "hover:border-[var(--lobb-clay)]/35 focus-visible:outline-none focus-visible:border-[var(--lobb-clay)]/50 focus-visible:shadow-[0_0_24px_rgba(196,98,45,0.12)]",
          "data-[popup-open]:border-[var(--lobb-clay)]/50 data-[popup-open]:bg-[var(--lobb-surface)]",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
          invalid ? "border-[var(--lobb-error)]/50" : "border-[var(--lobb-border)]",
          className
        )}
      >
        <span className={cn("truncate", !selected && "font-semibold text-[var(--lobb-text-tertiary)]")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner side="bottom" sideOffset={6} className="isolate z-[90] w-[var(--anchor-width)]">
          <Combobox.Popup className="max-h-[min(340px,var(--available-height))] w-full overflow-hidden rounded-[16px] border border-[var(--lobb-border)] bg-[var(--lobb-bg-elevated)] shadow-[var(--lobb-shadow-modal)]">
            <div className="flex items-center gap-2.5 border-b border-[var(--lobb-border)] px-4">
              <Search className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" />
              <Combobox.Input
                placeholder={searchPlaceholder}
                className="h-12 w-full border-0 bg-transparent text-[14px] font-semibold text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)] focus:ring-0"
              />
            </div>
            <Combobox.Empty className="px-4 py-5 text-center text-[13px] font-semibold text-[var(--lobb-text-tertiary)] empty:hidden">
              {emptyMessage}
            </Combobox.Empty>
            <Combobox.List className="max-h-[260px] overflow-y-auto p-1.5">
              {(item: { value: string; label: string }) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3.5 py-2.5 text-[14px] font-semibold text-[var(--lobb-text-secondary)] transition-colors data-[highlighted]:bg-[var(--lobb-clay)]/10 data-[highlighted]:text-[var(--lobb-text-primary)] data-[selected]:text-[var(--lobb-clay)]"
                >
                  <span className="truncate">{item.label}</span>
                  <Combobox.ItemIndicator>
                    <Check className="size-4 text-[var(--lobb-clay)]" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
