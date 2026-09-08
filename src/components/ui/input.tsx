import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--lobb-control-lg)] w-full min-w-0 rounded-[var(--lobb-radius-md)] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-3 py-2 text-base text-[var(--lobb-text-primary)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--lobb-text-primary)] placeholder:text-[var(--lobb-text-tertiary)] focus-visible:border-[var(--lobb-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--lobb-clay)]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] aria-invalid:border-[var(--lobb-border-error)] aria-invalid:ring-2 aria-invalid:ring-[var(--lobb-error)]/15 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
