import { STATUS_META, type Status } from "@/lib/status";
import { cn, formatSigned } from "@/lib/utils";

export interface DomainRailProps {
  name: string;
  score: number;
  status: Status;
  delta?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function DomainRail({
  name,
  score,
  status,
  delta,
  active = false,
  onClick,
  className,
}: DomainRailProps) {
  const meta = STATUS_META[status];
  const width = Math.max(0, Math.min(100, score));

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        active ? "bg-accent-soft" : "hover:bg-surface-muted",
        className,
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-ink">{name}</span>
          <span className="text-sm font-semibold tabular text-ink">
            {Number.isInteger(score) ? score : score.toFixed(1)}
          </span>
        </span>
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
          <span
            className={cn("block h-full rounded-full transition-[width] duration-500", meta.dot)}
            style={{ width: `${width}%` }}
          />
        </span>
      </span>

      <span className="w-8 shrink-0 text-right text-xs tabular text-muted">
        {delta === undefined ? "—" : formatSigned(delta)}
      </span>
    </button>
  );
}
