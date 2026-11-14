import { ScaleInput } from "@/components/ui/ScaleInput";
import type { ScaleField } from "@/features/checkin/checkin-config";

export interface OptionalScaleProps {
  field: ScaleField;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

export function OptionalScale({ field, value, onChange }: OptionalScaleProps) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink">{field.label}</p>
        <div className="flex items-center gap-2">
          {field.optional && (
            <span className="rounded-full bg-surface-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
              Optional
            </span>
          )}
          {value !== undefined && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-[10px] text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <ScaleInput
        labels={field.labels}
        lowLabel={field.lowLabel}
        highLabel={field.highLabel}
        value={value}
        onChange={onChange}
        className="mt-2"
      />

      {field.hint && <p className="mt-1 text-[11px] leading-relaxed text-muted">{field.hint}</p>}
    </div>
  );
}
