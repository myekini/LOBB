import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[14px] border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:border-[var(--lobb-border-focus)] focus-visible:ring-3 focus-visible:ring-[var(--lobb-clay)]/15 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:bg-[var(--lobb-bg-secondary)] disabled:text-[var(--lobb-text-tertiary)] disabled:opacity-100 aria-invalid:border-[var(--lobb-border-error)] aria-invalid:ring-3 aria-invalid:ring-[var(--lobb-error)]/10 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--lobb-bg-inverse)] text-[var(--lobb-text-inverse)] [a]:hover:bg-[#2A2520]",
        outline:
          "border-[var(--lobb-border-subtle)] bg-transparent text-[var(--lobb-text-primary)] hover:bg-[var(--lobb-bg-secondary)] aria-expanded:bg-[var(--lobb-bg-secondary)]",
        secondary:
          "bg-[var(--lobb-clay)] text-[var(--lobb-text-inverse)] hover:bg-[var(--lobb-clay-dark)] aria-expanded:bg-[var(--lobb-clay-dark)]",
        ghost:
          "text-[var(--lobb-text-secondary)] hover:bg-[var(--lobb-bg-secondary)] hover:text-[var(--lobb-text-primary)] aria-expanded:bg-[var(--lobb-bg-secondary)]",
        destructive:
          "border-[var(--lobb-error)] bg-transparent text-[var(--lobb-error)] hover:bg-[var(--lobb-error)]/10 focus-visible:border-[var(--lobb-error)] focus-visible:ring-[var(--lobb-error)]/10",
        link: "text-[var(--lobb-text-link)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
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
