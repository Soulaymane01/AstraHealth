import { BookOpen, Dumbbell, Plus, Sparkles } from "lucide-react";
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
  const Icon = item.kind === "countermeasure" ? Sparkles : Dumbbell;
  const article = articleForDomain(item.domain);
  const complete = item.remaining === 0;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border p-3.5",
        complete
          ? "border-nominal/25 bg-nominal-soft"
          : item.priority === 1
            ? "border-watch/30 bg-watch-soft"
            : "border-line bg-surface",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            complete ? "bg-nominal text-white" : "bg-surface/80 text-accent",
          )}
        >
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
          <p className="text-[10px] text-muted">
            {item.domain} · {item.duration_min} min
          </p>
        </div>
        <Button
          variant={complete ? "ghost" : "secondary"}
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={() => onLog(item)}
          aria-label={`Log ${item.name}`}
          title={`Log ${item.name}`}
        >
          <Plus size={13} aria-hidden />
        </Button>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface/70">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              complete ? "bg-nominal" : "bg-accent",
            )}
            style={{ width: `${Math.max(4, item.adherence)}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-medium tabular text-ink-2">
          {item.completed}/{item.target_per_week}
        </span>
        {article && (
          <Link
            to={`/library/${article}`}
            aria-label={`Read about ${item.domain}`}
            title="Read the evidence"
            className="text-muted transition-colors hover:text-accent"
          >
            <BookOpen size={12} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
