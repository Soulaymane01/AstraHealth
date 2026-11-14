import { Activity, HelpCircle, Trophy, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type QuizMode = "self" | "crew";
export type QuizKind = "knowledge" | "screening";

export interface QuizCardProps {
  title: string;
  mode: QuizMode;
  kind?: QuizKind;
  questions: number;
  bestScore?: number;
  latestTotalScore?: number;
  maxScore?: number;
  latestSeverityLabel?: string;
  status?: "new" | "in-progress" | "completed";
  onStart?: () => void;
  className?: string;
}

const MODE_META: Record<
  QuizMode,
  { label: string; icon: typeof Users; className: string }
> = {
  self: {
    label: "Know yourself",
    icon: HelpCircle,
    className: "bg-accent-soft text-accent",
  },
  crew: {
    label: "Know your crew",
    icon: Users,
    className: "bg-watch-soft text-watch",
  },
};

export function QuizCard({
  title,
  mode,
  kind = "knowledge",
  questions,
  bestScore,
  latestTotalScore,
  maxScore,
  latestSeverityLabel,
  status = "new",
  onStart,
  className,
}: QuizCardProps) {
  const screening = kind === "screening";
  const meta = MODE_META[mode];
  const Icon = screening ? Activity : meta.icon;

  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        "group flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-transform duration-150 hover:-translate-y-0.5",
        screening
          ? "border-accent/25 bg-surface"
          : mode === "self"
            ? "border-accent/20 bg-accent-soft"
            : "border-watch/25 bg-watch-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            screening ? "bg-surface-muted text-ink-2" : meta.className,
          )}
        >
          <Icon size={11} aria-hidden />
          {screening ? "Screening" : meta.label}
        </span>
        {screening ? (
          latestTotalScore !== undefined && latestTotalScore !== null ? (
            <span className="inline-flex items-baseline gap-1 text-[10px] text-muted">
              <span className="text-xs font-semibold tabular text-ink">
                {latestTotalScore}/{maxScore}
              </span>
              {latestSeverityLabel}
            </span>
          ) : (
            <span className="text-[10px] text-muted">Not taken</span>
          )
        ) : (
          bestScore !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-nominal">
              <Trophy size={11} aria-hidden />
              {Math.round(bestScore)}%
            </span>
          )
        )}
      </div>

      <h2 className="text-sm font-semibold leading-snug text-ink">{title}</h2>

      <div className="mt-auto flex items-center justify-between border-t border-ink/10 pt-3 text-xs">
        <span className="text-muted">{questions} questions</span>
        <span
          className={cn("font-medium", status === "completed" ? "text-nominal" : "text-accent")}
        >
          {status === "completed" ? "Retake" : status === "in-progress" ? "Resume" : "Start"}
        </span>
      </div>
    </button>
  );
}
