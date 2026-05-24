import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-14 w-full min-w-0 rounded-[12px] border border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] px-4 py-2 text-base text-[var(--lobb-text-primary)] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--lobb-text-primary)] placeholder:text-[var(--lobb-text-tertiary)] focus-visible:border-[var(--lobb-border-focus)] focus-visible:ring-3 focus-visible:ring-[var(--lobb-clay)]/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] aria-invalid:border-[var(--lobb-border-error)] aria-invalid:ring-3 aria-invalid:ring-[var(--lobb-error)]/10 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
