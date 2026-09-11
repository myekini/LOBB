import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <div className={cn("flex h-[var(--lobb-control-lg)] items-center gap-2 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 transition-colors focus-within:border-[var(--lobb-border-focus)] focus-within:ring-2 focus-within:ring-[var(--lobb-clay)]/20", className)}>
      <Search className="size-4 shrink-0 text-[var(--lobb-text-tertiary)]" aria-hidden="true" />
      <input data-slot="search-input" type="search" className="h-full min-w-0 flex-1 bg-transparent text-sm text-[var(--lobb-text-primary)] outline-none placeholder:text-[var(--lobb-text-tertiary)]" {...props} />
    </div>
  );
}
