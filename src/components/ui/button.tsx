import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--lobb-radius-md)] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:border-[var(--lobb-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--lobb-clay)]/20 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:opacity-100 aria-invalid:border-[var(--lobb-border-error)] aria-invalid:ring-2 aria-invalid:ring-[var(--lobb-error)]/15 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        unstyled: "bg-transparent text-inherit",
        default: "bg-[var(--lobb-clay)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)]",
        dark: "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-text-primary)]",
        outline: "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-elevated)] text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-bg-secondary)]",
        secondary: "border-[var(--lobb-border-subtle)] bg-[var(--lobb-bg-secondary)] text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-clay-light)]",
        ghost:
          "text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-bg-secondary)] hover:text-[var(--lobb-text-primary)] aria-expanded:bg-[var(--lobb-bg-secondary)]",
        destructive:
          "border-[var(--lobb-error)] bg-transparent text-[var(--lobb-error)] hover:bg-[var(--lobb-error)]/10 focus-visible:border-[var(--lobb-error)] focus-visible:ring-[var(--lobb-error)]/15",
        link: "text-[var(--lobb-text-link)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[var(--lobb-control-md)] gap-2 px-3.5",
        xs: "h-[var(--lobb-control-sm)] gap-1.5 px-2.5 text-xs",
        sm: "h-[var(--lobb-control-sm)] gap-1.5 px-3 text-sm",
        lg: "h-[var(--lobb-control-lg)] gap-2 px-4",
        icon: "size-[var(--lobb-control-md)]",
        "icon-xs": "size-[var(--lobb-control-sm)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-[var(--lobb-control-sm)]",
        "icon-lg": "size-[var(--lobb-control-lg)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
