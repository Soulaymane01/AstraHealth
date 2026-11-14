import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import type { TrainingPlanItem } from "@/lib/api/types";
import { articleForDomain } from "@/lib/knowledge";
import { cn } from "@/lib/utils";

export function PlanItemCard({
  item,
  onLog,
}: {
  item: TrainingPlanItem;
  onLog: (item: TrainingPlanItem) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-line bg-surface p-4",
        item.priority === 1 && "border-watch/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{item.name}</p>
          <p className="mt-0.5 text-[10px] text-muted">
            {item.domain} · {item.duration_min} min
          </p>
        </div>
        {item.countermeasure_for.length > 0 && (
          <span className="shrink-0 rounded-full bg-watch-soft px-2 py-0.5 text-[9px] font-medium text-watch">
            Countermeasure
          </span>
        )}
      </div>

      {item.countermeasure_for.length > 0 && (
        <p className="mt-2 rounded-lg bg-watch-soft/60 px-2.5 py-1.5 text-[10px] leading-relaxed text-watch">
          For: {item.countermeasure_for.join(", ")}
        </p>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
          <span>
            {item.completed} of {item.target_per_week} this week
          </span>
          <span className="tabular text-ink-2">{item.remaining} left</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              item.remaining === 0 ? "bg-nominal" : "bg-accent",
            )}
            style={{ width: `${item.adherence}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[10px] text-muted">{item.description}</span>
          {articleForDomain(item.domain) && (
            <Link
              to={`/library/${articleForDomain(item.domain)}`}
              className="shrink-0 text-[10px] font-medium text-accent hover:text-accent-strong"
            >
              Learn
            </Link>
          )}
        </div>
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => onLog(item)}>
          <Plus size={11} aria-hidden />
          Log
        </Button>
      </div>
    </div>
  );
}
