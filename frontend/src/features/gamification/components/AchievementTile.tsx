import { Lock, Sparkles } from "lucide-react";
import { createElement } from "react";

import { achievementIcon } from "@/features/gamification/icons";
import type { Achievement } from "@/lib/api/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function AchievementTile({ achievement }: { achievement: Achievement }) {
  const progress = achievement.unlocked ? 1 : achievement.progress;
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <div
      title={achievement.description}
      className={cn(
        "flex gap-3 rounded-xl border p-3",
        achievement.unlocked
          ? "border-accent/20 bg-accent-soft/45"
          : "border-dashed border-line bg-surface-muted/30",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          achievement.unlocked
            ? "bg-accent text-white shadow-[0_4px_12px_rgba(11,61,145,0.18)]"
            : "bg-surface-muted text-muted",
        )}
      >
        {createElement(achievementIcon(achievement.icon), { size: 15, "aria-hidden": true })}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={cn("truncate text-xs font-medium", achievement.unlocked ? "text-ink" : "text-ink-2")}
          >
            {achievement.name}
          </p>
          {achievement.unlocked ? (
            <Sparkles size={10} className="shrink-0 text-accent" aria-hidden />
          ) : (
            <Lock size={10} className="shrink-0 text-muted" aria-hidden />
          )}
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              achievement.unlocked ? "bg-nominal" : "bg-accent/70",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>

        <p
          className={cn(
            "mt-1 text-[9px]",
            achievement.unlocked ? "text-nominal" : "text-muted",
          )}
        >
          {achievement.unlocked && achievement.unlocked_at
            ? `Unlocked ${formatRelativeTime(achievement.unlocked_at)}`
            : `${percent}% there`}
        </p>
      </div>
    </div>
  );
}
