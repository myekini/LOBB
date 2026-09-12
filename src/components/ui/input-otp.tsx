"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "@/lib/utils";

// shadcn's canonical OTP primitive (built on the input-otp library) — one
// managed input underneath, rendered as separate "slot" boxes. Paste
// anywhere fills every slot, autofill/keyboard nav/caret all come from the
// library instead of hand-rolled per-box logic. Styled to LOBB's tokens
// rather than shadcn's stock look.
const InputOTP = React.forwardRef<React.ElementRef<typeof OTPInput>, React.ComponentPropsWithoutRef<typeof OTPInput>>(
  ({ className, containerClassName, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn("flex items-center gap-2 has-[:disabled]:opacity-50", containerClassName)}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  )
);
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("grid w-full grid-flow-col gap-2", className)} {...props} />
  )
);
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<React.ElementRef<"div">, React.ComponentPropsWithoutRef<"div"> & { index: number; hasError?: boolean }>(
  ({ index, hasError, className, ...props }, ref) => {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-[60px] items-center justify-center rounded-[var(--lobb-radius-lg)] border bg-[var(--lobb-bg-secondary)] text-center text-[22px] font-semibold text-[var(--lobb-text-primary)] shadow-[0_4px_24px_rgba(0,0,0,0.06)] outline-none transition-all duration-300",
          isActive && "-translate-y-1 border-[var(--lobb-clay)] bg-[var(--lobb-bg-elevated)] shadow-[0_8px_32px_rgba(196,98,45,0.15)]",
          hasError
            ? "border-[var(--lobb-border-error)]/50 text-[var(--lobb-border-error)]"
            : !isActive && "border-[var(--lobb-border-subtle)]",
          className
        )}
        {...props}
      >
        {char}
        {hasFakeCaret && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-px animate-pulse bg-[var(--lobb-clay)]" />
          </div>
        )}
      </div>
    );
  }
);
InputOTPSlot.displayName = "InputOTPSlot";

export { InputOTP, InputOTPGroup, InputOTPSlot };
