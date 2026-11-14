import { HelpCircle, Trophy, Users } from "lucide-react";

import { cn } from "@/lib/utils";

export type QuizMode = "self" | "crew";

export interface QuizCardProps {
  title: string;
  mode: QuizMode;
  questions: number;
  bestScore?: number;
  status?: "new" | "in-progress" | "completed";
  onStart?: () => void;
  className?: string;
}

const MODE_META: Record<
  QuizMode,
  { label: string; icon: typeof Users; className: string; copy: string }
> = {
  self: {
    label: "Know yourself",
    icon: HelpCircle,
    className: "bg-accent-soft text-accent",
    copy: "Health literacy about your own body",
  },
  crew: {
    label: "Know your crew",
    icon: Users,
    className: "bg-watch-soft text-watch",
    copy: "Consent-based perception check",
  },
};

export function QuizCard({
  title,
  mode,
  questions,
  bestScore,
  status = "new",
  onStart,
  className,
}: QuizCardProps) {
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        "group flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-transform duration-150 hover:-translate-y-0.5",
        mode === "self" ? "border-accent/20 bg-accent-soft" : "border-watch/25 bg-watch-soft",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            meta.className,
          )}
        >
          <Icon size={11} aria-hidden />
          {meta.label}
        </span>
        {bestScore !== undefined && (
          <span className="inline-flex items-center gap-1 text-xs text-nominal">
            <Trophy size={11} aria-hidden />
            {bestScore}%
          </span>
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
