import type { MetricField } from "@/features/checkin/checkin-config";
import { cn } from "@/lib/utils";

export interface MetricInputProps {
  field: MetricField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function MetricInput({ field, value, error, onChange }: MetricInputProps) {
  const id = `metric-${field.code}`;
  const describedBy = error ? `${id}-error` : field.hint ? `${id}-hint` : undefined;

  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10",
        error && "border-critical/40 focus-within:border-critical/50 focus-within:ring-critical/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-medium text-muted">
          {field.label}
        </label>
        {field.optional && (
          <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
            Optional
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder ?? "—"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular tracking-tight text-ink outline-none placeholder:text-muted/40"
        />
        <span className="shrink-0 text-xs text-muted">{field.unit}</span>
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[11px] leading-relaxed text-critical">
          {error}
        </p>
      ) : field.hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] leading-relaxed text-muted">
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}
