import { ArrowRight, Check, Dumbbell } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Status";
import { STATUS_META, type Status } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface AnomalyCardProps {
  status: Status;
  title: string;
  rationale: string;
  action?: string;
  timestamp?: string;
  acknowledged?: boolean;
  countermeasure?: {
    code: string;
    name: string;
    duration_min: number;
  } | null;
  onAcknowledge?: () => void;
  onViewGuidance?: () => void;
  onOpenCountermeasure?: () => void;
  className?: string;
}

export function AnomalyCard({
  status,
  title,
  rationale,
  action,
  timestamp,
  acknowledged = false,
  countermeasure,
  onAcknowledge,
  onViewGuidance,
  onOpenCountermeasure,
  className,
}: AnomalyCardProps) {
  const meta = STATUS_META[status];

  return (
    <article
      className={cn(
        "rounded-xl border border-line bg-surface p-4",
        acknowledged && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} aria-hidden />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            {timestamp && <span className="text-xs text-muted">{timestamp}</span>}
          </div>

          <h3 className="mt-1.5 text-sm font-semibold leading-snug text-ink">{title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{rationale}</p>

          {action && (
            <div className="mt-3 rounded-lg bg-surface-muted px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted">Recommended</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{action}</p>
            </div>
          )}

          {countermeasure && (
            <button
              type="button"
              onClick={onOpenCountermeasure}
              className="mt-2 flex w-full items-center gap-2 rounded-lg border border-accent/20 bg-accent-soft/60 px-3 py-2 text-left transition-colors hover:bg-accent-soft"
            >
              <Dumbbell size={12} className="shrink-0 text-accent" aria-hidden />
              <span className="shrink-0 text-[11px] font-medium text-accent">Countermeasure</span>
              <span className="truncate text-[11px] text-ink-2">
                {countermeasure.name} · {countermeasure.duration_min} min
              </span>
              <ArrowRight size={11} className="ml-auto shrink-0 text-accent" aria-hidden />
            </button>
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
            {onViewGuidance ? (
              <button
                type="button"
                onClick={onViewGuidance}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong"
              >
                View guidance
                <ArrowRight size={12} aria-hidden />
              </button>
            ) : (
              <span />
            )}
            <Button
              variant={acknowledged ? "ghost" : "secondary"}
              size="sm"
              onClick={onAcknowledge}
              disabled={acknowledged}
            >
              <Check size={12} aria-hidden />
              {acknowledged ? "Acknowledged" : "Acknowledge"}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
