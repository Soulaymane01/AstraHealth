import { Flame, ShieldCheck } from "lucide-react";

import type { Streak } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function StreakTile({
  label,
  streak,
  className,
}: {
  label: string;
  streak: Streak;
  className?: string;
}) {
  const milestoneProgress =
    streak.next_milestone > 0 ? Math.min(1, streak.current / streak.next_milestone) : 0;

  return (
    <div className={cn("rounded-lg border border-line bg-surface px-3 py-2.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
          <Flame size={12} className="text-watch" aria-hidden />
          {label}
        </span>
        <span className="text-[10px] text-muted">Longest {streak.longest}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular tracking-tight text-ink">
          {streak.current}
        </span>
        <span className="text-xs text-muted">day{streak.current === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-watch/70"
          style={{ width: `${milestoneProgress * 100}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-muted">
        <span>Next milestone {streak.next_milestone}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1",
            streak.grace_available ? "text-nominal" : "text-muted",
          )}
        >
          <ShieldCheck size={10} aria-hidden />
          {streak.grace_available ? "Grace available" : "Grace used"}
        </span>
      </div>
    </div>
  );
}
