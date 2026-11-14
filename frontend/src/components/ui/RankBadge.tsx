import { Orbit, Shield } from "lucide-react";

import { cn, formatNumber } from "@/lib/utils";

export function CreditChip({
  amount,
  className,
  showLabel = false,
}: {
  amount: number;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent",
        className,
      )}
      title={`${formatNumber(amount)} Flight Credits`}
    >
      <Orbit size={11} aria-hidden />
      <span className="tabular">{formatNumber(amount)}</span>
      {showLabel && <span className="text-[10px] text-accent">FC</span>}
    </span>
  );
}

export interface RankBadgeProps {
  rank: string;
  credits: number;
  nextRank?: string;
  progress: number;
  className?: string;
}

export function RankBadge({ rank, credits, nextRank, progress, className }: RankBadgeProps) {
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <div className={cn("card-shadow rounded-xl border border-line bg-surface p-4", className)}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Shield size={18} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Mission rank</p>
          <p className="truncate text-sm font-semibold text-ink">{rank}</p>
        </div>

        <CreditChip amount={credits} showLabel />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-muted">
            {nextRank ? `Next: ${nextRank}` : "Maximum rank reached"}
          </span>
          <span className="tabular font-medium text-accent">{Math.round(pct * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
