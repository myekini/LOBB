import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 py-3 text-base text-[var(--lobb-text-primary)] transition-colors outline-none placeholder:text-[var(--lobb-text-tertiary)] focus-visible:border-[var(--lobb-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--lobb-clay)]/20 disabled:cursor-not-allowed disabled:bg-[var(--lobb-bg-secondary)] disabled:opacity-50 aria-invalid:border-[var(--lobb-border-error)] aria-invalid:ring-2 aria-invalid:ring-[var(--lobb-error)]/15 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
