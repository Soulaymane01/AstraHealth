import { cn } from "@/lib/utils";

const DEFAULT_LABELS = ["Very low", "Low", "Moderate", "High", "Very high"];

export interface ScaleInputProps {
  label?: string;
  value?: number;
  onChange?: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
  labels?: string[];
  className?: string;
}

export function ScaleInput({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
  labels = DEFAULT_LABELS,
  className,
}: ScaleInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium text-ink">{label}</p>}

      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={label ?? "Scale"}>
        {labels.map((option, index) => {
          const optionValue = index + 1;
          const selected = value === optionValue;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              aria-label={`${optionValue} — ${option}`}
              title={option}
              onClick={() => onChange?.(optionValue)}
              className={cn(
                "flex h-12 flex-col items-center justify-center gap-1 rounded-lg border text-[11px] transition-colors",
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-2 hover:border-line-strong",
              )}
            >
              <span className="tabular text-xs font-medium">{optionValue}</span>
              <span
                aria-hidden
                className={cn("w-4 rounded-full", selected ? "bg-accent" : "bg-line-strong")}
                style={{ height: `${3 + index * 2}px` }}
              />
            </button>
          );
        })}
      </div>

      {(lowLabel || highLabel) && (
        <div className="flex justify-between text-xs text-muted">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
}
