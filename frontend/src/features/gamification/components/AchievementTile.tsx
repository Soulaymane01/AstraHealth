import { Lock } from "lucide-react";
import { createElement } from "react";

import { achievementIcon } from "@/features/gamification/icons";
import type { Achievement } from "@/lib/api/types";
import { cn, formatRelativeTime } from "@/lib/utils";

export function AchievementTile({ achievement }: { achievement: Achievement }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3",
        achievement.unlocked
          ? "border-line bg-surface"
          : "border-dashed border-line bg-surface-muted/40",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          achievement.unlocked ? "bg-accent-soft text-accent" : "bg-surface-muted text-muted",
        )}
      >
        {createElement(achievementIcon(achievement.icon), { size: 15, "aria-hidden": true })}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={cn("text-xs font-medium", achievement.unlocked ? "text-ink" : "text-ink-2")}
          >
            {achievement.name}
          </p>
          {!achievement.unlocked && <Lock size={10} className="text-muted" aria-hidden />}
        </div>
        {achievement.unlocked && achievement.unlocked_at && (
          <p className="mt-1 text-[10px] text-nominal">
            Unlocked {formatRelativeTime(achievement.unlocked_at)}
          </p>
        )}
      </div>
    </div>
  );
}
