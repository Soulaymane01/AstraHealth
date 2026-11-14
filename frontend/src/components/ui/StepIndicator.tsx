import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepIndicatorProps {
  steps: string[];
  current: number;
  className?: string;
}

export function StepIndicator({ steps, current, className }: StepIndicatorProps) {
  return (
    <ol className={cn("flex w-full items-start", className)} aria-label="Check-in progress">
      {steps.map((step, index) => {
        const complete = index < current;
        const active = index === current;

        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex w-full items-center">
              <span
                className={cn(
                  "h-px flex-1",
                  index === 0 ? "bg-transparent" : complete || active ? "bg-accent/40" : "bg-line",
                )}
              />
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium tabular transition-colors",
                  complete && "border-nominal/25 bg-nominal-soft text-nominal",
                  active && "border-accent bg-accent text-white",
                  !complete && !active && "border-line bg-surface text-muted",
                )}
                aria-current={active ? "step" : undefined}
              >
                {complete ? <Check size={12} aria-hidden /> : index + 1}
              </span>
              <span
                className={cn(
                  "h-px flex-1",
                  index === steps.length - 1
                    ? "bg-transparent"
                    : complete
                      ? "bg-accent/40"
                      : "bg-line",
                )}
              />
            </div>
            <span
              className={cn(
                "max-w-full truncate px-1 text-center text-xs",
                active ? "font-medium text-ink" : complete ? "text-ink-2" : "text-muted",
              )}
            >
              {step}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
