import { Check, Minus } from "lucide-react";

import type { StepDefinition, StepKey } from "@/features/checkin/checkin-config";
import { cn } from "@/lib/utils";

const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface CheckinProgressProps {
  steps: StepDefinition[];
  current: number;
  skipped: StepKey[];
}

export function CheckinProgress({ steps, current, skipped }: CheckinProgressProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted">
          Step {current + 1} of {steps.length}
        </p>
        <p className="text-xs text-muted">{steps[current]?.title}</p>
      </div>

      <ol className="mt-3 grid grid-cols-5 gap-1">
        {steps.map((step, index) => {
          const complete = index < current && !skipped.includes(step.key);
          const isSkipped = skipped.includes(step.key);
          const active = index === current;

          return (
            <li
              key={step.key}
              className="flex min-w-0 flex-col items-center gap-1.5"
              aria-label={`${step.title}${
                isSkipped ? " (skipped)" : complete ? " (complete)" : active ? " (current)" : ""
              }`}
            >
              <span className="relative flex h-8 w-8 items-center justify-center">
                <svg
                  viewBox="0 0 32 32"
                  className="absolute inset-0 h-8 w-8 -rotate-90"
                  aria-hidden
                >
                  <circle
                    cx="16"
                    cy="16"
                    r={RADIUS}
                    fill="none"
                    stroke="var(--color-line)"
                    strokeWidth="2.2"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r={RADIUS}
                    fill="none"
                    stroke={
                      isSkipped
                        ? "var(--color-line-strong)"
                        : active
                          ? "var(--color-accent)"
                          : complete
                            ? "var(--color-nominal)"
                            : "transparent"
                    }
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={isSkipped || active || complete ? 0 : CIRCUMFERENCE}
                    className="transition-[stroke-dashoffset,stroke] duration-500"
                  />
                </svg>

                <span
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium tabular",
                    isSkipped && "text-muted",
                    active && !isSkipped && "bg-accent text-white",
                    complete && "text-nominal",
                    !active && !complete && !isSkipped && "text-muted",
                  )}
                >
                  {complete ? (
                    <Check size={11} aria-hidden />
                  ) : isSkipped ? (
                    <Minus size={11} aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
              </span>

              <span
                className={cn(
                  "hidden max-w-full truncate text-center text-[10px] leading-tight sm:block",
                  active && !isSkipped ? "font-medium text-ink" : "text-muted",
                )}
              >
                {step.short}
              </span>
            </li>
          );
        })}
      </ol>

      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label="Check-in progress"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${((current + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
