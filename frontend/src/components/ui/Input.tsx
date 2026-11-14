import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 focus:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/10 disabled:cursor-not-allowed disabled:bg-surface-muted",
        invalid && "border-critical/40 focus:border-critical/60 focus:ring-critical/10",
        className,
      )}
      {...props}
    />
  );
});
