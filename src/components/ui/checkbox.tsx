"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LOBB checkbox — Base UI Checkbox styled to the design system.
 * Fixed 20×20, immune to global input sizing rules.
 */
export function Checkbox({
  className,
  ...props
}: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border-[1.5px] border-[var(--lobb-text-tertiary)]/45 bg-[var(--lobb-surface)] transition-all duration-150",
        "data-[checked]:border-[var(--lobb-clay)] data-[checked]:bg-[var(--lobb-clay)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lobb-clay)]/40 focus-visible:ring-offset-1",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex text-white data-[unchecked]:hidden"
      >
        <CheckIcon className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
